import { useEffect, useMemo, useState } from 'react';
import {
  auroraVisible,
  fetchSpaceWeather,
  flareClass,
  kpDescription,
  SDO_IMAGES,
  type SpaceWeatherSnapshot,
} from '../../lib/spaceWeatherService';
import type { WeatherStation } from '../../lib/weatherService';

interface Props {
  station: WeatherStation | null;
  tick: number;
}

export default function SpaceWeatherTab({ station, tick }: Props) {
  const [data, setData] = useState<SpaceWeatherSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imgIndex, setImgIndex] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetchSpaceWeather()
      .then((d) => {
        if (!cancelled) setData(d);
      })
      .catch((e) => {
        if (!cancelled) setError(String(e?.message ?? e));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [tick]);

  if (loading && !data) {
    return <div className="text-white/40 text-sm py-12 text-center">Loading space weather…</div>;
  }
  if (error && !data) {
    return (
      <div className="bg-red-500/10 border border-red-500/20 text-red-200/80 rounded-xl p-4 text-sm">
        Couldn't load space weather: {error}
        <div className="mt-2 text-[11px] text-white/40">
          The space-weather-proxy edge function might not be deployed yet — see
          <code className="mx-1">supabase/functions/space-weather-proxy/DEPLOY.md</code>.
        </div>
      </div>
    );
  }
  if (!data) return null;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-display font-bold text-white">Space Weather</h1>
        <p className="text-xs text-white/40">
          Powered by the NOAA Space Weather Prediction Center · updated{' '}
          {new Date(data.fetched_at).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
        </p>
      </div>

      {data.scales && <NoaaScalesCard scales={data.scales} />}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <KpCard data={data} station={station} />
        <FlareCard data={data} />
      </div>

      <SolarWindCard data={data} />

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <SunspotsCard data={data} />
        <AuroraCard data={data} station={station} />
      </div>

      <SunImageCard imgIndex={imgIndex} setImgIndex={setImgIndex} />

      {data.alerts.length > 0 && <AlertsCard alerts={data.alerts} />}

      {data.three_day_headlines.length > 0 && <ThreeDayCard lines={data.three_day_headlines} />}

      <div className="text-[10px] text-white/30 text-center">
        Data: NOAA SWPC (services.swpc.noaa.gov) · Imagery: NASA SDO (sdo.gsfc.nasa.gov)
      </div>
    </div>
  );
}

// ── Cards ────────────────────────────────────────────────────────

// Click-to-reveal card heading. Title (friendly) is always visible; the
// description is hidden until the user taps the title.
function CardHeader({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <details className="group mb-3">
      <summary className="cursor-pointer list-none flex items-center gap-1.5 text-xs uppercase tracking-wide text-white/40 font-semibold hover:text-white/60 transition-colors">
        <span>{title}</span>
        <span className="text-[9px] text-white/30 transition-transform group-open:rotate-180">▾</span>
      </summary>
      <div className="text-[11px] text-white/55 mt-2 leading-relaxed">{children}</div>
    </details>
  );
}

