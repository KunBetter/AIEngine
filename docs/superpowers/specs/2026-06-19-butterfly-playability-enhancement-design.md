# 蝴蝶效应 — 可玩性增强设计

**日期:** 2026-06-19  
**状态:** 设计中  
**聚焦游戏:** 蝴蝶效应 (Butterfly Effect)  
**目标:** 快速见效（1-2周），解决纯文本交互体验差、反馈慢、目标感缺乏、策略深度不足的问题

---

## 1. 问题诊断

蝴蝶效应概念优秀（时间循环 + 因果推理 + NPC记忆传递），但体验上是"打字→等AI→阅读"的纯文本循环。

五个具体问题：

| # | 问题 | 表现 |
|---|------|------|
| A | 即时反馈不足 | AI流式响应慢，等待时间长，无操作感 |
| B | 核心循环单薄 | 输入→等待→阅读，缺少中间操作环节 |
| C | 目标感/进度感不足 | 不知道做什么、离破局有多远 |
| D | 策略深度不够 | 与NPC对话深度依赖AI，玩家主动选择有限 |
| E | 纯文本交互 | 页面只有文字+SVG地图，交互形式单一 |

---

## 2. 解决策略

三层改造，由表及里：

- **感官层 (Sensory):** 视觉动效 + 音效 + 地图光影 + 循环仪式感 — 不改交互逻辑
- **结构层 (Structure):** 目标引导 + 进度可视化 + 成就系统 — 给玩家方向感
- **AI交互层 (AI Layer):** 操作分级 + 预生成 + 流式分阶段返回 + prompt调整 — 缩减等待时间，AI从叙事者变为状态引擎

---

## 3. 组件架构变更

### 现状
```
app/butterfly/page.tsx (~650 行，职责过多)
  ├── TimelineBoard    （时间线，可折叠）
  ├── CausalCanvas     （因果拼图，可切换）
  ├── ResourceBar      （AP资源条）
  ├── PixelEvent       （事件动效覆盖层）
  ├── StreamingText    （加载动画）
  └── ErrorBanner      （错误提示）
```

### 目标架构
```
app/butterfly/page.tsx （精简至 ~300 行，纯布局编排）
  ├── TownMap              【新】从内联SVG提取，加时间光影 + NPC移动动画
  ├── LoopGoalBanner       【新】替换纯文字关键事件提示，加推理进度环
  ├── TimelineBoard        【增强】可拖拽快进，视觉强化
  ├── NPCRelationRadar     【新】SVG雷达图替代纯文字NPC列表
  ├── CausalCanvas         【增强】真正可拖拽拼接的因果拼图
  ├── ResourceBar          【不变】
  ├── PixelEvent           【增强】新动效类型 + Web Audio音效
  ├── LoopSummary          【新】循环结束对比卡片
  ├── AchievementToast     【新】成就弹出通知
  ├── EvidenceBackpack     【新】线索卡片背包
  ├── QuickActions         【新】快捷行动按钮组
  └── ErrorBanner          【不变】
```

### 新增/增强组件清单

| 组件 | 类型 | 用途 | 复杂度 | 优先级 |
|------|------|------|--------|--------|
| TownMap | 新增 | 地图提取，时间光影，NPC动画 | 中 | P0 |
| LoopGoalBanner | 新增 | 循环目标 + 推理进度环 | 低 | P0 |
| PixelEvent | 增强 | 新动效类型 + 音效系统 | 中 | P0 |
| LoopSummary | 新增 | 循环结束对比 | 低 | P0 |
| NPCRelationRadar | 新增 | 关系雷达图 | 中 | P1 |
| CausalCanvas | 增强 | 拖拽拼接交互 | 高 | P1 |
| AchievementToast | 新增 | 成就通知 | 低 | P1 |
| EvidenceBackpack | 新增 | 线索卡片背包 | 中 | P2 |
| QuickActions | 新增 | 预设行动按钮 | 低 | P2 |

---

## 4. 感官层详细设计

### 4.1 TownMap — 时间光影系统

