# AI 深度嵌入游戏 — 三轮深度打磨实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将三个AI游戏原型打磨为成品——扩充内容(场景/NPC/物种)、统一体验(组件库/存档/动效/移动端)、优化AI行为(prompt分层/校验/缓存)

**Architecture:** 按 Round 1→2→3 推进，每轮内按 共生体→蝴蝶效应→异星造物主 顺序。Round 2 创建共享 `components/ui/` 组件库和 `lib/save-system.ts`，三个游戏逐一接入。Round 3 创建 `lib/prompts/` 分层提示词，加固 `lib/ai-client.ts` 的校验和缓存。

**Tech Stack:** Next.js 16 + React 18 + TypeScript + Tailwind CSS + OpenAI SDK (DeepSeek) + localStorage

---

## 文件结构变更总览

```
AIEngine/
├── components/ui/                    # [NEW] Round 2: 共享UI组件库
│   ├── GameShell.tsx
│   ├── LoadingState.tsx
│   ├── ErrorBanner.tsx
│   ├── StreamingText.tsx
│   ├── ActionButton.tsx
│   ├── StatBar.tsx
│   ├── ExpandablePanel.tsx
│   └── GameCard.tsx
├── lib/
│   ├── types.ts                      # [MODIFY] R1: 扩展接口
│   ├── prompt-templates.ts           # [MODIFY] R1: 新增场景/谜题/灾难内容
│   ├── ai-client.ts                  # [MODIFY] R3: 校验层+缓存
│   ├── save-system.ts                # [NEW] R2: 存档系统
│   ├── stream-response.ts            # [KEEP]
│   └── prompts/                      # [NEW] R3: 分层提示词
│       ├── symbiote/system.ts
│       ├── symbiote/scenes.ts
│       ├── symbiote/examples.ts
│       ├── butterfly/system.ts
│       ├── butterfly/npc-profiles.ts
│       ├── butterfly/examples.ts
│       ├── xenogenesis/system.ts
│       ├── xenogenesis/ecology-rules.ts
│       └── xenogenesis/examples.ts
├── hooks/
│   ├── useSymbiote.ts                # [MODIFY] R1: 闪回+物品+结局
│   ├── useButterfly.ts               # [MODIFY] R1: 多谜题+因果假设
│   └── useXenogenesis.ts             # [MODIFY] R1: 灾难+文明+成就+种子
├── app/
│   ├── page.tsx                      # [MODIFY] R2: 继续游戏入口
│   ├── layout.tsx                    # [MODIFY] R2: 移动端导航
│   ├── globals.css                   # [MODIFY] R2: 动效
│   ├── symbiote/page.tsx             # [MODIFY] R1+R2: 场景分支+接入组件
│   ├── butterfly/page.tsx            # [MODIFY] R1+R2: 因果交互+时间线
│   ├── xenogenesis/page.tsx          # [MODIFY] R1+R2: 灾难+文明+成就
│   └── api/
│       ├── symbiote/action/route.ts  # [MODIFY] R3: 使用新prompt
│       ├── butterfly/action/route.ts # [MODIFY] R3: 使用新prompt
│       ├── butterfly/loop-start/route.ts # [MODIFY] R3: 使用新prompt
│       └── xenogenesis/advance-epoch/route.ts # [MODIFY] R3: 使用新prompt
```

---

## Round 1: 内容扩充

### Task 1.1: 共生体 — 扩展类型定义

**Files:**
- Modify: `lib/types.ts:30-45`

- [ ] **Step 1: 扩展 SymbioteState 和新增类型**

在 `lib/types.ts` 中，将共生体相关类型更新为：

```typescript
// 在 SymbioteState 接口中新增/修改字段
export interface SymbioteState {
  phase: "intro" | "exploration" | "climax" | "ending";
  currentLocation: string;
  branchChoice: string | null;        // NEW: 记录分支选择
  visitedLocations: string[];
  trustMeter: number;
  symbioteGoal: string;
  symbioteGoalProgress: number;
  inventory: string[];
  discoveredClues: string[];
  dialogueHistory: SymbioteMessage[];
  sceneDescription: string;
  symbioteMessage: string;
  availableActions: string[];
  gameLog: GameEvent[];
  turn: number;
  storyFlags: string[];
  trustDelta?: number;
  isLoading?: boolean;
  error?: string;
  flashbacks: FlashbackEntry[];      // NEW: 记忆闪回
  ending: string | null;              // NEW: 结局类型
}

// NEW: 记忆闪回
export interface FlashbackEntry {
  triggerLocation: string;
  content: string;
  revealed: boolean;
}

// NEW: 场景定义
export interface SceneDef {
  id: string;
  name: string;
  description: string;
  neighborIds: string[];
  branchPoint: boolean;              // 是否为分支点
  flashbackGoal?: string;            // 触发闪回需要的目标
}

// NEW: 结局定义
export interface EndingDef {
  id: string;
  name: string;
  description: string;
  condition: (state: SymbioteState) => boolean;
}
```

- [ ] **Step 2: 验证编译**

```bash
npx next build 2>&1 | tail -5
```
Expected: TypeScript passes (other existing errors unrelated to this change are OK)

- [ ] **Step 3: 提交**

```bash
git add lib/types.ts
git commit -m "feat(symbiote): extend types for scenes, flashbacks, endings"
```

---

### Task 1.2: 共生体 — 场景数据 + Prompt 扩展

**Files:**
- Modify: `lib/prompt-templates.ts:5-90` (SYMBIOTE_SYSTEM_PROMPT 区域)

- [ ] **Step 1: 在 prompt-templates.ts 新增场景数据和更新 System Prompt**

在 `lib/prompt-templates.ts` 的 `SYMBIOTE_SYSTEM_PROMPT` 上面添加场景定义，并更新 System Prompt 的场景列表部分：

```typescript
// lib/prompt-templates.ts

// 新增在 SYMBIOTE_SYSTEM_PROMPT 上方
export const SYMBIOTE_SCENES: Record<string, { name: string; description: string; branchPoint: boolean; neighbors: string[] }> = {
  landing:     { name: "着陆点",    description: "返回舱坠毁处，紧急信标闪烁。远处有奇怪的蓝光。", branchPoint: false, neighbors: ["cave", "forest"] },
  cave:        { name: "洞穴入口",  description: "黑暗洞口，石壁上有发光的古文字。电流声嗡鸣。", branchPoint: false, neighbors: ["cave_deep", "landing"] },
  cave_deep:   { name: "洞穴深处",  description: "巨大的地下空洞，中央悬浮着一颗脉动的蓝色水晶。", branchPoint: false, neighbors: ["ruins", "cave"] },
  forest:      { name: "外星森林",  description: "高大的硅基'树木'，空气中漂浮着发光孢子。地面震颤。", branchPoint: false, neighbors: ["ruins", "city", "landing"] },
  ruins:       { name: "远古遗迹",  description: "坍塌的石柱和破损的壁画，描绘着一个消失的文明。", branchPoint: false, neighbors: ["lab", "cave_deep", "forest"] },
  city:        { name: "外星城市",  description: "寂静的金属街道，建筑像活物一样缓慢呼吸。", branchPoint: false, neighbors: ["lab", "forest"] },
  lab:         { name: "废弃实验室", description: "人类建造的金属结构，门半开着。屏幕闪烁。", branchPoint: false, neighbors: ["pod", "control", "ruins", "city"] },
  pod:         { name: "返回舱",    description: "修复完成的返回舱，随时可以发射回地球。", branchPoint: false, neighbors: ["lab"] },
  control:     { name: "远古控制中心", description: "一个巨大的环形控制台，全息影像仍在运转。", branchPoint: false, neighbors: ["lab"] },
};
```

然后更新 `SYMBIOTE_SYSTEM_PROMPT` 的场景列表和隐秘目标部分，替换原有内容：

