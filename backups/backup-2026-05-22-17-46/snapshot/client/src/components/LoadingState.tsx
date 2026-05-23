export function LoadingState({ label = 'Lade Daten…' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-4">
      <div className="w-12 h-12 rounded-full border-2 border-cyan-500/30 border-t-cyan-400 animate-spin" />
      <p className="text-slate-400 text-sm">{label}</p>
    </div>
  );
}
