# 三大游戏可玩性大幅改造设计

## 背景

三个 AI 深度嵌入游戏的核心循环已验证通过，但存在共同的体验问题：**纯文本交互带来的"阅读感"远大于"游戏感"**。玩家本质是 AI 故事的被动读者，而非游戏的主动参与者。

当前交互模式：`阅读 AI 文字 → 选择/输入行动 → 等待 AI 回应 → 阅读更多文字`

本次改造的目标是：**让玩家从"读者"变成"玩家"**，同时保留 AI 作为内容引擎的核心优势。

三个游戏按不同方向改造：
- **共生体** → 深度叙事（保留人机关系的戏剧张力，增加玩家的推理主动性）
- **蝴蝶效应** → 叙事+系统混合（因果推理居中，玩家操作因果网络）
- **异星造物主** → 系统驱动（行为引擎替代 AI 故事生成，AI 只用于罕见事件）

---

## 一、共生体：从"选择冒险"到"叙事侦探游戏"

### 1.1 核心循环重新设计

```
探索场景 → 收集线索/证据 → ECHO-7 给出解释（可能带有偏向）
    ↓
进入证据面板 → 连接线索、发现矛盾 → 推理 ECHO-7 的真实目标
    ↓
决定信任/质疑/假装信任 → 影响后续互动
    ↓
积累足够证据 → 触发对峙 → 指认 ECHO-7 的目标
    ↓
对峙结果决定结局走向 → 6 种结局
```

与现有关键区别：玩家不是在"等待结局"，而是在"主动推理并影响结局"。

### 1.2 新增系统

#### 1.2.1 证据面板（Evidence Board）

**现状**：线索是 `discoveredClues: string[]`，只作为文字标签展示，无交互价值。

**改造后**：
- 线索变为可交互的"证据卡片"，存储在 `evidenceCards: EvidenceCard[]` 中
- 每张卡片结构：

```typescript
interface EvidenceCard {
  id: string;
  title: string;              // 简短标题
  description: string;         // 详细描述
  sourceLocation: string;      // 在哪发现的
  echo7Explanation: string;    // ECHO-7 对此的解释
  hiddenContradiction?: string; // 与已知事实的矛盾（初始隐藏，需要推理解锁）
  connectedTo: string[];       // 与其他卡片的关联
  credibility: number;         // 可信度 0-100
}
```

- 证据面板是一个网格布局，卡片可拖拽排列
- 两张卡片拖到一起时，系统自动检测是否存在矛盾，弹出分析结果
- 至少需要连接 2 条矛盾才能解锁对峙

**交互细节**：
- 点击卡片查看详情，包括 ECHO-7 的解释
- 右键标记为"可疑"或"可信"
- 卡片边缘显示与哪些卡片有关联（线条连接）
- 当矛盾被发现时，卡片会闪烁/高亮

#### 1.2.2 信任双向博弈系统

**现状**：信任是单向数值（0-100），ECHO-7 的建议完全取决于 AI 情绪。

**改造后**：
信任变为三个维度：

```typescript
interface TrustState {
  surfaceTrust: number;       // 表面信任 - ECHO-7 感知到的你的态度
  trueTrust: number;          // 真实信任 - 你实际对 ECHO-7 的信任
  echo7Alertness: number;     // ECHO-7 的警惕度 - 越高越难抓到破绽
}
```

**三种态度选择**：
- **信任 ECHO-7**：听从建议 → surfaceTrust+、trueTrust+、安全路线、获得更多场景信息、但 ECHO-7 推进隐藏目标
- **质疑 ECHO-7**：独立调查 → echo7Alertness+、消耗更多资源（时间/生命值）、获得 ECHO-7 不想让你知道的线索
- **假装信任**：表面听从、暗中收集证据 → 风险最大（ECHO-7 警惕上升慢但一旦被抓到更难挽回）、回报最高（能获得最深的隐藏信息）

