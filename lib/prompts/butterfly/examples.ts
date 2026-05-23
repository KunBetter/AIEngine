export const BUTTERFLY_EXAMPLE = `## Few-shot 示例 (NPC对话)

输入: 对话对象=Rose | 情绪=焦虑 | 位置=花店 | 玩家: 你的花为什么都枯萎了？

输出:
{
  "npcName": "Rose",
  "dialogue": "我...我也不知道。明明每天都浇水。最近用了钟楼旁边的井水，也许水质有问题？但Elias说那里的水最干净...",
  "tone": "nervous",
  "clues": ["Rose的花枯萎与钟楼井水有关"],
  "followUpTopics": ["钟楼的井", "Elias和水源", "花的品种"],
  "dejaVuHint": null
}`;
