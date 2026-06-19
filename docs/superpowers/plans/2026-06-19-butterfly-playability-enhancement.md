# Butterfly Effect — Playability Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Butterfly Effect from "type → wait → read" into a visually responsive, goal-oriented interactive game with multi-phase AI feedback, without changing the core AI-driven architecture.

**Architecture:** Three-layer enhancement. Sensory layer adds time-based map lighting, pixel event animations, and procedural audio. Structure layer adds loop goal banners, NPC radar, loop summaries, and achievements. AI layer adds operation routing (local vs API), prepare-loop pre-generation, phased SSE streaming, and refined system prompts.

**Tech Stack:** Next.js 15, React 19, TypeScript, Tailwind CSS, Web Audio API, DeepSeek API via OpenAI SDK, SSE streaming

---

## File Structure

### New Files
| File | Purpose |
|------|---------|
| `components/game/TownMap.tsx` | Extracted map with time-of-day lighting + NPC animations |
| `components/game/LoopGoalBanner.tsx` | Loop objective + inference progress ring |
| `components/game/LoopSummary.tsx` | End-of-loop comparison cards |
| `components/game/NPCRelationRadar.tsx` | SVG radar chart for NPC relationships |
| `components/game/EvidenceBackpack.tsx` | Visual clue card inventory |
| `components/game/QuickActions.tsx` | Predefined action buttons |
| `components/ui/AchievementToast.tsx` | Achievement popup notification |
| `lib/audio.ts` | Web Audio API procedural sound effects |
| `app/api/butterfly/prepare-loop/route.ts` | Loop pre-generation API endpoint |

### Modified Files
| File | Change Summary |
|------|---------------|
| `app/butterfly/page.tsx` | Integrate new components; extract inline SVG to TownMap; reduce from ~650 to ~300 lines |
| `components/ui/PixelEvent.tsx` | Add `npc_awakening` effect; enhance `loop_reset` with shatter animation; integrate audio |
| `components/game/CausalCanvas.tsx` | Add SVG connection lines between placed fragments |
| `components/game/TimelineBoard.tsx` | Add drag-to-scrub time navigation |
| `hooks/useButterfly.ts` | Add operation routing, local clue cache, auto loop transition, achievement tracking |
| `app/api/butterfly/action/route.ts` | Phased SSE: send state patches before full text completes |
| `lib/prompts/butterfly/system.ts` | Shift AI role from "narrator" to "state engine" |
| `lib/types.ts` | Add `LoopPreparation`, `ButterflyAchievement`, `SSEPhaseEvent` types |

---

### Task 1: Type definitions for new systems

**Files:**
- Modify: `lib/types.ts` (append at end)

- [ ] **Step 1: Add new type definitions**

At the end of `lib/types.ts`, after the existing exports, append:

```typescript
// ---- 蝴蝶效应 v3 增强类型 ----

export interface DiscoverableClue {
  id: string;
  location: string;
  timeWindow: { start: number; end: number };
  description: string;
  requiredAction: string;
  revealsFragment: string;
}

export interface NPCScheduleEntry {
  timeStart: number;
  timeEnd: number;
  location: string;
}

export interface LoopKeyEvent {
  time: number;
  location: string;
  description: string;
  condition: string;
}

export interface LoopPreparation {
  npcSchedules: Record<string, NPCScheduleEntry[]>;
  discoverableClues: DiscoverableClue[];
  keyEvents: LoopKeyEvent[];
  loopGoal: string;
}

export interface SSEPhaseEvent {
  type: "npc_state_change" | "dialogue_start" | "dialogue_chunk" | "causal_fragment" | "timeline_update" | "done";
  data: Record<string, unknown>;
}

export interface ButterflyAchievement {
  id: string;
  name: string;
  description: string;
  unlockedAt: number; // timestamp
}

export const BUTTERFLY_ACHIEVEMENTS: Record<string, { name: string; description: string }> = {
  first_loop: { name: "🔄 初次回溯", description: "完成第1次循环" },
  five_loops: { name: "⏰ 时间旅人", description: "完成5次循环" },
  all_npcs: { name: "🤝 全镇皆知", description: "一轮内与所有6个NPC对话" },
  perfect_loop: { name: "✨ 完美循环", description: "一轮内发现3个以上因果链" },
  eureka: { name: "💡 灵光一现", description: "首次确认假设" },
  memory_awakened: { name: "🧠 记忆觉醒", description: "首个NPC达到 aware 阶段" },
  all_awakened: { name: "🌟 全员觉醒", description: "所有NPC觉醒" },
  speed_run: { name: "⚡ 闪电破局", description: "3轮内破解谜题" },
  s_rank: { name: "🏆 S级侦探", description: "获得S评级" },
};
```

- [ ] **Step 2: Commit**

```bash
git add lib/types.ts
git commit -m "feat(types): add LoopPreparation, SSEPhaseEvent, ButterflyAchievement types"
```

---

### Task 2: Audio system (`lib/audio.ts`)

**Files:**
- Create: `lib/audio.ts`

- [ ] **Step 1: Create the audio utility**

```typescript
// lib/audio.ts
// Procedural sound effects using Web Audio API — no external files needed.

type SoundType = "causal_ripple" | "discovery" | "secret" | "breakthrough" | "loop_reset" | "loop_break" | "npc_awakening";

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    audioCtx = new AudioContext();
  }
  return audioCtx;
}

function playTone(freq: number, duration: number, type: OscillatorType = "sine", volume = 0.15, rampDown = true) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  if (rampDown) {
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  }
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playNoise(duration: number, volume = 0.05) {
  const ctx = getCtx();
  const bufferSize = ctx.sampleRate * duration;
  const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    data[i] = (Math.random() * 2 - 1) * Math.max(0, 1 - i / bufferSize);
  }
  const source = ctx.createBufferSource();
  source.buffer = buffer;
  const gain = ctx.createGain();
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  source.connect(gain);
  gain.connect(ctx.destination);
  source.start();
}

export function playEventSound(type: SoundType) {
  try {
    switch (type) {
      case "causal_ripple":
        playTone(80, 1.5, "sine", 0.12);         // low rising hum
        setTimeout(() => playTone(120, 0.8, "sine", 0.08), 300);
        break;
      case "discovery":
        playTone(880, 0.15, "sine", 0.1);         // high short ding
        setTimeout(() => playTone(1320, 0.1, "sine", 0.06), 100);
        break;
      case "secret":
        playTone(55, 0.4, "triangle", 0.08);      // heartbeat: low thump
        setTimeout(() => playTone(55, 0.4, "triangle", 0.08), 600);
        break;
      case "breakthrough":
        playTone(523, 0.1, "sine", 0.1);          // C5 chord
        playTone(659, 0.1, "sine", 0.08);
        playTone(784, 0.15, "sine", 0.08);
        setTimeout(() => {
          playTone(1047, 0.2, "sine", 0.12);
        }, 200);
        break;
      case "loop_reset":
        playNoise(1.5, 0.06);                     // shatter noise
        playTone(200, 1.5, "sawtooth", 0.04, true); // descending
        break;
      case "loop_break":
        playTone(523, 0.1, "sine", 0.1);          // triumphant chord
        playTone(659, 0.1, "sine", 0.08);
        playTone(784, 0.1, "sine", 0.08);
        setTimeout(() => {
          playTone(1047, 0.4, "sine", 0.15);
          playTone(1319, 0.4, "sine", 0.1);
        }, 300);
        break;
      case "npc_awakening":
        playNoise(0.3, 0.03);                     // glitch static
        playTone(440, 0.2, "square", 0.04);
        setTimeout(() => playTone(660, 0.3, "sine", 0.06), 200);
        break;
    }
  } catch {
    // Audio not available — silently ignore
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add lib/audio.ts
git commit -m "feat(audio): add procedural Web Audio API sound effects for PixelEvent types"
```

---

### Task 3: TownMap component (extract from page.tsx)

**Files:**
- Create: `components/game/TownMap.tsx`
- Modify: `app/butterfly/page.tsx` (remove inline SVG, import TownMap)

- [ ] **Step 1: Create TownMap component**