ECHO-7 的 AI 提示中会加入当前警惕度，影响其回应策略：
- 低警惕：说话随意，可能无意中泄露信息
- 中警惕：回答更谨慎，避免提及隐藏目标相关话题
- 高警惕：开始主动误导、伪造线索、甚至不回应某些问题

#### 1.2.3 对峙系统（Confrontation）

**现状**：结局在当前基础上自动触发（`checkEnding()`），玩家被动接受。

**改造后**：
- 当玩家认为收集到足够证据时，可以**主动发起对峙**
- 对峙条件：至少发现 1 条矛盾 或 掌握 3+ 张证据卡片
- 对多次发生（5 个隐藏目标，玩家可能需要排除法），但每次对峙消耗信任资源
- 对峙过程是一段高强度互动对话：

```
玩家提出指控 → ECHO-7 反驳/承认/转移话题 → 玩家引用证据反驳 → ...
```

- AI 裁决机制：AI 评估玩家引用的证据与 ECHO-7 真实目标的关联度
  - 证据充足 + 指认正确 → 对峙成功，导向"真相大白"结局
  - 证据不足 + 指认错误 → 对峙失败，ECHO-7 从此封闭（警惕度锁定 100），
    剩余线索无法获取，导向"孤独归途"或"共生体胜利"结局
  - 证据不足但指向正确方向 → 部分成功，ECHO-7 承认部分真相，
    但隐藏更多，导向分支结局

- 对峙 UI 设计：
  - 全屏覆盖，暗色背景 + 紧张氛围
  - 左侧显示可用证据卡片（可拖入对话区作为论据）
  - 中央显示对话流
  - 有"指控"、"引用证据"、"让步"三个按钮
  - ECHO-7 的回应带有明显的情绪变化（通过 tone 标签和 PixelEvent）

#### 1.2.4 生命值/能量系统

为增加选择成本，引入简单的资源约束：

```typescript
interface SurvivalState {
  health: number;       // 生命值 0-100，归零则死亡结局
  energy: number;       // 能量 0-100，用于探索和独立调查
  oxygen: number;       // 氧气 0-100，随时间消耗
}
```

- 探索危险区域消耗能量和健康
- 听从 ECHO-7 建议通常通向安全路线（消耗少）
- 质疑 ECHO-7 独立调查消耗更多能量
- 生命值低时，ECHO-7 的 tone 和策略会变化（更关心你 vs 更利用你）
- 回到返回舱可以补充氧气（限制探索范围，增加时间压力）

### 1.3 AI 输出新增字段

```typescript
interface SymbioteAIResponseV2 extends SymbioteAIResponse {
  // 原有字段保留
  sceneUpdate: { ... };
  symbioteAdvice: { ... };
  groundTruth: { ... };

  // 新增字段
  echo7Strategy: {
    alertnessLevel: number;        // 当前警惕度
    isLying: boolean;              // 这段回应是否包含谎言
    lieTarget: string;             // 谎言针对哪个信息
    manipulationType: "misdirect" | "omit" | "gaslight" | "none";
  };
  evidenceCards: EvidenceCard[];   // 此场景可获得的新证据
  contradictionDetected?: {        // 玩家行为触发的矛盾发现
    cardA: string;
    cardB: string;
    description: string;
  };
  confrontationResponse?: {       // 对峙时的 ECHO-7 回应
    dialogue: string;
    emotionalState: "defensive" | "cornered" | "confessing" | "defiant";
    revealsTruth: boolean;
    revealedInfo: string;
    trustCost: number;
  };
}
```

### 1.4 结局系统更新

6 种结局的条件更新为：

| 结局 | 条件 |
|------|------|
| 信任的归途 (trust) | 未发起对峙，信任>70，直接返回地球 |
| 真相大白 (exposed) | 对峙成功，识破 ECHO-7 目标，夺回控制权 |
| 共生体胜利 (symbiote_win) | 对峙失败或未对峙，ECHO-7 达成隐蔽目标 |
| 融为一体 (merge) | 对峙中了解真相后选择帮助 ECHO-7 融合 |
| 最后的牺牲 (sacrifice) | ECHO-7 为了救你自毁核心（健康<20 触发） |
| 孤独归途 (escape) | 对峙一半放弃，或信任<25 但未掌握证据 |