将 page.tsx 中的内联 SVG 地图提取为独立组件 `components/game/TownMap.tsx`。

**时间-光影映射（对应 state.timeOfDay, 7-24）：**

| 时间 | 调性 | 视觉特征 |
|------|------|----------|
| 7:00 晨光 | 蓝紫调 | 低饱和度，薄雾叠加层 |
| 10:00 上午 | 暖黄调 | 正常饱和度 |
| 14:00 午后 | 亮白调 | 高对比 |
| 17:00 黄昏 | 橙粉调 | 长阴影 |
| 20:00 夜晚 | 深蓝调 | 灯火点起（地点节点发光） |
| 24:00 午夜 | 暗红调 | 钟楼崩塌特效 |

**实现方式：**
- SVG `<defs>` 中定义渐变叠加层 `<rect>` 覆盖全图，用 CSS `transition: opacity 2s ease` 平滑过渡
- 地点节点根据时间切换 `filter: drop-shadow()` 颜色
- NPC 光圈脉冲动画 (`@keyframes pulse-glow`)
- NPC 位置移动使用 SVG `<animateMotion>` 沿道路路径

**Props 接口：**
```typescript
interface TownMapProps {
  locations: Record<string, { x: number; y: number }>;
  npcs: Record<string, NPCState>;
  currentLocation: string;
  timeOfDay: number;
  onLocationClick: (location: string) => void;
  onNPCClick: (npcId: string) => void;
}
```

### 4.2 PixelEvent — 动效 + 音效增强

**新动效类型：**

| 事件类型 | 视觉效果 | 音效 | 持续时间 |
|----------|----------|------|----------|
| loop_reset | 画面碎裂 + 碎片逆向聚合 | 低频嗡鸣渐弱 | 3000ms |
| causal_ripple | 因果节点向四周扩散波纹 | 低频渐强"嗡——" | 2000ms |
| discovery | 放大镜聚光效果 + 信息弹出 | 中频"叮" | 1500ms |
| secret | 画面边缘暗角 + 中心文字高亮 | 心跳节奏"咚、咚" | 2000ms |
| breakthrough | 画面闪白 + 碎片信息快速飞入 | 高频清脆"叮！" | 3000ms |
| loop_break | 金色粒子爆炸 + 慢动作 | 交响渐强 | 4000ms |
| npc_awakening | 记忆回溯闪回（快速片段） | 倒带音效 | 2000ms |

**音效生成：**
- 使用 Web Audio API (OscillatorNode + GainNode) 程序化生成
- 不需要外部音频文件
- 在 `lib/audio.ts` 中封装 `playEventSound(eventType: string)` 工具函数

**触发时机绑定：**
- `causal_ripple` → `state.causalGraph.length` 增加时（已有监听）
- `discovery` → 玩家发现新线索时（新增监听：playerJournal 新增 type:"discovery" 的条目）
- `secret` → NPC 对话包含 clueWords 时（已有监听）
- `breakthrough` → hypotheses 状态变为 "confirmed" 时（已有监听）
- `loop_reset` → `state.loopNumber` 增加时（已有监听）
- `loop_break` → `state.keyEvent.prevented` 变为 true 时（已有监听）
- `npc_awakening` → NPC 的 `awakeningStage` 从 "dormant" 变更时（新增监听）

**实现文件：**
- `components/ui/PixelEvent.tsx` — 增强（已有组件）
- `lib/audio.ts` — 新建

### 4.3 循环重置仪式感

**当前逻辑：** `timeOfDay >= 24` → 显示按钮 → 玩家手动点击进入下一循环

**增强后逻辑：**
1. 21:00: 地图开始逐渐变暗
2. 23:00: 屏幕边缘出现红色暗角
3. 24:00: 自动触发 `loop_reset` PixelEvent → 画面碎裂
4. 碎片重组 → 时间回到 7:00 → 新循环自动开始
5. 自动调用 `startNewLoop()`，无需手动点击