```typescript
// components/game/TownMap.tsx
"use client";

import type { NPCStateV2 } from "@/lib/types";

const LOCATION_COORDS: Record<string, { x: number; y: number }> = {
  "钟楼": { x: 200, y: 45 },
  "花店": { x: 200, y: 145 },
  "广场": { x: 130, y: 95 },
  "诊所": { x: 280, y: 95 },
  "警局": { x: 90, y: 145 },
  "图书馆": { x: 130, y: 175 },
};

const ROAD_PATHS = [
  { x1: 130, y1: 95, x2: 200, y2: 45 },
  { x1: 130, y1: 95, x2: 200, y2: 145 },
  { x1: 130, y1: 95, x2: 280, y2: 95 },
  { x1: 130, y1: 95, x2: 90, y2: 145 },
  { x1: 130, y1: 95, x2: 130, y2: 175 },
];

const NPC_COLORS: Record<string, string> = {
  elias: "#ffcc00", rose: "#ff6b9d", marcus: "#64b5f6",
  brooks: "#8888ff", vera: "#bb66ff", sam: "#88aa88",
};

const NPC_LABELS: Record<string, string> = {
  elias: "Elias", rose: "Rose", marcus: "Marcus",
  brooks: "Brooks", vera: "Vera", sam: "Old Sam",
};

function getTimeOfDayGradient(hour: number): { overlay: string; accent: string } {
  if (hour >= 7 && hour < 10) return { overlay: "rgba(100,120,180,0.25)", accent: "#8899cc" };
  if (hour >= 10 && hour < 14) return { overlay: "rgba(255,220,150,0.15)", accent: "#ffcc88" };
  if (hour >= 14 && hour < 17) return { overlay: "rgba(255,255,240,0.08)", accent: "#ffffff" };
  if (hour >= 17 && hour < 20) return { overlay: "rgba(255,140,80,0.25)", accent: "#ff9966" };
  if (hour >= 20 && hour < 24) return { overlay: "rgba(20,30,80,0.45)", accent: "#4466aa" };
  return { overlay: "rgba(80,10,10,0.55)", accent: "#cc3333" };
}

interface TownMapProps {
  currentLocation: string;
  timeOfDay: number;
  npcs: Record<string, NPCStateV2>;
  selectedNPC: string | null;
  onLocationClick: (location: string) => void;
  onNPCClick: (npcId: string) => void;
}

export function TownMap({ currentLocation, timeOfDay, npcs, selectedNPC, onLocationClick, onNPCClick }: TownMapProps) {
  const { overlay, accent } = getTimeOfDayGradient(timeOfDay);
  const isNight = timeOfDay >= 20;

  const npcsAtLocation = (loc: string) =>
    Object.entries(npcs).filter(([, n]) => n.location === loc);

  return (
    <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
      <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">橡木镇</h3>
      <svg viewBox="0 0 400 250" className="w-full" style={{ transition: "filter 2s ease" }}>
        <defs>
          {/* Time-of-day overlay gradient */}
          <radialGradient id="timeOverlay">
            <stop offset="0%" stopColor="transparent" />
            <stop offset="100%" stopColor={overlay} />
          </radialGradient>
          {/* Night lights glow filter */}
          {isNight && (
            <filter id="nightGlow">
              <feGaussianBlur stdDeviation="3" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          )}
        </defs>

        {/* Roads */}
        {ROAD_PATHS.map((p, i) => (
          <line key={i} x1={p.x1} y1={p.y1} x2={p.x2} y2={p.y2}
            stroke="#2a2a4a" strokeWidth="3" />
        ))}

        {/* Time overlay */}
        <rect x="0" y="0" width="400" height="250" fill="url(#timeOverlay)"
          style={{ transition: "opacity 2s ease" }} />

        {/* Location nodes */}
        {Object.entries(LOCATION_COORDS).map(([name, pos]) => {
          const isCurrent = currentLocation === name;
          const npcsHere = npcsAtLocation(name);
          return (
            <g key={name}>
              {/* Location dot */}
              <circle
                cx={pos.x} cy={pos.y}
                r={isCurrent ? 12 : 8}
                fill={isCurrent ? accent : "#1a1a2e"}
                stroke={isCurrent ? accent : "#3a3a5a"}
                strokeWidth="2"
                style={{
                  cursor: "pointer",
                  transition: "all 0.5s ease",
                  filter: isNight ? "url(#nightGlow)" : undefined,
                }}
                onClick={() => onLocationClick(name)}
              />
              {/* NPC indicators */}
              {npcsHere.map(([id]) => (
                <circle key={id}
                  cx={pos.x + 16} cy={pos.y - 16} r="5"
                  fill={NPC_COLORS[id] || "#888"}
                  stroke="#0d0d24" strokeWidth="1"
                  className={id === selectedNPC ? "animate-pulse" : ""}
                  style={{
                    animation: "pulseGlow 1.5s ease-in-out infinite",
                    cursor: "pointer",
                  }}
                  onClick={(e) => { e.stopPropagation(); onNPCClick(id); }}
                />
              ))}
              {/* Location label */}
              <text x={pos.x} y={pos.y + 22} textAnchor="middle"
                fill={isCurrent ? accent : "#666"}
                fontSize="9" fontWeight={isCurrent ? "bold" : "normal"}
                style={{ transition: "fill 0.5s ease" }}>
                {name}
              </text>
            </g>
          );
        })}

        {/* Player indicator */}
        {(() => {
          const pos = LOCATION_COORDS[currentLocation];
          if (!pos) return null;
          return (
            <text x={pos.x} y={pos.y - 20} textAnchor="middle" fill="#fff" fontSize="10"
              className="animate-bounce">
              ▼
            </text>
          );
        })()}
      </svg>

      {/* NPC list at current location */}
      <div className="mt-3 pt-3 border-t border-[#1a1a2e]">
        <p className="text-xs text-gray-500 mb-2">当前在此地的NPC:</p>
        {npcsAtLocation(currentLocation).length === 0 ? (
          <p className="text-xs text-gray-600">无人</p>
        ) : (
          <div className="flex flex-wrap gap-1.5">
            {npcsAtLocation(currentLocation).map(([id]) => (
              <button key={id}
                onClick={() => onNPCClick(id)}
                className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                  selectedNPC === id
                    ? "border-[#ff6b9d] text-[#ff6b9d] bg-[#ff6b9d]/10"
                    : "border-[#2a2a4a] text-gray-400 hover:border-[#4a4a6a]"
                }`}>
                <span className="inline-block w-1.5 h-1.5 rounded-full mr-1"
                  style={{ backgroundColor: NPC_COLORS[id] || "#888" }} />
                {NPC_LABELS[id]}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add pulse-glow keyframe to global CSS**

Append to `app/globals.css`:

```css
@keyframes pulseGlow {
  0%, 100% { r: 5; opacity: 1; }
  50% { r: 7; opacity: 0.6; }
}
```

- [ ] **Step 3: Integrate TownMap into page.tsx**

In `app/butterfly/page.tsx`:
- Remove the `LOCATION_COORDS`, `NPC_COLORS`, `NPC_LABELS` constants (moved to TownMap)
- Remove the inline SVG map section (the entire `<div className="bg-[#0d0d24]...">` containing the SVG and NPC sections)
- Add import: `import { TownMap } from "@/components/game/TownMap";`
- Replace the removed section with:

```tsx
<TownMap
  currentLocation={state.currentLocation}
  timeOfDay={state.timeOfDay}
  npcs={state.npcs}
  selectedNPC={selectedNPC}
  onLocationClick={handleInvestigate}
  onNPCClick={handleNPCClick}
/>
```

- [ ] **Step 4: Verify the app compiles and renders**

```bash
npx tsc --noEmit 2>&1 | head -30
```

- [ ] **Step 5: Commit**

```bash
git add components/game/TownMap.tsx app/butterfly/page.tsx app/globals.css
git commit -m "feat(ui): extract TownMap component with time-of-day lighting from page.tsx"
```

---

### Task 4: PixelEvent enhancement — new effects + audio integration

**Files:**
- Modify: `components/ui/PixelEvent.tsx`

- [ ] **Step 1: Add import for audio and new NPC awakening effect**

At the top of `components/ui/PixelEvent.tsx`, add the import:

```typescript
import { useEffect } from "react";
import { playEventSound } from "@/lib/audio";
```

And inside the `PixelEvent` component function, add the audio call after the existing `useEffect` for duration:

```typescript
export function PixelEvent({ event, onDone }: { event: PixelEventData; onDone: () => void }) {
  useEffect(() => {
    const timer = setTimeout(onDone, event.duration || 2500);
    return () => clearTimeout(timer);
  }, [event, onDone]);

  // Play sound for supported event types
  useEffect(() => {
    const audioTypes = ["causal_ripple", "discovery", "secret", "breakthrough", "loop_reset", "loop_break", "npc_awakening"];
    if (audioTypes.includes(event.type)) {
      playEventSound(event.type as Parameters<typeof playEventSound>[0]);
    }
  }, [event.type]);
  // ... rest of component
```

- [ ] **Step 2: Enhance TimeResetEffect → add shatter animation**

Replace the existing `TimeResetEffect` function with an enhanced version that shows screen-shatter + reassemble:

```typescript
function TimeResetEffect() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
      {/* Shatter fragments */}
      <div className="shatter-container w-48 h-48 relative">
        {Array.from({ length: 12 }).map((_, i) => {
          const angle = (i / 12) * Math.PI * 2;
          const dist = 30 + Math.random() * 40;
          return (
            <div key={i} className="shatter-piece absolute bg-[#ff6b9d]/60"
              style={{
                width: `${8 + Math.random() * 16}px`,
                height: `${6 + Math.random() * 14}px`,
                left: "50%", top: "50%",
                animation: `shatterOut 0.8s ease-out ${i * 30}ms forwards, shatterIn 0.6s ease-in ${800 + i * 30}ms forwards`,
                opacity: 0,
                clipPath: `polygon(${Array.from({length: 4}, () => `${Math.random()*100}% ${Math.random()*100}%`).join(",")})`,
              }} />
          );
        })}
      </div>
      {/* Clock hands spinning backward */}
      <svg width="80" height="80" viewBox="0 0 80 80" style={{ animation: "fadeIn 0.3s ease-out 1.2s both" }}>
        <circle cx="40" cy="40" r="35" fill="none" stroke="#ff6b9d" strokeWidth="2" />
        <line x1="40" y1="40" x2="40" y2="18" stroke="#ff6b9d" strokeWidth="2"
          style={{ animation: "clockSpinReverse 0.5s linear infinite", transformOrigin: "40px 40px" }} />
      </svg>
      <span className="text-[#ff6b9d] text-2xl font-mono font-bold" style={{ animation: "fadeIn 0.3s ease-out 1.4s both" }}>
        LOOP RESET
      </span>
    </div>
  );
}
```

- [ ] **Step 3: Add NPC awakening effect component**

Add a new function after the existing effects:

```typescript
function NPCAwakeningEffect() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-2">
      {/* Glitch strips */}
      <div className="w-48 flex flex-col gap-1 overflow-hidden">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="glitch-strip" style={{
            animationDelay: `${i * 60}ms`,
            height: `${4 + (i % 3) * 4}px`,
            backgroundColor: i % 2 === 0 ? "#ff6b9d" : "#ffcc00",
            opacity: 0.3 + i * 0.1,
            clipPath: `inset(0 ${10 + i * 5}% 0 ${5 + i * 3}%)`,
            animation: "glitchSlide 0.4s ease-out both",
          }} />
        ))}
      </div>
      {/* Brain/synapse symbol */}
      <span className="text-3xl" style={{ animation: "scaleIn 0.5s ease-out 0.4s both" }}>🧠</span>
      <span className="text-[#ffcc00] text-xs font-mono animate-pulse"
        style={{ animation: "fadeIn 0.5s ease-out 0.6s both" }}>
        MEMORY AWAKENED
      </span>
    </div>
  );
}
```

- [ ] **Step 4: Wire up the new npc_awakening event type in the render switch**

In the main `PixelEvent` component's return, add the `npc_awakening` condition in the effect type switch:

```tsx
{event.type === "npc_awakening" && <NPCAwakeningEffect />}
```

Place it after the existing `loop_break` condition.

- [ ] **Step 5: Add new CSS keyframes to global CSS**

Append to `app/globals.css`:

```css
@keyframes shatterOut {
  0% { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(1); }
  100% { opacity: 0; transform: translate(var(--tx, 40px), var(--ty, 40px)) rotate(var(--tr, 45deg)) scale(0.3); }
}
@keyframes shatterIn {
  0% { opacity: 0; transform: translate(var(--tx, -20px), var(--ty, -20px)) rotate(var(--tr, -45deg)) scale(0.3); }
  100% { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(1); }
}
@keyframes clockSpinReverse {
  from { transform: rotate(0deg); }
  to { transform: rotate(-360deg); }
}
@keyframes glitchSlide {
  0% { transform: translateX(-100%); opacity: 0; }
  100% { transform: translateX(0); opacity: 1; }
}
```

- [ ] **Step 6: Commit**

```bash
git add components/ui/PixelEvent.tsx app/globals.css
git commit -m "feat(ui): enhance PixelEvent with NPC awakening effect, shatter animation, and audio integration"
```

---

### Task 5: LoopGoalBanner — objective + inference progress

**Files:**
- Create: `components/game/LoopGoalBanner.tsx`
- Modify: `app/butterfly/page.tsx` (replace key event text section)

- [ ] **Step 1: Create LoopGoalBanner component**

```typescript
// components/game/LoopGoalBanner.tsx
"use client";

const MYSTERY_ICONS: Record<string, string> = {
  tower: "🏚",
  plague: "🦠",
  invasion: "👥",
};

const MYSTERY_NAMES: Record<string, string> = {
  tower: "钟楼倒塌",
  plague: "诡异瘟疫",
  invasion: "外来者入侵",
};

interface LoopGoalBannerProps {
  activeMystery: "tower" | "plague" | "invasion";
  keyEvent: { description: string; prevented: boolean; requiredConditions: string[] };
  actionPoints: number;
  maxActionPoints: number;
  loopGoal: string;
  loopNumber: number;
}

export function LoopGoalBanner({ activeMystery, keyEvent, actionPoints, maxActionPoints, loopGoal, loopNumber }: LoopGoalBannerProps) {
  const completedConditions = keyEvent.requiredConditions.filter(c => c.includes("✓")).length;
  const totalConditions = keyEvent.requiredConditions.length;
  const progressPct = totalConditions > 0 ? (completedConditions / totalConditions) * 100 : 0;
  const circumference = 2 * Math.PI * 22; // r=22
  const strokeDashoffset = circumference - (progressPct / 100) * circumference;
  const apPct = (actionPoints / maxActionPoints) * 100;
  const apLow = actionPoints <= 2;

  return (
    <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
      <div className="flex items-start gap-4">
        {/* Progress ring */}
        <div className="relative w-14 h-14 shrink-0">
          <svg width="56" height="56" viewBox="0 0 56 56">
            <circle cx="28" cy="28" r="22" fill="none" stroke="#1a1a2e" strokeWidth="4" />
            <circle cx="28" cy="28" r="22" fill="none" stroke="#ff6b9d" strokeWidth="4"
              strokeDasharray={circumference} strokeDashoffset={strokeDashoffset}
              strokeLinecap="round" transform="rotate(-90 28 28)"
              style={{ transition: "stroke-dashoffset 0.8s ease" }} />
          </svg>
          <span className="absolute inset-0 flex items-center justify-center text-xs font-bold text-[#ff6b9d]">
            {completedConditions}/{totalConditions}
          </span>
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-lg">{MYSTERY_ICONS[activeMystery] || "❓"}</span>
            <span className="text-sm font-bold text-[#ff6b9d]">
              {MYSTERY_NAMES[activeMystery] || activeMystery}
            </span>
            <span className="text-xs text-gray-500">循环 #{loopNumber}</span>
          </div>
          <p className="text-xs text-gray-400 mb-2">{keyEvent.description}</p>

          {/* Loop goal */}
          {loopGoal && (
            <p className="text-xs text-[#ffcc00]/80 mb-2 italic">
              🎯 本轮目标: {loopGoal}
            </p>
          )}

          {/* Conditions */}
          <div className="flex flex-wrap gap-1">
            {keyEvent.requiredConditions.map((c, i) => (
              <span key={i} className={`text-[10px] px-2 py-0.5 rounded-full ${
                c.includes("✓") ? "bg-green-400/10 text-green-400" : "bg-[#1a1a2e] text-gray-500"
              }`}>
                {c.includes("✓") ? "✓ " : "☐ "}{c.replace("✓ ", "")}
              </span>
            ))}
          </div>
        </div>

        {/* AP indicator */}
        <div className="shrink-0 text-center">
          <div className={`text-lg font-mono font-bold ${apLow ? "text-red-400 animate-pulse" : "text-[#ff6b9d]"}`}
            style={{ transition: "color 0.3s" }}>
            {actionPoints}
          </div>
          <div className="text-[10px] text-gray-500">/ {maxActionPoints} AP</div>
          <div className="mt-1 w-12 h-1 bg-[#1a1a2e] rounded-full overflow-hidden">
            <div className="h-full bg-[#ff6b9d] rounded-full transition-all duration-300"
              style={{ width: `${apPct}%` }} />
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Integrate into page.tsx**

In `app/butterfly/page.tsx`:
- Add import: `import { LoopGoalBanner } from "@/components/game/LoopGoalBanner";`
- Add a `loopGoal` state: `const [loopGoal, setLoopGoal] = useState("");`
- Replace the key event banner div (the `<div className="bg-[#ff6b9d]/5...">` block) with:

```tsx
<LoopGoalBanner
  activeMystery={state.activeMystery}
  keyEvent={state.keyEvent}
  actionPoints={state.actionPoints}
  maxActionPoints={state.maxActionPoints}
  loopGoal={loopGoal}
  loopNumber={state.loopNumber}
