"use client";

export function StreamingText({
  text,
  isLoading,
  accent = "#888",
  emptyText = "等待响应...",
}: {
  text: string;
  isLoading: boolean;
  accent?: string;
  emptyText?: string;
}) {
  return (
    <div className="text-sm text-gray-300 leading-relaxed whitespace-pre-wrap">
      {text || <span className="text-gray-600 italic">{emptyText}</span>}
      {isLoading && (
        <span
          className="inline-block w-1.5 h-4 ml-0.5 align-text-bottom rounded-sm animate-pulse"
          style={{ backgroundColor: accent }}
        />
      )}
    </div>
  );
}
