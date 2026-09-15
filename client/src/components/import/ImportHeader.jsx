export function ImportHeader() {
  return (
    <header className="flex items-center justify-between border-b border-slate-200 bg-white px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-900 text-white">
                ↗
            </div>
            <span className="font-display text-lg font-bold tracking-tight text-slate-900">
                Fintrac
            </span>
        </div>
    </header>
);
}