# 像素动态事件系统 — 实现计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 为三个AI引擎游戏添加15种CSS+SVG像素动态事件覆盖层，提升视觉趣味性

**Architecture:** 一个共享 `PixelEvent` 覆盖层组件 + `globals.css` 中约200行像素动画CSS + 每个游戏页面接入5种事件触发逻辑。纯CSS实现，零外部依赖。

**Tech Stack:** React + CSS @keyframes + inline SVG + CSS Grid

---

## 文件结构

```
AIEngine/
├── components/ui/PixelEvent.tsx    # [NEW] 共享覆盖层组件
├── app/globals.css                 # [MODIFY] 像素动画 keyframes（增量）
├── app/symbiote/page.tsx           # [MODIFY] 添加 5 种事件触发
├── app/butterfly/page.tsx          # [MODIFY] 添加 5 种事件触发
└── app/xenogenesis/page.tsx        # [MODIFY] 添加 5 种事件触发
```

---

### Task 1: 共享 PixelEvent 组件

**Files:**
- Create: `components/ui/PixelEvent.tsx`

- [ ] **Step 1: 创建 PixelEvent 覆盖层组件**

```tsx
"use client";

import { useEffect } from "react";

export interface PixelEventData {
  type: string;
  duration?: number;
}

export function PixelEvent({ event, onDone }: { event: PixelEventData; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, event.duration || 2500);
    return () => clearTimeout(timer);
  }, [event, onDone]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onDone}>
      <div className="w-[200px] h-[200px] relative">
        {/* 各事件类型渲染 */}
        {event.type === "discovery" && <DiscoveryEffect />}
        {event.type === "flashback" && <FlashbackEffect />}
        {event.type === "item_get" && <ItemGetEffect />}
        {event.type === "danger" && <DangerEffect />}
        {event.type === "ending" && <EndingEffect />}
        {event.type === "time_reset" && <TimeResetEffect />}
        {event.type === "causal_ripple" && <CausalRippleEffect />}
        {event.type === "secret" && <SecretEffect />}
        {event.type === "breakthrough" && <BreakthroughEffect />}
        {event.type === "loop_break" && <LoopBreakEffect />}
        {event.type === "meteor" && <MeteorEffect />}
        {event.type === "evolution" && <EvolutionEffect />}
        {event.type === "civilization" && <CivilizationEffect />}
        {event.type === "extinction" && <ExtinctionEffect />}
        {event.type === "balance" && <BalanceEffect />}
      </div>
    </div>
  );
}

// ---- 共生体事件 ----

function DiscoveryEffect() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="pixel-explosion">
        {Array.from({ length: 16 }).map((_, i) => {
          const angle = (i / 16) * Math.PI * 2;
          const dist = 40 + (i % 3) * 25;
          const x = Math.cos(angle) * dist;
          const y = Math.sin(angle) * dist;
          return (
            <div key={i} className="pixel-particle" style={{
              animationDelay: `${i * 50}ms`,
              '--tx': `${x}px`,
              '--ty': `${y}px`,
              backgroundColor: i % 3 === 0 ? '#ffcc00' : i % 3 === 1 ? '#ffaa00' : '#ff8800',
            } as React.CSSProperties} />
          );
        })}
      </div>
    </div>
  );
}

function FlashbackEffect() {
  return (
    <div className="w-full h-full flex flex-col gap-1 overflow-hidden">
      {Array.from({ length: 10 }).map((_, i) => (
        <div key={i} className="glitch-strip" style={{
          animationDelay: `${i * 80}ms`,
          height: `${8 + (i % 4) * 6}px`,
          backgroundColor: i % 2 === 0 ? '#4488ff' : '#ffffff',
          opacity: 0.4 + (i % 3) * 0.2,
          clipPath: `inset(0 ${10 + i * 3}% 0 ${5 + i * 2}%)`,
        }} />
      ))}
      <div className="absolute inset-0 flex items-center justify-center text-white text-lg font-mono opacity-70 animate-pulse">
        MEMORY FRAGMENT
      </div>
    </div>
  );
}

function ItemGetEffect() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-12 h-12 grid grid-cols-4 gap-0.5 item-icon animate-bounce">
          {Array.from({ length: 16 }).map((_, i) => (
            <div key={i} className="bg-[#00ff88]" style={{ opacity: (i === 5 || i === 6 || i === 9 || i === 10 || i === 0 || i === 3 || i === 12 || i === 15) ? 1 : 0.3 }} />
          ))}
        </div>
        <span className="text-[#00ff88] text-xs font-mono animate-pulse">ITEM ACQUIRED</span>
      </div>
    </div>
  );
}

function DangerEffect() {
  return (
    <div className="w-full h-full pointer-events-none">
      <div className="danger-border absolute inset-0 border-2 border-red-500/40 rounded-lg animate-pulse" />
      <div className="danger-border absolute inset-2 border border-red-400/30 rounded-lg animate-pulse" style={{ animationDelay: '200ms' }} />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 text-red-400 text-sm font-mono tracking-widest">
        ⚠ DANGER
      </div>
    </div>
  );
}

function EndingEffect() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="ending-stars">
        {Array.from({ length: 30 }).map((_, i) => (
          <div key={i} className="ending-star" style={{
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 2}s`,
            width: `${2 + (i % 3)}px`,
            height: `${2 + (i % 3)}px`,
          }} />
        ))}
      </div>
      <span className="text-[#00ff88] text-lg font-bold font-mono tracking-widest animate-pulse z-10">
        THE END
      </span>
    </div>
  );
}