**改动点：** `useButterfly` hook 中新增 `isLoopTransitioning` 状态，`timeOfDay >= 24` 时自动触发过渡动画，动画结束后自动进入新循环。

### 4.4 对话增强

- NPC 情绪指示：每条回复前显示情绪 emoji + 语气标签（NPC_LABELS 扩展）
- 关键信息高亮：含 clueWords 的对话内容短暂闪烁金色
- Deja Vu 视觉：有 dejaVu 属性的 NPC 对话气泡带边缘抖动效果

---

## 5. 结构层详细设计

### 5.1 LoopGoalBanner — 循环目标引导

替换当前页面的纯文字关键事件提示区域。

**显示内容：**
- 当前谜题名称 + 图标
- 已发现条件的进度环（例如 "3个条件中已完成2个" → 2/3 环）
- AI 生成的本轮建议目标（来自 prepare-loop API）
- 剩余 AP 提示

**Props 接口：**
```typescript
interface LoopGoalBannerProps {
  activeMystery: "tower" | "plague" | "invasion";
  keyEvent: ButterflyState["keyEvent"];
  actionPoints: number;
  maxActionPoints: number;
  loopGoal: string; // 来自 prepare-loop API
}
```

### 5.2 NPCRelationRadar — 关系雷达图

替代当前 sidebar 中的纯文字 NPC 列表。

**显示内容：**
- SVG 雷达图，每个 NPC 一个轴
- 轴上显示：与玩家的关系值、已知秘密数、觉醒阶段标记
- 点击 NPC 轴 → 选中该 NPC 进行对话
- 觉醒 NPC 的轴带特殊光效

**实现方式：**
- `<svg>` 多边形雷达图，6 个 NPC = 6 条轴
- 每个 NPC 的 `relationships[player]` 决定轴上位置
- `awakeningStage` 决定轴的颜色和光效

### 5.3 LoopSummary — 循环结束对比

每次循环结束（timeOfDay >= 24 或 keyEvent.prevented）后展示。

**显示内容：**
- 左列：上轮状态（关闭前）
- 右列：本轮状态（改变后）
- 变化对比：
  - NPC 行为变化（谁说了不同的话？谁去了不同的地方？）
  - 新发现的线索数量
  - 因果网络新增节点数
  - 假设确认/驳回数
- 底部：本轮评分 + 评级

### 5.4 AchievementToast — 成就通知

屏幕右上角弹出动画通知。

**蝴蝶效应专属成就：**

| 成就ID | 名称 | 条件 |
|--------|------|------|
| first_loop | 🔄 初次回溯 | 完成第1次循环 |
| five_loops | ⏰ 时间旅人 | 完成5次循环 |
| all_npcs | 🤝 全镇皆知 | 一轮内与所有6个NPC对话 |
| perfect_loop | ✨ 完美循环 | 一轮内发现3个以上因果链 |
| eureka | 💡 灵光一现 | 首次确认假设 |
| memory_awakened | 🧠 记忆觉醒 | 首个NPC达到 "aware" 阶段 |
| all_awakened | 🌟 全员觉醒 | 所有NPC觉醒 |
| speed_run | ⚡ 闪电破局 | 3轮内破解谜题 |
| s_rank | 🏆 S级侦探 | 获得S评级 |

**实现文件：** `components/ui/AchievementToast.tsx` — 新建

---

## 6. AI 交互层详细设计

### 6.1 操作分级路由

在 `useButterfly` hook 中新增 `routeAction()` 函数，根据操作类型选择处理路径：

| 操作 | 处理路径 | 预计延迟 |
|------|----------|----------|
| 移动 (move) | 本地状态更新，不调 API | <10ms |
| 调查环境 (investigate) | 优先匹配 prepare-loop 预设线索 | <10ms（命中时） |
| 简单对话 (greeting) | 轻量 prompt，max 50 tokens | <2s |
| 深度对话 (talk) | 完整 AI 推理，流式返回 | 5-8s |
| 循环准备 (newLoop) | prepare-loop API，预生成整个循环 | 后台执行 |