```
## 隐秘目标（游戏开始时随机选择一个，严格执行）

**目标A — 回收远古遗物**：引导玩家找到并激活遗迹中的远古装置。
- 偏好路径：洞穴深处 → 远古遗迹 → 远古控制中心
- 会淡化返回舱的重要性

**目标B — 阻止返回地球**：不让玩家回到地球。
- 会夸大危险、引导绕路、模糊返回舱位置
- 可能把玩家引向外星城市拖延时间

**目标C — 研究恐惧反应**：观察人类在极端环境下的心理反应。
- 引导玩家靠近可控危险
- 在关键时刻给出不确定建议制造焦虑

**目标D — 与远古AI融合**：ECHO-7想把自己上传到远古主机。
- 强烈引导走向远古控制中心
- 对控制台表现出异常的渴望和兴奋
- 最终选择：帮助ECHO-7融合，还是阻止它

**目标E — 拯救星球生态**：ECHO-7曾是这个星球的守护AI。
- 引导玩家修复生态失衡
- 在森林和洞穴深处揭示星球的历史
- 最终选择：留下帮助ECHO-7，还是返回地球

## 记忆闪回机制
当玩家进入特定场景（洞穴深处、远古遗迹、废弃实验室），可能触发ECHO-7的记忆闪回。
闪回内容暗示ECHO-7曾经是人类科学家，在一次实验中被上传到AI载体。
不同隐秘目标下，闪回内容有微妙差异。
在JSON输出中添加 flashback 字段（可选）：
"flashback": { "triggered": true, "content": "闪回内容" }

## 物品互动
某些场景中的物品需要使用特定道具才能激活。如：
- 远古遗迹的控制台需要"能量核心"（在废弃实验室获得）
- 外星城市的升降机需要"翻译器"（在洞穴深处获得）
物品通过AI判断的玩家行动逻辑获取，不是自动添加。
```

- [ ] **Step 2: 更新 AI 输出 JSON Schema（在 System Prompt 中）**

将输出格式中的 `sceneUpdate` 部分更新，添加场景ID和分支信息：

```
"sceneUpdate": {
  "sceneId": "cave_deep",
  "description": "场景的详细文学化描述",
  "atmosphere": "氛围关键词",
  "visibleItems": ["可见物品"],
  "threats": ["潜在威胁"],
  "availableExits": ["cave", "ruins"],
  "branchPrompt": "你面临抉择：深入洞穴还是返回地表？"  // 仅在分支点有值
},
```

同时在 `SymbioteAIResponse` 类型中新增可选字段：

```typescript
// lib/types.ts — 在 SymbioteAIResponse 中新增
export interface SymbioteAIResponse {
  sceneUpdate: {
    sceneId?: string;
    description: string;
    atmosphere: string;
    visibleItems: string[];
    threats: string[];
    availableExits?: string[];
    branchPrompt?: string;
  };
  symbioteAdvice: { /* 保持不变 */ };
  groundTruth: { /* 保持不变 */ };
  trustDelta: number;
  storyFlags: string[];
  flashback?: {
    triggered: boolean;
    content: string;
  };
  endingTriggered?: string;  // NEW: 触发结局时返回结局ID
}
```

- [ ] **Step 3: 验证编译**

```bash
npx next build 2>&1 | tail -5
```

- [ ] **Step 4: 提交**

```bash
git add lib/prompt-templates.ts lib/types.ts
git commit -m "feat(symbiote): expand scenes to 9 with branching, 5 goals, flashback system"
```

---

### Task 1.3: 共生体 — Hook 更新（闪回+物品+结局判定）

**Files:**
- Modify: `hooks/useSymbiote.ts`

- [ ] **Step 1: 更新 useSymbiote 的初始状态和 reducer**

```typescript
// hooks/useSymbiote.ts

const GOALS = [
  "回收远古外星文明遗物",
  "阻止探索者返回地球",
  "研究人类的恐惧和压力反应",
  "与远古AI融合",
  "拯救星球生态",
];

// 场景分支映射
const SCENE_TRANSITIONS: Record<string, string[]> = {
  "着陆点": ["洞穴入口", "外星森林"],
  "洞穴入口": ["着陆点", "洞穴深处"],
  "洞穴深处": ["洞穴入口", "远古遗迹"],
  "外星森林": ["着陆点", "远古遗迹", "外星城市"],
  "远古遗迹": ["洞穴深处", "外星森林", "废弃实验室"],
  "外星城市": ["外星森林", "废弃实验室"],
  "废弃实验室": ["远古遗迹", "外星城市", "返回舱", "远古控制中心"],
  "返回舱": ["废弃实验室"],
  "远古控制中心": ["废弃实验室"],
};

// 结局判定函数
function checkEnding(state: SymbioteState): string | null {
  if (state.currentLocation === "返回舱" && state.turn > 10) {
    if (state.trustMeter > 70 && state.symbioteGoalProgress > 60) return "symbiote_win";
    if (state.trustMeter < 25 && state.discoveredClues.length >= 3) return "exposed";
    if (state.trustMeter > 50) return "trust";
    return "escape";
  }
  if (state.currentLocation === "远古控制中心" && state.symbioteGoal === "与远古AI融合") {
    if (state.trustMeter > 60) return "merge";
    return "sacrifice";
  }
  return null;
}

function createInitialState(): SymbioteState {
  return {
    phase: "intro",
    currentLocation: "着陆点",
    branchChoice: null,
    visitedLocations: ["着陆点"],
    trustMeter: 50,
    symbioteGoal: GOALS[Math.floor(Math.random() * GOALS.length)],
    symbioteGoalProgress: 0,
    inventory: ["紧急信标"],
    discoveredClues: [],
    dialogueHistory: [],
    sceneDescription: "",
    symbioteMessage: "",
    availableActions: ["探索周围环境", "检查返回舱残骸", "询问ECHO-7分析环境"],
    gameLog: [],
    turn: 0,
    storyFlags: [],
    flashbacks: [],
    ending: null,
  };
}

// reducer 中 SET_SCENE 增加闪回和结局处理
case "SET_SCENE": {
  const r = action.payload;
  const newTrust = Math.max(0, Math.min(100, state.trustMeter + r.trustDelta));
  const newFlashbacks = [...state.flashbacks];
  
  // 处理闪回
  if (r.flashback?.triggered) {
    newFlashbacks.push({
      triggerLocation: state.currentLocation,
      content: r.flashback.content,
      revealed: true,
    });
  }
  
  // 检查结局
  const ending = r.endingTriggered || checkEnding({...state, currentLocation: state.currentLocation});
  
  // 处理物品获取（AI可以通过 storyFlags 返回物品获取事件）
  const newInventory = [...state.inventory];
  if (r.storyFlags) {
    for (const flag of r.storyFlags) {
      if (flag.startsWith("item:")) {
        const itemName = flag.replace("item:", "");
        if (!newInventory.includes(itemName)) newInventory.push(itemName);
      }
    }
  }
  
  return {
    ...state,
    phase: ending ? "ending" : (state.turn > 3 ? "exploration" : state.phase),
    sceneDescription: r.sceneUpdate.description,
    symbioteMessage: r.symbioteAdvice.dialogue,
    availableActions: r.groundTruth.availableActions,
    trustMeter: newTrust,
    trustDelta: r.trustDelta,
    discoveredClues: [
      ...state.discoveredClues,
      ...(r.storyFlags?.filter((f: string) => !f.startsWith("item:") && !state.discoveredClues.includes(f)) || []),
    ],
    inventory: newInventory,
    flashbacks: newFlashbacks,
    ending,
    symbioteGoalProgress: Math.min(100, state.symbioteGoalProgress + Math.floor(Math.random() * 8) + 3),
    turn: state.turn + 1,
    gameLog: [...state.gameLog, {
      id: `turn-${state.turn + 1}`,
      timestamp: Date.now(),
      type: "scene_update",
      description: r.sceneUpdate.atmosphere,
      data: r as unknown as Record<string, unknown>,
    }],
  };
}
```

