export const XENOGENESIS_EXAMPLE = `## Few-shot 示例

输入: 星球温度22°C | 3个物种 | 纪元5

输出:
{
  "epoch": 6,
  "speciesUpdates": [
    {"id":"species_1","populationDelta":30,"newPopulation":180,"status":"thriving","reasoning":"草食兽A以光藻为食，光藻繁盛提供了充足食物"},
    {"id":"species_2","populationDelta":-20,"newPopulation":80,"status":"declining","reasoning":"肉食兽B猎物不足，种群开始萎缩"},
    {"id":"species_3","populationDelta":10,"newPopulation":310,"status":"stable","reasoning":"光藻持续进行光合作用，维持稳定增长"}
  ],
  "newMutations": [],
  "interactions": [
    {"type":"predation","speciesA":"species_2","speciesB":"species_1","intensity":0.6,"description":"肉食兽B持续捕食草食兽A，但成功率下降"}
  ],
  "environmentChange": {"temperature":1,"cause":"自然气候波动"},
  "narrative": "第六纪元，草食兽A凭借光藻的丰沛供给迎来了种群爆发。肉食兽B的狩猎成功率开始下降——猎物变得更快了。食物链的天平正在倾斜。",
  "extinctions": [],
  "notableEvents": ["草食兽A种群快速增长", "肉食兽B面临食物短缺"]
}`;