function NoaaScalesCard({ scales }: { scales: { G: number; S: number; R: number } }) {
  const items: { letter: 'G' | 'S' | 'R'; label: string; value: number; explain: string }[] = [
    { letter: 'G', label: 'Storm', value: scales.G, explain: 'Geomagnetic storm — when the Sun shakes Earth\'s magnetic field. Causes auroras, sometimes GPS errors and grid issues.' },
    { letter: 'S', label: 'Radiation', value: scales.S, explain: 'Solar radiation storm — bursts of high-energy particles. Affects satellites and polar flights.' },
    { letter: 'R', label: 'Radio', value: scales.R, explain: 'Radio blackout — flares disrupt long-range (HF) radio. Mostly impacts ham radio, aviation, and shortwave.' },
  ];
  const colorFor = (v: number): string =>
    v <= 0 ? 'text-emerald-300 border-emerald-500/30 bg-emerald-500/10'
    : v === 1 ? 'text-yellow-300 border-yellow-500/30 bg-yellow-500/10'
    : v === 2 ? 'text-amber-300 border-amber-500/30 bg-amber-500/10'
    : v === 3 ? 'text-orange-300 border-orange-500/30 bg-orange-500/10'
    : v === 4 ? 'text-red-300 border-red-500/30 bg-red-500/10'
    :           'text-fuchsia-300 border-fuchsia-500/30 bg-fuchsia-500/10';
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <CardHeader title="Storm watch right now">
        Three NOAA scales: storms, radiation, and radio blackouts. 0 means quiet, 5 means
        extreme. Tap any card for the full explanation.
      </CardHeader>
      <div className="grid grid-cols-3 gap-3">
        {items.map((it) => (
          <details key={it.letter} className={`rounded-xl border p-3 ${colorFor(it.value)}`}>
            <summary className="cursor-pointer list-none text-center">
              <div className="text-3xl font-display font-bold">
                {it.letter}
                {it.value}
              </div>
              <div className="text-[10px] uppercase tracking-wide opacity-80 mt-1">{it.label}</div>
            </summary>
            <div className="text-[11px] opacity-85 mt-2 leading-relaxed">{it.explain}</div>
          </details>
        ))}
      </div>
    </div>
  );
}

function KpCard({ data, station }: { data: SpaceWeatherSnapshot; station: WeatherStation | null }) {
  const kp = data.kp.current;
  const desc = kpDescription(kp);
  const max = 9;
  const pct = kp === null ? 0 : Math.min(1, kp / max);

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <CardHeader title="How shaken-up Earth's magnetism is">
        Known as the <span className="font-mono text-white/70">Kp index</span> (0–9 scale).
        Drives aurora visibility; at the high end can also cause GPS errors and power-grid
        stress.
      </CardHeader>
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-display font-bold text-white tabular-nums">
          {kp === null ? '—' : kp.toFixed(1)}
        </span>
        <span className={`text-sm font-semibold ${desc.tone}`}>{desc.label}</span>
      </div>
      <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 via-yellow-400 via-orange-400 to-fuchsia-400 transition-all duration-700"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      {station && (
        <div className="mt-3 pt-3 border-t border-white/5 text-xs text-white/60">
          Aurora at your latitude (
          {station.latitude !== null ? station.latitude.toFixed(1) : '?'}°):{' '}
          <AuroraVerdictInline lat={station.latitude} kp={kp} />
        </div>
      )}
    </div>
  );
}

function AuroraVerdictInline({ lat, kp }: { lat: number | null; kp: number | null }) {
  const v = auroraVisible(lat, kp);
  const tone =
    v.verdict === 'overhead' ? 'text-fuchsia-300'
    : v.verdict === 'likely' ? 'text-emerald-300'
    : v.verdict === 'possible' ? 'text-amber-300'
    : 'text-white/50';
  const label =
    v.verdict === 'overhead' ? 'overhead — bright displays possible'
    : v.verdict === 'likely' ? 'likely visible to the north'
    : v.verdict === 'possible' ? 'marginal — check skies'
    : 'unlikely tonight';
  return <span className={tone}>{label}</span>;
}