// ---- 蝴蝶效应事件 ----

function TimeResetEffect() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
      <svg width="80" height="80" viewBox="0 0 80 80" className="clock-svg">
        <circle cx="40" cy="40" r="35" fill="none" stroke="#ff6b9d" strokeWidth="2" />
        <line x1="40" y1="40" x2="40" y2="18" stroke="#ff6b9d" strokeWidth="2" className="clock-hand" style={{ animation: 'clockSpin 0.8s linear infinite', transformOrigin: '40px 40px' }} />
        <line x1="40" y1="40" x2="55" y2="40" stroke="#ff6b9d" strokeWidth="1.5" className="clock-hand-fast" style={{ animation: 'clockSpin 0.3s linear infinite', transformOrigin: '40px 40px' }} />
      </svg>
      <div className="calendar-flip text-[#ff6b9d] text-2xl font-mono font-bold">
        <span className="calendar-digit">LOOP</span>
      </div>
    </div>
  );
}

function CausalRippleEffect() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      {[0, 1, 2].map((i) => (
        <div key={i} className="ripple-ring absolute rounded-full border border-[#ff6b9d]/50"
          style={{
            animation: `rippleOut 1.5s ease-out ${i * 400}ms infinite`,
            width: '20px', height: '20px',
          }} />
      ))}
      <div className="w-3 h-3 bg-[#ff6b9d] rounded-full z-10" />
    </div>
  );
}

function SecretEffect() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-2">
        <div className="w-16 h-20 relative">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-12 h-14 bg-[#ff6b9d]/80"
            style={{ clipPath: 'polygon(50% 0%, 100% 25%, 100% 100%, 0% 100%, 0% 25%)' }} />
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-[#1a1a2e] rounded-full" />
        </div>
        <div className="exclamation-bubble text-[#ff6b9d] text-4xl font-bold animate-bounce">!</div>
      </div>
    </div>
  );
}

function BreakthroughEffect() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="grid grid-cols-2 gap-1 w-24 h-24 puzzle-grid">
        {[0, 1, 2, 3].map((i) => (
          <div key={i} className="puzzle-piece bg-[#ff6b9d]"
            style={{ animation: `puzzleJoin 0.6s ease-out ${i * 200}ms forwards`, opacity: 0 }} />
        ))}
      </div>
    </div>
  );
}

function LoopBreakEffect() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="glass-break w-32 h-32 relative">
        {[0, 1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="glass-shard absolute bg-white/80"
            style={{
              width: `${10 + i * 5}px`,
              height: `${15 + i * 8}px`,
              left: `${20 + i * 15}%`,
              top: `${10 + i * 12}%`,
              animation: `shardFly 1s ease-out ${i * 80}ms forwards`,
              opacity: 0,
            }} />
        ))}
      </div>
    </div>
  );
}