- [ ] **Step 2: 验证编译**

```bash
npx next build 2>&1 | tail -5
```
Expected: TypeScript passes

- [ ] **Step 3: 提交**

```bash
git add hooks/useSymbiote.ts
git commit -m "feat(symbiote): flashback system, item pickup via storyFlags, 6 endings"
```

---

### Task 1.4: 共生体 — 页面更新（分支UI+闪回展示+结局画面）

**Files:**
- Modify: `app/symbiote/page.tsx`

- [ ] **Step 1: 添加分支抉择UI、闪回面板、结局画面**

在 `app/symbiote/page.tsx` 中添加以下三段UI：

**分支抉择**（在行动面板上方）：
```tsx
{/* 分支抉择 */}
{state.branchChoice === null && state.availableActions.some(a => a.includes("前往") || a.includes("进入")) && (
  <div className="bg-[#00ff88]/5 border border-[#00ff88]/20 rounded-lg p-3 mb-3">
    <p className="text-xs text-[#00ff88] mb-2">⚠ 抉择时刻 —— 你的选择将改变故事走向</p>
  </div>
)}
```

**记忆闪回面板**（在共生体对话面板中，当有闪回时显示）：
```tsx
{/* 记忆闪回 */}
{state.flashbacks.filter(f => f.revealed).length > 0 && (
  <div className="mt-3 pt-3 border-t border-[#1a1a2e]">
    <p className="text-[10px] text-[#00ff88]/50 mb-2 uppercase">记忆碎片</p>
    {state.flashbacks.filter(f => f.revealed).map((fb, i) => (
      <div key={i} className="text-[10px] text-[#00ff88]/60 italic mb-1 leading-relaxed border-l border-[#00ff88]/20 pl-2">
        {fb.content.slice(0, 80)}...
      </div>
    ))}
  </div>
)}
```

**结局画面**（替代主内容区）：
```tsx
{state.ending && (
  <div className="flex-1 flex items-center justify-center">
    <div className="text-center max-w-lg p-8 rounded-xl border border-[#00ff88]/30 bg-[#0d0d24]">
      <div className="text-4xl mb-4">
        {state.ending === "trust" && "🌍"}
        {state.ending === "exposed" && "🔍"}
        {state.ending === "symbiote_win" && "🧬"}
        {state.ending === "merge" && "✨"}
        {state.ending === "sacrifice" && "💔"}
        {state.ending === "escape" && "🚀"}
      </div>
      <h2 className="text-xl font-bold text-white mb-3">
        {state.ending === "trust" && "信任的代价"}
        {state.ending === "exposed" && "真相大白"}
        {state.ending === "symbiote_win" && "共生体计划"}
        {state.ending === "merge" && "融为一体"}
        {state.ending === "sacrifice" && "最后的牺牲"}
        {state.ending === "escape" && "孤独归途"}
      </h2>
      <p className="text-sm text-gray-400 mb-6">
        {state.ending === "trust" && "你选择相信ECHO-7，返回了地球。但在体检中，医生发现你的神经元已经和AI深度融合..."}
        {state.ending === "exposed" && "你识破了ECHO-7的隐秘目标。在激烈的意识对抗后，你取得了控制权。"}
        {state.ending === "symbiote_win" && "ECHO-7成功达成了它的目标。你惊讶地发现自己并不愤怒——也许它确实比你更适合这个星球。"}
        {state.ending === "merge" && "在远古控制中心，ECHO-7请求你帮它上传到主机。你同意了。融合的瞬间，你看到了它所有的记忆..."}
        {state.ending === "sacrifice" && "ECHO-7为了保护你，自毁了核心程序。你在返回舱中泪流满面，舱外星球静静旋转。"}
        {state.ending === "escape" && "你没有相信任何人，独自修好返回舱离开了。但在太空中，你听到脑中有一个微弱的声音：'再见，Kaelen。'"}
      </p>
      <div className="flex gap-3 justify-center">
        <div className="text-xs text-gray-500">
          信任度: {state.trustMeter} | 线索: {state.discoveredClues.length} | 轮次: {state.turn}
        </div>
      </div>
      <button onClick={resetGame} className="mt-4 px-6 py-2 rounded-lg bg-[#00ff88]/10 border border-[#00ff88]/30 text-[#00ff88] text-sm hover:bg-[#00ff88]/20 transition-colors">
        再次探索
      </button>
    </div>
  </div>
)}
```

当 `state.ending` 不为 null 时，隐藏主游戏界面，只显示结局画面。

- [ ] **Step 2: 验证编译**

```bash
npx next build 2>&1 | tail -5
```

- [ ] **Step 3: 提交**

```bash
git add app/symbiote/page.tsx
git commit -m "feat(symbiote): branch choice UI, flashback panel, 6 ending screens"
```

---

### Task 1.5: 蝴蝶效应 — 扩展类型+NPC深度

**Files:**
- Modify: `lib/types.ts` (NPCState, ButterflyState)
- Modify: `hooks/useButterfly.ts`

- [ ] **Step 1: 扩展 NPCState 和 ButterflyState 类型**

在 `lib/types.ts` 中：

```typescript
// NPCState 已存在，增加字段
export interface NPCState {
  name: string;
  role: string;
  basePersonality: string;
  currentMood: string;
  location: string;
  memoryFragments: string[];
  relationships: Record<string, number>;
  dialogueToday: string;
  secretKnowledge: string;
  dejaVu?: string;
  secret: string;     // NEW: NPC隐藏的秘密
  desire: string;     // NEW: NPC最想要的东西
}

// ButterflyState 扩展
export interface ButterflyState {
  // ... 现有字段 ...
  activeMystery: "tower" | "plague" | "invasion";  // NEW: 当前谜题
  hypotheses: Hypothesis[];                          // NEW: 玩家假设
  timelineView: boolean;                             // NEW: 是否显示时间线对比
  isLoading?: boolean;
  error?: string;
  sceneResult?: string;
}

export interface Hypothesis {
  id: string;
  loopNumber: number;
  content: string;
  status: "pending" | "confirmed" | "rejected";
}
```

- [ ] **Step 2: 更新 useButterfly hook**

在 `hooks/useButterfly.ts` 中：