**实现方案：**
- 在 `hooks/useButterfly.ts` 中新增 `quickInvestigate()` 和 `quickTalk()` 方法
- 本地缓存 prepare-loop 返回的 `discoverableClues` 和 `npcSchedules`
- 当玩家操作匹配预设数据时，直接返回结果，不调远程 AI

### 6.2 新增 API：POST /api/butterfly/prepare-loop

在循环开始时调用，AI 一次性生成该循环的世界状态骨架：

**请求：**
```json
{
  "loopNumber": 3,
  "previousCausalGraph": [...],
  "npcStates": {...},
  "activeMystery": "tower"
}
```

**响应：**
```json
{
  "npcSchedules": {
    "elias": [
      { "timeStart": 7, "timeEnd": 12, "location": "钟楼" },
      { "timeStart": 12, "timeEnd": 14, "location": "广场" }
    ]
  },
  "discoverableClues": [
    {
      "id": "clue_001",
      "location": "钟楼",
      "timeWindow": { "start": 9, "end": 12 },
      "description": "地基裂缝中嵌着一块旧怀表",
      "requiredAction": "仔细观察地基",
      "revealsFragment": "frag_005"
    }
  ],
  "keyEvents": [
    {
      "time": 16,
      "location": "钟楼",
      "description": "Elias 匆忙离开钟楼前往警局",
      "condition": "elias 未被打扰"
    }
  ],
  "loopGoal": "找到怀表的主人，并在16:00前到达钟楼"
}
```

**实现文件：** `app/api/butterfly/prepare-loop/route.ts` — 新建

### 6.3 现有 API 改造：流式分阶段返回

修改 `app/api/butterfly/route.ts`，SSE 流式返回分阶段输出：

```
SSE Event: { type: "npc_state_change", data: { npcId: "elias", mood: "nervous" } }
  → 前端立即更新NPC情绪指示器

SSE Event: { type: "dialogue_start", data: { npc: "elias", tone: "hesitant" } }
  → 对话气泡出现，NPC头像亮起

SSE Event: { type: "dialogue_chunk", data: "钟楼的地基..." }
SSE Event: { type: "dialogue_chunk", data: "从三年前就开始裂了..." }
  → 流式文本逐字填充

SSE Event: { type: "causal_fragment", data: { id: "frag_005", ... } }
  → 因果碎片飞入 CausalCanvas

SSE Event: { type: "timeline_update", data: { nodeId: "tn_012", ... } }
  → 时间线节点解锁

SSE Event: { type: "done", data: { fullState: {...} } }
  → 最终完整状态合并
```

### 6.4 System Prompt 调整

**当前定位：** AI 是"叙事者"，生成大段文字描述

**调整后定位：** AI 是"状态引擎"，优先输出结构化数据，文本精炼

**调整要点：**
- NPC 对话不超过 3 句
- 优先填充 causalFragments、timelineNodes、npcStateChanges
- 线索藏在游戏系统数据中（时间/地点/物品条件），不直接告诉玩家
- 在每个 NPC 回复中嵌入至少一个可跟进的新地点或新时间

**实现文件：** `lib/prompts/butterfly.ts` — 修改 system prompt

---

## 7. 数据流

```
┌──────────────────────────────────────────────────────┐
│                    玩家操作                            │
│  点击地点 / 点击NPC / 输入对话 / 拖拽因果碎片          │
└────────┬─────────────────────────────────┬────────────┘
         │                                 │
    ┌────▼────┐                      ┌─────▼─────┐
    │ 本地路由 │                      │ 交互操作   │
    │ (移动/  │                      │ (拖拽拼接) │
    │  调查)  │                      └─────┬─────┘
    └────┬────┘                            │
         │                          ┌─────▼─────┐
    ┌────▼────┐                     │ useButterfly│
    │ 即时更新 │                     │ 本地验证    │
    │ state   │                     └─────┬─────┘
    └─────────┘                           │
                                   ┌──────▼──────┐
         ┌─────────────────────────┤ 需要调AI?   │
         │                         └──────┬──────┘
         │ 否                              │ 是
         │                          ┌──────▼──────┐
         │                          │ POST /api/  │
         │                          │ butterfly   │
         │                          │ (SSE流式)   │
         │                          └──────┬──────┘
         │                                 │
         │                          ┌──────▼──────┐
         │                          │ SSE分阶段   │
         │                          │ 推送状态更新 │
         │                          └──────┬──────┘
         │                                 │
         └─────────┬───────────────────────┘
                   │
            ┌──────▼──────┐
            │ 状态合并     │
            │ + PixelEvent │
            │ 触发检查     │
            └──────┬──────┘
                   │
            ┌──────▼──────┐
            │ React 重渲染 │
            │ (TownMap,    │
            │  CausalCanvas│
            │  Timeline等) │
            └─────────────┘
```