// ---- 异星造物主事件 ----

function MeteorEffect() {
  return (
    <div className="w-full h-full relative overflow-hidden">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-3 h-6 bg-orange-500 meteor-fall" />
      <div className="absolute bottom-1/4 left-1/2 -translate-x-1/2">
        <div className="explosion-particles">
          {Array.from({ length: 12 }).map((_, i) => (
            <div key={i} className="explosion-dot absolute bg-orange-500"
              style={{
                width: '4px', height: '4px',
                animation: `explodeOut 0.8s ease-out ${i * 40}ms forwards`,
                opacity: 0,
              }} />
          ))}
        </div>
      </div>
    </div>
  );
}

function EvolutionEffect() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg width="80" height="80" viewBox="0 0 80 80" className="dna-helix">
        {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
          <g key={i}>
            <line x1={30 + i * 3} y1={10 + i * 8} x2={50 - i * 3} y2={10 + i * 8} stroke="#64b5f6" strokeWidth="2" opacity={0.3 + i * 0.08} />
            <circle cx={30 + i * 3} cy={10 + i * 8} r="2" fill="#64b5f6" />
            <circle cx={50 - i * 3} cy={10 + i * 8} r="2" fill="#ff6b9d" />
          </g>
        ))}
      </svg>
    </div>
  );
}

function CivilizationEffect() {
  return (
    <div className="w-full h-full flex items-end justify-center gap-1 pb-8">
      {[0, 1, 2, 3].map((i) => (
        <div key={i} className="building bg-[#64b5f6]/80"
          style={{
            width: `${12 + i * 6}px`,
            height: `${0}px`,
            animation: `buildUp 0.6s ease-out ${i * 300}ms forwards`,
          }} />
      ))}
    </div>
  );
}

function ExtinctionEffect() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <div className="flex flex-col items-center gap-3">
        <div className="skull-pixel w-12 h-14 relative">
          <div className="grid grid-cols-8 gap-px skull-grid opacity-50">
            {Array.from({ length: 64 }).map((_, i) => {
              const row = Math.floor(i / 8);
              const col = i % 8;
              const isSkull = (row >= 1 && row <= 5 && col >= 1 && col <= 6) ||
                (row === 3 && col >= 2 && col <= 5) || (row === 5 && col >= 3 && col <= 4);
              return <div key={i} className="w-1 h-1" style={{ backgroundColor: isSkull ? '#ff4444' : 'transparent' }} />;
            })}
          </div>
        </div>
        <span className="text-red-400 text-xs font-mono animate-pulse">EXTINCT</span>
      </div>
    </div>
  );
}

function BalanceEffect() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <svg width="80" height="80" viewBox="0 0 80 80" className="yin-yang animate-spin" style={{ animationDuration: '4s' }}>
        <circle cx="40" cy="40" r="35" fill="none" stroke="#64b5f6" strokeWidth="1" />
        <path d="M40 5 A35 35 0 0 1 40 75 A17.5 17.5 0 0 1 40 40 A17.5 17.5 0 0 0 40 5" fill="#64b5f6" opacity="0.6" />
        <circle cx="40" cy="22.5" r="4" fill="#64b5f6" />
        <circle cx="40" cy="57.5" r="4" fill="#0a0a1a" />
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: 验证编译**

```bash
npx next build 2>&1 | tail -5
```
Expected: TypeScript passes, no errors.

- [ ] **Step 3: 提交**

```bash
git add components/ui/PixelEvent.tsx
git commit -m "feat(pixel): shared PixelEvent overlay component with 15 effect renderers"
```

---

### Task 2: CSS 像素动画

**Files:**
- Modify: `app/globals.css` (追加, ~150行)

- [ ] **Step 1: 在 globals.css 末尾追加像素动画 keyframes**

