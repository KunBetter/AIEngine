# AI Engine 优化方案

> 基于 2026-06-28 深度分析生成 | 优先级: P0=阻断 / P1=重要 / P2=改进 / P3=远期

---

## P0 — 阻断级修复 (1-2h)

### 1. 修复共生体 SSR 水合不匹配
- **文件**: `hooks/useSymbiote.ts:77`
- **问题**: `createInitialState()` 中 `Math.random()` 选择 symbioteGoal，服务端和客户端首次渲染结果不同，导致 hydration mismatch
- **参考**: Butterfly 已在 `a488483` commit 中修复了同类问题（用固定初始值）
- **方案**: 初始状态使用固定 goal，在 RESET action 或第一个 `useEffect` 中随机化
  ```ts
  // createInitialState 中使用固定值
  symbioteGoal: GOALS[0],  // 固定初始值为第一个目标
  // 在首次客户端渲染后随机化
  useEffect(() => { dispatch({ type: "RANDOMIZE_GOAL" }); }, []);
  ```

### 2. 修复 useState 初始化器中的 Math.random
- **文件**: `hooks/useSymbiote.ts:77`, `hooks/useButterfly.ts:288`, `hooks/useXenogenesis.ts:123`
- **问题**: 所有在 useReducer 初始化器或 useState 初始值中使用 Math.random() 的地方都有 SSR 风险
- **验证**: `useXenogenesis.ts` 的 `generateSeed()` 在 `createInitialState()` 中被调用，同样有风险
- **方案**: 统一模式——初始化函数返回固定种子，首次 useEffect 中重新随机

---

## P1 — 重要改进 (3-5h)

### 3. API Key 安全加固
- **文件**: `lib/ai-client.ts:5`
- **问题**: Key 直接从 `process.env` 读取，无 fallback 提示
- **方案**:
  ```ts
  const apiKey = process.env.DEEPSEEK_API_KEY;
  if (!apiKey) {
    if (typeof window === "undefined") {
      console.warn("[AI Engine] DEEPSEEK_API_KEY not set — AI calls will fail");
    }
  }
  const openai = new OpenAI({
    apiKey: apiKey || "MISSING_KEY",
    baseURL: "https://api.deepseek.com",
  });
  ```

### 4. 移除模块级可变状态
- **文件**: `hooks/useButterfly.ts:217` (`causalIdCounter`), `hooks/useXenogenesis.ts:114-115` (`colorIdx`, `speciesCounter`)
- **问题**: 模块级变量在多个组件实例间共享，HMR 时状态泄露
- **方案**: 将计数器移入 `useRef` 或直接使用 `Date.now() + Math.random()` 生成唯一 ID
  ```ts
  // 替代模块级变量
  const causalIdRef = useRef(0);
  // 使用时
  causalIdRef.current++;
  const id = `causal_${causalIdRef.current}_${Date.now()}`;
  ```

### 5. 统一 V1/V2 类型，消除冗余
- **文件**: `lib/types.ts`, `hooks/useSymbiote.ts`
- **问题**: 
  - `SymbioteStateV2 extends SymbioteState` 但 hooks 中直接使用 V2 字段
  - `useSymbiote.ts:454` 使用 `(state as SymbioteStateV2 & { isLoading?: boolean })` 类型断言，说明 `isLoading` 应直接声明在类型上
- **方案**: 
  - 将 `isLoading` / `error` 加入 `SymbioteStateV2` 类型定义
  - 移除 `SymbioteAIResponse` 等 V1 类型（未被直接使用处），仅保留 V2 版本或重命名为不带版本号

### 6. 清理未使用的组件和导入
- **未使用的组件**: `EvidenceBackpack`, `ExpandablePanel`, `LoadingState`（均已定义但无页面引用）
- **方案**: 删除或标记为 `@deprecated`，或确认是否计划中使用
- **验证命令**: `npx ts-prune` 或手动 grep 每个导出的引用

---

## P2 — 代码质量提升 (4-6h)

### 7. React Hook 依赖修复
- **文件**: `app/butterfly/page.tsx` — 7个 useEffect 缺少依赖项
  - `pendingAchievement` 在 useEffect 内使用但未在依赖数组
  - `resetGame` 在 useEffect 内使用但未在依赖数组
- **文件**: `app/symbiote/page.tsx` — 类似问题
- **方案**: 安装 `eslint-plugin-react-hooks` 并修复所有 warning；或将缺失的依赖加入数组