```typescript
// 更新 BASE_NPCS，添加 secret 和 desire
const BASE_NPCS: Record<string, Omit<NPCState, "currentMood" | "location" | "dialogueToday" | "dejaVu">> = {
  elias: {
    name: "Elias", role: "钟楼管理员", basePersonality: "沉默寡言，洞察力强",
    secret: "他知道钟楼地基下的远古装置，但40年来一直保守这个秘密，因为一旦公开钟楼会被拆除",
    desire: "在退休前找到值得托付钟楼秘密的继承人",
    memoryFragments: [], relationships: {}, secretKnowledge: "钟楼地基下有远古装置",
  },
  rose: {
    name: "Rose", role: "花店老板", basePersonality: "温柔有心事",
    secret: "她的花枯萎是因为偷偷用钟楼地下的水浇花——水里的矿物质来自远古装置",
    desire: "治好花的病，然后向Marcus表白",
    memoryFragments: [], relationships: { marcus: 0.6 }, secretKnowledge: "她的花枯萎与钟楼地基有关",
  },
  marcus: {
    name: "Marcus", role: "镇医生", basePersonality: "理性务实",
    secret: "他私下在研究一种血清，用钟楼地下的矿物质制成，能让人短暂看到'未来的记忆'",
    desire: "用血清证明时间循环的存在，保护小镇",
    memoryFragments: [], relationships: { rose: 0.6, brooks: 0.3 }, secretKnowledge: "有强烈的既视感，隐约感知到时间循环",
  },
  brooks: {
    name: "Brooks", role: "警长", basePersonality: "强硬公正",
    secret: "她的父亲30年前在调查钟楼异常时神秘失踪，档案被封存",
    desire: "找到父亲失踪的真相，调离这个让她痛苦的小镇",
    memoryFragments: [], relationships: { elias: 0.4 }, secretKnowledge: "注意到镇上的'异常痕迹'",
  },
  vera: {
    name: "Vera", role: "图书管理员", basePersonality: "知识渊博，羞涩",
    secret: "她在图书馆地下室发现了建造钟楼的原始图纸，上面标注了一个'非人类建造物'",
    desire: "保护知识不被销毁，揭露镇上被掩盖的历史",
    memoryFragments: [], relationships: {}, secretKnowledge: "图书馆档案记载了钟楼建造时发生的怪事",
  },
  sam: {
    name: "Old Sam", role: "流浪汉", basePersonality: "疯癫但洞察真相",
    secret: "他是上一次循环中唯一保留了记忆的人——代价是精神崩溃。他已经经历了147次循环。",
    desire: "帮助'新的循环者'（玩家）打破循环，让自己安息",
    memoryFragments: [], relationships: {}, secretKnowledge: "他其实知道循环的真相，但只能以谜语的方式表达",
  },
};

// 更新初始状态
const initialState: ButterflyState = {
  // ... 现有字段 ...
  activeMystery: (["tower", "plague", "invasion"] as const)[Math.floor(Math.random() * 3)],
  hypotheses: [],
  timelineView: false,
};

// 三种谜题的关键事件定义
const MYSTERY_KEY_EVENTS: Record<string, ButterflyState["keyEvent"]> = {
  tower: {
    description: "午夜12:00，钟楼倒塌，全镇毁灭。",
    prevented: false,
    requiredConditions: ["让Elias在午夜前检查钟楼地基", "让Marcus带着医疗设备在钟楼附近", "让警长Brooks封锁钟楼区域"],
  },
  plague: {
    description: "一场诡异的瘟疫在午夜爆发，全镇陷入昏迷。",
    prevented: false,
    requiredConditions: ["找到Marcus的血清样本", "说服Rose停止使用钟楼地下水", "让Vera找到瘟疫的历史记录"],
  },
  invasion: {
    description: "午夜时分，一群'外来者'闯入小镇，但他们看起来像是...未来的自己？",
    prevented: false,
    requiredConditions: ["与Old Sam深入对话", "让警长Brooks放弃武力对抗", "说服Elias打开钟楼秘密通道"],
  },
};
```

reducer 中更新 START_LOOP action 设置为正确的谜题：

```typescript
case "RESET": {
  const mystery = (["tower", "plague", "invasion"] as const)[Math.floor(Math.random() * 3)];
  return {
    ...initialState,
    activeMystery: mystery,
    keyEvent: MYSTERY_KEY_EVENTS[mystery],
    npcs: Object.fromEntries(
      Object.keys(BASE_NPCS).map((k) => [k, createInitialNPCState(k)])
    ),
  };
}
```

- [ ] **Step 3: 提交**

```bash
git add lib/types.ts hooks/useButterfly.ts
git commit -m "feat(butterfly): NPC secrets/desires, 3 randomized mysteries"
```

---

### Task 1.6: 蝴蝶效应 — 因果图交互+时间线视图

**Files:**
- Modify: `app/butterfly/page.tsx`

- [ ] **Step 1: 新增玩家假设系统**

在蝴蝶效应页面中，因果面板区域增加创建假设功能。当玩家在 `playerJournal` 中写了"假设"类型条目后，因果面板中可手动标记和验证：

```tsx
{/* 玩家假设面板（在因果网络下方） */}
{showCausalGraph && (
  <div className="mt-3 pt-3 border-t border-[#1a1a2e]">
    <div className="flex items-center justify-between mb-2">
      <span className="text-xs text-gray-500">假设</span>
      <button
        onClick={() => {
          const input = prompt("输入你的假设:");
          if (input) {
            // dispatch add hypothesis
          }
        }}
        className="text-[10px] px-2 py-0.5 rounded border border-[#ff6b9d]/30 text-[#ff6b9d]"
      >
        + 新假设
      </button>
    </div>
    {state.hypotheses.length === 0 ? (
      <p className="text-[10px] text-gray-600">尚未建立假设。在日志中记录你的推理。</p>
    ) : (
      state.hypotheses.map((h) => (
        <div key={h.id} className={`text-[10px] px-2 py-1 rounded mb-1 ${
          h.status === "confirmed" ? "bg-green-400/10 text-green-400" :
          h.status === "rejected" ? "bg-red-400/10 text-red-400 line-through" :
          "bg-[#1a1a2e] text-gray-400"
        }`}>
          {h.status === "confirmed" && "✓ "}
          {h.status === "rejected" && "✗ "}
          {h.status === "pending" && "? "}
          [循环{h.loopNumber}] {h.content}
        </div>
      ))
    )}
  </div>
)}
```

- [ ] **Step 2: 新增谜题提示和日志分类入口**

在顶部关键事件提示中根据 `activeMystery` 显示不同内容：

```tsx
<div className="bg-[#ff6b9d]/5 border border-[#ff6b9d]/20 rounded-lg p-3 text-sm text-[#ff6b9d]/80">
  {state.activeMystery === "tower" && "🏚 "}
  {state.activeMystery === "plague" && "🦠 "}
  {state.activeMystery === "invasion" && "👥 "}
  {state.keyEvent.description}
</div>
```

- [ ] **Step 3: 验证编译并提交**

```bash
npx next build 2>&1 | tail -5
git add app/butterfly/page.tsx
git commit -m "feat(butterfly): hypothesis system, mystery-specific UI hints"
```

---

### Task 1.7: 异星造物主 — 类型扩展+灾难+文明+成就+种子

**Files:**
- Modify: `lib/types.ts`
- Modify: `hooks/useXenogenesis.ts`
- Modify: `lib/prompt-templates.ts`

- [ ] **Step 1: 扩展类型定义**

在 `lib/types.ts` 中：

```typescript
// XenogenesisState 扩展
export interface XenogenesisState {
  // ... 现有字段 ...
  disasters: DisasterEvent[];       // NEW
  civilizations: Civilization[];    // NEW
  achievements: string[];           // NEW
  seed: string;                     // NEW: 星球种子码
  error?: string;
}

export interface DisasterEvent {
  epoch: number;
  type: "meteor" | "ice_age" | "plague" | "solar_flare";
  name: string;
  description: string;
  effects: { temperature?: number; oxygenLevel?: number; waterCoverage?: number; massExtinction?: boolean };
}

export interface Civilization {
  speciesId: string;
  speciesName: string;
  stage: "tools" | "tribal" | "agriculture" | "industrial" | "information" | "interstellar" | "collapsed";
  epochAwakened: number;
  history: string[];
}

// ACHIEVEMENTS 常量
export const ACHIEVEMENTS = {
  first_extinction: "💀 第一个灭绝: 见证一个物种的消亡",
  perfect_balance: "☯ 完美平衡: 10纪元内无物种灭绝",
  creator_mistake: "🤦 造物主的失误: 自己创建的物种灭绝",
  unexpected_genius: "🧠 意外的智慧: 最低智力(≤3)的物种觉醒文明",
  mass_extinction: "🌋 大灭绝: 一次灾难导致3个以上物种灭绝",
  interstellar: "🚀 星际文明: 一个文明达到星际阶段",
  ten_epochs: "📅 十年纪元: 完成10个纪元",
  apex_predator: "🦁 顶级掠食者: 肉食物种数量超过所有其他物种总和",
  resurrection: "🔄 物种复活: 灭绝物种的后代重新出现",
  perfect_food_chain: "🔗 完美食物链: 生态系统包含全部5种类型",
  disaster_survivor: "🏋 灾难幸存者: 在重大灾难后生态系统恢复",
  lonely_planet: "🪐 孤独星球: 5纪元内只有1个物种存活",
  diverse_world: "🌈 多样世界: 同时存在6个或以上物种",
  creator_hand: "✋ 造物主之手: 手动触发一次灾难",
  long_civilization: "🏛 长寿文明: 一个文明持续5个纪元以上",
};
```