```css
/* ===== 像素动态事件动画 ===== */

/* 粒子爆炸 */
.pixel-explosion { position: relative; width: 0; height: 0; }
.pixel-particle {
  position: absolute;
  width: 6px; height: 6px;
  animation: particleBurst 1.2s ease-out forwards;
}
@keyframes particleBurst {
  0%   { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { transform: translate(var(--tx), var(--ty)) scale(0); opacity: 0; }
}

/* 故障条纹 */
.glitch-strip {
  animation: glitchShake 0.6s ease-in-out infinite;
}
@keyframes glitchShake {
  0%, 100% { transform: translateX(0); }
  25%  { transform: translateX(-4px); }
  50%  { transform: translateX(4px); }
  75%  { transform: translateX(-2px); }
}

/* 物品图标 */
.item-icon { image-rendering: pixelated; }

/* 危险边框 */
.danger-border { animation: dangerPulse 0.8s ease-in-out infinite; }
@keyframes dangerPulse {
  0%, 100% { opacity: 0.3; }
  50%  { opacity: 1; }
}

/* 结局星星 */
.ending-stars { position: absolute; inset: 0; overflow: hidden; }
.ending-star {
  position: absolute;
  background: #00ff88;
  animation: starTwinkle 1.5s ease-in-out infinite;
}
@keyframes starTwinkle {
  0%, 100% { opacity: 0.2; transform: scale(1); }
  50%  { opacity: 1; transform: scale(2); }
}

/* 时钟旋转 */
@keyframes clockSpin {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
.calendar-digit {
  animation: calendarFlip 0.8s steps(1) infinite;
}
@keyframes calendarFlip {
  0%, 100% { opacity: 1; }
  50%  { opacity: 0.3; }
}

/* 因果波纹 */
@keyframes rippleOut {
  0%   { transform: scale(0); opacity: 0.8; }
  100% { transform: scale(8); opacity: 0; }
}

/* 拼图聚合 */
@keyframes puzzleJoin {
  0%   { opacity: 0; transform: translate(var(--px, 0), var(--py, 0)) scale(0.5); }
  100% { opacity: 1; transform: translate(0, 0) scale(1); }
}
.puzzle-piece:nth-child(1) { --px: -30px; --py: -30px; }
.puzzle-piece:nth-child(2) { --px: 30px; --py: -30px; }
.puzzle-piece:nth-child(3) { --px: -30px; --py: 30px; }
.puzzle-piece:nth-child(4) { --px: 30px; --py: 30px; }

/* 玻璃碎裂 */
@keyframes shardFly {
  0%   { opacity: 0; transform: scale(0.5) rotate(0deg); }
  50%  { opacity: 1; }
  100% { opacity: 0; transform: scale(1.5) rotate(45deg) translate(var(--sx, 20px), var(--sy, -30px)); }
}
.glass-shard:nth-child(1) { --sx: -20px; --sy: -25px; }
.glass-shard:nth-child(2) { --sx: 25px; --sy: -15px; }
.glass-shard:nth-child(3) { --sx: -15px; --sy: 20px; }
.glass-shard:nth-child(4) { --sx: 20px; --sy: 25px; }
.glass-shard:nth-child(5) { --sx: -25px; --sy: 10px; }
.glass-shard:nth-child(6) { --sx: 10px; --sy: -20px; }

/* 陨石坠落 */
@keyframes meteorFall {
  0%   { transform: translateY(-120px); opacity: 1; }
  100% { transform: translateY(80px); opacity: 0; }
}
.meteor-fall { animation: meteorFall 0.8s ease-in forwards; }

/* 爆炸粒子 */
.explosion-particles { position: relative; width: 0; height: 0; }
@keyframes explodeOut {
  0%   { transform: translate(0, 0) scale(1); opacity: 1; }
  100% { transform: translate(var(--ex, 0), var(--ey, 0)) scale(0.5); opacity: 0; }
}
.explosion-dot:nth-child(1)  { --ex: -30px; --ey: -30px; }
.explosion-dot:nth-child(2)  { --ex: 0px; --ey: -40px; }
.explosion-dot:nth-child(3)  { --ex: 30px; --ey: -30px; }
.explosion-dot:nth-child(4)  { --ex: -40px; --ey: 0px; }
.explosion-dot:nth-child(5)  { --ex: 40px; --ey: 0px; }
.explosion-dot:nth-child(6)  { --ex: -30px; --ey: 30px; }
.explosion-dot:nth-child(7)  { --ex: 0px; --ey: 40px; }
.explosion-dot:nth-child(8)  { --ex: 30px; --ey: 30px; }
.explosion-dot:nth-child(9)  { --ex: -15px; --ey: -20px; }
.explosion-dot:nth-child(10) { --ex: 15px; --ey: -20px; }
.explosion-dot:nth-child(11) { --ex: -15px; --ey: 20px; }
.explosion-dot:nth-child(12) { --ex: 15px; --ey: 20px; }

/* 建筑升起 */
@keyframes buildUp {
  0%   { height: 0; opacity: 0.5; }
  100% { height: var(--bh, 40px); opacity: 1; }
}
.building:nth-child(1) { --bh: 30px; }
.building:nth-child(2) { --bh: 50px; }
.building:nth-child(3) { --bh: 40px; }
.building:nth-child(4) { --bh: 60px; }

/* 骷髅溶解 */
@keyframes dissolve {
  0%   { opacity: 1; filter: none; }
  100% { opacity: 0; filter: blur(4px); }
}
.skull-grid { animation: dissolve 2s ease-in forwards; animation-delay: 0.5s; }

/* 时钟手动画（在组件中通过 style 使用） */
.clock-hand, .clock-hand-fast { animation-timing-function: linear; animation-iteration-count: infinite; }
```

