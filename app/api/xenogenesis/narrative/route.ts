import { NextRequest } from "next/server";
import { callAI } from "@/lib/ai-client";
import { XENOGENESIS_SYSTEM } from "@/lib/prompts/xenogenesis/system";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { gameState } = body;

    const aliveSpecies = Object.values(gameState.species || {})
      .filter((s: any) => s.status !== "extinct")
      .map((s: any) => `${s.emoji} ${s.name} (种群:${s.population}, 状态:${s.status})`)
      .join("; ");

    const extinctThisEpoch = Object.values(gameState.species || {})
      .filter((s: any) => s.status === "extinct")
      .map((s: any) => s.name)
      .join(", ");

    const disasterInfo = (gameState.disasters || [])
      .filter((d: any) => d.epoch === gameState.epoch)
      .map((d: any) => `${d.name}: ${d.description}`)
      .join("; ");

    const civInfo = (gameState.civilizations || [])
      .filter((c: any) => c.epochAwakened === gameState.epoch)
      .map((c: any) => `${c.speciesName} 文明觉醒 — ${c.stage}`)
      .join("; ");

    const userMessage = `## 纪元叙事生成

星球: ${gameState.planetName} | 纪元: ${gameState.epoch}
环境: 温度${gameState.environment?.temperature}°C, 氧气${gameState.environment?.oxygenLevel}%, 水域${gameState.environment?.waterCoverage}%

现存物种: ${aliveSpecies || "无"}
${extinctThisEpoch ? `本纪元灭绝: ${extinctThisEpoch}` : ""}
${disasterInfo ? `灾难事件: ${disasterInfo}` : ""}
${civInfo ? `文明事件: ${civInfo}` : ""}

请生成一段生动的纪元叙事总结（中文，3-5句话），描述这个纪元生态系统的整体变化。
要有文学性，但也要反映数据背后的生态学意义。

## 输出格式（严格JSON）:
{
  "narrative": "叙事文本",
  "headline": "纪元标题（简短，5-8字）",
  "ecosystemHealth": "thriving|stable|declining|critical"
}`;

    const systemPrompt = `${XENOGENESIS_SYSTEM}

你现在是叙事模式。你只需要根据数据生成生动的叙事总结。不需要计算任何数值，不需要模拟任何物种行为。数据和演算已由前端完成。`;

    const result = await callAI(systemPrompt, userMessage, { temperature: 0.85, maxTokens: 1024 });
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { narrative: "这个纪元静静地过去了。生态系统在沉默中演化。", headline: "寂静纪元" },
      { status: 200 }
    );
  }
}