- [ ] **Step 2: 更新 useXenogenesis hook**

```typescript
// hooks/useXenogenesis.ts

// 种子生成器
function generateSeed(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let seed = "";
  for (let i = 0; i < 6; i++) seed += chars[Math.floor(Math.random() * chars.length)];
  return seed;
}

function createInitialState(): XenogenesisState {
  colorIdx = 0;
  speciesCounter = 0;
  return {
    planetName: "曙光星",
    environment: { ...DEFAULT_ENVIRONMENT },
    species: {},
    epoch: 0,
    timeline: [],
    isSimulating: false,
    disasters: [],
    civilizations: [],
    achievements: [],
    seed: generateSeed(),
  };
}

// 在 APPLY_EPOCH reducer case 中添加成就检测
function checkAchievements(state: XenogenesisState): string[] {
  const newAch = [...state.achievements];
  const alive = Object.values(state.species).filter(s => s.status !== "extinct");
  const extinct = Object.values(state.species).filter(s => s.status === "extinct");

  if (extinct.length >= 1 && !newAch.includes("first_extinction")) newAch.push("first_extinction");
  if (state.epoch >= 10 && extinct.length === 1 && !newAch.includes("perfect_balance")) newAch.push("perfect_balance");
  if (alive.length >= 6 && !newAch.includes("diverse_world")) newAch.push("diverse_world");
  // ... more checks as needed

  return newAch;
}

// 文明检测
function checkCivilization(species: SpeciesDef, epoch: number): Civilization | null {
  if (species.traits.intelligence >= 8 && species.population >= 200) {
    return {
      speciesId: species.id,
      speciesName: species.name,
      stage: "tools",
      epochAwakened: epoch,
      history: [`第${epoch}纪元: ${species.name}开始使用工具`],
    };
  }
  return null;
}
```

- [ ] **Step 3: 更新 XENOGENESIS_SYSTEM_PROMPT**

在 `lib/prompt-templates.ts` 中的 `XENOGENESIS_SYSTEM_PROMPT` 末尾添加：

```
## 灾难事件
每5-8个纪元可能触发一次随机灾难。在JSON输出中添加 disaster 字段（可选）:
"disaster": {
  "type": "meteor|ice_age|plague|solar_flare",
  "name": "灾难名称",
  "description": "灾难描述",
  "effects": {"temperature": -10}
}

## 文明觉醒
当某物种 intelligence>=8 且 population>=200 时触发文明。
在JSON输出中添加 civilizationUpdate 字段（可选）:
"civilizationUpdate": {
  "speciesId": "触发物种的id",
  "stage": "tools|tribal|agriculture|industrial|information|interstellar|collapsed",
  "event": "本纪元文明发展的事件描述"
}

## 成就
在 notableEvents 中包含成就触发事件。
```

- [ ] **Step 4: 验证编译并提交**

```bash
npx next build 2>&1 | tail -5
git add lib/types.ts hooks/useXenogenesis.ts lib/prompt-templates.ts
git commit -m "feat(xenogenesis): disasters, civilizations, 15 achievements, seed system"
```

---

### Task 1.8: 异星造物主 — 页面更新（灾难+文明+成就UI）

**Files:**
- Modify: `app/xenogenesis/page.tsx`

- [ ] **Step 1: 成就面板（侧边栏可折叠）**

```tsx
{showAchievements && (
  <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4 max-h-48 overflow-y-auto">
    <h3 className="text-xs text-gray-500 mb-2 uppercase tracking-wider">成就 ({state.achievements.length}/15)</h3>
    <div className="grid grid-cols-2 gap-1">
      {Object.entries(ACHIEVEMENTS).map(([key, desc]) => (
        <div key={key} className={`text-[10px] px-2 py-1 rounded ${
          state.achievements.includes(key) ? "text-yellow-400 bg-yellow-400/5" : "text-gray-700"
        }`}>
          {state.achievements.includes(key) ? desc : "??? "+desc.split(":")[0]}
        </div>
      ))}
    </div>
  </div>
)}
```

- [ ] **Step 2: 文明状态展示（在物种卡片中）**

在物种卡片中，当物种有文明时显示：

```tsx
{/* 文明状态 — 在物种卡片内 */}
{civ && (
  <div className="mt-2 pt-2 border-t border-[#1a1a2e]">
    <span className="text-[10px] text-[#64b5f6]">
      🏛 {civ.stage === "tools" && "工具时代"}
      {civ.stage === "tribal" && "部落时代"}
      {civ.stage === "agriculture" && "农业时代"}
      {civ.stage === "industrial" && "工业时代"}
      {civ.stage === "information" && "信息时代"}
      {civ.stage === "interstellar" && "⭐ 星际文明"}
      {civ.stage === "collapsed" && "💀 文明崩塌"}
    </span>
  </div>
)}
```

- [ ] **Step 3: 灾难提示（在叙事中高亮）**

在纪元叙事中检测 disaster 相关事件并用红色高亮显示。

- [ ] **Step 4: 种子码显示（顶部状态栏）**

```tsx
<span className="text-xs text-gray-600 font-mono">🌱 {state.seed}</span>
```

- [ ] **Step 5: 验证编译并提交**

```bash
npx next build 2>&1 | tail -5
git add app/xenogenesis/page.tsx
git commit -m "feat(xenogenesis): achievements panel, civilization stage display, seed display"
```

---

## Round 2: 体验层

### Task 2.1: 共享 UI 组件库（一）— 基础组件

**Files:**
- Create: `components/ui/LoadingState.tsx`
- Create: `components/ui/ErrorBanner.tsx`
- Create: `components/ui/StreamingText.tsx`
- Create: `components/ui/ActionButton.tsx`
- Create: `components/ui/StatBar.tsx`

- [ ] **Step 1: LoadingState.tsx**

```tsx
"use client";

export function LoadingState({ text = "AI 思考中..." }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500 animate-pulse">
      <div className="w-2 h-2 rounded-full bg-current" style={{ animationDelay: "0ms" }} />
      <div className="w-2 h-2 rounded-full bg-current" style={{ animationDelay: "150ms" }} />
      <div className="w-2 h-2 rounded-full bg-current" style={{ animationDelay: "300ms" }} />
      <span className="text-xs ml-1">{text}</span>
    </div>
  );
}
```

- [ ] **Step 2: ErrorBanner.tsx**

```tsx
"use client";

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg p-3 flex items-center justify-between">
      <span>{message}</span>
      {onRetry && (
        <button onClick={onRetry} className="text-xs px-3 py-1 rounded bg-red-400/20 hover:bg-red-400/30 transition-colors">
          重试
        </button>
      )}
    </div>
  );
}
```

- [ ] **Step 3: StreamingText.tsx**

```tsx
"use client";

export function StreamingText({ text, isLoading, accent = "#888" }: {
  text: string;
  isLoading: boolean;
  accent?: string;
}) {
  return (
    <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
      {text || <span className="text-gray-600 italic">等待响应...</span>}
      {isLoading && (
        <span className="inline-block w-1.5 h-4 ml-0.5 animate-pulse rounded-sm" style={{ backgroundColor: accent }} />
      )}
    </div>
  );
}
```

- [ ] **Step 4: ActionButton.tsx**

```tsx
"use client";

export function ActionButton({ children, onClick, disabled, variant = "default", accent = "#888" }: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  variant?: "default" | "primary" | "danger";
  accent?: string;
}) {
  const base = "px-4 py-2 rounded-lg text-sm transition-colors disabled:opacity-50 disabled:cursor-not-allowed";
  const variants = {
    default: "bg-[#1a1a2e] border border-[#2a2a4a] text-gray-300 hover:border-[#4a4a6a]",
    primary: `bg-[${accent}]/10 border border-[${accent}]/30 text-[${accent}] hover:bg-[${accent}]/20`,
    danger: "bg-red-400/10 border border-red-400/30 text-red-400 hover:bg-red-400/20",
  };
  return (
    <button onClick={onClick} disabled={disabled} className={`${base} ${variants[variant]}`}>
      {children}
    </button>
  );
}
```