- [ ] **Step 2: 验证编译**

```bash
npx next build 2>&1 | tail -5
```
Expected: Build passes.

- [ ] **Step 3: 提交**

```bash
git add app/globals.css
git commit -m "feat(pixel): CSS keyframes for 15 pixel art animations"
```

---

### Task 3: 共生体接入 5 种像素事件

**Files:**
- Modify: `app/symbiote/page.tsx`

- [ ] **Step 1: 添加 pixelEvent 状态和触发逻辑**

在文件顶部添加 import：
```typescript
import { PixelEvent } from "@/components/ui/PixelEvent";
import type { PixelEventData } from "@/components/ui/PixelEvent";
```

在组件内添加 state：
```typescript
const [pixelEvent, setPixelEvent] = useState<PixelEventData | null>(null);
```

添加 ref 追踪上一次状态以检测变化：
```typescript
const prevCluesRef = useRef(state.discoveredClues.length);
const prevFlashbacksRef = useRef(state.flashbacks.length);
const prevTurnRef = useRef(state.turn);
const prevEndingRef = useRef(state.ending);
```

添加事件检测 useEffect：
```typescript
useEffect(() => {
  // discovery: 进入新场景
  if (state.turn > 0 && state.turn > prevTurnRef.current && state.currentLocation !== "着陆点") {
    setPixelEvent({ type: "discovery" });
  }
  prevTurnRef.current = state.turn;

  // flashback: 闪回触发
  if (state.flashbacks.length > prevFlashbacksRef.current) {
    setPixelEvent({ type: "flashback" });
  }
  prevFlashbacksRef.current = state.flashbacks.length;

  // item_get: 物品获取
  if (state.inventory.length > 0 && state.turn > prevTurnRef.current) {
    // 简单判断：回合变了且物品增加了（基于 turn 变化已处理，这里检查物品数）
  }

  // danger: 高威胁
  if (state.sceneDescription && (state.sceneDescription.includes("危险") || state.sceneDescription.includes("威胁"))) {
    // 基于 state 中的 threat 信息
  }

  // ending: 结局触发
  if (state.ending && state.ending !== prevEndingRef.current) {
    setPixelEvent({ type: "ending", duration: 4000 });
  }
  prevEndingRef.current = state.ending;
}, [state.turn, state.flashbacks.length, state.ending]);
```

以及在 JSX return 语句的最后添加（在 closing `</div>` 前）：
```tsx
{pixelEvent && <PixelEvent event={pixelEvent} onDone={() => setPixelEvent(null)} />}
```