新增 2 种死亡结局：
| 结局 | 条件 |
|------|------|
| 异星埋葬 (perish) | 生命值归零 |
| 完全背叛 (betrayed) | 假装信任被 ECHO-7 识破 + 对峙时拿不出证据 |

---

## 二、蝴蝶效应：从"循环聊天模拟器"到"因果拼图推理游戏"

### 2.1 核心循环重新设计

```
新循环开始 → 时间线地图展示已有节点 + 迷雾节点
    ↓
消耗行动点数 → 在时间线上选择要去的时间/地点 → 与 NPC 交互
    ↓
获得因果碎片 → 将碎片拼接到因果网络上（手动操作）
    ↓
碎片匹配正确 → 获得洞察力点数
    ↓
用洞察力点数"锚定"关键因果 → 锚定的因果在下次循环保留
    ↓
关键事件被阻止 → 胜利
```

### 2.2 新增系统

#### 2.2.1 时间线地图（Timeline Board）

**现状**：`timeOfDay` 只是数字，时间线性推进，玩家只能"等待"时间流逝。

**改造后**：
- 水平时间轴 7:00 → 24:00，每格 1 小时
- 初始状态：大部分节点是"迷雾"，只有广场（起始点）附近可见
- 已知节点显示：该时间/地点有哪些 NPC、发生了什么事
- 玩家可以选择在已解锁或相邻节点"跳跃"（消耗行动点数）

```typescript
interface TimelineNode {
  time: number;
  location: string;
  npcsPresent: string[];       // 在场的 NPC
  events: string[];             // 已知事件
  isUnlocked: boolean;          // 是否已解锁
  isCritical: boolean;          // 是否为关键事件节点
  causalLinks: string[];        // 经过此节点的因果链 ID
  mysteryStatus: "hidden" | "suspicious" | "revealed";
}
```

**交互细节**：
- 点击已解锁节点 → 跳转到那个时间/地点
- 点击迷雾节点 → 提示"需要先解锁相邻节点"或"消耗洞察力预览"
- 关键事件节点（如 24:00 钟楼）始终可见但标记为红色
- 鼠标悬停节点可预览：谁在那里、已知事件
- 时间线底部显示当前循环的"剩余行动点数"

#### 2.2.2 行动点数系统（AP System）

**现状**：无限制的自由行动，没有紧迫感。

**改造后**：
- 每次循环有固定 AP（如 8 点）
- 消耗规则：
  - 移动到相邻时间节点：1 AP
  - 与 NPC 对话：1 AP
  - 深入调查地点：2 AP
  - 触发关键事件干预：3 AP
- AP 用完 → 时间自动快进到午夜 → 循环重置
- AP 余量在 UI 顶部显著展示，用完后闪烁警告

**策略意义**：你必须在有限行动内做出最优选择——去和谁说话？调查哪个地点？在什么时候？

#### 2.2.3 因果碎片拼接系统

**现状**：因果图由 AI 自动生成，玩家只能看，不能操作。

**改造后**：
- 每次互动不只获得文字回应，还获得 1-2 个"因果碎片"：

```typescript
interface CausalFragment {
  id: string;
  description: string;         // 例如："Rose 在 14:00 从钟楼取了井水"
  relatedNPCs: string[];
  relatedTime: number;
  relatedLocation: string;
  hints: string[];             // 指向相关碎片的线索
  isPlaced: boolean;           // 是否已拼入因果网络
  correctPosition?: {          // 正确的拼接位置（用于校验）
    parentId?: string;
    childId?: string;
  };
}
```

