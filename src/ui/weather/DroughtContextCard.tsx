import { useEffect, useMemo, useState } from 'react';
import { getReadingsRange } from '../../lib/weatherService';
import {
  convertPrecip,
  convertTemp,
  useWeatherUnitsStore,
} from '../../lib/weatherUnits';

interface MonthStat {
  month: string; // YYYY-MM
  totalRainIn: number | null;
  avgTempRaw: number | null; // °F raw from DB
  ytdIn: number | null;     // last rainfall_year_in seen in this month
}

function monthKey(iso: string) { return iso.slice(0, 7); }

function monthShort(key: string) {
  const [y, m] = key.split('-').map(Number);
  return new Date(y, m - 1).toLocaleDateString([], { month: 'short' });
}

async function fetchMonthlyStats(stationId: number): Promise<MonthStat[]> {
  const from = new Date();
  from.setMonth(from.getMonth() - 13);
  from.setDate(1);
  from.setHours(0, 0, 0, 0);

  const rows = await getReadingsRange(
    stationId,
    from.toISOString(),
    new Date().toISOString(),
    'observed_at,rainfall_month_in,rainfall_year_in,temp',
  );

  const byMonth: Record<string, { rains: number[]; temps: number[]; ytd: number | null }> = {};
  for (const r of rows) {
    const k = monthKey(r.observed_at);
    if (!byMonth[k]) byMonth[k] = { rains: [], temps: [], ytd: null };
    if (r.rainfall_month_in !== null) byMonth[k].rains.push(r.rainfall_month_in);
    if (r.temp !== null) byMonth[k].temps.push(r.temp);
    if (r.rainfall_year_in !== null) byMonth[k].ytd = r.rainfall_year_in;
  }

  return Object.entries(byMonth)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, d]) => ({
      month,
      totalRainIn: d.rains.length ? Math.max(...d.rains) : null,
      avgTempRaw:
        d.temps.length
          ? d.temps.reduce((a, b) => a + b, 0) / d.temps.length
          : null,
      ytdIn: d.ytd,
    }));
}

