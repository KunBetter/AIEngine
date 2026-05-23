"use client";

export function LoadingState({ text = "AI 思考中..." }: { text?: string }) {
  return (
    <div className="flex items-center gap-2 text-sm text-gray-500">
      <div className="flex gap-1">
        <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "0ms" }} />
        <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "150ms" }} />
        <div className="w-1.5 h-1.5 rounded-full bg-current animate-bounce" style={{ animationDelay: "300ms" }} />
      </div>
      <span className="text-xs ml-1">{text}</span>
    </div>
  );
}