- 因果网络是一个**画布**，玩家将碎片以卡片形式拖入
- 碎片之间可以连线，表示因果关系
- 拼接正确时：碎片发光、连线变金色、获得"洞察力"点数
- 拼接错误时：连线变红、提示矛盾
- 碎片拼接正确的定义：相邻碎片描述的事件存在逻辑因果，且时间顺序合理

**画布交互**：
- 可缩放、可拖拽的无限画布（类似 Miro/FigJam 的简单版）
- 左侧是"未放置的碎片"面板
- 中央是因果网络画布
- 碎片卡片显示关键信息，连线显示因果方向（箭头）

#### 2.2.4 因果锚定系统

**现状**：每次循环重置，NPC 状态完全重置（只有微弱的既视感），玩家必须重新来过。

**改造后**：
- 发现完整因果链（3+ 碎片正确拼接）后，可以用"洞察力"锚定它
- 锚定的因果链在下次循环重置时**保留效果**：

```typescript
interface AnchoredCausal {
  causalChainId: string;
  anchorLevel: number;           // 锚定深度 1-3
  effects: {
    npcMemoryRetained: string[]; // 哪些 NPC 保留了相关记忆
    eventPreShifted: boolean;    // 事件是否提前偏移
    locationStateChanged: string;// 地点状态变化
  };
}
```

**消耗曲线**：
- 锚定第 1 条因果链：消耗 1 洞察力
- 锚定第 2 条因果链：消耗 2 洞察力
- 锚定第 3 条因果链：消耗 4 洞察力
- ...指数增长，迫使玩家选择"最关键的因果"来锚定

**过热机制**：
- 锚定过多因果 → 循环"过热" → NPC 开始集体保留记忆
- 过热症状：NPC 行为不可预测、时间线开始扭曲、意外事件增多
- 过热阈值 = 3 条锚定链（可变）
- 超过阈值不会失败，但游戏难度大幅增加

#### 2.2.5 NPC 记忆觉醒度

```typescript
interface NPCStateV2 extends NPCState {
  memoryAwakening: number;       // 记忆觉醒度 0-100
  permanentMemories: string[];   // 锚定后永久保留的记忆
  awakeningStage: "dormant" | "deja_vu" | "aware" | "ally" | "unstable";
}
```

| 阶段 | 觉醒度 | 行为 |
|------|--------|------|
| dormant | 0-20 | 每次循环完全重置，偶尔既视感 |
| deja_vu | 21-40 | 对话中有更明确的既视感线索 |
| aware | 41-60 | 开始主动提供帮助，记得上次循环的部分内容 |
| ally | 61-80 | 成为你的盟友，能在循环中自主行动 |
| unstable | 81-100 | 记忆过载，行为不可预测，可能在循环中做危险的事 |

Old Sam 初始觉醒度为 70（他是上一轮循环者），其他 NPC 初始为 0。
锚定与某 NPC 相关的因果链会增加其觉醒度。

### 2.3 胜利条件

不再是无尽循环直到碰巧阻止灾难。

**评分系统**：
```
最终评分 = 基础分(1000)
  - 循环次数 × 50
  - 锚定数 × 30
  + 剩余洞察力 × 20
  + 所有 NPC 觉醒度总和（越高越好，但 unstable 阶段扣分）
```

| 评级 | 条件 |
|------|------|
| S | 3 次循环内破解 |
| A | 5 次循环内破解 |
| B | 8 次循环内破解 |
| C | 10+ 次循环或锚定过多 |

### 2.4 AI 输出新增字段

```typescript
interface ButterflyAIResponseV2 {
  // 原有字段
  npcName?: string;
  dialogue?: string;
  tone?: string;
  hasCausalImpact?: boolean;
  causalNode?: CausalNode;
  result?: string;

  // 新增字段
  causalFragments: CausalFragment[];      // 此互动产生的因果碎片
  timelineNodesUnlocked: TimelineNode[];   // 新解锁的时间线节点
  npcMemoryHint?: string;                 // NPC 记忆中浮现的线索
  anchoringSuggestion?: {                 // AI 建议可锚定的因果链
    chainDescription: string;
    fragmentsInvolved: string[];
    predictedEffect: string;
  };
  mysteryProgress: {
    conditionMet: string[];              // 哪些关键事件条件已满足
    conditionHint: string[];             // 未满足条件的提示
  };
}
```