### 8. 行为引擎使用种子化随机
- **文件**: `lib/behavior-engine.ts`（16处 Math.random）
- **问题**: 行为引擎的随机性无法重现，调试困难
- **方案**: 传入 RNG 函数替代 Math.random，与 `planet-generator.ts` 的模式一致
  ```ts
  export function runTick(state: ..., tick: number, rng?: () => number): TickResult {
    const rand = rng || Math.random;
    // 所有 Math.random() → rand()
  }
  ```

### 9. 响应缓存策略优化
- **文件**: `lib/ai-client.ts:49-60`
- **问题**: 缓存键仅基于前 200 字符 hash，碰撞概率高；1小时 TTL 对游戏场景可能过长
- **方案**: 
  - 使用完整 prompt 的 hash（或更长的前缀）
  - 将 TTL 缩短到 5-10 分钟，游戏场景下重复请求的场景较少
  - 考虑为不同游戏使用不同的缓存命名空间

### 10. 类型文件拆分
- **文件**: `lib/types.ts` (627行)
- **问题**: 单文件包含所有游戏的所有类型，随着V3/V4类型增加会膨胀
- **方案**: 按游戏拆分
  ```
  lib/types/
    common.ts       # GameEvent, GamePhase, AIRequestOptions, StreamEvent
    symbiote.ts     # SymbioteStateV2, EvidenceCard, TrustState, ...
    butterfly.ts    # ButterflyStateV2, CausalNode, TimelineNode, ...
    xenogenesis.ts  # XenogenesisStateV2, SpeciesDef, PlanetTile, ...
    index.ts        # re-export all
  ```

---

## P3 — 架构与体验优化 (8-12h)

### 11. AI 调用层引入请求队列
- **问题**: 用户快速连续点击时，多个 API 请求并行发出，状态冲突
- **方案**: 在 hook 层加入请求队列或取消前一个飞行请求
  ```ts
  const abortRef = useRef<AbortController | null>(null);
  const sendAction = useCallback(async (...) => {
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    // ... fetch with controller.signal
  }, []);
  ```

### 12. 错误恢复与重试 UX
- **问题**: AI 调用失败时仅显示错误横幅，用户需手动重试（且通常不知道做什么）
- **方案**: 
  - `ErrorBanner` 增加一个 "重试上次操作" 按钮（hook 中保存上次请求参数）
  - API 层区分网络错误 vs AI 解析错误，给出不同提示
  - 连续 3 次失败后建议检查 API key 或切换网络

### 13. 游戏存档增强
- **文件**: `lib/save-system.ts`
- **问题**: 
  - 仅支持单槽位自动保存，无手动存档
  - 存档格式未压缩，大状态下可能超 localStorage 5MB 限制
- **方案**:
  - 在地图/设置区域增加 "保存/加载" UI（当前已有多槽位逻辑但 UI 未暴露）
  - 对大状态（Xenogenesis 的 individuals 数组可达 500+）做序列化优化或分片存储
  - 考虑 `IndexedDB` 作为备选存储后端

### 14. 性能：异星造物主 tick 循环优化
- **问题**: 
  - `behavior-engine.ts` 中每 tick 遍历所有个体多次（状态判定、行为执行、健康结算）
  - `findPrey()` 在 O(n) 过滤后排序，大种群时性能下降
- **方案**:
  - 使用空间哈希网格加速邻近查询（`distance()` 调用）
  - 将个体迁移到 TypedArray 或扁平结构减少 GC 压力
  - 统计模式下跳过个体循环（已实现，但切换阈值 500 可调高）

### 15. 移动端适配完善
- **文件**: `app/globals.css` 已有基础的 `mobile-*` 工具类
- **问题**: 蝴蝶效应的因果画布（SVG 拖拽）、异星造物主的地图（20×12 网格）在手机上体验差
- **方案**: 
  - 为移动端提供简化的列表视图（因果图已支持列表/画布切换，可默认列表）
  - 地图支持双指缩放 + 平移
  - 输入框在移动端自动聚焦并调起键盘

---

## 执行建议

| 阶段 | 内容 | 预估时间 | 风险 |
|------|------|----------|------|
| 第1轮 | P0 (2项) | 1-2h | 低 — 修复已知bug |
| 第2轮 | P1 (4项) | 3-5h | 低 — 重构不改变行为 |
| 第3轮 | P2 (4项) | 4-6h | 中 — 类型拆分需更新所有导入 |
| 第4轮 | P3 (5项) | 8-12h | 中高 — 涉及架构变更 |

**总预估**: 16-25 小时

**建议立即执行**: P0 + P1.3 (API Key) + P1.4 (模块级状态) — 这三项是当前最影响稳定性和安全性的问题。
