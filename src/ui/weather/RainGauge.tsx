interface Props {
  dayIn: number | null;
  monthIn: number | null;
  yearIn: number | null;
  rateIn: number | null;
  storm: number | null;
  last24hIn: number | null;
}

export default function RainGauge({ dayIn, monthIn, yearIn, rateIn, storm, last24hIn }: Props) {
  // Gauge max scales with actual rainfall (min 1")
  const gaugeMax = Math.max(1, Math.ceil((dayIn ?? 0) * 2));
  const pct = Math.min(1, (dayIn ?? 0) / gaugeMax);
  const gaugeH = 180;
  const fillH = gaugeH * pct;

  const rows: [string, string][] = [
    ['Today', dayIn !== null && dayIn !== undefined ? `${dayIn.toFixed(2)}"` : '--'],
    ['24 hr', last24hIn !== null && last24hIn !== undefined ? `${last24hIn.toFixed(2)}"` : '--'],
    ['Rate', rateIn !== null && rateIn !== undefined ? `${rateIn.toFixed(2)} "/hr` : '--'],
    ['Storm', storm !== null && storm !== undefined ? `${storm.toFixed(2)}"` : '--'],
    ['Month', monthIn !== null && monthIn !== undefined ? `${monthIn.toFixed(2)}"` : '--'],
    ['Year', yearIn !== null && yearIn !== undefined ? `${yearIn.toFixed(2)}"` : '--'],
  ];

  return (
    <div className="flex items-start gap-4">
      {/* Gauge bar */}
      <div className="flex flex-col items-center flex-shrink-0">
        <svg width={48} height={gaugeH + 20} viewBox={`0 0 48 ${gaugeH + 20}`}>
          <defs>
            <linearGradient id="rainFill" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#60a5fa" />
              <stop offset="100%" stopColor="#3b82f6" />
            </linearGradient>
          </defs>
          {/* tube outline */}
          <rect
            x={16}
            y={8}
            width={16}
            height={gaugeH}
            rx={8}
            fill="rgba(255,255,255,0.05)"
            stroke="rgba(255,255,255,0.2)"
            strokeWidth="1"
          />
          {/* fill */}
          {pct > 0 && (
            <rect
              x={16}
              y={8 + (gaugeH - fillH)}
              width={16}
              height={fillH}
              rx={8}
              fill="url(#rainFill)"
            />
          )}
          {/* tick marks */}
          {Array.from({ length: 5 }, (_, i) => i).map((i) => {
            const y = 8 + (gaugeH * i) / 4;
            const label = (gaugeMax * (1 - i / 4)).toFixed(1);
            return (
              <g key={i}>
                <line x1={32} y1={y} x2={36} y2={y} stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
                <text x={38} y={y + 3} fontSize="8" fill="rgba(255,255,255,0.4)">
                  {label}
                </text>
              </g>
            );
          })}
        </svg>
      </div>

      {/* Stats */}
      <div className="flex-1 min-w-0 grid grid-cols-2 gap-x-3 gap-y-2">
        {rows.map(([label, value]) => (
          <div key={label}>
            <div className="text-[10px] uppercase tracking-wide text-white/40">{label}</div>
            <div className="text-sm font-mono text-white/90">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
