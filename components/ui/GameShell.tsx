"use client";

export function GameShell({
  children,
  topBar,
  bottomBar,
}: {
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