export default function DroughtContextCard({
  stationId,
  tick,
}: {
  stationId: number;
  tick: number;
}) {
  const [monthly, setMonthly] = useState<MonthStat[]>([]);
  const [loading, setLoading] = useState(true);

  const precU = useWeatherUnitsStore((s) => s.precip);
  const tempU = useWeatherUnitsStore((s) => s.temp);

  useEffect(() => {
    setLoading(true);
    fetchMonthlyStats(stationId)
      .then(setMonthly)
      .catch(() => setMonthly([]))
      .finally(() => setLoading(false));
  }, [stationId, tick]);

  const now = new Date();
  const thisMonthKey = monthKey(now.toISOString());
  const currentCalMonth = thisMonthKey.slice(5, 7); // MM

  const thisMonth = monthly.find((m) => m.month === thisMonthKey);
  const past = monthly.filter((m) => m.month < thisMonthKey);

  // Historical same-calendar-month data from prior years
  const sameCalMonths = past.filter((m) => m.month.slice(5, 7) === currentCalMonth);

  const avgHistRainIn = useMemo(() => {
    const vals = sameCalMonths.map((m) => m.totalRainIn).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }, [sameCalMonths]);

  const avgHistTempRaw = useMemo(() => {
    const vals = sameCalMonths.map((m) => m.avgTempRaw).filter((v): v is number => v !== null);
    return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
  }, [sameCalMonths]);

  // Bar chart: last 12 complete months
  const bar12 = past.slice(-12);
  const maxBarRain = Math.max(
    ...bar12.map((m) => m.totalRainIn ?? 0),
    avgHistRainIn ?? 0,
    0.01,
  );

  // Formatting helpers
  const rainUnit = precU === 'in' ? '"' : ' mm';
  const fmtRain = (v: number | null, decimals = 2) => {
    if (v === null) return '—';
    const c = convertPrecip(v, precU);
    return c === null ? '—' : `${c.toFixed(precU === 'in' ? decimals : 0)}${rainUnit}`;
  };
  const fmtTemp = (v: number | null) => {
    if (v === null) return '—';
    const c = convertTemp(v, tempU);
    return c === null ? '—' : `${Math.round(c)}°${tempU}`;
  };

  // Anomaly labels
  const rainPct =
    avgHistRainIn && avgHistRainIn > 0 && thisMonth?.totalRainIn != null
      ? ((thisMonth.totalRainIn - avgHistRainIn) / avgHistRainIn) * 100
      : null;
  const wetDry = anomalyLabel(rainPct, [10, 30], ['Above Normal', 'Much Wetter'], ['Below Normal', 'Much Drier'], 'Near Normal');

  const tempDelta =
    avgHistTempRaw !== null && thisMonth?.avgTempRaw != null
      ? thisMonth.avgTempRaw - avgHistTempRaw
      : null;
  const hotCool = anomalyLabel(
    tempDelta !== null ? tempDelta * (tempU === 'C' ? 1 : 9 / 5) : null,
    [1, 3],
    ['Warmer Than Usual', 'Much Warmer'],
    ['Cooler Than Usual', 'Much Cooler'],
    'Near Normal',
  );

  const histYears = sameCalMonths.length;
  const monthName = new Date(now.getFullYear(), now.getMonth()).toLocaleString('default', { month: 'long' });

  if (loading) {
    return (
      <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
        <div className="text-xs uppercase tracking-wide text-white/40 mb-3 font-semibold">
          Precipitation & Temperature Context
        </div>
        <div className="space-y-2">
          {[75, 55, 65].map((w, i) => (
            <div key={i} className="h-4 bg-white/10 rounded animate-pulse" style={{ width: `${w}%` }} />
          ))}
        </div>
      </div>
    );
  }

  if (monthly.length === 0) return null;

  return (
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4 space-y-4">
      <div className="flex items-baseline justify-between flex-wrap gap-1">
        <div className="text-xs uppercase tracking-wide text-white/40 font-semibold">
          Precipitation &amp; Temperature Context
        </div>
        {histYears > 0 && (
          <div className="text-[10px] text-white/25">
            vs {histYears} prior {monthName}{histYears > 1 ? 's' : ''} on record
          </div>
        )}
      </div>

      {/* Stat tiles */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <ContextTile
          label="Month Rain"
          value={fmtRain(thisMonth?.totalRainIn ?? null)}
          badge={wetDry}
          sub={avgHistRainIn !== null ? `avg ${fmtRain(avgHistRainIn, 1)}` : null}
        />
        <ContextTile
          label="Year to Date"
          value={fmtRain(thisMonth?.ytdIn ?? null)}
          badge={null}
          sub={null}
        />
        <ContextTile
          label={`${monthName} Avg Temp`}
          value={fmtTemp(thisMonth?.avgTempRaw ?? null)}
          badge={hotCool}
          sub={avgHistTempRaw !== null ? `avg ${fmtTemp(avgHistTempRaw)}` : null}
        />
        <ContextTile
          label="Hottest Month"
          value={fmtTemp(
            past.length
              ? Math.max(...past.map((m) => m.avgTempRaw ?? -999).filter((v) => v > -999))
              : null,
          )}
          badge={null}
          sub={
            past.length
              ? past.reduce((best, m) =>
                  (m.avgTempRaw ?? -999) > (best.avgTempRaw ?? -999) ? m : best,
                ).month
              : null
          }
        />
      </div>

      {/* 12-month bar chart */}
      {bar12.length > 0 && (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-white/30 mb-2">
            Monthly Rainfall — Last 12 Months
          </div>
          <div className="flex items-end gap-0.5 sm:gap-1" style={{ height: 80 }}>
            {bar12.map((m) => {
              const barH =
                m.totalRainIn !== null ? (m.totalRainIn / maxBarRain) * 68 : 0;
              const avgH =
                avgHistRainIn !== null ? (avgHistRainIn / maxBarRain) * 68 : null;
              const isCurrentCalMonth = m.month.slice(5, 7) === currentCalMonth;
              return (
                <div
                  key={m.month}
                  className="flex-1 flex flex-col items-center gap-0.5"
                  title={`${monthShort(m.month)} ${m.month.slice(0, 4)}: ${fmtRain(m.totalRainIn)}`}
                >
                  <div className="w-full relative flex flex-col justify-end" style={{ height: 68 }}>
                    {avgH !== null && (
                      <div
                        className="absolute left-0 right-0 border-t border-dashed border-white/25 pointer-events-none"
                        style={{ bottom: avgH }}
                      />
                    )}
                    <div
                      className={`w-full rounded-t-sm transition-all duration-300 ${
                        isCurrentCalMonth
                          ? 'bg-cyan-400/80'
                          : barH === 0
                          ? 'bg-white/10'
                          : 'bg-blue-400/55'
                      }`}
                      style={{ height: Math.max(barH, barH === 0 ? 2 : 0) }}
                    />
                  </div>
                  <div className="text-[8px] text-white/30 text-center w-full truncate leading-tight">
                    {monthShort(m.month)}
                  </div>
                </div>
              );
            })}
          </div>
          {avgHistRainIn !== null && (
            <div className="flex items-center gap-1.5 mt-1 text-[10px] text-white/35">
              <div className="w-5 border-t border-dashed border-white/30" />
              {monthName} average ({histYears} yr{histYears !== 1 ? 's' : ''})
            </div>
          )}
        </div>
      )}

      {/* Year-on-year temperature strip */}
      {past.length >= 3 && (
        <div>
          <div className="text-[10px] uppercase tracking-wide text-white/30 mb-2">
            Monthly Avg Temperature — Last 12 Months
          </div>
          <TempStrip months={bar12} tempU={tempU} avgHistTempRaw={avgHistTempRaw} />
        </div>
      )}
    </div>
  );
}

// ── Helpers ────────────────────────────────────────────────────

function anomalyLabel(
  delta: number | null,
  thresholds: [number, number],
  above: [string, string],
  below: [string, string],
  neutral: string,
): { label: string; tone: string } | null {
  if (delta === null) return null;
  if (delta > thresholds[1]) return { label: above[1], tone: 'cyan' };
  if (delta > thresholds[0]) return { label: above[0], tone: 'blue' };
  if (delta < -thresholds[1]) return { label: below[1], tone: 'orange' };
  if (delta < -thresholds[0]) return { label: below[0], tone: 'amber' };
  return { label: neutral, tone: 'green' };
}

const TONE: Record<string, string> = {
  cyan:   'text-cyan-400',
  blue:   'text-blue-300',
  green:  'text-green-400',
  amber:  'text-amber-400',
  orange: 'text-orange-400',
};

function ContextTile({
  label,
  value,
  badge,
  sub,
}: {
  label: string;
  value: string;
  badge: { label: string; tone: string } | null;
  sub: string | null;
}) {
  return (
    <div className="bg-black/20 rounded-lg p-3">
      <div className="text-[10px] uppercase tracking-wide text-white/40 mb-0.5">{label}</div>
      <div className="text-lg font-mono font-semibold text-white tabular-nums leading-tight">{value}</div>
      {badge && (
        <div className={`text-[11px] font-medium mt-0.5 ${TONE[badge.tone] ?? 'text-white/60'}`}>
          {badge.label}
        </div>
      )}
      {sub && <div className="text-[10px] text-white/35 mt-0.5">{sub}</div>}
    </div>
  );
}

function TempStrip({
  months,
  tempU,
  avgHistTempRaw,
}: {
  months: MonthStat[];
  tempU: 'F' | 'C';
  avgHistTempRaw: number | null;
}) {
  const temps = months.map((m) => m.avgTempRaw).filter((v): v is number => v !== null);
  if (temps.length === 0) return null;

  const minT = Math.min(...temps);
  const maxT = Math.max(...temps);
  const range = maxT - minT || 1;

  const fmtT = (v: number) => {
    const c = convertTemp(v, tempU);
    return c === null ? '' : `${Math.round(c)}°`;
  };

  return (
    <div className="flex items-end gap-0.5 sm:gap-1" style={{ height: 60 }}>
      {months.map((m) => {
        if (m.avgTempRaw === null) {
          return (
            <div key={m.month} className="flex-1 flex flex-col items-center gap-0.5">
              <div style={{ height: 48 }} />
              <div className="text-[8px] text-white/20 text-center w-full truncate">
                {monthShort(m.month)}
              </div>
            </div>
          );
        }
        const normalized = (m.avgTempRaw - minT) / range; // 0–1
        const barH = 8 + normalized * 40; // 8–48 px
        // Heat colour: cold=blue, warm=amber, hot=red
        const hue = normalized < 0.5
          ? `rgba(96,165,250,${0.4 + normalized * 0.6})` // blue
          : `rgba(251,191,36,${0.3 + (normalized - 0.5) * 1.4})`; // amber→orange
        const isAboveAvg = avgHistTempRaw !== null && m.avgTempRaw > avgHistTempRaw + 0.5;
        const isBelowAvg = avgHistTempRaw !== null && m.avgTempRaw < avgHistTempRaw - 0.5;
        return (
          <div
            key={m.month}
            className="flex-1 flex flex-col items-center gap-0.5"
            title={`${monthShort(m.month)} ${m.month.slice(0, 4)}: avg ${fmtT(m.avgTempRaw)}${tempU}`}
          >
            <div className="w-full relative flex flex-col justify-end" style={{ height: 48 }}>
              {isAboveAvg && (
                <div className="absolute top-0.5 left-0 right-0 flex justify-center">
                  <span className="text-[6px] text-orange-400/70">▲</span>
                </div>
              )}
              {isBelowAvg && (
                <div className="absolute top-0.5 left-0 right-0 flex justify-center">
                  <span className="text-[6px] text-blue-400/70">▼</span>
                </div>
              )}
              <div
                className="w-full rounded-t-sm"
                style={{ height: barH, background: hue }}
              />
            </div>
            <div className="text-[8px] text-white/30 text-center w-full truncate leading-tight">
              {monthShort(m.month)}
            </div>
          </div>
        );
      })}
    </div>
  );
}