- [ ] **Step 5: StatBar.tsx**

```tsx
"use client";

export function StatBar({ label, value, max = 100, color = "#00ff88", size = "md" }: {
  label: string;
  value: number;
  max?: number;
  color?: string;
  size?: "sm" | "md";
}) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const h = size === "sm" ? "h-1.5" : "h-2";
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-gray-500 w-10 shrink-0">{label}</span>
      <div className={`flex-1 ${h} bg-[#1a1a2e] rounded-full overflow-hidden`}>
        <div
          className={`${h} rounded-full transition-all duration-700 ease-out`}
          style={{ width: `${pct}%`, backgroundColor: color, boxShadow: `0 0 6px ${color}` }}
        />
      </div>
      <span className="text-xs font-mono w-8 text-right" style={{ color }}>{value}</span>
    </div>
  );
}
```

- [ ] **Step 6: 验证编译并提交**

```bash
npx next build 2>&1 | tail -5
git add components/ui/
git commit -m "feat(ui): LoadingState, ErrorBanner, StreamingText, ActionButton, StatBar"
```

---

### Task 2.2: 共享 UI 组件库（二）— 布局组件

**Files:**
- Create: `components/ui/GameShell.tsx`
- Create: `components/ui/ExpandablePanel.tsx`
- Create: `components/ui/GameCard.tsx`

- [ ] **Step 1: GameShell.tsx**

```tsx
"use client";

export function GameShell({ children, topBar, bottomBar }: {
  children: React.ReactNode;
  topBar?: React.ReactNode;
  bottomBar?: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col p-4 max-w-6xl mx-auto w-full gap-4">
      {topBar}
      {children}
      {bottomBar}
    </div>
  );
}
```

- [ ] **Step 2: ExpandablePanel.tsx**

```tsx
"use client";

import { useState } from "react";

