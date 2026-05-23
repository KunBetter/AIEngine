# 像素风格动态事件系统 — 设计文档

## 背景

三个AI引擎游戏以文字描述为主，需要增加像素风格的动态视觉事件来提升趣味性和沉浸感。

## 方案：像素事件覆盖层

纯 CSS + inline SVG 实现，不引入任何外部资源或图片。一个共享的 `PixelEvent` 覆盖层组件，三个游戏各自定义 5 种像素动效事件。

## 架构

```
components/ui/PixelEvent.tsx   # 共享覆盖层组件（新增）
app/globals.css                 # 像素动画 keyframes（增量）
app/symbiote/page.tsx           # 添加 pixelEvent 状态 + 5种触发逻辑
app/butterfly/page.tsx          # 同上
app/xenogenesis/page.tsx        # 同上
```

## 组件接口

```typescript
interface PixelEvent {
  type: string;
  duration?: number;  // 默认 2500ms
}

<PixelEvent event={pixelEvent} onDone={() => setPixelEvent(null)} />
```

渲染模式：半透明暗色覆盖层（`bg-black/60`）+ 居中 200x200 像素画布（CSS Grid 绘制）。

## 三游戏事件清单

### 共生体

| type | 触发条件 | 视觉效果 |
|------|---------|---------|
| `discovery` | 进入新场景（turn>0 且 visitedLocations 新增） | 8x8 金色方块粒子从中心向四周爆开 |
| `flashback` | state.flashbacks 数组新增元素 | 全屏蓝白雪花故障条纹，0.5s 闪烁 |
| `item_get` | storyFlags 中出现 "item:" 前缀 | 物品像素图标（方块组合）从底部弹跳进入 |
| `danger` | groundTruth.realThreatLevel > 0.6 | 四边红色脉冲条纹（2px 边框呼吸） |
| `ending` | state.ending !== null | 6种结局不同动效（星云粒子/飞船升空/融合光柱/心脏碎裂/孤独星球/锁链断裂） |

### 蝴蝶效应

| type | 触发条件 | 视觉效果 |
|------|---------|---------|
| `time_reset` | 新循环开始（loopNumber 增加） | 中央像素时钟指针旋转 + 底部日历数字翻页 |
| `causal_ripple` | causalGraph 数组新增元素 | 同心像素波纹从中心扩散（3层透明度递减） |
| `secret` | NPC 对话返回 clues 数组非空 | 像素人物剪影 + 红色"!"气泡弹跳 |
| `breakthrough` | 假设被证实（hypothesis status→confirmed） | 4块拼图碎片从四角聚合拼合 |
| `loop_break` | keyEvent.prevented 变为 true | 像素玻璃从中心碎裂 + 白色粒子溢出 |

### 异星造物主

| type | 触发条件 | 视觉效果 |
|------|---------|---------|
| `meteor` | disasters 数组新增元素（type=meteor） | 像素火球从顶部坠落 → 底部橙色爆炸粒子 |
| `evolution` | species traits 被 mutation 更新 | 像素DNA双螺旋旋转 → 物种方块变形 |
| `civilization` | civilizations 数组新增元素 | 底部像素建筑逐帧升起（帐篷→房屋→塔楼） |
| `extinction` | species status 变为 extinct | 像素骷髅淡入 + 物种精灵方块逐列溶解 |
| `balance` | 连续3纪元无灭绝且物种≥3 | 阴阳符号旋转 + 绿色粒子环 |

## 行为规格

- 覆盖层 z-index 50，高于游戏 UI
- 默认时长 2500ms，可配置
- 动画结束后自动消失（调用 onDone）
- 点击覆盖层可提前关闭
- 触发不阻塞游戏状态（事件与游戏循环异步）
- 连续触发时：新事件替换旧事件（不排队）

## 动画实现

所有动画使用 CSS `@keyframes`，像素效果使用 `box-shadow` 矩阵或 CSS Grid 单元格动画。参考技术：
- 粒子爆炸：`box-shadow` 多阴影偏移 + `transform: scale(0) → scale(1)`
- 波纹：`border-radius: 50%` + `transform: scale(0) → scale(4)` + `opacity: 1 → 0`
- 故障效果：`clip-path` 切片 + `transform: translateX(-2px) → translateX(2px)` 快速切换
- 像素绘制：CSS Grid 8x8 单元格 + 每个单元格独立 `animation-delay`

## 验证

- 每个游戏触发全部 5 种事件
- 覆盖层不遮挡关键交互（AI 调用可并行进行）
- 移动端覆盖层缩放正常
