import Link from "next/link";

const games = [
  {
    href: "/symbiote",
    title: "共生体",
    subtitle: "Symbiote",
    accent: "#00ff88",
    desc: "你是异星探索者，体内的AI共生体有自己的隐秘目标。信任，还是质疑？",
    tags: ["信任博弈", "单人AI对手", "叙事驱动"],
  },
  {
    href: "/butterfly",
    title: "蝴蝶效应",
    subtitle: "Butterfly Effect",
    accent: "#ff6b9d",
    desc: "被困在时间循环中。每次重置，NPC的行为因你之前的选择而微妙改变。找到因果链，打破循环。",
    tags: ["因果推理", "时间循环", "多NPC"],
  },
  {
    href: "/xenogenesis",
    title: "异星造物主",
    subtitle: "Xenogenesis",
    accent: "#64b5f6",
    desc: "设计生命形态，放入AI驱动的生态系统。观察它们竞争、进化、灭绝——或繁荣。",
    tags: ["生态模拟", "涌现行为", "造物主视角"],
  },
];

export default function Home() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8">
      <div className="text-center mb-12">
        <h1 className="text-4xl font-bold tracking-wider mb-3">
          <span className="text-white">AI</span>
          <span className="text-gray-500"> ENGINE</span>
        </h1>
        <p className="text-gray-500 text-sm max-w-md mx-auto leading-relaxed">
          三个实验性游戏原型，探索AI作为游戏引擎的可能性。
          每一个游戏中，AI都不是外挂的聊天机器人，而是驱动核心玩法的实时决策引擎。
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full max-w-4xl">
        {games.map((g) => (
          <Link
            key={g.href}
            href={g.href}
            className="group block p-6 rounded-xl border border-[#2a2a4a] bg-[#0d0d24]
                       hover:border-[#3a3a5a] hover:bg-[#111133] transition-all duration-300"
          >
            <div className="flex items-center gap-2 mb-3">
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: g.accent, boxShadow: `0 0 8px ${g.accent}` }}
              />
              <span className="text-xs tracking-widest text-gray-500 uppercase">{g.subtitle}</span>
            </div>
            <h2 className="text-xl font-bold text-white mb-2">{g.title}</h2>
            <p className="text-sm text-gray-400 leading-relaxed mb-4">{g.desc}</p>
            <div className="flex flex-wrap gap-1.5">
              {g.tags.map((t) => (
                <span
                  key={t}
                  className="text-xs px-2 py-0.5 rounded-full border border-[#2a2a4a] text-gray-500
                             group-hover:border-[#3a3a5a] group-hover:text-gray-400 transition-colors"
                >
                  {t}
                </span>
              ))}
            </div>
          </Link>
        ))}
      </div>

      <p className="mt-10 text-xs text-gray-600">
        需要设置 <code className="text-gray-500">ANTHROPIC_API_KEY</code> 环境变量
      </p>
    </div>
  );
}