function FlareCard({ data }: { data: SpaceWeatherSnapshot }) {
  const cls = flareClass(data.xray.latest_flux);
  // Build a tiny sparkline of the last 60 flux readings on a log scale.
  const recent = data.xray.recent.slice(-60);
  const path = useMemo(() => {
    if (recent.length < 2) return null;
    const w = 220;
    const h = 56;
    // Log-scale Y: 1e-9 → 1e-3.
    const yMin = -9;
    const yMax = -3;
    const xs = (i: number) => (i / (recent.length - 1)) * w;
    const ys = (flux: number) => {
      const e = Math.log10(Math.max(flux, 1e-10));
      const t = (e - yMin) / (yMax - yMin);
      return h * (1 - Math.max(0, Math.min(1, t)));
    };
    let d = '';
    recent.forEach((p, i) => {
      const x = xs(i);
      const y = ys(p.flux);
      d += i === 0 ? `M ${x.toFixed(1)} ${y.toFixed(1)} ` : `L ${x.toFixed(1)} ${y.toFixed(1)} `;
    });
    return { d, w, h };
  }, [recent]);

  const tone =
    cls.letter === 'X' ? 'text-fuchsia-300'
    : cls.letter === 'M' ? 'text-red-300'
    : cls.letter === 'C' ? 'text-amber-300'
    : cls.letter === 'B' ? 'text-emerald-300'
    : 'text-white/60';

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <CardHeader title="Solar flare strength">
        Bursts of X-rays from the Sun (called{' '}
        <span className="font-mono text-white/70">X-ray flux</span>). Classes A–X, each step
        is 10× stronger. C-class is mild, M is moderate (sometimes brief radio blackouts),
        X is severe.
      </CardHeader>
      <div className="flex items-baseline gap-3">
        <span className="text-4xl font-display font-bold tabular-nums">
          <span className={tone}>{cls.letter}</span>
          <span className="text-white">{cls.magnitude}</span>
        </span>
        <span className="text-xs text-white/50">
          {data.xray.latest_flux !== null ? `${data.xray.latest_flux.toExponential(2)} W/m²` : ''}
        </span>
      </div>
      <div className="mt-2">
        {path && (
          <svg width="100%" height="56" viewBox={`0 0 ${path.w} ${path.h}`} className="overflow-visible">
            {[1e-7, 1e-6, 1e-5, 1e-4].map((thresh, i) => {
              const e = Math.log10(thresh);
              const t = (e - -9) / (-3 - -9);
              const y = path.h * (1 - t);
              const colors = ['#34d399', '#fbbf24', '#f87171', '#e879f9'];
              return (
                <g key={i}>
                  <line x1={0} x2={path.w} y1={y} y2={y} stroke={colors[i]} strokeOpacity="0.18" strokeDasharray="2 3" />
                </g>
              );
            })}
            <path d={path.d} fill="none" stroke="#fbbf24" strokeWidth="1.5" />
          </svg>
        )}
      </div>
    </div>
  );
}

function SolarWindCard({ data }: { data: SpaceWeatherSnapshot }) {
  const l = data.solar_wind.latest;
  const bzTone = l.bz === null ? 'text-white/50' : l.bz < -10 ? 'text-fuchsia-300' : l.bz < -5 ? 'text-amber-300' : l.bz < 0 ? 'text-emerald-300' : 'text-white/70';
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <CardHeader title="Wind from the Sun">
        Stream of particles flowing past Earth (the{' '}
        <span className="font-mono text-white/70">solar wind</span>, measured by DSCOVR a
        million miles upwind). <strong className="text-white/75">Bz</strong> is the most
        important number — strongly negative means south-pointing magnetism that punches
        holes in Earth's shield and drives aurora.{' '}
        <strong className="text-white/75">Speed</strong> over ~600 km/s usually means a
        coronal-mass-ejection (CME) is hitting.
      </CardHeader>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <Stat label="Speed" sub="how fast" value={l.speed === null ? '—' : `${Math.round(l.speed)}`} unit="km/s" tone={
          l.speed === null ? 'text-white/50' :
          l.speed > 700 ? 'text-fuchsia-300' :
          l.speed > 500 ? 'text-amber-300' :
          'text-white'
        } />
        <Stat label="Density" sub="how thick" value={l.density === null ? '—' : l.density.toFixed(1)} unit="p/cm³" tone="text-white" />
        <Stat label="Bz" sub="N/S magnetism" value={l.bz === null ? '—' : l.bz.toFixed(1)} unit="nT" tone={bzTone} />
        <Stat label="Bt" sub="total field" value={l.bt === null ? '—' : l.bt.toFixed(1)} unit="nT" tone="text-white" />
      </div>
      <SparklineRow points={data.solar_wind.plasma_recent.map((p) => p.speed)} label="Speed (last 90 min)" color="#60a5fa" />
      <SparklineRow points={data.solar_wind.mag_recent.map((p) => p.bz)} label="Bz (last 90 min)" color="#f472b6" centerOnZero />
    </div>
  );
}