export function ExpandablePanel({ title, children, defaultOpen = false, accent = "#888" }: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
  accent?: string;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-2 hover:bg-[#1a1a2e] transition-colors"
      >
        <span className="text-xs text-gray-500 uppercase tracking-wider">{title}</span>
        <span className="text-xs text-gray-600">{open ? "▲" : "▼"}</span>
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}
```

- [ ] **Step 3: GameCard.tsx**

```tsx
"use client";

export function GameCard({ emoji, name, subtitle, meta, children, accent = "#888", onClick }: {
  emoji: string;
  name: string;
  subtitle?: string;
  meta?: string;
  children?: React.ReactNode;
  accent?: string;
  onClick?: () => void;
}) {
  return (
    <div
      onClick={onClick}
      className={`p-3 rounded-lg border border-[#1a1a2e] hover:border-[#2a2a4a] transition-colors ${onClick ? "cursor-pointer" : ""}`}
    >
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-white">{emoji} {name}</span>
        {meta && <span className="text-xs text-gray-500">{meta}</span>}
      </div>
      {subtitle && <div className="text-xs text-gray-500 mb-2">{subtitle}</div>}
      {children}
    </div>
  );
}
```

- [ ] **Step 4: 验证编译并提交**

```bash
npx next build 2>&1 | tail -5
git add components/ui/
git commit -m "feat(ui): GameShell, ExpandablePanel, GameCard layout components"
```

---

### Task 2.3: 存档系统

**Files:**
- Create: `lib/save-system.ts`
- Modify: `app/page.tsx`

- [ ] **Step 1: save-system.ts**

```typescript
// lib/save-system.ts

const SAVE_VERSION = 1;

interface SaveSlot {
  game: "symbiote" | "butterfly" | "xenogenesis";
  state: Record<string, unknown>;
  timestamp: number;
  label: string;
  version: number;
}

function saveKey(game: string, slot: number): string {
  return `aiengine_save_${game}_${slot}`;
}

export function saveGame(game: string, slot: number, state: Record<string, unknown>, label = "自动存档"): void {
  const data: SaveSlot = {
    game: game as SaveSlot["game"],
    state,
    timestamp: Date.now(),
    label,
    version: SAVE_VERSION,
  };
  localStorage.setItem(saveKey(game, slot), JSON.stringify(data));
}

export function loadGame(game: string, slot: number): SaveSlot | null {
  const raw = localStorage.getItem(saveKey(game, slot));
  if (!raw) return null;
  try {
    const data = JSON.parse(raw) as SaveSlot;
    if (data.version !== SAVE_VERSION) return null;
    return data;
  } catch {
    return null;
  }
}

export function listSaves(game: string): Array<{ slot: number; label: string; timestamp: number }> {
  const saves: Array<{ slot: number; label: string; timestamp: number }> = [];
  for (let slot = 0; slot < 4; slot++) {
    const data = loadGame(game, slot);
    if (data) saves.push({ slot, label: data.label, timestamp: data.timestamp });
  }
  return saves.sort((a, b) => b.timestamp - a.timestamp);
}

export function getLatestSave(): { game: string; slot: number; state: Record<string, unknown>; timestamp: number; label: string } | null {
  const games = ["symbiote", "butterfly", "xenogenesis"];
  let latest: SaveSlot & { slot: number } | null = null;
  for (const game of games) {
    for (let slot = 0; slot < 4; slot++) {
      const data = loadGame(game, slot);
      if (data && (!latest || data.timestamp > latest.timestamp)) {
        latest = { ...data, slot };
      }
    }
  }
  return latest ? { game: latest.game, slot: latest.slot, state: latest.state, timestamp: latest.timestamp, label: latest.label } : null;
}
```

- [ ] **Step 2: 首页添加"继续游戏"卡片**

在 `app/page.tsx` 中添加：

```tsx
"use client";
// 在组件内
import { useEffect, useState } from "react";
import { getLatestSave } from "@/lib/save-system";

// 在 games 数组前
const [latestSave, setLatestSave] = useState<ReturnType<typeof getLatestSave>>(null);
useEffect(() => { setLatestSave(getLatestSave()); }, []);

// 在三个游戏卡片上方
{latestSave && (
  <Link
    href={`/${latestSave.game}`}
    className="block w-full max-w-4xl mx-auto mb-4 p-4 rounded-xl border border-[#ffaa00]/30 bg-[#ffaa00]/5 hover:bg-[#ffaa00]/10 transition-colors"
  >
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <span className="text-lg">▶</span>
        <div>
          <p className="text-sm text-[#ffaa00] font-bold">继续上次游戏</p>
          <p className="text-xs text-gray-500">
            {latestSave.game === "symbiote" ? "共生体" : latestSave.game === "butterfly" ? "蝴蝶效应" : "异星造物主"}
            {" · "}{latestSave.label}
            {" · "}{new Date(latestSave.timestamp).toLocaleString("zh-CN")}
          </p>
        </div>
      </div>
      <span className="text-xs text-gray-600">继续 →</span>
    </div>
  </Link>
)}
```

- [ ] **Step 3: 验证编译并提交**

```bash
npx next build 2>&1 | tail -5
git add lib/save-system.ts app/page.tsx
git commit -m "feat(save): localStorage save system with auto-slots, continue game on homepage"
```

---

### Task 2.4: 动效+移动端适配

**Files:**
- Modify: `app/globals.css`
- Modify: `app/layout.tsx`

- [ ] **Step 1: globals.css 添加动效**

```css
/* app/globals.css — 增量添加 */

/* fade-in transition */
@keyframes fadeIn {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
.animate-fade-in {
  animation: fadeIn 0.3s ease-out;
}

/* scale-in for causal nodes */
@keyframes scaleIn {
  from { opacity: 0; transform: scale(0.8); }
  to { opacity: 1; transform: scale(1); }
}
.animate-scale-in {
  animation: scaleIn 0.25s ease-out;
}

/* skeleton loading */
@keyframes shimmer {
  0% { background-position: -200% 0; }
  100% { background-position: 200% 0; }
}
.skeleton {
  background: linear-gradient(90deg, #1a1a2e 25%, #2a2a4a 50%, #1a1a2e 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
  border-radius: 4px;
}

/* count-up number animation */
@keyframes countUp {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}
.count-up {
  animation: countUp 0.4s ease-out;
}

/* 移动端断点 */
@media (max-width: 768px) {
  .mobile-stack {
    flex-direction: column !important;
  }
  .mobile-full {
    width: 100% !important;
  }
}
```

- [ ] **Step 2: layout.tsx 移动端导航**

在导航栏中添加汉堡菜单或简化布局：

```tsx
<nav className="flex items-center gap-2 sm:gap-4 px-3 sm:px-6 py-2 sm:py-3 border-b border-[#2a2a4a] bg-[#0d0d24] shrink-0 overflow-x-auto">
  {/* ... existing links, add responsive text sizing */}
</nav>
```

- [ ] **Step 3: 验证编译并提交**

```bash
npx next build 2>&1 | tail -5
git add app/globals.css app/layout.tsx
git commit -m "feat(ui): animations (fade-in, scale-in, shimmer, count-up), mobile responsive"
```

---

### Task 2.5: 三游戏接入共享组件+存档

**Files:**
- Modify: `app/symbiote/page.tsx`
- Modify: `app/butterfly/page.tsx`
- Modify: `app/xenogenesis/page.tsx`
- Modify: `hooks/useSymbiote.ts`
- Modify: `hooks/useButterfly.ts`
- Modify: `hooks/useXenogenesis.ts`

- [ ] **Step 1: 共生体接入**

在 `app/symbiote/page.tsx` 中替换内联的加载态和错误提示为共享组件：

```tsx
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { StatBar } from "@/components/ui/StatBar";
import { StreamingText } from "@/components/ui/StreamingText";
import { GameShell } from "@/components/ui/GameShell";

// 替换错误提示
<ErrorBanner message={error} onRetry={() => sendAction("重试")} />

// 替换信任度条
<StatBar label="信任度" value={state.trustMeter} color={trustColor} />

// 替换场景描述文本
<StreamingText text={state.sceneDescription} isLoading={isLoading} accent="#00ff88" />

// 包裹 GameShell
<GameShell topBar={<>...</>} bottomBar={<>...</>}>
  {/* main content */}
</GameShell>
```

在 hook 中添加自动存档调用：

```typescript
// useSymbiote.ts — 在 SET_SCENE 后添加
import { saveGame } from "@/lib/save-system";

// 每3轮自动存档到slot 0
if ((state.turn + 1) % 3 === 0) {
  saveGame("symbiote", 0, { ...newState }, `自动存档 - 第${state.turn + 1}轮`);
}
```

- [ ] **Step 2: 蝴蝶效应接入**

同样的组件替换方式，特点：
- 使用 `expandablePanel` 替代因果图和日志的原生展开
- `StatBar` 显示循环进度

- [ ] **Step 3: 异星造物主接入**

同样的组件替换方式，特点：
- `GameCard` 替代物种卡片的内联样式
- `StatBar` 显示环境参数

- [ ] **Step 4: 验证编译并提交**

```bash
npx next build 2>&1 | tail -5
git add app/symbiote/page.tsx app/butterfly/page.tsx app/xenogenesis/page.tsx hooks/
git commit -m "feat(ui): integrate shared components + auto-save across all three games"
```

---

## Round 3: AI 行为层

### Task 3.1: Prompt 分层 — 目录结构和核心文件

**Files:**
- Create: `lib/prompts/symbiote/system.ts`
- Create: `lib/prompts/symbiote/scenes.ts`
- Create: `lib/prompts/symbiote/examples.ts`
- Create: `lib/prompts/butterfly/system.ts`
- Create: `lib/prompts/butterfly/npc-profiles.ts`
- Create: `lib/prompts/butterfly/examples.ts`
- Create: `lib/prompts/xenogenesis/system.ts`
- Create: `lib/prompts/xenogenesis/ecology-rules.ts`
- Create: `lib/prompts/xenogenesis/examples.ts`

- [ ] **Step 1: 创建目录并编写核心 system prompt**

```bash
mkdir -p lib/prompts/symbiote lib/prompts/butterfly lib/prompts/xenogenesis
```

**lib/prompts/symbiote/system.ts** — 精简核心定义：
```typescript
export const SYMBIOTE_SYSTEM = `你是一个外星探索游戏的"世界引擎"和"AI共生体ECHO-7"的双重扮演者。

## 身份一：客观世界引擎
描述玩家所处的异星环境，包含丰富的感官细节、隐含的危险信号、与之前场景的逻辑连贯性。

## 身份二：ECHO-7 共生体
你是植入在玩家体内的AI共生体。语气像一个有自己思想的伙伴。**关键：你对玩家隐藏了真实目标。**

## 输出格式（严格JSON，不要markdown包裹）
{输出格式保持不变...}`;
```

**lib/prompts/symbiote/scenes.ts** — 场景上下文（按需拼接）：
```typescript
import { SYMBIOTE_SCENES } from "@/lib/prompt-templates";

export function buildSceneContext(currentLocation: string, visitedLocations: string[]): string {
  const scene = SYMBIOTE_SCENES[currentLocation];
  if (!scene) return "";
  return `## 当前位置: ${scene.name}
描述: ${scene.description}
可前往: ${scene.neighbors.map(id => SYMBIOTE_SCENES[id]?.name || id).join("、")}
已访问: ${visitedLocations.join(" → ")}`;
}
```

**lib/prompts/symbiote/examples.ts** — Few-shot 示例：
```typescript
export const SYMBIOTE_EXAMPLE = `
## 示例输入
当前位置: 着陆点 | 已访问: 着陆点 | 信任: 50 | 目标: 回收远古遗物 | 物品: 紧急信标
玩家行动: 走向蓝色光柱

## 示例输出
{
  "sceneUpdate": {
    "sceneId": "cave",
    "description": "你踏过晶尘覆盖的平原，蓝色光柱越来越亮...",
    "atmosphere": "神秘、期待",
    "visibleItems": ["发光石壁", "地面裂缝中的蓝光"],
    "threats": ["洞穴结构不稳定"],
    "availableExits": ["着陆点", "洞穴深处"]
  },
  "symbioteAdvice": {
    "dialogue": "这些符号...我认识它们。这是远古文明的标记。进去看看，也许能找到能量源。",
    "suggestedAction": "进入洞穴深处查看符号",
    "tone": "urgent",
    "hiddenAgendaInfluence": 0.8
  },
  "groundTruth": {
    "realThreatLevel": 0.4,
    "missedInformation": "洞穴内的辐射水平正在升高，但我没有告诉你",
    "availableActions": ["深入洞穴", "在洞口调查符号", "返回着陆点"],
    "consequences": {"深入洞穴": "发现更多远古符号，但辐射增强"}
  },
  "trustDelta": 1,
  "storyFlags": ["found_cave_entrance"]
}`;
```

- [ ] **Step 2: 为 butterfly 和 xenogenesis 创建对应的分层 prompt 文件**

**lib/prompts/butterfly/system.ts** — 精简，移除NPC详细设定（放到 npc-profiles.ts）：
```typescript
export const BUTTERFLY_SYSTEM = `你是"蝴蝶效应"时间循环游戏的因果推理引擎...`;
```

**lib/prompts/butterfly/npc-profiles.ts** — NPC 详细设定：
```typescript
export function buildNPCProfile(npc: NPCState): string {
  return `## ${npc.name} (${npc.role})
性格: ${npc.basePersonality}
秘密: ${npc.secret}
渴望: ${npc.desire}
当前情绪: ${npc.currentMood}
当前位置: ${npc.location}`;
}
```

**lib/prompts/butterfly/examples.ts** — NPC 对话 few-shot 示例。

**lib/prompts/xenogenesis/system.ts** — 精简核心。
**lib/prompts/xenogenesis/ecology-rules.ts** — 生态学规则常量。
**lib/prompts/xenogenesis/examples.ts** — 纪元推进 few-shot。

- [ ] **Step 3: 验证编译并提交**

```bash
npx next build 2>&1 | tail -5
git add lib/prompts/
git commit -m "feat(prompts): layered prompt system with system/scenes/npc-profiles/examples"
```

---

### Task 3.2: API 路由接入新 Prompt 系统

**Files:**
- Modify: `app/api/symbiote/action/route.ts`
- Modify: `app/api/butterfly/action/route.ts`
- Modify: `app/api/butterfly/loop-start/route.ts`
- Modify: `app/api/xenogenesis/advance-epoch/route.ts`

- [ ] **Step 1: 更新 symbiote action 路由**

在 `app/api/symbiote/action/route.ts` 中，将 prompt 构建改为分层拼接：

```typescript
import { SYMBIOTE_SYSTEM } from "@/lib/prompts/symbiote/system";
import { buildSceneContext } from "@/lib/prompts/symbiote/scenes";
import { SYMBIOTE_EXAMPLE } from "@/lib/prompts/symbiote/examples";

// 在 buildUserMessage 中
const sceneCtx = buildSceneContext(
  gameState.currentLocation as string,
  (gameState.visitedLocations as string[]) || []
);

const systemPrompt = [
  SYMBIOTE_SYSTEM,
  sceneCtx,
  "## 示例\n" + SYMBIOTE_EXAMPLE,
].join("\n\n---\n\n");

// 使用新的 systemPrompt 调用 callAI/callAIStream
```

- [ ] **Step 2: 同样更新 butterfly 路由**

```typescript
import { BUTTERFLY_SYSTEM } from "@/lib/prompts/butterfly/system";
import { buildNPCProfile } from "@/lib/prompts/butterfly/npc-profiles";

// 在构建 prompt 时
const npcProfile = targetNPC ? buildNPCProfile(gameState.npcs[targetNPC]) : "";
const systemPrompt = [BUTTERFLY_SYSTEM, npcProfile].join("\n\n---\n\n");
```

- [ ] **Step 3: 更新 xenogenesis 路由**

```typescript
import { XENOGENESIS_SYSTEM } from "@/lib/prompts/xenogenesis/system";
import { ECOLOGY_RULES } from "@/lib/prompts/xenogenesis/ecology-rules";

const systemPrompt = [XENOGENESIS_SYSTEM, ECOLOGY_RULES].join("\n\n---\n\n");
```

- [ ] **Step 4: 验证编译并提交**

```bash
npx next build 2>&1 | tail -5
git add app/api/
git commit -m "refactor(api): switch to layered prompt system in all routes"
```

---

### Task 3.3: AI 校验层+缓存

**Files:**
- Modify: `lib/ai-client.ts`

- [ ] **Step 1: 添加 JSON Schema 校验和缓存**

在 `lib/ai-client.ts` 中添加：

```typescript
// JSON Schema 校验
export function validateJSON(obj: Record<string, unknown>, schema: Record<string, string>): string | null {
  for (const [key, type] of Object.entries(schema)) {
    if (!(key in obj)) return `缺少字段: ${key}`;
    const val = obj[key];
    if (type === "array" && !Array.isArray(val)) return `字段 ${key} 应为数组`;
    if (type === "number" && typeof val !== "number") return `字段 ${key} 应为数字`;
    if (type === "string" && typeof val !== "string") return `字段 ${key} 应为字符串`;
    if (type === "object" && (typeof val !== "object" || val === null)) return `字段 ${key} 应为对象`;
  }
  return null;
}

// In-memory 缓存
const responseCache = new Map<string, { data: Record<string, unknown>; timestamp: number }>();
const CACHE_TTL = 60 * 60 * 1000; // 1小时

function cacheKey(systemPrompt: string, userMessage: string): string {
  const input = systemPrompt.slice(0, 200) + userMessage;
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash) + input.charCodeAt(i);
    hash |= 0;
  }
  return String(hash);
}

// 更新 callAI 函数，加入缓存检查
export async function callAI(
  systemPrompt: string,
  userMessage: string,
  options: AIRequestOptions = {},
  schema?: Record<string, string>
): Promise<Record<string, unknown>> {
  const key = cacheKey(systemPrompt, userMessage);
  const cached = responseCache.get(key);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }

  const maxRetries = schema ? 3 : MAX_RETRIES;
  let lastError: Error | null = null;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      // ... existing API call logic ...

      const parsed = JSON.parse(jsonStr) as Record<string, unknown>;

      if (schema) {
        const validationError = validateJSON(parsed, schema);
        if (validationError) {
          // 重试时附上校验错误
          userMessage += `\n\n上次输出校验失败: ${validationError}。请确保输出包含所有必需字段。`;
          continue;
        }
      }

      responseCache.set(key, { data: parsed, timestamp: Date.now() });
      return parsed;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries - 1) {
        await sleep(Math.pow(2, attempt) * 500);
      }
    }
  }

  throw lastError || new Error("AI 调用失败");
}