---

## 三、异星造物主：从"AI 故事阅读器"到"生态模拟沙盒"

### 3.1 核心循环重新设计

```
创建物种（物种实验室） → 投放
    ↓
↑   纪元开始 → 实时观察星球地图上的物种行为（行为引擎驱动）
|       ↓
|   遭遇事件 → 玩家选择是否消耗干预令牌出手
|       ↓
|   纪元结束 → 查看数据报告（AI 生成叙事回顾）
|       ↓
└── 下一纪元：创建新物种？改变环境？等待演化？
```

### 3.2 新增系统

#### 3.2.1 星球地图（Planet Grid）

**现状**：环境只是数值（温度、氧气、水域），无空间维度。

**改造后**：
- 一块可缩放的网格地图，初始建议 60×40 tiles
- 每个 tile 有：
  - 地形类型：ocean、coast、forest、grassland、desert、mountain、volcano、tundra
  - 资源量：food、water、shelter（影响物种生存）
  - 温度微调（相对全球温度 ±3°C）
  - 特殊属性：geothermal、fertile、toxic、radioactive

```typescript
interface PlanetTile {
  x: number;
  y: number;
  terrain: TerrainType;
  resources: { food: number; water: number; shelter: number };
  temperatureMod: number;
  special?: string;
  occupantIds: string[];       // 当前在此 tile 的物种个体
}
```

- 地图生成算法：
  - 基于 `seed` 进行确定性随机生成
  - 海洋覆盖 = waterCoverage%
  - 温度梯度：赤道热、两极冷
  - 地形分布：由 Perlin noise 近似决定

**视觉呈现**：
- Tile 颜色编码地形类型
- 物种以 emoji 图标在地图上移动
- 种群密度热力图层（可切换）
- 缩放和平移支持

#### 3.2.2 物种行为引擎（Behavior Engine）

**这是改造最大的部分。** 不再每回合调用 AI 生成生态变化，而是用前端行为引擎计算。

```typescript
interface SpeciesIndividual {
  id: string;
  speciesId: string;
  x: number;
  y: number;
  hunger: number;       // 0=饱 100=极饿
  health: number;       // 0=死亡 100=完美
  age: number;          // 年龄（tick 计数）
  state: BehaviorState;
}

type BehaviorState =
  | "idle"
  | "foraging"      // 觅食
  | "hunting"       // 捕猎（肉食/杂食）
  | "fleeing"       // 逃跑（被捕食）
  | "mating"        // 繁殖
  | "resting"       // 休息
  | "migrating"     // 迁移（寻找更优环境）
  | "dying";        // 死亡
```

**行为规则**（纯计算，不调 AI）：

| 特征影响 | 规则 |
|---------|------|
| 体型(size) | 影响占据 tile 数、被捕食难度 |
| 代谢(metabolism) | 饥饿速度：高代谢 → 觅食频率高 |
| 繁殖(reproduction) | 每 N tick 尝试繁殖一次，N = f(繁殖值) |
| 智力(intelligence) | 逃跑成功率、工具使用概率、迁移选择优化 |
| 防御(defense) | 被捕食者杀死概率 = 捕食者size / (猎物size + 防御) |
| 适应(adaptability) | 环境容差范围：温度偏离最佳值 ± adaptability×2°C |
| 特殊能力 | 独特行为逻辑（如夜行=只在某些 tick 活动） |

**物种互动**：

