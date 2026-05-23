"use client";

export function ErrorBanner({ message, onRetry }: { message: string; onRetry?: () => void }) {
  if (!message) return null;
  return (
    <div className="text-sm text-red-400 bg-red-400/10 border border-red-400/30 rounded-lg p-3 flex items-center justify-between">
      <span>{message}</span>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-xs px-3 py-1 rounded bg-red-400/20 hover:bg-red-400/30 transition-colors shrink-0 ml-3"
        >
          重试
        </button>
      )}
    </div>
  );
}
