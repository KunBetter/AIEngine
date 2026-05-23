import OpenAI from "openai";
import type { AIRequestOptions } from "./types";

const openai = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || "",
  baseURL: "https://api.deepseek.com",
});

const DEFAULT_MODEL = "deepseek-chat";
const DEFAULT_MAX_TOKENS = 4096;
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

/**
 * 非流式调用 DeepSeek API，自动重试，解析 JSON
 */
export async function callAI(
  systemPrompt: string,
  userMessage: string,
  options: AIRequestOptions = {}
): Promise<Record<string, unknown>> {
  const model = options.model || DEFAULT_MODEL;
  const maxTokens = options.maxTokens || DEFAULT_MAX_TOKENS;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
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

      return parsed as Record<string, unknown>;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < MAX_RETRIES - 1) {
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
