import { fgColor } from '../lib/format';

interface Props {
  value: number;
  classification: string;
  size?: 'sm' | 'lg';
}

export function FearGreedGauge({ value, classification, size = 'lg' }: Props) {
  const color = fgColor(value);
  const rotation = (value / 100) * 180 - 90;
  const dim = size === 'lg' ? 220 : 140;
  const stroke = size === 'lg' ? 14 : 10;

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: dim, height: dim / 2 + 20 }}>
        <svg width={dim} height={dim / 2 + 20} viewBox={`0 0 ${dim} ${dim / 2 + 20}`} className="overflow-visible">
          <defs>
            <linearGradient id="gaugeGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#ef4444" />
              <stop offset="25%" stopColor="#f97316" />
              <stop offset="50%" stopColor="#eab308" />
              <stop offset="75%" stopColor="#84cc16" />
              <stop offset="100%" stopColor="#22c55e" />
            </linearGradient>
          </defs>
          <path
            d={`M ${stroke} ${dim / 2} A ${dim / 2 - stroke} ${dim / 2 - stroke} 0 0 1 ${dim - stroke} ${dim / 2}`}
            fill="none"
            stroke="rgba(30,41,59,0.8)"
            strokeWidth={stroke}
            strokeLinecap="round"
          />
          <path
            d={`M ${stroke} ${dim / 2} A ${dim / 2 - stroke} ${dim / 2 - stroke} 0 0 1 ${dim - stroke} ${dim / 2}`}
            fill="none"
            stroke="url(#gaugeGrad)"
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={`${Math.PI * (dim / 2 - stroke)}`}
            strokeDashoffset={`${Math.PI * (dim / 2 - stroke) * (1 - value / 100)}`}
          />
          <g transform={`rotate(${rotation} ${dim / 2} ${dim / 2})`}>
            <line
              x1={dim / 2}
              y1={dim / 2}
              x2={dim / 2}
              y2={stroke + 8}
              stroke={color}
              strokeWidth="3"
              strokeLinecap="round"
            />
            <circle cx={dim / 2} cy={dim / 2} r="6" fill={color} />
          </g>
        </svg>
        <div
          className="absolute left-1/2 -translate-x-1/2 text-center"
          style={{ bottom: size === 'lg' ? 0 : -4 }}
        >
          <p className={`font-bold tabular-nums ${size === 'lg' ? 'text-5xl' : 'text-3xl'}`} style={{ color }}>
            {value}
          </p>
          <p className={`text-slate-400 ${size === 'lg' ? 'text-sm' : 'text-xs'} mt-1`}>{classification}</p>
        </div>
      </div>
    </div>
  );
}