更精确的触发逻辑——使用独立的 useEffect 检测具体条件：
```typescript
// Flashback 检测
useEffect(() => {
  if (state.flashbacks.length > 0 && state.flashbacks[state.flashbacks.length - 1]?.revealed) {
    setPixelEvent({ type: "flashback" });
  }
}, [state.flashbacks.length]);

// Danger 检测（从场景描述中识别）
const prevDescRef = useRef("");
useEffect(() => {
  const desc = state.sceneDescription;
  const dangerWords = ["危险", "威胁", "辐射", "不稳定", "崩塌", "陷阱", "有毒"];
  if (desc && desc !== prevDescRef.current && dangerWords.some(w => desc.includes(w))) {
    setPixelEvent({ type: "danger" });
  }
  prevDescRef.current = desc;
}, [state.sceneDescription]);

// Item get 检测
const prevInvLenRef = useRef(0);
useEffect(() => {
  if (state.inventory.length > prevInvLenRef.current) {
    setPixelEvent({ type: "item_get" });
  }
  prevInvLenRef.current = state.inventory.length;
}, [state.inventory.length]);

// Discovery（新场景）
const prevLocRef = useRef("");
useEffect(() => {
  if (state.currentLocation !== prevLocRef.current && prevLocRef.current !== "" && state.turn > 0) {
    setPixelEvent({ type: "discovery" });
  }
  prevLocRef.current = state.currentLocation;
}, [state.currentLocation]);

// Ending
useEffect(() => {
  if (state.ending) {
    setPixelEvent({ type: "ending", duration: 4000 });
  }
}, [state.ending]);
```

- [ ] **Step 2: 验证编译**

```bash
npx next build 2>&1 | tail -5
```

- [ ] **Step 3: 提交**

```bash
git add app/symbiote/page.tsx
git commit -m "feat(pixel): Symbiote — 5 pixel events (discovery/flashback/item_get/danger/ending)"
```

---

### Task 4: 蝴蝶效应接入 5 种像素事件

**Files:**
- Modify: `app/butterfly/page.tsx`

- [ ] **Step 1: 添加 pixelEvent 状态和触发逻辑**

添加 import：
```typescript
import { PixelEvent } from "@/components/ui/PixelEvent";
import type { PixelEventData } from "@/components/ui/PixelEvent";
```

添加 state：
```typescript
const [pixelEvent, setPixelEvent] = useState<PixelEventData | null>(null);
```

添加触发检测：
```typescript
// Time reset: 新循环开始
const prevLoopRef = useRef(state.loopNumber);
useEffect(() => {
  if (state.loopNumber > prevLoopRef.current) {
    setPixelEvent({ type: "time_reset" });
  }
  prevLoopRef.current = state.loopNumber;
}, [state.loopNumber]);

// Causal ripple: 因果节点新增
const prevCausalLenRef = useRef(0);
useEffect(() => {
  if (state.causalGraph.length > prevCausalLenRef.current) {
    setPixelEvent({ type: "causal_ripple" });
  }
  prevCausalLenRef.current = state.causalGraph.length;
}, [state.causalGraph.length]);

// Secret: NPC对话返回clues
const prevDialogueLenRef = useRef(0);
useEffect(() => {
  if (state.dialogueMessages.length > prevDialogueLenRef.current) {
    const lastMsg = state.dialogueMessages[state.dialogueMessages.length - 1];
    if (lastMsg?.role === "npc" && (lastMsg.content.includes("秘密") || lastMsg.content.includes("其实"))) {
      setPixelEvent({ type: "secret" });
    }
  }
  prevDialogueLenRef.current = state.dialogueMessages.length;
}, [state.dialogueMessages.length]);

// Breakthrough: 假设被证实
const prevHypLenRef = useRef(0);
useEffect(() => {
  if (state.hypotheses.length > prevHypLenRef.current) {
    const lastHyp = state.hypotheses[state.hypotheses.length - 1];
    if (lastHyp?.status === "confirmed") {
      setPixelEvent({ type: "breakthrough" });
    }
  }
  prevHypLenRef.current = state.hypotheses.length;
}, [state.hypotheses.length]);

// Loop break: 关键事件被阻止
const prevPreventedRef = useRef(false);
useEffect(() => {
  if (state.keyEvent.prevented && !prevPreventedRef.current) {
    setPixelEvent({ type: "loop_break", duration: 4000 });
  }
  prevPreventedRef.current = state.keyEvent.prevented;
}, [state.keyEvent.prevented]);
```

