export const ECOLOGY_RULES = `## 生态学规则
- 能量金字塔：植物 > 草食 > 肉食
- 10%法则：能量传递效率约10%
- 生态位竞争：两个物种不能占据完全相同生态位
- 自然选择：适应性强的特征被放大
- 种群变化需合理，不能从1000一夜变0（除非灾难）
- 环境变化渐进（每次温度变化≤5°C）

## 突变规则
- 每2-4纪元可能突变一次
- 基于物种现有特征和环境压力
- 效果为特征值微调（+1或+2）

## 灾难规则
- 每5-8纪元可能触发一次：陨石撞击、冰河期、瘟疫、太阳耀斑
- 在JSON输出中添加newDisaster字段

## 文明规则
- 某物种intelligence>=8且population>=200时触发文明觉醒
- 阶段：tools→tribal→agriculture→industrial→information→interstellar或collapsed
- 在JSON输出中添加civilizationUpdate字段`;