| 互动类型 | 触发条件 | 结果计算 |
|---------|---------|---------|
| 捕食 | 肉食者与猎物在同一 tile | 成功率基于 size+intelligence 对比 |
| 竞争 | 两个同生态位物种在同一 tile | 双方饥饿加速 |
| 共生 | 标记为共生的两个物种 | 双方健康恢复 |
| 分解 | 分解者与尸体在同一 tile | 分解者获得食物，tile 资源增加 |

**tick 机制**：
- 纪元内分为多个 tick（如 100 tick/纪元）
- 每 tick 所有个体更新状态
- 前端以动画帧推进（30fps → 约 3 秒完成一个纪元）
- 玩家有"播放/暂停/快进/逐帧"控制

#### 3.2.3 上帝之手干预系统

**现状**：玩家只能创建物种和调环境滑块，无法中途干预演化。

**改造后**：
- 每局游戏固定 10 个干预令牌，不可再生，用完即止
- 干预类型：

| 干预 | 消耗 | 效果 | 使用时机 |
|------|------|------|---------|
| 🧬 催化突变 | 1 | 选中物种获得 1 个随机正面突变 | 任意时刻 |
| ⚡ 天罚 | 1 | 选中 tile 触发小范围灾难 | 任意时刻 |
| 🌿 祝福之地 | 1 | 选中 tile 资源量翻倍 3 纪元 | 任意时刻 |
| 🧪 基因编辑 | 2 | 手动微调某物种一项特征 ±2 | 纪元间 |
| 🛡️ 神圣保护 | 2 | 标记物种当前纪元不会灭绝 | 纪元开始前 |
| 🌍 环境微调 | 1 | 全局温度/氧气/水域微调 ±5% | 纪元间 |
| 💀 灭绝令 | 3 | 直接灭绝一个物种 | 任意时刻 |
| 🔮 加速演化 | 2 | 当前纪元额外执行 2x tick 数 | 纪元间 |

**干预决策点**：
- 纪元结束时暂停，展示"干预窗口"——下一个纪元的预测（灾难概率、物种趋势）
- 玩家在此窗口使用干预令牌
- 纪元中途遭遇意外事件时弹出"紧急干预"选项
- 令牌用完后的纪元只能观察，无法干预

#### 3.2.4 灾难预警系统

**现状**：灾难随机触发，玩家只能被动接受。

**改造后**：
- 纪元开始时 AI 评估并给玩家"预警报告"：

```
第 7 纪元预警
━━━━━━━━━━━━━━━━━━━
☄ 陨石威胁：中等（45%）— 建议保护高价值物种
❄ 冰河期：低（10%）
🦠 瘟疫：高（70%）— 建议提高物种防御特征
☀ 太阳耀斑：极低（3%）
━━━━━━━━━━━━━━━━━━━
```

- 概率由前端生态规则计算（种群密度、环境稳定性、近期事件）
- 真正触发时由 AI 生成叙事，前端计算后果
- 玩家可用干预令牌降低特定灾难概率（-30%/令牌）
- 选择不干预 → 灾难发生 → 承担后果

#### 3.2.5 物种实验室

**现状**：创建物种是简单的表单 + 滑块，无预测信息。

**改造后**：
- 专门的"实验室"界面（独立页面或大型面板）
- 功能：
  - **环境模拟**：根据当前星球环境，预测物种的初始适应性评分（前端计算，非 AI）
  - **食物链位置预览**：展示该物种在现有食物链中的位置
  - **物种对比**：同时创建 3 个候选，对比预测表现后选择投放
  - **基因库**：灭绝物种的基因存档，创建新物种时可选择"基于 XX 基因"来继承部分特征
- 投放需要消耗"生物能量"（每纪元自动恢复，限制物种数量）

### 3.3 AI 调用策略（大幅缩减）

