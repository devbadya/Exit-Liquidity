export function LoadingState({ label = 'Lade Daten…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5">
      <div className="w-10 h-10 rounded-full border-2 border-[var(--b2)] border-t-[var(--cyan)] animate-spin" />
      <p className="text-[var(--t2)] text-sm">{label}</p>
    </div>
  );
}

export function SkeletonCard() {
  return (
    <div className="card-pro overflow-hidden">
      <div className="skeleton h-44 rounded-none" />
      <div className="p-4 space-y-2.5">
        <div className="skeleton h-2.5 w-1/3 rounded" />
        <div className="skeleton h-4 w-full rounded" />
        <div className="skeleton h-4 w-3/4 rounded" />
        <div className="skeleton h-3 w-1/2 rounded" />
      </div>
    </div>
  );
}