在 JSX 末尾添加：
```tsx
{pixelEvent && <PixelEvent event={pixelEvent} onDone={() => setPixelEvent(null)} />}
```

- [ ] **Step 2: 验证编译并提交**

```bash
npx next build 2>&1 | tail -5
git add app/butterfly/page.tsx
git commit -m "feat(pixel): Butterfly — 5 pixel events (time_reset/causal_ripple/secret/breakthrough/loop_break)"
```

---

### Task 5: 异星造物主接入 5 种像素事件

**Files:**
- Modify: `app/xenogenesis/page.tsx`

- [ ] **Step 1: 添加 pixelEvent 状态和触发逻辑**

添加 import：
```typescript
import { PixelEvent } from "@/components/ui/PixelEvent";
import type { PixelEventData } from "@/components/ui/PixelEvent";
```

添加 state：
```typescript
const [pixelEvent, setPixelEvent] = useState<PixelEventData | null>(null);
```

添加触发检测：
```typescript
// Meteor: 灾难事件新增
const prevDisasterLenRef = useRef(0);
useEffect(() => {
  if (state.disasters.length > prevDisasterLenRef.current) {
    const lastD = state.disasters[state.disasters.length - 1];
    if (lastD?.type === "meteor") setPixelEvent({ type: "meteor" });
  }
  prevDisasterLenRef.current = state.disasters.length;
}, [state.disasters.length]);

// Evolution: 物种突变（traits变更检测）
const prevTraitsRef = useRef("");
useEffect(() => {
  const traitsStr = Object.values(state.species).map(s => s.traits.specialAbility || "").join(",");
  if (traitsStr !== prevTraitsRef.current && prevTraitsRef.current !== "" && traitsStr.length > prevTraitsRef.current.length) {
    setPixelEvent({ type: "evolution" });
  }
  prevTraitsRef.current = traitsStr;
}, [state.species]);

// Civilization: 文明觉醒
const prevCivLenRef = useRef(0);
useEffect(() => {
  if (state.civilizations.length > prevCivLenRef.current) {
    setPixelEvent({ type: "civilization", duration: 3500 });
  }
  prevCivLenRef.current = state.civilizations.length;
}, [state.civilizations.length]);

// Extinction: 物种灭绝
const prevExtinctCountRef = useRef(0);
useEffect(() => {
  const extinctCount = Object.values(state.species).filter(s => s.status === "extinct").length;
  if (extinctCount > prevExtinctCountRef.current) {
    setPixelEvent({ type: "extinction" });
  }
  prevExtinctCountRef.current = extinctCount;
}, [state.species]);

// Balance: 连续3纪元无灭绝且物种>=3
useEffect(() => {
  if (state.epoch >= 3) {
    const recentEpochs = state.timeline.slice(-3);
    const noExtinction = recentEpochs.every(e => (e.notableEvents || []).every(ev => !ev.includes("灭绝")));
    const enoughSpecies = Object.values(state.species).filter(s => s.status !== "extinct").length >= 3;
    if (noExtinction && enoughSpecies && recentEpochs.length === 3) {
      setPixelEvent({ type: "balance" });
    }
  }
}, [state.epoch]);
```

在 JSX return 末尾添加：
```tsx
{pixelEvent && <PixelEvent event={pixelEvent} onDone={() => setPixelEvent(null)} />}
```

- [ ] **Step 2: 验证编译并提交**

```bash
npx next build 2>&1 | tail -5
git add app/xenogenesis/page.tsx
git commit -m "feat(pixel): Xenogenesis — 5 pixel events (meteor/evolution/civilization/extinction/balance)"
```

---

### Task 6: 启动验证

- [ ] **Step 1: 启动服务器并验证所有页面**

```bash
kill $(lsof -t -i:3000) 2>/dev/null
npm run dev &
sleep 4
curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/symbiote
curl -s -o /dev/null -w " %{http_code}" http://localhost:3000/butterfly
curl -s -o /dev/null -w " %{http_code}" http://localhost:3000/xenogenesis
echo ""
```
Expected: `200 200 200`

- [ ] **Step 2: 提交最终验证**

```bash
git add -A && git commit -m "test: pixel events system verified — all 3 games serving 200"
```