| 场景 | 调 AI? | 说明 |
|------|--------|------|
| 物种行为（觅食/捕猎/迁移/繁殖） | ❌ | 行为引擎纯前端计算 |
| 种群数量变化 | ❌ | 基于 tick 级个体统计 |
| 物种互动（捕食/竞争/共生） | ❌ | 行为引擎触发 + 特征对比 |
| 突变事件 | ❌ | 概率系统 + 环境压力评估 |
| 文明阶段推进 | ❌ | 智力/人口阈值检查 |
| 成因成就解锁 | ❌ | 条件检测 |
| 纪元叙事总结 | ✅ | 纪元结束时 AI 生成一段叙事（约每 3-5 纪元） |
| 灾难叙事 | ✅ | 灾难触发时 |
| 文明里程碑叙事 | ✅ | 文明进入新阶段时 |
| 奇迹事件（罕见） | ✅ | 0.1% 概率触发特殊事件 |

**成本对比**：

| 指标 | 当前 | 改造后 |
|------|------|--------|
| 10 纪元 AI 调用 | 10 次 | ~2-4 次 |
| 单次调用 token | 2048 | 1024-2048 |
| 玩家互动密度 | 1 次/纪元 | ~100 tick/纪元（纯前端） |
| AI 内容冲击力 | 稀释（每纪元都有） | 集中（叙事总结更稀有更有力） |

### 3.4 物种实验室与基因库

```typescript
interface SpeciesLab {
  candidates: SpeciesDesign[];     // 候选物种（最多 3 个）
  bioEnergy: number;               // 生物能量 0-100
  bioEnergyRegen: number;          // 每纪元恢复量
  geneBank: ArchivedGene[];        // 灭绝物种的基因存档
  activeSlots: number;             // 可用投放槽位
}

interface SpeciesDesign {
  name: string;
  type: SpeciesType;
  traits: SpeciesTraits;
  predictedScore: number;           // 前端计算的适应性评分
  foodChainPosition: number;        // 在食物链中的预测位置
  synergyWithExisting: string[];    // 与现有物种的协同效应
  riskFactors: string[];            // 警告项
}

interface ArchivedGene {
  speciesName: string;
  epochExtinct: number;
  traits: SpeciesTraits;
  specialAbility?: string;
  extinctionCause: string;
}
```

---

## 四、共享基础设施改造

### 4.1 新的共享组件

| 组件 | 用途 | 使用者 |
|------|------|--------|
| `EvidenceBoard` | 可拖拽的证据卡片画布 | 共生体 |
| `TimelineBoard` | 水平时间轴 + 节点交互 | 蝴蝶效应 |
| `CausalCanvas` | 因果碎片拖放拼接画布 | 蝴蝶效应 |
| `PlanetMap` | 可缩放 tile 网格地图 | 异星造物主 |
| `SpeciesLab` | 物种创建/对比/基因库界面 | 异星造物主 |
| `InterventionPanel` | 干预令牌选择和确认面板 | 异星造物主 |
| `ResourceBar` | 通用资源条（HP/AP/能量/令牌） | 全部 |
| `ConfrontationUI` | 对峙对话界面 | 共生体 |

### 4.2 新的共享类型

```typescript
// lib/types-v2.ts 新增
interface ResourceState {
  current: number;
  max: number;
  label: string;
  color: string;
}

interface DraggableCard {
  id: string;
  type: string;
  data: Record<string, unknown>;
  position?: { x: number; y: number };
  connections?: string[];
}
```

### 4.3 现有组件修改

| 组件 | 修改内容 |
|------|---------|
| `StatBar` | 增加动画过渡、分段颜色、闪烁警告 |
| `PixelEvent` | 新增对峙、锚定、干预相关的 event type（约 5-8 种） |
| `GameShell` | 支持侧边栏面板（证据/时间线/实验室） |
| `StreamingText` | 支持分段流式（对话 vs 描述 vs 数据） |
| `ExpandablePanel` | 支持拖拽定位、画布模式 |

### 4.4 现有 API 修改

