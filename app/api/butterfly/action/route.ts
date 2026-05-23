import { NextRequest } from "next/server";
import { callAI, callAIStream, extractJSON } from "@/lib/ai-client";
import { BUTTERFLY_SYSTEM } from "@/lib/prompts/butterfly/system";
import { buildNPCProfile } from "@/lib/prompts/butterfly/npc-profiles";
import { BUTTERFLY_EXAMPLE } from "@/lib/prompts/butterfly/examples";
import { createSSEResponse, sseEncoder } from "@/lib/stream-response";
import type { ButterflyState, NPCState } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameState, actionType, targetNPC, playerInput } = body as {
      gameState: ButterflyState;
      actionType: "talk" | "investigate" | "intervene";
      targetNPC?: string;
      playerInput: string;
    };

    const encoder = sseEncoder();
    let fullText = "";

    const npcCtx = targetNPC && gameState.npcs[targetNPC] ? buildNPCProfile(gameState.npcs[targetNPC]) : "";
    const systemPrompt = [BUTTERFLY_SYSTEM, npcCtx, BUTTERFLY_EXAMPLE].filter(Boolean).join("\n\n---\n\n");

    let userMessage = "";

    if (actionType === "talk" && targetNPC) {
      const npc = gameState.npcs[targetNPC];
      userMessage = buildDialogueMessage(gameState, targetNPC, npc, playerInput);
    } else if (actionType === "investigate") {
      userMessage = buildInvestigateMessage(gameState, playerInput);
    } else if (actionType === "intervene") {
      userMessage = buildInterveneMessage(gameState, playerInput);
    } else {
      userMessage = buildGeneralMessage(gameState, playerInput);
    }

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
            const parsed = JSON.parse(jsonStr);
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

function npcStateString(npc: NPCState): string {
  return `情绪: ${npc.currentMood} | 位置: ${npc.location} | 今日对话: ${npc.dialogueToday || "未知"}`;
}

function causalSummary(state: ButterflyState): string {
  return state.causalGraph
    .slice(-6)
    .map((n) => `[循环${n.loopNumber}] ${n.action} → ${n.affectedNPCs.join(",")}: ${n.consequenceDescription}`)
    .join("\n");
}

function buildDialogueMessage(
  state: ButterflyState,
  npcId: string,
  npc: NPCState,
  playerInput: string
): string {
  return `## 场景: NPC对话

### 当前循环: 第${state.loopNumber}次 | 时间: ${state.timeOfDay}:00 | 地点: ${state.currentLocation}

### 对话对象: ${npcId}
角色: ${npc.role}
性格: ${npc.basePersonality}
当前状态: ${npcStateString(npc)}

### 因果背景:
${causalSummary(state)}

### 玩家说:
${playerInput}

请以${npcId}的身份回应。如果是Old Sam(流浪汉)，说话应该包含看似胡言乱语但实际与因果图相关的线索。
如果NPC有既视感，在回应中不经意地透露。

### 输出格式（严格JSON）:
{
  "npcName": "${npcId}",
  "dialogue": "NPC说的话（中文，2-4句）",
  "tone": "warm|sad|nervous|secretive|frightened|calm|mysterious",
  "clues": ["对话中隐含的线索"],
  "followUpTopics": ["玩家可以追问的话题"],
  "dejaVuHint": "NPC不经意流露的既视感（如果有）",
  "newCausalNode": null
}`;
}

function buildInvestigateMessage(state: ButterflyState, playerInput: string): string {
  return `## 场景: 玩家调查

### 当前循环: 第${state.loopNumber}次 | 时间: ${state.timeOfDay}:00 | 地点: ${state.currentLocation}

### 玩家行动: ${playerInput}

### 已有因果图:
${causalSummary(state)}

请描述玩家调查的结果。根据因果图，这个地点/物品在当前循环中是否有异常？

### 输出格式（严格JSON）:
{
  "result": "调查结果的详细描述（中文，2-4句）",
  "discovery": "玩家发现的线索或异常（中文）",
  "relatedNPCs": ["与此发现相关的NPC"],
  "hasCausalImpact": true,
  "causalNode": {
    "action": "${playerInput}",
    "affectedNPCs": ["相关的NPC"],
    "consequenceDescription": "因果影响描述",
    "magnitude": 3
  }
}`;
}

function buildInterveneMessage(state: ButterflyState, playerInput: string): string {
  return `## 场景: 玩家干预行动

### 当前循环: 第${state.loopNumber}次 | 时间: ${state.timeOfDay}:00 | 地点: ${state.currentLocation}

### 玩家尝试干预: ${playerInput}

### 已有因果图:
${causalSummary(state)}

### 关键事件: ${state.keyEvent.description}

请评估这个干预行动的因果影响。

### 输出格式（严格JSON）:
{
  "result": "干预行动的即时结果（中文）",
  "hasCausalImpact": true,
  "causalNode": {
    "action": "${playerInput}",
    "affectedNPCs": ["受影响的NPC"],
    "consequenceDescription": "因果影响的详细描述",
    "magnitude": 5
  },
  "keyEventProgress": "这个干预对阻止关键事件有帮助吗？",
  "newClue": "通过干预发现的新信息"
}`;
}

function buildGeneralMessage(state: ButterflyState, playerInput: string): string {
  return `## 场景: 玩家行动

### 当前循环: 第${state.loopNumber}次 | 时间: ${state.timeOfDay}:00 | 地点: ${state.currentLocation}

### 行动: ${playerInput}

### 因果背景:
${causalSummary(state)}

### 输出格式（严格JSON）:
{
  "result": "行动结果（中文）",
  "hasCausalImpact": false,
  "causalNode": null
}`;
}