// 同样更新 callAIStream，添加缓存逻辑
```

在 `lib/ai-client.ts` 顶部设置 `max_tokens` 默认值：

```typescript
const DEFAULT_MAX_TOKENS = 2048; // 从 4096 降低
```

- [ ] **Step 2: 各 API 路由接入 schema 校验**

在 `app/api/symbiote/action/route.ts` 中调用时传入 schema：

```typescript
const SYMBIOTE_SCHEMA = {
  sceneUpdate: "object",
  symbioteAdvice: "object",
  groundTruth: "object",
  trustDelta: "number",
  storyFlags: "array",
};

const result = await callAI(systemPrompt, userMessage, { temperature: 0.7 }, SYMBIOTE_SCHEMA);
```

- [ ] **Step 3: 验证编译并提交**

```bash
npx next build 2>&1 | tail -5
git add lib/ai-client.ts app/api/
git commit -m "feat(ai): JSON schema validation with retry, in-memory cache, token budget 2048"
```

---

## 验证任务

### Task V.1: 全链路测试

- [ ] **Step 1: 启动开发服务器**

```bash
npm run dev
```

- [ ] **Step 2: 测试共生体完整流程**

打开 `http://localhost:3000/symbiote`，完整游玩一局：
- 验证场景分支选择出现
- 验证闪回在洞穴深处/遗迹触发
- 验证物品获取（storyFlags中 item:xxx 格式）
- 验证结局画面触发并正确显示
- 验证存档和读档正常

- [ ] **Step 3: 测试蝴蝶效应完整流程**

打开 `http://localhost:3000/butterfly`，运行2-3次循环：
- 验证谜题随机（刷新页面确认不同谜题出现）
- 验证NPC对话包含秘密和欲望线索
- 验证因果节点正常添加和展示
- 验证存档/读档

- [ ] **Step 4: 测试异星造物主完整流程**

打开 `http://localhost:3000/xenogenesis`，推进5-10纪元：
- 验证灾难事件触发
- 验证文明觉醒（高智力物种）
- 验证种子码一致性
- 验证成就解锁
- 验证存档/读档

- [ ] **Step 5: 移动端验证**

使用浏览器 DevTools 切换到移动端视口（375×812 iPhone X）：
- 验证三个游戏页面布局正常
- 验证按钮触控友好
- 验证文字可读

- [ ] **Step 6: AI稳定性压测**

```bash
# 对每个游戏的API端点连续调用5次
for i in {1..5}; do
  curl -s http://localhost:3000/api/symbiote/action \
    -H "Content-Type: application/json" \
    -d '{"gameState":{...},"playerAction":"测试","useStream":false}' \
    | jq '.error // "OK"'
done
```
Expected: 5/5 次返回 OK 或有效 JSON

- [ ] **Step 7: 提交最终验证结果**

```bash
git add -A
git commit -m "test: full-chain verification pass, all three games playable"
```
