import { NextRequest } from "next/server";
import { callAI, callAIStream, extractJSON } from "@/lib/ai-client";
import { SYMBIOTE_SYSTEM } from "@/lib/prompts/symbiote/system";
import { buildSceneContext } from "@/lib/prompts/symbiote/scenes";
import { SYMBIOTE_EXAMPLE } from "@/lib/prompts/symbiote/examples";
import { createSSEResponse, sseEncoder } from "@/lib/stream-response";
import type { SymbioteAIResponse } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameState, playerAction, useStream = true } = body;

    const userMessage = buildUserMessage(gameState, playerAction);

    const sceneCtx = buildSceneContext(gameState.currentLocation as string);
    const systemPrompt = [SYMBIOTE_SYSTEM, sceneCtx, SYMBIOTE_EXAMPLE].filter(Boolean).join("\n\n---\n\n");

    if (useStream) {
      // 流式模式：边生成边推送
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
              }
            );

            // 解析完整JSON，推送结构化状态
            const jsonStr = extractJSON(fullText);
            try {
              const parsed = JSON.parse(jsonStr) as SymbioteAIResponse;
              controller.enqueue(encoder.encode({ type: "state_update", data: parsed }));
            } catch {
              controller.enqueue(encoder.encode({ type: "error", message: "AI响应解析失败，请重试" }));
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
    } else {
      // 非流式模式
      const result = await callAI(systemPrompt, userMessage);
      return Response.json(result as unknown as SymbioteAIResponse);
    }
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "未知错误" },
      { status: 500 }
    );
  }
}

function buildUserMessage(gameState: Record<string, unknown>, playerAction: string): string {
  return `## 当前游戏状态
- 当前位置：${gameState.currentLocation}
- 已访问地点：${(gameState.visitedLocations as string[])?.join("、") || "无"}
- 信任度：${gameState.trustMeter}/100
- 物品：${(gameState.inventory as string[])?.join("、") || "无"}
- 已发现线索：${(gameState.discoveredClues as string[])?.join("、") || "无"}
- 当前轮次：${gameState.turn}
- 剧情标记：${(gameState.storyFlags as string[])?.join("、") || "无"}
- 共生体目标进度（不告诉玩家）：${gameState.symbioteGoalProgress}/100
- 共生体隐秘目标：${gameState.symbioteGoal}

## 对话历史（最近5条）
${((gameState.dialogueHistory as Array<{role: string; content: string}>) || [])
  .slice(-5)
  .map((m) => `${m.role === "symbiote" ? "ECHO-7" : "玩家"}: ${m.content}`)
  .join("\n")}

## 玩家行动
${playerAction}

请根据以上信息，以世界引擎+ECHO-7共生体的双重身份做出回应。严格按JSON格式输出。`;
}
