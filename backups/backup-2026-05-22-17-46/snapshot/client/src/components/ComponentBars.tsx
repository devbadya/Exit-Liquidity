import { fgColor } from '../lib/format';

interface Props {
  components: Record<string, number>;
}

export function ComponentBars({ components }: Props) {
  return (
    <div className="space-y-4">
      {Object.entries(components).map(([label, value]) => (
        <div key={label}>
          <div className="flex justify-between text-sm mb-1.5">
            <span className="text-slate-400">{label}</span>
            <span className="font-medium tabular-nums" style={{ color: fgColor(value) }}>
              {value}
            </span>
          </div>
          <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full rounded-full transition-all duration-700"
              style={{ width: `${value}%`, backgroundColor: fgColor(value) }}
            />
          </div>
        </div>
      ))}
    </div>
  );
}