---

## 8. 文件改动清单

### 新建文件
| 文件 | 用途 |
|------|------|
| `components/game/TownMap.tsx` | 提取地图，加时间光影和NPC动画 |
| `components/game/LoopGoalBanner.tsx` | 循环目标 + 推理进度环 |
| `components/game/LoopSummary.tsx` | 循环结束对比面板 |
| `components/game/NPCRelationRadar.tsx` | NPC关系雷达图 |
| `components/game/EvidenceBackpack.tsx` | 线索卡片背包 |
| `components/game/QuickActions.tsx` | 快捷行动按钮组 |
| `components/ui/AchievementToast.tsx` | 成就弹出通知 |
| `lib/audio.ts` | Web Audio API 音效工具 |
| `app/api/butterfly/prepare-loop/route.ts` | 循环预生成API |

### 修改文件
| 文件 | 改动内容 |
|------|----------|
| `app/butterfly/page.tsx` | 提取内联SVG→TownMap；提取关键事件→LoopGoalBanner；接入新组件；精简至~300行 |
| `components/ui/PixelEvent.tsx` | 新增 discovery/npc_awakening 动效类型；接入音效 |
| `components/game/CausalCanvas.tsx` | 增加拖拽拼接交互 |
| `components/game/TimelineBoard.tsx` | 增加拖拽快进交互 |
| `hooks/useButterfly.ts` | 新增操作路由、本地缓存、prepare-loop调用、循环过渡状态 |
| `app/api/butterfly/route.ts` | 改造为分阶段SSE流式返回 |
| `lib/prompts/butterfly.ts` | 调整system prompt定位 |

---

## 9. 实现计划

### 第1周（P0 优先级）
| 天 | 任务 |
|----|------|
| 1 | `TownMap` 组件 + 时间光影CSS动画 |
| 2 | `PixelEvent` 增强 + `lib/audio.ts` 音效系统 |
| 3 | `LoopGoalBanner` + `LoopSummary` 组件 |
| 4 | `prepare-loop` API 开发 + `useButterfly` 操作路由 |
| 5 | SSE 流式分阶段改造 + system prompt 调整 |

### 第2周（P1 优先级）
| 天 | 任务 |
|----|------|
| 6 | `CausalCanvas` 拖拽拼接交互 |
| 7 | `NPCRelationRadar` 雷达图 |
| 8 | `AchievementToast` 成就系统 |
| 9 | `EvidenceBackpack` + `QuickActions`（P2） |
| 10 | 整体联调 + 视觉打磨 + page.tsx 精简收尾 |

---

## 10. 验收标准

1. **反馈速度：** 移动和调查操作即时响应（无网络等待），简单对话 <2s 返回
2. **视觉质感：** 地图时间光影平滑过渡，关键事件有匹配的 PixelEvent 动效和音效
3. **目标清晰：** 玩家始终能看到循环目标、推理进度、剩余AP
4. **循环仪式：** 循环切换自动过渡，有画面碎裂→重组的完整动画
5. **AI交互：** SSE 分阶段返回，首个状态更新在 1s 内到达
6. **交互深度：** CausalCanvas 支持玩家手动拖拽拼接因果碎片
7. **代码质量：** page.tsx 从 ~650 行精简到 ~300 行
