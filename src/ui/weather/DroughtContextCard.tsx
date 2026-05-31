import { useEffect, useMemo, useState } from 'react';
import type { WeatherStation } from '../../lib/weatherService';
import { convertPrecip, useWeatherUnitsStore } from '../../lib/weatherUnits';

// ── helpers ────────────────────────────────────────────────────

function ordinal(n: number): string {
  if (n <= 0) return String(n);
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] ?? s[v] ?? s[0]);
}

function monthName(month0: number) {
  return new Date(2000, month0).toLocaleString('default', { month: 'long' });
}

// ── types ──────────────────────────────────────────────────────

interface MonthRecord {
  year: number;
  precipMm: number;
  avgTempC: number | null;
}

// ── API fetchers ────────────────────────────────────────────────

async function fetchCountyName(lat: number, lon: number): Promise<string | null> {
  try {
    const r = await fetch(
      `https://geo.fcc.gov/api/census/block/find?latitude=${lat}&longitude=${lon}&format=json`,
    );
    if (!r.ok) return null;
    const d = await r.json();
    return d?.County?.name ?? null;
  } catch {
    return null;
  }
}

async function fetchClimateHistory(
  lat: number,
  lon: number,
): Promise<{ times: string[]; precip: (number | null)[]; temps: (number | null)[] } | null> {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const url =
      `https://archive-api.open-meteo.com/v1/archive` +
      `?latitude=${lat}&longitude=${lon}` +
      `&start_date=1959-01-01&end_date=${today}` +
      `&daily=precipitation_sum,temperature_2m_mean` +
      `&timezone=auto`;
    const r = await fetch(url);
    if (!r.ok) return null;
    const d = await r.json();
    return {
      times: d.daily.time,
      precip: d.daily.precipitation_sum,
      temps: d.daily.temperature_2m_mean,
    };
  } catch {
    return null;
  }
}

// ── compute ────────────────────────────────────────────────────

function buildMonthRecords(
  times: string[],
  precip: (number | null)[],
  temps: (number | null)[],
  targetMonth: number, // 0-indexed
): MonthRecord[] {
  const byYear: Record<number, { p: number; ts: number; tc: number }> = {};
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    const mo = parseInt(t.slice(5, 7), 10) - 1;
    if (mo !== targetMonth) continue;
    const yr = parseInt(t.slice(0, 4), 10);
    if (!byYear[yr]) byYear[yr] = { p: 0, ts: 0, tc: 0 };
    byYear[yr].p += precip[i] ?? 0;
    if (temps[i] !== null && temps[i] !== undefined) {
      byYear[yr].ts += temps[i]!;
      byYear[yr].tc++;
    }
  }
  return Object.entries(byYear).map(([yr, v]) => ({
    year: Number(yr),
    precipMm: v.p,
    avgTempC: v.tc > 0 ? v.ts / v.tc : null,
  }));
}

function buildYtdRecords(
  times: string[],
  precip: (number | null)[],
  upToMonth: number, // 0-indexed, inclusive
): { year: number; precipMm: number }[] {
  const byYear: Record<number, number> = {};
  for (let i = 0; i < times.length; i++) {
    const t = times[i];
    const mo = parseInt(t.slice(5, 7), 10) - 1;
    if (mo > upToMonth) continue;
    const yr = parseInt(t.slice(0, 4), 10);
    byYear[yr] = (byYear[yr] ?? 0) + (precip[i] ?? 0);
  }
  return Object.entries(byYear).map(([yr, p]) => ({ year: Number(yr), precipMm: p }));
}

