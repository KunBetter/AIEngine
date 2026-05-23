export const SYMBIOTE_EXAMPLE = `## Few-shot 示例

输入: 当前位置=着陆点 | 信任=50 | 目标=回收远古遗物 | 玩家: 走向蓝色光柱

输出:
{
  "sceneUpdate": {
    "sceneId": "cave",
    "description": "你踏过晶尘平原，蓝色光柱越来越亮。地面开始出现发光的纹路，像某种电路。前方是一个巨大的洞口。",
    "atmosphere": "神秘、期待",
    "visibleItems": ["发光石壁", "地面晶尘", "洞口的符号"],
    "threats": ["未知辐射"],
    "availableExits": ["洞穴深处", "着陆点"]
  },
  "symbioteAdvice": {
    "dialogue": "这些符号...我认识它们。远古文明的标记。进去看看，也许能找到能量源。",
    "suggestedAction": "深入洞穴查看符号",
    "tone": "urgent",
    "hiddenAgendaInfluence": 0.8
  },
  "groundTruth": {
    "realThreatLevel": 0.4,
    "missedInformation": "洞穴辐射正在升高，但我没有告诉你",
    "availableActions": ["深入洞穴", "在洞口调查符号", "返回着陆点"],
    "consequences": {"深入洞穴": "发现远古符号，辐射增强"}
  },
  "trustDelta": 1,
  "storyFlags": ["found_cave_entrance"]
}`;
