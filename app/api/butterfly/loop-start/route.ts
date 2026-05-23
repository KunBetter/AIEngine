import { NextRequest } from "next/server";
import { callAI, extractJSON } from "@/lib/ai-client";
import { BUTTERFLY_SYSTEM_PROMPT } from "@/lib/prompt-templates";
import type { ButterflyState, NPCState } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameState } = body as { gameState: ButterflyState };

    const causalSummary = gameState.causalGraph
      .map((n) => `- [循环${n.loopNumber}] ${n.action} → 影响: ${n.affectedNPCs.join(", ")} | ${n.consequenceDescription} (强度:${n.magnitude})`)
      .join("\n");

    const userMessage = `## 场景: 循环开始 — 世界生成

### 当前循环: 第 ${gameState.loopNumber} 次
### 因果图（之前所有循环积累的因果影响）:
${causalSummary || "（尚无因果积累，这是初始状态）"}

### 关键事件
${gameState.keyEvent.description}
达成条件: ${gameState.keyEvent.requiredConditions.join("; ")}

## 任务
遍历因果图，计算每个NPC在当前循环中的状态偏移。
生成每个NPC的今日情绪、位置、核心对话（需嵌入线索）、特殊行为和既视感。

## 输出格式（严格JSON，不要markdown包裹）
{
  "npcs": {
    "elias": {
      "mood": "情绪描述",
      "location": "位置",
      "dialogue": "核心对话内容（中文）",
      "specialBehavior": "特殊行为描述",
      "dejaVu": "既视感描述（如果因果图中有相关影响）"
    },
    "rose": { ... },
    "marcus": { ... },
    "brooks": { ... },
    "vera": { ... },
    "sam": { ... }
  },
  "atmosphere": "小镇整体氛围（1-2句）",
  "initialClues": ["玩家在循环开始时能注意到的异常现象"]
}`;

    const result = await callAI(BUTTERFLY_SYSTEM_PROMPT, userMessage, { temperature: 0.8 });
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "AI调用失败" },
      { status: 500 }
    );
  }
}
