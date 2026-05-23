import { NextRequest } from "next/server";
import { callAIStream, extractJSON } from "@/lib/ai-client";
import { XENOGENESIS_SYSTEM } from "@/lib/prompts/xenogenesis/system";
import { ECOLOGY_RULES } from "@/lib/prompts/xenogenesis/ecology-rules";
import { XENOGENESIS_EXAMPLE } from "@/lib/prompts/xenogenesis/examples";
import { createSSEResponse, sseEncoder } from "@/lib/stream-response";
import type { XenogenesisAIResponse, XenogenesisState } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameState } = body as { gameState: XenogenesisState };

    const userMessage = buildEpochMessage(gameState);

    const systemPrompt = [XENOGENESIS_SYSTEM, ECOLOGY_RULES, XENOGENESIS_EXAMPLE].join("\n\n---\n\n");

    const encoder = sseEncoder();
    let fullText = "";

    const readable = new ReadableStream({
      async start(controller) {
        try {
          await callAIStream(
            systemPrompt,
            userMessage,
            (chunk) => {
              fullText += chunk;
              controller.enqueue(encoder.encode({ type: "content", data: chunk }));
            },
            { temperature: 0.8 }
          );

          const jsonStr = extractJSON(fullText);
          try {
            const parsed = JSON.parse(jsonStr) as XenogenesisAIResponse;
            controller.enqueue(encoder.encode({ type: "state_update", data: parsed }));
          } catch {
            controller.enqueue(encoder.encode({ type: "error", message: "AI响应解析失败" }));
          }

          controller.enqueue(encoder.done());
          controller.close();
        } catch (err) {
          controller.enqueue(
            encoder.encode({ type: "error", message: err instanceof Error ? err.message : "AI调用失败" })
          );
          controller.close();
        }
      },
    });

    return createSSEResponse(readable);
  } catch (err) {
    return Response.json({ error: err instanceof Error ? err.message : "未知错误" }, { status: 500 });
  }
}

function buildEpochMessage(state: XenogenesisState): string {
  const speciesSummary = Object.values(state.species)
    .filter((s) => s.status !== "extinct")
    .map(
      (s) =>
        `- ${s.emoji} ${s.name} (${s.type}) 种群=${s.population} 状态=${s.status} 特征: 体型${s.traits.size} 代谢${s.traits.metabolism} 繁殖${s.traits.reproduction} 智力${s.traits.intelligence} 防御${s.traits.defense} 适应${s.traits.adaptability}${s.traits.specialAbility ? ` 特殊:${s.traits.specialAbility}` : ""}`
    )
    .join("\n");

  const extinctSummary = Object.values(state.species)
    .filter((s) => s.status === "extinct")
    .map((s) => `- ${s.name} (灭绝于第${state.epoch}纪元)`)
    .join("\n");

  const historySummary = state.timeline
    .slice(-3)
    .map((e) => `纪元${e.epochNumber}: ${e.narrative.slice(0, 100)}...`)
    .join("\n");

  return `## 当前星球状态
星球: ${state.planetName}
当前纪元: ${state.epoch}
环境: 温度${state.environment.temperature}°C 氧气${state.environment.oxygenLevel}% 水域${state.environment.waterCoverage}%

## 现存物种
${speciesSummary || "（无存活物种）"}

## 已灭绝物种
${extinctSummary || "（无）"}

## 近期历史
${historySummary || "（初始纪元）"}

请作为生态系统引擎，模拟第${state.epoch + 1}纪元的变化。严格按JSON格式输出。`;
}
