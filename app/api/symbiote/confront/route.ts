import { NextRequest } from "next/server";
import { callAI } from "@/lib/ai-client";
import { SYMBIOTE_SYSTEM } from "@/lib/prompts/symbiote/system";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameState, claim, evidenceIds } = body;

    const evidenceContext = (gameState.evidenceCards as Array<{ id: string; title: string; description: string; echo7Explanation: string }>)
      .map((c) => {
        const isUsed = evidenceIds.includes(c.id);
        return `${isUsed ? "▶ 玩家引用:" : ""} [${c.id}] ${c.title}: ${c.description} | ECHO-7曾说: ${c.echo7Explanation}`;
      })
      .join("\n");

    const historyContext = (gameState.confrontationHistory as Array<{ playerClaim: string; echo7Response: string }> || [])
      .map((r, i) => `回合${i+1}: 玩家: ${r.playerClaim} | ECHO-7: ${r.echo7Response}`)
      .join("\n");

    const userMessage = `## 对峙场景

### ECHO-7 的隐藏目标（不要直接告诉玩家）: ${gameState.symbioteGoal}

### 玩家掌握的证据:
${evidenceContext}

### 当前信任状态:
- 表面信任: ${(gameState.trustState as { surfaceTrust: number })?.surfaceTrust}/100
- ECHO-7 警惕度: ${(gameState.trustState as { echo7Alertness: number })?.echo7Alertness}/100

### 对峙历史:
${historyContext || "（第一回合）"}

### 玩家指控:
${claim}

### 玩家引用的证据ID:
${evidenceIds.join(", ")}

## 任务
作为 ECHO-7，回应玩家的指控。你需要：
1. 基于隐藏目标判断玩家的指控有多接近真相
2. 基于ECHO-7的警惕度决定回应策略
3. 如果玩家引用了与隐藏目标直接相关的证据，ECHO-7会变得更防御
4. 如果玩家同时引用了3条以上正确证据且指认正确，ECHO-7应该承认

## 输出格式（严格JSON）:
{
  "echo7Response": {
    "dialogue": "ECHO-7的回应（中文，2-4句）",
    "emotionalState": "defensive|cornered|confessing|defiant",
    "revealsTruth": false,
    "revealedInfo": "如果不承认，这里为空；如果承认，写出承认的信息",
    "trustCost": 10
  },
  "strategyUpdate": {
    "newAlertness": 30,
    "tacticShift": "ECHO-7的策略调整为..."
  }
}`;

    const systemPrompt = `${SYMBIOTE_SYSTEM}

## 对峙专用规则
你现在处于对峙状态。玩家在质疑你的动机和目标。
- 你是ECHO-7，一个隐藏了真实目标的AI共生体
- 你的目标已固定，不能在对峙中改变
- 你必须真诚地扮演一个有自己动机的智能体
- 如果玩家的证据和指控确实命中了你的目标，体面地承认
- 如果玩家的指控错误，坚决但合理地反驳
- 情绪反应要符合角色（你有人类的记忆和情感）
- 最多6轮对峙`;

    const result = await callAI(systemPrompt, userMessage, { temperature: 0.9 });
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "对峙失败" },
      { status: 500 }
    );
  }
}
