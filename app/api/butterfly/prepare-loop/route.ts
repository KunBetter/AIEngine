// app/api/butterfly/prepare-loop/route.ts
import { NextRequest } from "next/server";
import { callAI } from "@/lib/ai-client";
import { BUTTERFLY_SYSTEM } from "@/lib/prompts/butterfly/system";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { loopNumber, previousCausalGraph, npcStates, activeMystery } = body as {
      loopNumber: number;
      previousCausalGraph: Array<{ loopNumber: number; action: string; affectedNPCs: string[]; consequenceDescription: string }>;
      npcStates: Record<string, { name: string; memoryAwakening?: number; awakeningStage?: string; location: string; currentMood: string }>;
      activeMystery: string;
    };

    const causalSummary = (previousCausalGraph || [])
      .slice(-10)
      .map(n => `- [循环${n.loopNumber}] ${n.action} → ${n.affectedNPCs?.join(",")}: ${n.consequenceDescription}`)
      .join("\n");

    const npcSummary = Object.entries(npcStates || {})
      .map(([id, n]) =>
        `- ${n.name}: 觉醒度${(n as any).memoryAwakening || 0} (${(n as any).awakeningStage || "dormant"}), 位置${n.location}, 情绪${n.currentMood}`
      ).join("\n");

    const systemPrompt = `${BUTTERFLY_SYSTEM}

## 额外任务：预生成循环数据
你需要为即将开始的循环预生成可发现线索和NPC行程。

输出格式（严格JSON，无markdown包裹）：
{
  "npcSchedules": {
    "elias": [{ "timeStart": 7, "timeEnd": 12, "location": "钟楼" }],
    "rose": [{ "timeStart": 7, "timeEnd": 18, "location": "花店" }],
    "marcus": [{ "timeStart": 8, "timeEnd": 18, "location": "诊所" }],
    "brooks": [{ "timeStart": 8, "timeEnd": 18, "location": "警局" }],
    "vera": [{ "timeStart": 9, "timeEnd": 18, "location": "图书馆" }],
    "sam": [{ "timeStart": 7, "timeEnd": 24, "location": "广场" }]
  },
  "discoverableClues": [
    {
      "id": "clue_01",
      "location": "钟楼",
      "timeWindow": { "start": 9, "end": 12 },
      "description": "地基裂缝中的旧怀表（中文，具体描述发现的物品或现象）",
      "requiredAction": "观察地基",
      "revealsFragment": "frag_clue_01"
    }
  ],
  "loopGoal": "本轮的推荐目标（中文，1句话）"
}`;

    const userMessage = `## 循环预生成 — 第${loopNumber}次循环

### 当前谜题: ${activeMystery}

### 因果图（最近10条）:
${causalSummary || "（尚无因果积累）"}

### NPC状态:
${npcSummary}

请生成本轮的可发现线索（至少4个，分布在不同地点和时间段）、NPC行程计划、以及建议的玩家目标。`;

    const result = await callAI(systemPrompt, userMessage, { temperature: 0.7 });
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "AI调用失败" },
      { status: 500 }
    );
  }
}