function SparklineRow({
  points,
  label,
  color,
  centerOnZero = false,
}: {
  points: number[];
  label: string;
  color: string;
  centerOnZero?: boolean;
}) {
  if (points.length < 2) return null;
  const w = 600;
  const h = 36;
  const valid = points.filter((v) => Number.isFinite(v));
  if (valid.length < 2) return null;
  let yMin = Math.min(...valid);
  let yMax = Math.max(...valid);
  if (centerOnZero) {
    const span = Math.max(Math.abs(yMin), Math.abs(yMax), 1);
    yMin = -span;
    yMax = span;
  } else {
    const pad = (yMax - yMin) * 0.1 || 1;
    yMin -= pad;
    yMax += pad;
  }
  const xs = (i: number) => (i / (points.length - 1)) * w;
  const ys = (v: number) => h * (1 - (v - yMin) / (yMax - yMin || 1));
  let d = '';
  let pen = false;
  points.forEach((v, i) => {
    if (!Number.isFinite(v)) {
      pen = false;
      return;
    }
    const x = xs(i);
    const y = ys(v);
    d += pen ? `L ${x.toFixed(1)} ${y.toFixed(1)} ` : `M ${x.toFixed(1)} ${y.toFixed(1)} `;
    pen = true;
  });
  const zeroY = centerOnZero ? h * (1 - (0 - yMin) / (yMax - yMin)) : null;
  return (
    <div className="mt-3">
      <div className="flex items-baseline justify-between text-[10px] text-white/40 mb-0.5">
        <span>{label}</span>
        <span className="font-mono">last 90 min</span>
      </div>
      <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} className="overflow-visible">
        {zeroY !== null && (
          <line x1={0} x2={w} y1={zeroY} y2={zeroY} stroke="rgba(255,255,255,0.12)" strokeDasharray="2 2" />
        )}
        <path d={d} fill="none" stroke={color} strokeWidth="1.5" />
      </svg>
    </div>
  );
}

function Stat({ label, sub, value, unit, tone }: { label: string; sub?: string; value: string; unit: string; tone: string }) {
  return (
    <div>
      <div className="text-[10px] uppercase tracking-wide text-white/40">{label}</div>
      {sub && <div className="text-[9px] text-white/35 -mt-0.5">{sub}</div>}
      <div className={`text-lg font-display font-bold tabular-nums ${tone}`}>
        {value} <span className="text-[10px] text-white/40">{unit}</span>
      </div>
    </div>
  );
}

function SunspotsCard({ data }: { data: SpaceWeatherSnapshot }) {
  const ssn = (data.sunspots.latest as any)?.SSN ?? (data.sunspots.latest as any)?.ssn ?? null;
  const f10 = (data.sunspots.latest as any)?.f10 ?? (data.sunspots.latest as any)?.flux_10cm ?? null;
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <CardHeader title="How busy the Sun's surface is">
        Dark spots on the Sun where flares and solar storms come from. More spots and more
        active groups generally means a more energetic Sun.
      </CardHeader>
      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Spots today"
          sub="sunspot number"
          value={ssn !== null ? String(ssn) : '—'}
          unit=""
          tone="text-white"
        />
        <Stat
          label="Active groups"
          sub="visible right now"
          value={String(data.sunspots.active_regions_count)}
          unit=""
          tone="text-white"
        />
      </div>
      {f10 !== null && (
        <div className="text-xs text-white/60 mt-3">
          Energy output: <span className="text-white font-mono">{f10}</span>{' '}
          <span className="text-white/40">sfu</span>
        </div>
      )}
    </div>
  );
}

