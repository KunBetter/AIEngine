import OpenAI from "openai";
import type { AIRequestOptions } from "./types";

const apiKey = process.env.DEEPSEEK_API_KEY;
if (!apiKey && typeof window === "undefined") {
  console.warn("[AI Engine] DEEPSEEK_API_KEY is not set — AI calls will fail. Set it in .env.local");
}

const openai = new OpenAI({
  apiKey: apiKey || "MISSING_KEY",
  baseURL: "https://api.deepseek.com",
});

const DEFAULT_MODEL = "deepseek-chat";
const DEFAULT_MAX_TOKENS = 2048;
const MAX_RETRIES = 3;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

/**
 * 提取 JSON — 处理 AI 输出中可能包裹的 markdown 代码块
 */
export function extractJSON(text: string): string {
  let cleaned = text.trim();

  const fenceMatch = cleaned.match(/```(?:json)?\s*\n?([\s\S]*?)\n?```/);
  if (fenceMatch) {
    cleaned = fenceMatch[1].trim();
  }

  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.slice(firstBrace, lastBrace + 1);
  }

  return cleaned;
}

export function validateJSON(obj: Record<string, unknown>, schema: Record<string, string>): string | null {
  for (const [key, type] of Object.entries(schema)) {
    if (!(key in obj)) return `缺少字段: ${key}`;
    const val = obj[key];
    if (type === "array" && !Array.isArray(val)) return `字段 ${key} 应为数组`;
    if (type === "number" && typeof val !== "number") return `字段 ${key} 应为数字`;
    if (type === "string" && typeof val !== "string") return `字段 ${key} 应为字符串`;
    if (type === "object" && (typeof val !== "object" || val === null || Array.isArray(val))) return `字段 ${key} 应为对象`;
  }
  return null;
}

const responseCache = new Map<string, { data: Record<string, unknown>; timestamp: number }>();
const CACHE_TTL = 10 * 60 * 1000; // 10 minutes (reduced from 1h — game states change quickly)

function cacheKey(systemPrompt: string, userMessage: string): string {
  // Use full prompt for cache key to minimize collisions
  const input = systemPrompt + userMessage;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

/**
 * 非流式调用 DeepSeek API，自动重试，解析 JSON
 */
export async function callAI(
  systemPrompt: string,
  userMessage: string,
  options: AIRequestOptions = {},
  schema?: Record<string, string>
): Promise<Record<string, unknown>> {
  const model = options.model || DEFAULT_MODEL;
  const maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS;

  const key = cacheKey(systemPrompt, userMessage);
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  let lastError: Error | null = null;

  const maxRetries = schema ? 3 : MAX_RETRIES;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const response = await openai.chat.completions.create({
        model,
        max_tokens: maxTokens,
        temperature: options.temperature ?? 0.7,
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: userMessage },
        ],
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        throw new Error("AI 返回内容为空");
      }

      const jsonStr = extractJSON(content);
      const parsed = JSON.parse(jsonStr);

      if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
        throw new Error("AI 返回格式错误：期望 JSON 对象");
      }

      if (schema) {
        const validationError = validateJSON(parsed, schema);
        if (validationError) {
          if (attempt < maxRetries - 1) {
            userMessage += `\n\n[校验失败: ${validationError}。请确保输出包含所有必需字段。]`;
            continue;
          }
        }
      }

      responseCache.set(key, { data: parsed, timestamp: Date.now() });
      return parsed as Record<string, unknown>;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        await sleep(Math.pow(2, attempt) * 500);
      }
    }
  }

  throw lastError || new Error("AI 调用失败");
}

/**
 * 流式调用 DeepSeek API，通过回调推送事件
 */
export async function callAIStream(
  systemPrompt: string,
  userMessage: string,
  onChunk: (text: string) => void,
  options: AIRequestOptions = {}
): Promise<string> {
  const model = options.model || DEFAULT_MODEL;
  const maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS;

  const stream = await openai.chat.completions.create({
    model,
    max_tokens: maxTokens,
    temperature: options.temperature ?? 0.7,
    messages: [
      { role: "system", content: systemPrompt },
      { role: "user", content: userMessage },
    ],
    stream: true,
  });

  let fullText = "";

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      fullText += delta;
      onChunk(delta);
    }
  }

  return fullText;
}
