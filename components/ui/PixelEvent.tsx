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
            <div key={i} className="bg-[#00ff88]" style={{
              opacity: [0,3,5,6,9,10,12,15].includes(i) ? 1 : 0.3
            }} />
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

function TimeResetEffect() {
  return (
    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
      <svg width="80" height="80" viewBox="0 0 80 80" className="clock-svg">
        <circle cx="40" cy="40" r="35" fill="none" stroke="#ff6b9d" strokeWidth="2" />
        <line x1="40" y1="40" x2="40" y2="18" stroke="#ff6b9d" strokeWidth="2"
          style={{ animation: 'clockSpin 0.8s linear infinite', transformOrigin: '40px 40px' }} />
        <line x1="40" y1="40" x2="55" y2="40" stroke="#ff6b9d" strokeWidth="1.5"
          style={{ animation: 'clockSpin 0.3s linear infinite', transformOrigin: '40px 40px' }} />
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
              width: `${10 + i * 5}px`, height: `${15 + i * 8}px`,
              left: `${20 + i * 15}%`, top: `${10 + i * 12}%`,
              animation: `shardFly 1s ease-out ${i * 80}ms forwards`,
              opacity: 0,
            }} />
        ))}
      </div>
    </div>
  );
}

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
            <line x1={30 + i * 3} y1={10 + i * 8} x2={50 - i * 3} y2={10 + i * 8}
              stroke="#64b5f6" strokeWidth="2" opacity={0.3 + i * 0.08} />
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
                (row === 2 && (col === 2 || col === 5)) ||
                (row === 4 && col >= 3 && col <= 4);
              return <div key={i} className="w-1 h-1"
                style={{ backgroundColor: isSkull ? '#ff4444' : 'transparent' }} />;
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
      <svg width="80" height="80" viewBox="0 0 80 80" className="yin-yang"
        style={{ animation: 'clockSpin 4s linear infinite' }}>
        <circle cx="40" cy="40" r="35" fill="none" stroke="#64b5f6" strokeWidth="1" />
        <path d="M40 5 A35 35 0 0 1 40 75 A17.5 17.5 0 0 1 40 40 A17.5 17.5 0 0 0 40 5"
          fill="#64b5f6" opacity="0.6" />
        <circle cx="40" cy="22.5" r="4" fill="#64b5f6" />
        <circle cx="40" cy="57.5" r="4" fill="#0a0a1a" />
      </svg>
    </div>
  );
}