function AuroraCard({ data, station }: { data: SpaceWeatherSnapshot; station: WeatherStation | null }) {
  const lat = station?.latitude ?? null;
  const v = auroraVisible(lat, data.kp.current);
  const tone =
    v.verdict === 'overhead' ? 'text-fuchsia-300'
    : v.verdict === 'likely' ? 'text-emerald-300'
    : v.verdict === 'possible' ? 'text-amber-300'
    : 'text-white/50';
  const headline =
    v.verdict === 'overhead' ? 'Overhead'
    : v.verdict === 'likely' ? 'Likely visible'
    : v.verdict === 'possible' ? 'Marginal'
    : 'Unlikely';

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <CardHeader title="Northern lights tonight">
        Whether the aurora's likely to be visible from your station's latitude, based on
        the current Kp value. At your latitude ({lat !== null ? `${lat.toFixed(1)}°` : '?'}),
        aurora usually reach down to about {v.threshold.toFixed(0)}° at the current Kp of{' '}
        {data.kp.current?.toFixed(1) ?? '—'}. Best viewing: dark skies, no moon, looking
        north, around 10 PM–2 AM local. Rough estimate, not a guarantee.
      </CardHeader>
      <div className={`text-3xl font-display font-bold ${tone}`}>{headline}</div>
    </div>
  );
}

function SunImageCard({ imgIndex, setImgIndex }: { imgIndex: number; setImgIndex: (n: number) => void }) {
  const img = SDO_IMAGES[imgIndex];
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-baseline justify-between gap-2 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-wide text-white/40 font-semibold">
            The Sun right now
          </div>
          <div className="text-[11px] text-white/50">{img.description}</div>
        </div>
        <div className="flex gap-1 flex-wrap">
          {SDO_IMAGES.map((s, i) => (
            <button
              key={s.id}
              onClick={() => setImgIndex(i)}
              className={`text-[11px] px-2 py-1 rounded-md transition-colors ${
                i === imgIndex
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'bg-white/5 text-white/60 hover:bg-white/10'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>
      </div>
      <div className="bg-black flex items-center justify-center">
        <img
          src={img.url}
          alt={`Sun: ${img.description}`}
          className="max-w-full h-auto max-h-[480px]"
          loading="lazy"
        />
      </div>
      <div className="px-4 py-2 text-[10px] text-white/30 text-center">
        NASA/SDO · refreshes every few minutes
      </div>
    </div>
  );
}

function AlertsCard({ alerts }: { alerts: { issued: string; product_id: string; message: string }[] }) {
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <CardHeader title="Recent space weather alerts">
        Official advisories from NOAA's Space Weather Prediction Center, last 36 hours. Tap
        any item below to read the full text.
      </CardHeader>
      <div className="space-y-2">
        {alerts.map((a, i) => (
          <details key={i} className="bg-white/5 rounded-lg border border-white/5 overflow-hidden">
            <summary className="cursor-pointer list-none flex items-center gap-2 p-3 hover:bg-white/5 transition-colors">
              <span className="text-xs font-mono text-amber-300">{a.product_id}</span>
              <span className="text-[10px] text-white/40">
                {new Date(a.issued + 'Z').toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
            </summary>
            <div className="px-3 pb-3 pt-1 text-xs text-white/65 whitespace-pre-wrap leading-relaxed font-mono">
              {a.message}
            </div>
          </details>
        ))}
      </div>
    </div>
  );
}

function ThreeDayCard({ lines }: { lines: string[] }) {
  return (
    <div className="bg-white/5 rounded-xl border border-white/10 p-4">
      <CardHeader title="Next 3 days">
        Highlights from NOAA's 3-day space-weather forecast discussion.
      </CardHeader>
      <ul className="text-xs text-white/65 space-y-1 font-mono">
        {lines.map((l, i) => (
          <li key={i}>{l}</li>
        ))}
      </ul>
    </div>
  );
}