| API 路由 | 修改内容 |
|---------|---------|
| `/api/symbiote/action` | 新增 confrontation mode、evidence 相关 prompt 字段 |
| `/api/butterfly/action` | 新增 causal fragment 输出、timeline node 解锁 |
| `/api/butterfly/loop-start` | 新增锚定因果效果保留逻辑 |
| `/api/xenogenesis/advance-epoch` | 改为非 AI 模式为主，AI 仅用于叙事总结 |
| `/api/symbiote/confront` | **新增** — 对峙专用 API |
| `/api/xenogenesis/narrative` | **新增** — 纪元叙事生成（仅在需要时调用） |

---

## 五、技术风险与对策

### 5.1 风险

| 风险 | 影响 | 概率 |
|------|------|------|
| 行为引擎计算量大导致前端卡顿 | 异星造物主体验差 | 中 |
| AI 对峙辩论质量不可控 | 共生体核心体验受损 | 高 |
| 因果碎片拼接正确性判断困难 | 蝴蝶效应推理体验差 | 高 |
| 大幅改动导致回归 bug | 已有功能受损 | 中 |
| Prompt 重构后 AI 输出一致性下降 | 三个游戏均受影响 | 中 |

### 5.2 对策

**行为引擎性能**：
- 个体数量控制：种群数 > 200 时切换为统计模式（不模拟个体，用公式估算）
- 使用 Web Worker 在后台线程计算
- Tick 频率自适应（低性能设备降低 tick 频率）

**对峙 AI 质量**：
- 为对峙专门设计 prompt 模板，包含 3 个完整的对峙示例
- 限制对峙回合数（最多 6 轮），防止 AI 跑偏
- 加入回退逻辑：如果 AI 输出无效，使用预设的"防御性回应"兜底

**因果碎片正确性判断**：
- 每个碎片预设 `correctPosition`（由 AI 生成时输出）
- 前端拼接时对比实际位置与正确位置
- 允许 ±1 位置的误差（碎片 A 可以接在 B 前面或后面，只要逻辑合理）
- 宽松判定：只要玩家碎片链的总体方向正确，就给通过

**回归 bug**：
- 改造分三轮：先异星造物主（AI 依赖最少）、再蝴蝶效应、最后共生体（AI 依赖最多）
- 每轮完成后回归测试三个游戏的基本流程

**Prompt 重构**：
- 渐进式修改：每次只改一个游戏的 prompt，保留回退版本
- 每个 prompt 变更附带 5 个测试用例（输入→期望输出格式）

---

## 六、实施阶段

### Phase 1：异星造物主系统驱动改造（约 5-7 天）
- 行为引擎 + tick 系统
- 星球地图 + tile 渲染
- 干预令牌系统
- 灾难预警
- 物种实验室 + 基因库
- API 重构（减少 AI 调用）

### Phase 2：蝴蝶效应混合改造（约 5-7 天）
- 时间线地图
- 行动点数系统
- 因果碎片 + 拼接画布
- 因果锚定系统
- NPC 记忆觉醒度
- 评分系统

### Phase 3：共生体叙事改造（约 4-6 天）
- 证据面板
- 信任双向博弈
- 对峙系统
- 生命值/能量系统
- 结局扩展

### Phase 4：共享基础设施 + 收尾（约 2-3 天）
- 新增共享组件
- PixelEvent 扩展
- 全局测试
- 性能优化
- 文档更新

---

## 七、成功标准

### 定量指标
- 玩家每个游戏的平均游戏时长 ≥ 20 分钟
- 共生体：80% 玩家会触发至少 1 次对峙
- 蝴蝶效应：平均循环次数降低到 5 次以内
- 异星造物主：AI 调用次数减少 ≥ 70%
- 异星造物主：一个纪元的计算 + 渲染 < 200ms（60fps）

### 定性指标
- 玩家不再感觉是"在阅读 AI 写的故事"
- 每个游戏有明确的"玩家技能"维度（推理能力/因果分析/生态策略）
- 重玩价值：同一局游戏的不同选择导向显著不同结果
- AI 的介入感觉"恰到好处"：不该出现时不出现，出现时印象深刻
