import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { FearGreedSnapshot } from '../types';
import { fgColor } from '../lib/format';

interface Props {
  history: FearGreedSnapshot[];
  days: number;
}

export function FearGreedChart({ history, days }: Props) {
  const data = [...history]
    .slice(0, days)
    .reverse()
    .map((p) => ({
      date: new Date(p.timestamp).toLocaleDateString('de-DE', { day: '2-digit', month: 'short' }),
      value: p.value,
      classification: p.classification,
    }));

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id="fgArea" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#22d3ee" stopOpacity={0.35} />
              <stop offset="100%" stopColor="#22d3ee" stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
          <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 11 }} axisLine={false} tickLine={false} width={32} />
          <Tooltip
            contentStyle={{
              background: '#151d2e',
              border: '1px solid #334155',
              borderRadius: '12px',
              fontSize: '12px',
            }}
            formatter={(value) => [typeof value === 'number' ? value : 0, 'Index']}
            labelStyle={{ color: '#94a3b8' }}
          />
          <Area
            type="monotone"
            dataKey="value"
            stroke="#22d3ee"
            strokeWidth={2}
            fill="url(#fgArea)"
            dot={false}
            activeDot={{ r: 5, fill: fgColor(data[data.length - 1]?.value ?? 50) }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
