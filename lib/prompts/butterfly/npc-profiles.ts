import type { NPCState } from "@/lib/types";

export function buildNPCProfile(npc: NPCState): string {
  return `## ${npc.name} (${npc.role})
性格: ${npc.basePersonality}
隐藏秘密: ${npc.secret}
内心渴望: ${npc.desire}
当前情绪: ${npc.currentMood}
当前位置: ${npc.location}
关键信息: ${npc.secretKnowledge}`;
}

export function buildAllNPCProfiles(npcs: Record<string, NPCState>): string {
  return Object.values(npcs).map(npc => buildNPCProfile(npc)).join("\n\n");
}