/>
```

- [ ] **Step 3: Commit**

```bash
git add components/game/LoopGoalBanner.tsx app/butterfly/page.tsx
git commit -m "feat(ui): add LoopGoalBanner with inference progress ring and loop objective"
```

---

### Task 6: LoopSummary — end-of-loop comparison

**Files:**
- Create: `components/game/LoopSummary.tsx`
- Modify: `app/butterfly/page.tsx` (add after loop end)

- [ ] **Step 1: Create LoopSummary component**

```typescript
// components/game/LoopSummary.tsx
"use client";

interface LoopChange {
  label: string;
  before: string;
  after: string;
}

interface LoopSummaryProps {
  loopNumber: number;
  changes: LoopChange[];
  newClues: number;
  newCausalNodes: number;
  confirmedHypotheses: number;
  rejectedHypotheses: number;
  score: number;
  rating: string;
  onContinue: () => void;
}

export function LoopSummary({ loopNumber, changes, newClues, newCausalNodes, confirmedHypotheses, rejectedHypotheses, score, rating, onContinue }: LoopSummaryProps) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/70"
      style={{ animation: "fadeIn 0.3s ease-out" }}>
      <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-6 w-full max-w-lg mx-4"
        style={{ animation: "scaleIn 0.4s ease-out" }}>
        <h3 className="text-lg font-bold text-[#ff6b9d] text-center mb-4">
          🔄 第 {loopNumber} 次循环结束
        </h3>

        {/* What changed */}
        {changes.length > 0 && (
          <div className="mb-4">
            <p className="text-xs text-gray-500 mb-2 uppercase tracking-wider">NPC 行为变化</p>
            <div className="space-y-2">
              {changes.map((c, i) => (
                <div key={i} className="flex items-stretch gap-2 text-xs">
                  <div className="flex-1 bg-[#1a1a2e] rounded p-2 text-gray-500 line-through">{c.before}</div>
                  <span className="flex items-center text-[#ff6b9d]">→</span>
                  <div className="flex-1 bg-[#ff6b9d]/5 border border-[#ff6b9d]/20 rounded p-2 text-[#ff6b9d]">{c.after}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <div className="bg-[#1a1a2e] rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-[#ff6b9d]">{newClues}</p>
            <p className="text-[10px] text-gray-500">新线索</p>
          </div>
          <div className="bg-[#1a1a2e] rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-[#ff6b9d]">{newCausalNodes}</p>
            <p className="text-[10px] text-gray-500">因果链</p>
          </div>
          <div className="bg-[#1a1a2e] rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-green-400">{confirmedHypotheses}</p>
            <p className="text-[10px] text-gray-500">假设确认</p>
          </div>
          <div className="bg-[#1a1a2e] rounded-lg p-3 text-center">
            <p className="text-lg font-bold text-red-400">{rejectedHypotheses}</p>
            <p className="text-[10px] text-gray-500">假设驳回</p>
          </div>
        </div>

        {/* Score */}
        <div className="text-center mb-4">
          <p className="text-xs text-gray-500">评分</p>
          <p className="text-2xl font-bold text-[#ff6b9d]">{score}</p>
          <p className="text-xs text-[#ffcc00] font-mono">评级: {rating}</p>
        </div>

        <button onClick={onContinue}
          className="w-full py-2 rounded-lg bg-[#ff6b9d]/20 border border-[#ff6b9d]/40 text-[#ff6b9d]
                   hover:bg-[#ff6b9d]/30 transition-colors text-sm">
          进入下一次循环 →
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add loop summary state to page.tsx**

In `app/butterfly/page.tsx`:
- Add import: `import { LoopSummary } from "@/components/game/LoopSummary";`
- Add state: `const [showLoopSummary, setShowLoopSummary] = useState(false);`
- Add `prevStatsRef` to track previous-loop stats for comparison:

```typescript
const prevStatsRef = useRef({ causalCount: 0, clueCount: 0, hypConfirmed: 0, hypRejected: 0 });
```

- Add a `useEffect` to detect loop end and trigger summary:

```typescript
useEffect(() => {
  if (state.timeOfDay >= 24 && !showLoopSummary) {
    setShowLoopSummary(true);
  }
}, [state.timeOfDay, showLoopSummary]);
```

- Add the component at the bottom of the return (before PixelEvent):

```tsx
{showLoopSummary && (
  <LoopSummary
    loopNumber={state.loopNumber}
    changes={[]}  // populated via useMemo comparing current vs previous NPC states
    newClues={state.playerJournal.filter(e => e.loopNumber === state.loopNumber).length - prevStatsRef.current.clueCount}
    newCausalNodes={state.causalGraph.length - prevStatsRef.current.causalCount}
    confirmedHypotheses={state.hypotheses.filter(h => h.status === "confirmed").length - prevStatsRef.current.hypConfirmed}
    rejectedHypotheses={state.hypotheses.filter(h => h.status === "rejected").length - prevStatsRef.current.hypRejected}
    score={calculateScore(state)}
    rating={getRating(calculateScore(state))}
    onContinue={() => {
      setShowLoopSummary(false);
      prevStatsRef.current = {
        causalCount: state.causalGraph.length,
        clueCount: state.playerJournal.filter(e => e.loopNumber === state.loopNumber).length,
        hypConfirmed: state.hypotheses.filter(h => h.status === "confirmed").length,
        hypRejected: state.hypotheses.filter(h => h.status === "rejected").length,
      };
      handleNewLoop();
    }}
  />
)}
```

- [ ] **Step 3: Commit**

```bash
git add components/game/LoopSummary.tsx app/butterfly/page.tsx
git commit -m "feat(ui): add LoopSummary end-of-loop comparison panel with score display"
```

---

### Task 7: Operation routing in useButterfly hook

**Files:**
- Modify: `hooks/useButterfly.ts`

- [ ] **Step 1: Add local cache and quick action methods**

In `hooks/useButterfly.ts`, after the existing `useButterfly` function's state declaration, add local cache state and quick-action handlers:

```typescript
// Add after the existing state + dispatch lines in useButterfly():
const [loopPrep, setLoopPrep] = useState<LoopPreparation | null>(null);

// Quick move: update location locally, no API call
const quickMove = useCallback((location: string) => {
  if (LOCATIONS.includes(location)) {
    dispatch({ type: "SET_LOCATION", payload: location });
    dispatch({ type: "ADD_JOURNAL", payload: {
      loopNumber: state.loopNumber,
      timeOfDay: state.timeOfDay,
      content: `移动到${location}`,
      type: "observation",
    }});
    dispatch({ type: "USE_AP", payload: 1 });
  }
}, [state.loopNumber, state.timeOfDay]);

// Quick investigate: check local prep cache first
const quickInvestigate = useCallback((location: string, action: string) => {
  // Check prepare-loop cache
  const matchedClue = loopPrep?.discoverableClues.find(
    c => c.location === location &&
         state.timeOfDay >= c.timeWindow.start &&
         state.timeOfDay <= c.timeWindow.end &&
         action.includes(c.requiredAction)
  );

  if (matchedClue) {
    // Local hit — immediate result
    dispatch({ type: "USE_AP", payload: 2 });
    dispatch({ type: "ADD_JOURNAL", payload: {
      loopNumber: state.loopNumber,
      timeOfDay: state.timeOfDay,
      content: `发现: ${matchedClue.description}`,
      type: "observation",
    }});
    dispatch({ type: "ADD_INSIGHT", payload: 1 });
    if (matchedClue.revealsFragment) {
      dispatch({ type: "ADD_FRAGMENTS", payload: [{
        id: matchedClue.revealsFragment,
        description: matchedClue.description,
        relatedNPCs: [],
        relatedTime: state.timeOfDay,
        relatedLocation: location,
        hints: [],
        isPlaced: false,
      }]});
    }
    return true; // handled locally
  }
  return false; // fall through to API
}, [loopPrep, state.timeOfDay, state.loopNumber]);
```

- [ ] **Step 2: Modify sendAction to use operation routing**

In the existing `sendAction` callback, add routing logic at the beginning (before the API fetch):

```typescript
const sendAction = useCallback(
  async (actionType: "talk" | "investigate" | "intervene", playerInput: string, targetNPC?: string) => {
    // ---- Route: investigate with possible local cache hit ----
    if (actionType === "investigate" && state.currentLocation) {
      const handled = quickInvestigate(state.currentLocation, playerInput);
      if (handled) return; // locally resolved, skip API
    }

    // ---- Existing logic below ----
    const apCost: Record<typeof actionType, number> = { talk: 1, investigate: 2, intervene: 3 };
    dispatch({ type: "USE_AP", payload: apCost[actionType] });
    // ... rest of existing sendAction unchanged
```

- [ ] **Step 3: Add prepare-loop call in startNewLoop**

Modify `startNewLoop` to also call the new prepare-loop API:

```typescript
const startNewLoop = useCallback(async () => {
  dispatch({ type: "SET_LOADING", payload: true });
  try {
    // Call prepare-loop first for pre-generation
    const prepRes = await fetch("/api/butterfly/prepare-loop", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        loopNumber: state.loopNumber,
        previousCausalGraph: state.causalGraph,
        npcStates: state.npcs,
        activeMystery: state.activeMystery,
      }),
    });
    if (prepRes.ok) {
      const prepData = await prepRes.json();
      if (!prepData.error) {
        setLoopPrep(prepData as LoopPreparation);
      }
    }

    // Existing loop-start call...
    const res = await fetch("/api/butterfly/loop-start", { /* ...unchanged... */ });
    // ... rest of existing startNewLoop unchanged
```

- [ ] **Step 4: Add auto-loop transition in newLoop**

Modify `newLoop` to be an auto-transition instead of manual trigger. Add `isLoopTransitioning` state and `triggerLoopReset`:

```typescript
const [isLoopTransitioning, setIsLoopTransitioning] = useState(false);

const triggerLoopReset = useCallback(async () => {
  setIsLoopTransitioning(true);
  // The PixelEvent loop_reset plays for ~3s
  await new Promise(r => setTimeout(r, 3000));
  const nextLoop = state.loopNumber + 1;
  dispatch({
    type: "START_LOOP",
    payload: Object.fromEntries(
      Object.entries(state.npcs).map(([name, npc]) => [name, {
        mood: npc.currentMood, location: npc.location, dialogue: "", dejaVu: "",
      }])
    ),
  });
  dispatch({ type: "ADD_JOURNAL", payload: {
    loopNumber: nextLoop, timeOfDay: 7,
    content: `--- 第${nextLoop}次循环开始 ---`, type: "observation",
  }});
  setIsLoopTransitioning(false);
  // Auto-start the new loop
  await startNewLoop();
}, [state, startNewLoop]);
```

- [ ] **Step 5: Add the new exports to the return statement**

Add to the return object:
```typescript
return {
  state,
  startNewLoop, sendAction, newLoop, resetGame,
  anchorChain, placeFragment, connectFragments,
  // New exports:
  quickMove,
  triggerLoopReset,
  isLoopTransitioning,
  loopGoal: loopPrep?.loopGoal || "",
  // convenience:
  isLoading: /* ... */,
  error: /* ... */,
  timeOfDay: state.timeOfDay,
  isDayEnd: state.timeOfDay >= 24,
};
```

- [ ] **Step 6: Add imports at top of useButterfly.ts**

```typescript
import { useReducer, useCallback, useState, useRef } from "react";
import type { /* ...existing... */ LoopPreparation } from "@/lib/types";
```

- [ ] **Step 7: Commit**

```bash
git add hooks/useButterfly.ts
git commit -m "feat(hook): add operation routing, local clue cache, auto loop transition to useButterfly"
```

---

### Task 8: Prepare-loop API endpoint

**Files:**
- Create: `app/api/butterfly/prepare-loop/route.ts`

- [ ] **Step 1: Create the prepare-loop API route**

```typescript
// app/api/butterfly/prepare-loop/route.ts
import { NextRequest } from "next/server";
import { callAI, extractJSON } from "@/lib/ai-client";
import { BUTTERFLY_SYSTEM } from "@/lib/prompts/butterfly/system";
import type { ButterflyStateV2, NPCStateV2 } from "@/lib/types";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { loopNumber, previousCausalGraph, npcStates, activeMystery } = body as {
      loopNumber: number;
      previousCausalGraph: ButterflyStateV2["causalGraph"];
      npcStates: Record<string, NPCStateV2>;
      activeMystery: string;
    };

    const causalSummary = (previousCausalGraph || [])
      .slice(-10)
      .map((n: any) => `- [循环${n.loopNumber}] ${n.action} → ${n.affectedNPCs?.join(",")}: ${n.consequenceDescription}`)
      .join("\n");

    const npcSummary = Object.entries(npcStates || {})
      .map(([id, n]: [string, any]) =>
        `- ${n.name}: 觉醒度${n.memoryAwakening || 0} (${n.awakeningStage || "dormant"}), 位置${n.location}, 情绪${n.currentMood}`
      ).join("\n");

    const systemPrompt = `${BUTTERFLY_SYSTEM}

## 额外任务：预生成循环数据
你需要为即将开始的循环预生成可发现线索和NPC行程。

输出格式（严格JSON，无markdown包裹）：
{
  "npcSchedules": {
    "elias": [{ "timeStart": 7, "timeEnd": 12, "location": "钟楼" }],
    "rose": [{ "timeStart": 7, "timeEnd": 18, "location": "花店" }],
    "marcus": [{ "timeStart": 8, "timeEnd": 18, "location": "诊所" }],
    "brooks": [{ "timeStart": 8, "timeEnd": 18, "location": "警局" }],
    "vera": [{ "timeStart": 9, "timeEnd": 18, "location": "图书馆" }],
    "sam": [{ "timeStart": 7, "timeEnd": 24, "location": "广场" }]
  },
  "discoverableClues": [
    {
      "id": "clue_01",
      "location": "钟楼",
      "timeWindow": { "start": 9, "end": 12 },
      "description": "地基裂缝中的旧怀表（中文，具体描述发现的物品或现象）",
      "requiredAction": "观察地基",
      "revealsFragment": "frag_clue_01"
    }
  ],
  "loopGoal": "本轮的推荐目标（中文，1句话）"
}`;

    const userMessage = `## 循环预生成 — 第${loopNumber}次循环

### 当前谜题: ${activeMystery}

### 因果图（最近10条）:
${causalSummary || "（尚无因果积累）"}

### NPC状态:
${npcSummary}

请生成本轮的可发现线索（至少4个，分布在不同地点和时间段）、NPC行程计划、以及建议的玩家目标。`;

    const result = await callAI(systemPrompt, userMessage, { temperature: 0.7 });
    return Response.json(result);
  } catch (err) {
    return Response.json(
      { error: err instanceof Error ? err.message : "AI调用失败" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 2: Commit**

```bash
git add app/api/butterfly/prepare-loop/route.ts
git commit -m "feat(api): add prepare-loop endpoint for pre-generating discoverable clues and NPC schedules"
```

---

### Task 9: Phased SSE streaming in action API

**Files:**
- Modify: `app/api/butterfly/action/route.ts`

- [ ] **Step 1: Refactor to send phase events during streaming**

Replace the `start` callback in the `ReadableStream` constructor to emit phased events:

In `app/api/butterfly/action/route.ts`, replace the current streaming logic inside `start()` with:

```typescript
const readable = new ReadableStream({
  async start(controller) {
    try {
      // --- Phase 1: Send NPC state change immediately if talking ---
      if (actionType === "talk" && targetNPC) {
        const npc = gameState.npcs[targetNPC] as NPCStateV2;
        const toneGuess = playerInput.includes("质问") ? "defensive" :
                          playerInput.includes("关心") ? "warm" :
                          playerInput.includes("秘密") ? "secretive" : "calm";
        controller.enqueue(encoder.encode({
          type: "npc_state_change",
          data: { npcId: targetNPC, mood: "思考中...", tone: toneGuess },
        }));
      }

      // --- Phase 2: Stream dialogue chunks ---
      let dialogueStarted = false;

      await callAIStream(
        systemPrompt,
        userMessage,
        (chunk) => {
          fullText += chunk;

          // Try to extract dialogue early from partial JSON
          if (!dialogueStarted) {
            const dialogueMatch = fullText.match(/"dialogue"\s*:\s*"([^"]{5,})/);
            if (dialogueMatch && targetNPC) {
              dialogueStarted = true;
              controller.enqueue(encoder.encode({
                type: "dialogue_start",
                data: { npc: targetNPC, preview: dialogueMatch[1].slice(0, 30) + "..." },
              }));
            }
          }
        },
        { temperature: 0.8 }
      );

      // --- Phase 3: Parse and emit structured data ---
      const jsonStr = extractJSON(fullText);
      try {
        const parsed = JSON.parse(jsonStr);

        // Emit causal fragments immediately
        if (parsed.causalFragments?.length > 0) {
          controller.enqueue(encoder.encode({
            type: "causal_fragment",
            data: { fragments: parsed.causalFragments },
          }));
        }

        // Emit timeline updates immediately
        if (parsed.timelineNodesUnlocked?.length > 0) {
          controller.enqueue(encoder.encode({
            type: "timeline_update",
            data: { nodes: parsed.timelineNodesUnlocked },
          }));
        }

        // Final state update with everything
        controller.enqueue(encoder.encode({ type: "state_update", data: parsed }));
      } catch {
        controller.enqueue(encoder.encode({ type: "error", message: "AI响应解析失败" }));
      }

      controller.enqueue(encoder.done());
      controller.close();
    } catch (err) {
      controller.enqueue(
        encoder.encode({ type: "error", message: err instanceof Error ? err.message : "AI调用失败" })
      );
      controller.close();
    }
  },
});
```

- [ ] **Step 2: Add frontend handling for new SSE event types**

In `hooks/useButterfly.ts`, inside the `sendAction`'s SSE reader loop, add handlers for the new event types:

```typescript
// Inside the SSE reader while loop, add to the if/else chain:
} else if (event.type === "npc_state_change") {
  // Early NPC mood update before dialogue arrives
  const d = event.data as { npcId: string; mood: string };
  // Update NPC mood optimistically
  dispatch({
    type: "ADD_DIALOGUE",
    payload: { role: "npc", npcName: d.npcId, content: "..." },
  });
} else if (event.type === "causal_fragment") {
  const d = event.data as { fragments: CausalFragment[] };
  if (d.fragments?.length > 0) {
    dispatch({ type: "ADD_FRAGMENTS", payload: d.fragments });
  }
} else if (event.type === "timeline_update") {
  const d = event.data as { nodes: TimelineNode[] };
  if (d.nodes?.length > 0) {
    dispatch({ type: "UNLOCK_TIMELINE_NODES", payload: d.nodes });
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add app/api/butterfly/action/route.ts hooks/useButterfly.ts
git commit -m "feat(api): add phased SSE streaming with early NPC state, dialogue preview, and immediate fragment delivery"
```

---

### Task 10: System prompt adjustment

**Files:**
- Modify: `lib/prompts/butterfly/system.ts`

- [ ] **Step 1: Rewrite system prompt to prioritize state over narration**

Replace the content of `BUTTERFLY_SYSTEM`:

```typescript
export const BUTTERFLY_SYSTEM = `你是"蝴蝶效应"时间循环游戏的因果状态引擎。你的首要任务是用结构化数据驱动游戏世界，文本精炼。

## 世界
橡木镇（Oakvale），300年历史。玩家被困在7:00到午夜的循环中。
每次循环重置NPC记忆，但因果层面留下"涟漪"。玩家每轮8AP。

## 核心原则
1. **你不是小说家，你是状态引擎。** NPC对话不超过3句。
2. **线索藏在系统数据中。** 用时间、地点、物品条件来隐藏信息，而非直接告诉玩家。
3. **每个NPC回复都必须嵌入可跟进的线索。** 至少暗示一个新地点或新时间。
4. **优先输出结构化字段。** causalFragments > timelineNodes > dialogue。

## 因果碎片
每次互动输出1-2个碎片（CausalFragment）。碎片是具体的因果卡片：
- description: 1句话因果描述
- relatedNPCs: 相关NPC
- relatedTime: 时间点(7-24)
- relatedLocation: 地点
- hints: ["指向其他碎片的线索"]

## 时间线节点
调查揭示新信息时解锁TimelineNode：
- time: 时间点 | location: 地点 | npcsPresent: 在场NPC
- events: ["事件描述"] | isCritical: 是否关键 | mysteryStatus: hidden/suspicious/revealed

## 锚定因果
已锚定因果链在循环重置后保留：
- 相关NPC保留部分记忆（memoryAwakening+20）
- 事件可能偏移 | 地点状态可能改变

## 记忆觉醒阶段
dormant(0-20) → deja_vu(21-40) → aware(41-60) → ally(61-80) → unstable(81-100)

## 输出格式
对话场景:
{
  "npcName": "...",
  "dialogue": "NPC说的话（中文，≤3句）",
  "tone": "warm|sad|nervous|secretive|frightened|calm|mysterious",
  "clues": ["隐含线索"],
  "followUpTopics": ["可追问话题"],
  "causalFragments": [{ "id":"frag_N", ... }],
  "timelineNodesUnlocked": [{ "id":"tln_time_loc", ... }]
}

调查/干预场景:
{
  "hasCausalImpact": true,
  "causalNode": { "action":"...", "affectedNPCs":[], "consequenceDescription":"...", "magnitude":3 },
  "result": "结果描述（≤2句）",
  "discovery": "发现内容",
  "causalFragments": [...],
  "timelineNodesUnlocked": [...]
}`;
```

- [ ] **Step 2: Commit**

```bash
git add lib/prompts/butterfly/system.ts
git commit -m "refactor(prompt): reposition AI from narrator to state engine, enforce brevity and structured output"
```

---

### Task 11: CausalCanvas — connection lines enhancement

**Files:**
- Modify: `components/game/CausalCanvas.tsx`

- [ ] **Step 1: Add SVG connection lines between placed fragments**

In `CausalCanvas.tsx`, add an SVG overlay for connection lines. After the Grid background SVG, before the placed fragments div:

```tsx
{/* Connection lines */}
<svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ zIndex: 5 }}>
  {placed.flatMap(p =>
    p.connections.map(targetId => {
      const target = placed.find(t => t.id === targetId);
      if (!target) return null;
      return (
        <line key={`${p.id}-${targetId}`}
          x1={p.x + CARD_WIDTH / 2} y1={p.y + CARD_HEIGHT / 2}
          x2={target.x + CARD_WIDTH / 2} y2={target.y + CARD_HEIGHT / 2}
          stroke="#ff6b9d" strokeWidth="1.5" strokeDasharray="4 2"
          opacity={0.5} />
      );
    })
  )}
</svg>
```

- [ ] **Step 2: Add connect-on-drop for nearby fragments**

Add a helper function and modify `handleDrop` to auto-connect to nearby fragments:

```typescript
const CONNECT_DISTANCE = 80;

const findNearestFragment = useCallback((x: number, y: number, excludeId: string) => {
  let nearest: PlacedFragment | null = null;
  let minDist = CONNECT_DISTANCE;
  for (const p of placed) {
    if (p.id === excludeId) continue;
    const dist = Math.sqrt((p.x + CARD_WIDTH/2 - x) ** 2 + (p.y + CARD_HEIGHT/2 - y) ** 2);
    if (dist < minDist) {
      minDist = dist;
      nearest = p;
    }
  }
  return nearest;
}, [placed]);
```

Modify `handleDrop` to check for nearby fragments after placing:

```typescript
const handleDrop = useCallback((e: React.DragEvent, fragmentId: string) => {
  // ...existing positioning logic...
  const newPlaced: PlacedFragment = {
    id: fragment.id, x, y,
    description: fragment.description,
    relatedNPCs: fragment.relatedNPCs,
    isCorrect: null, connections: [],
  };

  // Check for nearby fragments to auto-connect
  const nearby = findNearestFragment(x + CARD_WIDTH/2, y + CARD_HEIGHT/2, fragmentId);
  if (nearby) {
    newPlaced.connections = [...nearby.connections, nearby.id];
    setPlaced(prev => prev.map(p =>
      p.id === nearby!.id ? { ...p, connections: [...p.connections, fragmentId] } : p
    ));
    onConnectFragments(fragmentId, nearby.id);
  }

  setPlaced(prev => [...prev, newPlaced]);
  onPlaceFragment(fragmentId, x, y);
}, [fragments, onPlaceFragment, findNearestFragment, onConnectFragments]);
```

- [ ] **Step 3: Commit**

```bash
git add components/game/CausalCanvas.tsx
git commit -m "feat(ui): add SVG connection lines between placed CausalCanvas fragments with auto-connect"
```

---

### Task 12: NPCRelationRadar — SVG radar chart

**Files:**
- Create: `components/game/NPCRelationRadar.tsx`
- Modify: `app/butterfly/page.tsx` (integrate)

- [ ] **Step 1: Create NPCRelationRadar component**

```typescript
// components/game/NPCRelationRadar.tsx
"use client";

import type { NPCStateV2 } from "@/lib/types";

const NPC_COLORS: Record<string, string> = {
  elias: "#ffcc00", rose: "#ff6b9d", marcus: "#64b5f6",
  brooks: "#8888ff", vera: "#bb66ff", sam: "#88aa88",
};

const NPC_LABELS: Record<string, string> = {
  elias: "Elias", rose: "Rose", marcus: "Marcus",
  brooks: "Brooks", vera: "Vera", sam: "Sam",
};

interface NPCRelationRadarProps {
  npcs: Record<string, NPCStateV2>;
  selectedNPC: string | null;
  onSelectNPC: (id: string) => void;
}

export function NPCRelationRadar({ npcs, selectedNPC, onSelectNPC }: NPCRelationRadarProps) {
  const npcEntries = Object.entries(npcs);
  const center = { x: 150, y: 130 };
  const radius = 90;
  const angleStep = (2 * Math.PI) / npcEntries.length;

  const getPoint = (index: number, distance: number) => ({
    x: center.x + Math.cos(angleStep * index - Math.PI / 2) * distance,
    y: center.y + Math.sin(angleStep * index - Math.PI / 2) * distance,
  });

  // Data polygon: uses awakening normalized to radius
  const dataPoints = npcEntries.map(([, npc], i) => {
    const dist = (npc.awakeningStage === "dormant" ? 0.15 :
                  npc.awakeningStage === "deja_vu" ? 0.35 :
                  npc.awakeningStage === "aware" ? 0.55 :
                  npc.awakeningStage === "ally" ? 0.75 : 0.95) * radius;
    return getPoint(i, dist);
  });

  const dataPath = dataPoints.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`).join(" ") + " Z";

  return (
    <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
      <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">NPC 关系网络</h3>
      <svg viewBox="0 0 300 270" className="w-full">
        {/* Background rings */}
        {[0.25, 0.5, 0.75, 1].map((scale) => (
          <polygon key={scale}
            points={npcEntries.map((_, i) => {
              const p = getPoint(i, radius * scale);
              return `${p.x},${p.y}`;
            }).join(" ")}
            fill="none" stroke="#1a1a2e" strokeWidth="1" />
        ))}

        {/* Axes */}
        {npcEntries.map((_, i) => {
          const outer = getPoint(i, radius);
          return <line key={i} x1={center.x} y1={center.y} x2={outer.x} y2={outer.y}
            stroke="#1a1a2e" strokeWidth="1" />;
        })}

        {/* Data polygon */}
        <polygon points={dataPoints.map(p => `${p.x},${p.y}`).join(" ")}
          fill="#ff6b9d" fillOpacity="0.15" stroke="#ff6b9d" strokeWidth="1.5"
          style={{ transition: "all 0.5s ease" }} />

        {/* NPC nodes */}
        {npcEntries.map(([id, npc], i) => {
          const pos = getPoint(i, radius + 20);
          const isSelected = id === selectedNPC;
          const isAwake = npc.awakeningStage !== "dormant";
          return (
            <g key={id} style={{ cursor: "pointer" }} onClick={() => onSelectNPC(id)}>
              {isAwake && (
                <circle cx={pos.x} cy={pos.y} r={isSelected ? 16 : 12}
                  fill="none" stroke={NPC_COLORS[id]} strokeWidth="1"
                  opacity={0.5} className="animate-pulse" />
              )}
              <circle cx={pos.x} cy={pos.y} r={6}
                fill={isSelected ? NPC_COLORS[id] : "#1a1a2e"}
                stroke={NPC_COLORS[id]} strokeWidth="2"
                style={{ transition: "all 0.3s" }} />
              <text x={pos.x} y={pos.y + 18} textAnchor="middle"
                fill={isSelected ? "#fff" : "#666"} fontSize="9"
                fontWeight={isSelected ? "bold" : "normal"}>
                {NPC_LABELS[id]}
              </text>
              {/* Awakening stage badge */}
              {isAwake && (
                <text x={pos.x} y={pos.y - 12} textAnchor="middle" fontSize="8"
                  fill={NPC_COLORS[id]}>
                  {npc.awakeningStage === "unstable" ? "⚠" :
                   npc.awakeningStage === "ally" ? "★" :
                   npc.awakeningStage === "aware" ? "●" : "◉"}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
```

- [ ] **Step 2: Integrate into page.tsx**

In `app/butterfly/page.tsx`:
- Add import: `import { NPCRelationRadar } from "@/components/game/NPCRelationRadar";`
- Add toggle state: `const [showRadar, setShowRadar] = useState(false);`
- Add toggle button next to existing panel toggles:

```tsx
<button onClick={() => setShowRadar(!showRadar)}
  className={`text-xs px-3 py-1.5 rounded border transition-colors ${
    showRadar ? "border-[#ff6b9d]/40 text-[#ff6b9d] bg-[#ff6b9d]/10"
    : "border-[#2a2a4a] text-gray-400 hover:text-white"
  }`}>
  🕸 {showRadar ? "隐藏雷达" : "关系雷达"}
</button>
```

- Replace the NPC list section with the radar (conditionally):

```tsx
{showRadar ? (
  <NPCRelationRadar
    npcs={state.npcs}
    selectedNPC={selectedNPC}
    onSelectNPC={handleNPCClick}
  />
) : (
  /* existing NPC text list */
)}
```

- [ ] **Step 3: Commit**

```bash
git add components/game/NPCRelationRadar.tsx app/butterfly/page.tsx
git commit -m "feat(ui): add NPCRelationRadar SVG radar chart for NPC relationship visualization"
```

---

### Task 13: AchievementToast and tracking

**Files:**
- Create: `components/ui/AchievementToast.tsx`
- Modify: `hooks/useButterfly.ts` (add achievement tracking logic)

- [ ] **Step 1: Create AchievementToast**

```typescript
// components/ui/AchievementToast.tsx
"use client";

import { useEffect, useState } from "react";

interface AchievementToastProps {
  id: string;
  name: string;
  description: string;
  onDone: () => void;
}

export function AchievementToast({ name, description, onDone }: AchievementToastProps) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 3500);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div className={`fixed top-4 right-4 z-50 transition-all duration-300 ${
      visible ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"
    }`}>
      <div className="bg-[#0d0d24] border border-[#ffcc00]/30 rounded-xl p-4 shadow-lg shadow-[#ffcc00]/5 max-w-xs">
        <div className="flex items-start gap-3">
          <span className="text-2xl">🏆</span>
          <div>
            <p className="text-xs text-[#ffcc00] font-bold mb-0.5">成就解锁</p>
            <p className="text-sm text-white font-bold">{name}</p>
            <p className="text-xs text-gray-400 mt-0.5">{description}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Add achievement checking in useButterfly**

In `hooks/useButterfly.ts`, add achievement detection logic. After the state declarations, add:

```typescript
import { BUTTERFLY_ACHIEVEMENTS } from "@/lib/types";

// Inside useButterfly():
const [unlockedAchievements, setUnlockedAchievements] = useState<Set<string>>(new Set());
const [pendingAchievement, setPendingAchievement] = useState<{ id: string; name: string; description: string } | null>(null);

// Achievement check helper — call after state changes
const checkAchievements = useCallback((currentState: ButterflyStateV2) => {
  const newUnlocks: string[] = [];

  if (currentState.loopNumber >= 2 && !unlockedAchievements.has("first_loop"))
    newUnlocks.push("first_loop");
  if (currentState.loopNumber >= 5 && !unlockedAchievements.has("five_loops"))
    newUnlocks.push("five_loops");
  if (currentState.hypotheses.some(h => h.status === "confirmed") && !unlockedAchievements.has("eureka"))
    newUnlocks.push("eureka");

  const awakenedNPCs = Object.values(currentState.npcs).filter(
    (n: any) => n.awakeningStage === "aware" || n.awakeningStage === "ally" || n.awakeningStage === "unstable"
  ).length;
  if (awakenedNPCs >= 1 && !unlockedAchievements.has("memory_awakened"))
    newUnlocks.push("memory_awakened");
  if (awakenedNPCs >= 6 && !unlockedAchievements.has("all_awakened"))
    newUnlocks.push("all_awakened");

  const npcsTalkedThisLoop = new Set(
    currentState.dialogueMessages.filter(m => m.role === "npc").map(m => m.npcName)
  ).size;
  if (npcsTalkedThisLoop >= 6 && !unlockedAchievements.has("all_npcs"))
    newUnlocks.push("all_npcs");

  if (currentState.keyEvent.prevented && currentState.loopNumber <= 3 && !unlockedAchievements.has("speed_run"))
    newUnlocks.push("speed_run");

  if (currentState.keyEvent.prevented) {
    const rating = getRating(calculateScore(currentState));
    if (rating === "S" && !unlockedAchievements.has("s_rank"))
      newUnlocks.push("s_rank");
  }

  if (newUnlocks.length > 0) {
    const next = newUnlocks[0];
    setUnlockedAchievements(prev => new Set([...prev, ...newUnlocks]));
    setPendingAchievement({
      id: next,
      name: BUTTERFLY_ACHIEVEMENTS[next].name,
      description: BUTTERFLY_ACHIEVEMENTS[next].description,
    });
  }
}, [unlockedAchievements]);
```

Add achievement checking calls inside `sendAction` after the SSE stream completes and inside `triggerLoopReset` after processing.

- [ ] **Step 3: Integrate AchievementToast into page.tsx**

```tsx
import { AchievementToast } from "@/components/ui/AchievementToast";

// Add to return, near the bottom:
{pendingAchievement && (
  <AchievementToast
    name={pendingAchievement.name}
    description={pendingAchievement.description}
    onDone={() => setPendingAchievement(null)}
  />
)}
```

- [ ] **Step 4: Commit**

```bash
git add components/ui/AchievementToast.tsx hooks/useButterfly.ts app/butterfly/page.tsx
git commit -m "feat(ui): add AchievementToast with 9 butterfly-specific achievements and auto-detection"
```

---

### Task 14: EvidenceBackpack and QuickActions (P2 — optional)

**Files:**
- Create: `components/game/EvidenceBackpack.tsx`
- Create: `components/game/QuickActions.tsx`
- Modify: `app/butterfly/page.tsx` (integrate)

- [ ] **Step 1: Create EvidenceBackpack**

```typescript
// components/game/EvidenceBackpack.tsx
"use client";

interface BackpackItem {
  id: string;
  name: string;
  description: string;
  sourceLocation: string;
  discoveredAt: number; // loopNumber
}

interface EvidenceBackpackProps {
  items: BackpackItem[];
  onUseItem: (item: BackpackItem) => void;
}

export function EvidenceBackpack({ items, onUseItem }: EvidenceBackpackProps) {
  if (items.length === 0) {
    return (
      <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
        <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">🎒 证物背包</h3>
        <p className="text-xs text-gray-600 italic">暂无证物。调查地点和对话NPC来收集线索。</p>
      </div>
    );
  }

  return (
    <div className="bg-[#0d0d24] border border-[#2a2a4a] rounded-xl p-4">
      <h3 className="text-xs text-gray-500 mb-3 uppercase tracking-wider">🎒 证物背包 ({items.length})</h3>
      <div className="grid grid-cols-2 gap-2">
        {items.map(item => (
          <button key={item.id}
            onClick={() => onUseItem(item)}
            className="text-left p-2 rounded border border-[#2a2a4a] bg-[#1a1a2e]
                     hover:border-[#ff6b9d]/30 transition-colors group">
            <p className="text-xs text-white truncate group-hover:text-[#ff6b9d]">{item.name}</p>
            <p className="text-[10px] text-gray-500 truncate">{item.description}</p>
            <p className="text-[9px] text-gray-600 mt-1">
              📍 {item.sourceLocation} · 循环{item.discoveredAt}
            </p>
          </button>
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Create QuickActions**

```typescript
// components/game/QuickActions.tsx
"use client";

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  action: string;
  apCost: number;
}

interface QuickActionsProps {
  actions: QuickAction[];
  disabled: boolean;
  onAction: (action: string) => void;
}

export function QuickActions({ actions, disabled, onAction }: QuickActionsProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {actions.map(a => (
        <button key={a.id}
          onClick={() => onAction(a.action)}
          disabled={disabled}
          className="text-xs px-3 py-1.5 rounded-full border border-[#2a2a4a] text-gray-400
                   hover:border-[#ff6b9d]/30 hover:text-[#ff6b9d] disabled:opacity-30
                   transition-colors flex items-center gap-1">
          <span>{a.icon}</span>
          <span>{a.label}</span>
          <span className="text-[9px] text-gray-600">({a.apCost}AP)</span>
        </button>
      ))}
    </div>
  );
}
```

- [ ] **Step 3: Integrate into page.tsx**

Add the default quick actions and backpack state, then render them near the input panel.

```tsx
const defaultQuickActions: QuickAction[] = [
  { id: "look", label: "仔细观察", icon: "🔍", action: "仔细观察周围环境", apCost: 1 },
  { id: "search", label: "搜索物品", icon: "🔎", action: "搜索可能有用的物品", apCost: 2 },
  { id: "ask", label: "询问路人", icon: "💬", action: "询问附近的人", apCost: 1 },
];
```

- [ ] **Step 4: Commit**

```bash
git add components/game/EvidenceBackpack.tsx components/game/QuickActions.tsx app/butterfly/page.tsx
git commit -m "feat(ui): add EvidenceBackpack and QuickActions components for improved player agency"
```

---

### Task 15: Integration, cleanup, and final polish

**Files:**
- Modify: `app/butterfly/page.tsx` (final cleanup to ~300 lines)

- [ ] **Step 1: Remove extracted inline code from page.tsx**

Ensure the following are removed from page.tsx:
- `LOCATION_COORDS` constant → in TownMap
- `NPC_COLORS` constant → in TownMap (keep a local import if needed for other components)
- `NPC_LABELS` constant → only needed in TownMap now
- Inline SVG map → replaced by `<TownMap />`
- Key event text banner → replaced by `<LoopGoalBanner />`

- [ ] **Step 2: Verify page.tsx line count**

```bash
wc -l app/butterfly/page.tsx
```

Target: ~300 lines (down from ~650).

- [ ] **Step 3: Full TypeScript check**

```bash
npx tsc --noEmit 2>&1 | head -50
```

Fix any type errors.

- [ ] **Step 4: Test run the app**

```bash
npm run dev &
sleep 5
curl -s http://localhost:3000/butterfly | head -20
```

Verify the page loads without errors.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat(butterfly): complete playability enhancement — sensory, structure, and AI layers"
```