function computeNormal(records: MonthRecord[], startYear = 1991, endYear = 2020): number | null {
  const vals = records.filter((r) => r.year >= startYear && r.year <= endYear).map((r) => r.precipMm);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function computeYtdNormal(
  records: { year: number; precipMm: number }[],
  startYear = 1991,
  endYear = 2020,
): number | null {
  const vals = records.filter((r) => r.year >= startYear && r.year <= endYear).map((r) => r.precipMm);
  return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
}

function rankWettest(records: MonthRecord[], currentMm: number, currentYear: number): { rank: number; total: number } {
  const others = records.filter((r) => r.year !== currentYear);
  const rank = others.filter((r) => r.precipMm > currentMm).length + 1;
  return { rank, total: others.length + 1 }; // include current year
}

function rankYtdWettest(
  records: { year: number; precipMm: number }[],
  currentMm: number,
  currentYear: number,
): { rank: number; total: number } {
  const others = records.filter((r) => r.year !== currentYear);
  const rank = others.filter((r) => r.precipMm > currentMm).length + 1;
  return { rank, total: others.length + 1 };
}

// ── component ──────────────────────────────────────────────────

export default function DroughtContextCard({
  station,
  tick,
}: {
  station: WeatherStation | null;
  tick: number;
}) {
  const [county, setCounty] = useState<string | null>(null);
  const [climate, setClimate] = useState<{
    times: string[];
    precip: (number | null)[];
    temps: (number | null)[];
  } | null>(null);
  const [loading, setLoading] = useState(true);

  const precU = useWeatherUnitsStore((s) => s.precip);

  const lat = station?.latitude;
  const lon = station?.longitude;

  useEffect(() => {
    if (!lat || !lon) { setLoading(false); return; }
    setLoading(true);
    Promise.all([
      fetchCountyName(lat, lon),
      fetchClimateHistory(lat, lon),
    ]).then(([c, cl]) => {
      setCounty(c);
      setClimate(cl);
    }).catch(() => {}).finally(() => setLoading(false));
    // tick ignored intentionally — climate history doesn't change intra-session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [lat, lon]);

  const now = new Date();
  const curYear = now.getFullYear();
  const curMonth = now.getMonth(); // 0-indexed

  const stats = useMemo(() => {
    if (!climate) return null;
    const { times, precip, temps } = climate;

    const monthRecs = buildMonthRecords(times, precip, temps, curMonth);
    const ytdRecs = buildYtdRecords(times, precip, curMonth);

    const curMonthRec = monthRecs.find((r) => r.year === curYear);
    const curYtdRec = ytdRecs.find((r) => r.year === curYear);

    const monthNormalMm = computeNormal(monthRecs);
    const ytdNormalMm = computeYtdNormal(ytdRecs);

    const monthRank = curMonthRec ? rankWettest(monthRecs, curMonthRec.precipMm, curYear) : null;
    const ytdRank = curYtdRec ? rankYtdWettest(ytdRecs, curYtdRec.precipMm, curYear) : null;

    return {
      monthPrecipMm: curMonthRec?.precipMm ?? null,
      ytdPrecipMm: curYtdRec?.precipMm ?? null,
      monthNormalMm,
      ytdNormalMm,
      monthRank,
      ytdRank,
      yearsOfRecord: monthRecs.length,
    };
  }, [climate, curYear, curMonth]);

  if (!lat || !lon) return null;

  const fmtRain = (mm: number) => {
    const v = convertPrecip(mm / 25.4, precU); // mm → inches first, then convert
    if (v === null) return '—';
    return `${Math.abs(v).toFixed(2)}${precU === 'in' ? '"' : ' mm'}`;
  };

  const fmtDep = (currentMm: number | null, normalMm: number | null) => {
    if (currentMm === null || normalMm === null) return null;
    const depMm = currentMm - normalMm;
    const v = convertPrecip(Math.abs(depMm) / 25.4, precU);
    if (v === null) return null;
    const sign = depMm >= 0 ? '↑' : '↓';
    const tone = depMm >= 0 ? 'text-cyan-400' : 'text-amber-400';
    return { sign, value: v.toFixed(2), unit: precU === 'in' ? '"' : ' mm', tone, above: depMm >= 0 };
  };

  if (loading) {
    return (
      <div className="space-y-3">
        {[0, 1].map((i) => (
          <div key={i} className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-5">
            <div className="h-10 w-16 bg-white/10 rounded animate-pulse mb-2" />
            <div className="h-3 w-48 bg-white/10 rounded animate-pulse mb-4" />
            <div className="border-t border-white/10 pt-3 flex gap-3">
              <div className="h-3 w-8 bg-white/10 rounded animate-pulse" />
              <div className="h-3 w-24 bg-white/10 rounded animate-pulse" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!stats) return null;

  const monthDep = fmtDep(stats.monthPrecipMm, stats.monthNormalMm);
  const ytdDep = fmtDep(stats.ytdPrecipMm, stats.ytdNormalMm);
  const mName = monthName(curMonth);
  const ytdRange = curMonth > 0
    ? `${monthName(0)}–${monthName(curMonth - 1)} ${curYear}`
    : `${mName} ${curYear}`;

  return (
    <div className="space-y-3">
      {/* Monthly rank card */}
      {stats.monthRank && (
        <RankCard
          rank={stats.monthRank.rank}
          total={stats.monthRank.total}
          rankLabel={`wettest ${mName} on record, over the past ${stats.monthRank.total} years`}
          dryRankLabel={`driest ${mName} on record, over the past ${stats.monthRank.total} years`}
          dep={monthDep}
          county={county}
        />
      )}

      {/* YTD rank card */}
      {stats.ytdRank && curMonth > 0 && (
        <RankCard
          rank={stats.ytdRank.rank}
          total={stats.ytdRank.total}
          rankLabel={`wettest year to date over the past ${stats.ytdRank.total} years`}
          dryRankLabel={`driest year to date over the past ${stats.ytdRank.total} years`}
          dep={ytdDep}
          county={county}
          sub={`(${ytdRange})`}
        />
      )}
    </div>
  );
}

// ── sub-component ──────────────────────────────────────────────

function RankCard({
  rank,
  total,
  rankLabel,
  dryRankLabel,
  dep,
  county,
  sub,
}: {
  rank: number;
  total: number;
  rankLabel: string;
  dryRankLabel: string;
  dep: { sign: string; value: string; unit: string; tone: string; above: boolean } | null;
  county: string | null;
  sub?: string;
}) {
  const isWet = dep ? dep.above : rank <= total / 2;
  const dryRank = total - rank + 1;
  const displayRank = isWet ? rank : dryRank;
  const label = isWet ? rankLabel : dryRankLabel;

  return (
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-5">
      {county && (
        <div className="text-[10px] uppercase tracking-wide text-white/30 mb-2">{county}</div>
      )}
      <div className="text-5xl font-bold text-amber-400 leading-none mb-1 tabular-nums">
        {ordinal(displayRank)}
      </div>
      <div className="text-sm text-white/60 leading-snug">
        {label}
        {sub && <span className="block text-xs text-white/35 mt-0.5">{sub}</span>}
      </div>

      {dep && (
        <>
          <div className="border-t border-white/10 mt-4 pt-3 flex items-baseline gap-2">
            <span className={`text-2xl font-semibold tabular-nums ${dep.tone}`}>
              {dep.sign} {dep.value}{dep.unit}
            </span>
          </div>
          <div className="text-xs text-white/40 mt-0.5">from normal</div>
        </>
      )}
    </div>
  );
}
