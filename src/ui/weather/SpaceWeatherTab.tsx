import { useEffect, useMemo, useRef, useState, type RefObject } from 'react';
import {
  alertSummary,
  auroraColor,
  auroraValueAt,
  auroraVisible,
  fetchSpaceWeather,
  flareActivity,
  flareClass,
  kpDescription,
  scaleLabel,
  solarWindActivity,
  sunspotActivity,
  SDO_IMAGES,
  helioviewerImageUrl,
  type AuroraGridPoint,
  type AuroraSnapshot,
  type KpForecastPoint,
  type SpaceWeatherSnapshot,
} from '../../lib/spaceWeatherService';
import type { WeatherStation } from '../../lib/weatherService';
import SolarSystemViewer from './SolarSystemViewer';

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

      <SolarSystemViewer data={data} station={station} />

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

      {data.aurora && data.aurora.points.length > 0 && (
        <AuroraMapCard data={data} station={station} />
      )}

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
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
      <CardHeader title="Is anything unusual happening?">
        Three NOAA scales for storms (G), radiation (S), and radio blackouts (R). Tap any
        card for the full explanation.
      </CardHeader>
      <div className="grid grid-cols-3 gap-3">
        {items.map((it) => {
          const status = scaleLabel(it.value);
          return (
            <details key={it.letter} className={`rounded-xl border p-3 ${colorFor(it.value)}`}>
              <summary className="cursor-pointer list-none text-center">
                <div className={`text-base font-display font-semibold leading-tight ${status.tone}`}>
                  {status.label}
                </div>
                <div className="text-[10px] uppercase tracking-wide opacity-70 mt-1">
                  {it.label}
                </div>
                <div className="text-[10px] uppercase tracking-wide opacity-50 mt-0.5 font-mono">
                  {it.letter}
                  {it.value}
                </div>
              </summary>
              <div className="text-[11px] opacity-85 mt-2 leading-relaxed">{it.explain}</div>
            </details>
          );
        })}
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
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
      <CardHeader title="How shaken-up Earth's magnetism is">
        Known as the <span className="font-mono text-white/70">Kp index</span> (0–9 scale).
        Drives aurora visibility; at the high end can also cause GPS errors and power-grid
        stress.
      </CardHeader>
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className={`text-3xl font-display font-bold ${desc.tone}`}>{desc.label}</span>
        <span className="text-xs text-white/40 font-mono">
          Kp {kp === null ? '—' : kp.toFixed(1)}
        </span>
      </div>
      <div className="mt-3 h-2 bg-white/5 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-emerald-400 via-yellow-400 via-orange-400 to-fuchsia-400 transition-all duration-700"
          style={{ width: `${pct * 100}%` }}
        />
      </div>
      {data.kp.forecast.length > 0 && <KpForecastStrip forecast={data.kp.forecast} />}
      {station && (
        <div className="mt-3 pt-3 border-t border-white/5 text-xs text-white/60">
          Aurora at your latitude (
          {station.latitude !== null ? station.latitude.toFixed(1) : '?'}°):{' '}
          <AuroraVerdictInline station={station} kp={kp} aurora={data.aurora} />
        </div>
      )}
    </div>
  );
}

// Bar strip of the upcoming ~3-day Kp forecast (SWPC issues this at
// 3-hour cadence). Solid bars are already-observed/estimated readings
// near "now"; faded bars are the forward-looking prediction.
function KpForecastStrip({ forecast }: { forecast: KpForecastPoint[] }) {
  const maxKp = 9;
  const barTone = (kp: number): string =>
    kp < 4 ? 'bg-emerald-400'
    : kp < 5 ? 'bg-amber-400'
    : kp < 6 ? 'bg-orange-400'
    : kp < 7 ? 'bg-orange-500'
    : kp < 8 ? 'bg-red-500'
    : 'bg-fuchsia-500';
  let lastDay = '';
  return (
    <div className="mt-3 pt-3 border-t border-white/5">
      <div className="text-[10px] uppercase tracking-wide text-white/40 font-semibold mb-2">
        Next 3 days
      </div>
      <div className="flex items-end gap-[2px] h-12">
        {forecast.map((p, i) => {
          const day = new Date(p.time).toLocaleDateString([], { weekday: 'short' });
          const showLabel = day !== lastDay;
          lastDay = day;
          const h = Math.max(8, (p.kp / maxKp) * 100);
          return (
            <div key={i} className="flex-1 h-full flex flex-col justify-end items-center relative group">
              <div
                className={`w-full rounded-t-sm ${barTone(p.kp)} ${p.kind === 'predicted' ? 'opacity-45' : ''}`}
                style={{ height: `${h}%` }}
              />
              <div className="pointer-events-none absolute bottom-full mb-1 hidden group-hover:block text-[9px] bg-black/80 text-white px-1.5 py-0.5 rounded whitespace-nowrap z-10">
                {new Date(p.time).toLocaleString([], { weekday: 'short', hour: 'numeric' })} · Kp{' '}
                {p.kp.toFixed(1)}
              </div>
              {showLabel && (
                <div className="absolute -bottom-4 text-[8px] text-white/35 truncate w-full text-center">
                  {day}
                </div>
              )}
            </div>
          );
        })}
      </div>
      <div className="h-4" />
      <div className="text-[9px] text-white/30 text-center">Faded bars = predicted</div>
    </div>
  );
}

function AuroraVerdictInline({
  station,
  kp,
  aurora,
}: {
  station: WeatherStation | null;
  kp: number | null;
  aurora: SpaceWeatherSnapshot['aurora'];
}) {
  const v = resolveAuroraVerdict(station, kp, aurora);
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
  return (
    <span className={tone}>
      {label}
      {v.probability !== null && <span className="text-white/30"> ({v.probability}%)</span>}
    </span>
  );
}

// Prefer the real OVATION grid probability at the station's exact
// lat/lon when we have it (far more local/accurate than a Kp-only
// estimate); fall back to the rough Kp+latitude heuristic when the
// aurora grid didn't load or the station is outside its |lat|>=35 range.
function resolveAuroraVerdict(
  station: WeatherStation | null,
  kp: number | null,
  aurora: SpaceWeatherSnapshot['aurora'],
): { verdict: 'unlikely' | 'possible' | 'likely' | 'overhead'; probability: number | null } {
  const lat = station?.latitude ?? null;
  const lon = station?.longitude ?? null;
  if (aurora && lat !== null && lon !== null) {
    const val = auroraValueAt(aurora.points, lat, lon);
    if (val !== null) {
      const verdict = val <= 0 ? 'unlikely' : val < 4 ? 'possible' : val < 15 ? 'likely' : 'overhead';
      return { verdict, probability: Math.round(val) };
    }
  }
  return { ...auroraVisible(lat, kp), probability: null };
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
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
      <CardHeader title="Solar flare strength">
        Bursts of X-rays from the Sun (called{' '}
        <span className="font-mono text-white/70">X-ray flux</span>). Classes A–X, each step
        is 10× stronger. C-class is mild, M is moderate (sometimes brief radio blackouts),
        X is severe.
      </CardHeader>
      <div className="flex items-baseline gap-3 flex-wrap">
        <span className={`text-3xl font-display font-bold ${flareActivity(data.xray.latest_flux).tone}`}>
          {flareActivity(data.xray.latest_flux).label}
        </span>
        <span className="text-xs text-white/40 font-mono">
          Class <span className={tone}>{cls.letter}</span>
          {cls.magnitude}
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
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
      <CardHeader title="Wind from the Sun">
        Stream of particles flowing past Earth (the{' '}
        <span className="font-mono text-white/70">solar wind</span>, measured by DSCOVR a
        million miles upwind). <strong className="text-white/75">Bz</strong> is the most
        important number — strongly negative means south-pointing magnetism that punches
        holes in Earth's shield and drives aurora.{' '}
        <strong className="text-white/75">Speed</strong> over ~600 km/s usually means a
        coronal-mass-ejection (CME) is hitting.
      </CardHeader>
      {(() => {
        const a = solarWindActivity(l.speed, l.bz);
        return (
          <div className={`text-2xl font-display font-bold mb-3 ${a.tone}`}>
            {a.label}
          </div>
        );
      })()}
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
  const { ssn, ssn_date, f10 } = data.sunspots;
  return (
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
      <CardHeader title="How busy the Sun's surface is">
        Dark spots on the Sun where flares and solar storms come from. More spots and more
        active groups generally means a more energetic Sun.
      </CardHeader>
      {(() => {
        const a = sunspotActivity(ssn);
        return (
          <div className={`text-2xl font-display font-bold mb-3 ${a.tone}`}>{a.label}</div>
        );
      })()}
      <div className="grid grid-cols-2 gap-3">
        <Stat
          label="Sunspot number"
          sub={ssn_date ? new Date(ssn_date).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'today'}
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
          Energy output (10.7cm flux): <span className="text-white font-mono">{f10}</span>{' '}
          <span className="text-white/40">sfu</span>
        </div>
      )}
    </div>
  );
}

function AuroraCard({ data, station }: { data: SpaceWeatherSnapshot; station: WeatherStation | null }) {
  const lat = station?.latitude ?? null;
  const v = resolveAuroraVerdict(station, data.kp.current, data.aurora);
  const kpOnly = auroraVisible(lat, data.kp.current); // still used for the "threshold" text below
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
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
      <CardHeader title="Northern lights tonight">
        Whether the aurora's likely to be visible from your station's latitude. When the live
        aurora forecast grid covers your latitude we use its real probability there; otherwise
        this falls back to a Kp-only estimate. At your latitude (
        {lat !== null ? `${lat.toFixed(1)}°` : '?'}), aurora usually reach down to about{' '}
        {kpOnly.threshold.toFixed(0)}° at the current Kp of {data.kp.current?.toFixed(1) ?? '—'}.
        Best viewing: dark skies, no moon, looking north, around 10 PM–2 AM local.
      </CardHeader>
      <div className={`text-3xl font-display font-bold ${tone}`}>
        {headline}
        {v.probability !== null && <span className="text-base text-white/40 ml-2">{v.probability}% chance</span>}
      </div>
    </div>
  );
}

// Polar-projection heatmap of NOAA's OVATION aurora nowcast grid — the
// closest thing to a "radar" for aurora. Two polar plots (N/S
// hemisphere), each point colored by aurora probability/intensity, with
// the user's station plotted on top so they can see at a glance whether
// the oval currently reaches them. Rendered to a <canvas> via raw pixel
// pushes rather than one DOM/SVG element per grid point — the grid can
// carry several thousand points and canvas handles that instantly where
// SVG would start to choke, especially on lower-end phones.
//
// Fullscreen mode (⛶) doesn't just blow the maps up — it's the one
// place a compact strip of the rest of the tab's live numbers (Kp,
// solar wind, flares, sunspots, NOAA scales) shows up alongside the
// maps, so you can cross-reference without the base card getting
// cluttered with a second copy of everything above it.
function AuroraMapCard({ data, station }: { data: SpaceWeatherSnapshot; station: WeatherStation | null }) {
  const aurora = data.aurora!; // caller only renders this card when data.aurora is present
  const [fullscreen, setFullscreen] = useState(false);

  useEffect(() => {
    if (!fullscreen) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener('keydown', onKey);
    };
  }, [fullscreen]);

  return (
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <CardHeader title="Aurora forecast map — the closest thing to radar for the northern lights">
            NOAA's OVATION model estimates aurora probability across the whole globe every few
            minutes, forecast about 30-60 minutes ahead. Brighter/hotter colors mean a better
            chance of visible aurora at that location. Your station is marked with a white ring
            if it falls within plotted range.
          </CardHeader>
        </div>
        <button
          onClick={() => setFullscreen(true)}
          className="flex-shrink-0 min-h-[38px] text-xs sm:text-[13px] font-medium px-3 py-2 rounded-lg bg-sky-500/15 hover:bg-sky-500/25 border border-sky-400/30 text-sky-200 hover:text-white transition-colors"
          title="View fullscreen"
        >
          ⛶ Fullscreen
        </button>
      </div>
      <AuroraMapBody data={data} aurora={aurora} station={station} sizeKey="compact" />
      {fullscreen && (
        // Fully opaque, not bg-black/NN — the compact card directly
        // behind this overlay (same scroll position, not unmounted)
        // has bright aurora colors that visibly bled through even at
        // 97% opacity, producing a ghosting/double-exposure look.
        <div className="fixed inset-0 z-50 bg-[#05060f] overflow-y-auto">
          <div className="max-w-5xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between mb-3">
              <div className="text-sm font-display font-bold text-white">Aurora Forecast Map</div>
              <button
                onClick={() => setFullscreen(false)}
                className="text-white/60 hover:text-white text-sm w-8 h-8 flex items-center justify-center rounded-lg hover:bg-white/10"
                aria-label="Close fullscreen"
              >
                ✕
              </button>
            </div>
            <SpaceWeatherStrip data={data} />
            <div className="mt-4">
              <AuroraMapBody data={data} aurora={aurora} station={station} sizeKey="full" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AuroraMapBody({
  data,
  aurora,
  station,
  sizeKey,
}: {
  data: SpaceWeatherSnapshot;
  aurora: AuroraSnapshot;
  station: WeatherStation | null;
  sizeKey: 'compact' | 'full';
}) {
  const northRef = useRef<HTMLCanvasElement>(null);
  const southRef = useRef<HTMLCanvasElement>(null);

  const northPts = useMemo(() => aurora.points.filter((p) => p[1] > 0), [aurora.points]);
  const southPts = useMemo(() => aurora.points.filter((p) => p[1] < 0), [aurora.points]);

  useDrawAuroraPolar(northRef, northPts, 'north', station, sizeKey);
  useDrawAuroraPolar(southRef, southPts, 'south', station, sizeKey);

  const stationVal =
    station?.latitude != null && station?.longitude != null
      ? auroraValueAt(aurora.points, station.latitude, station.longitude)
      : null;

  return (
    <>
      <div className="text-[10px] text-white/40 mb-2 mt-2">
        Observed {aurora.observation_time ? new Date(aurora.observation_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}
        {' · '}forecast for{' '}
        {aurora.forecast_time ? new Date(aurora.forecast_time).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' }) : '—'}
        {' · '}Kp {data.kp.current !== null ? data.kp.current.toFixed(1) : '—'}
      </div>
      <div className={sizeKey === 'full' ? 'grid grid-cols-1 sm:grid-cols-2 gap-6 max-w-3xl mx-auto' : 'grid grid-cols-2 gap-3'}>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-white/40 text-center mb-1">Northern Hemisphere</div>
          <canvas ref={northRef} className="w-full aspect-square rounded-lg bg-black/40" />
        </div>
        <div>
          <div className="text-[10px] uppercase tracking-wide text-white/40 text-center mb-1">Southern Hemisphere</div>
          <canvas ref={southRef} className="w-full aspect-square rounded-lg bg-black/40" />
        </div>
      </div>
      {stationVal !== null && (
        <div className="text-xs text-white/60 mt-3 pt-3 border-t border-white/5 text-center">
          Aurora probability directly over your station right now:{' '}
          <span className="text-white font-semibold">{Math.round(stationVal)}%</span>
        </div>
      )}
      <AuroraLegend />
    </>
  );
}

// Compact, horizontally-scrollable strip of the tab's other live
// numbers — only shown in the fullscreen aurora map, so cross-checking
// "is this a real storm?" doesn't require closing the map to scroll up.
function SpaceWeatherStrip({ data }: { data: SpaceWeatherSnapshot }) {
  const kp = kpDescription(data.kp.current);
  const wind = solarWindActivity(data.solar_wind.latest.speed, data.solar_wind.latest.bz);
  const flare = flareActivity(data.xray.latest_flux);
  const cls = flareClass(data.xray.latest_flux);
  const chips: { label: string; value: string; tone: string }[] = [
    { label: 'Kp index', value: `${kp.label}${data.kp.current !== null ? ` (${data.kp.current.toFixed(1)})` : ''}`, tone: kp.tone },
    {
      label: 'Solar wind',
      value: `${wind.label}${data.solar_wind.latest.speed !== null ? ` · ${Math.round(data.solar_wind.latest.speed)} km/s` : ''}`,
      tone: wind.tone,
    },
    { label: 'Flares', value: `${flare.label} (${cls.letter === '—' ? '—' : `${cls.letter}${cls.magnitude}`})`, tone: flare.tone },
    { label: 'Sunspot number', value: data.sunspots.ssn !== null ? String(data.sunspots.ssn) : '—', tone: 'text-white' },
    { label: 'Active regions', value: String(data.sunspots.active_regions_count), tone: 'text-white' },
  ];
  if (data.scales) {
    chips.push({ label: 'G / S / R', value: `G${data.scales.G} S${data.scales.S} R${data.scales.R}`, tone: 'text-white' });
  }
  chips.push({ label: 'NOAA alerts (36h)', value: String(data.alerts.length), tone: data.alerts.length > 0 ? 'text-amber-300' : 'text-white/50' });

  return (
    <div className="overflow-x-auto -mx-1 px-1">
      <div className="flex gap-2 min-w-max pb-1">
        {chips.map((c) => (
          <div key={c.label} className="bg-white/5 border border-white/10 rounded-lg px-3 py-2 min-w-[130px]">
            <div className="text-[9px] uppercase tracking-wide text-white/40">{c.label}</div>
            <div className={`text-xs font-semibold mt-0.5 ${c.tone}`}>{c.value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

function AuroraLegend() {
  const stops = [0, 2, 5, 10, 20, 40, 70, 100];
  return (
    <div className="flex items-center gap-1 mt-3">
      <span className="text-[9px] text-white/30 mr-1">Low</span>
      {stops.map((s) => (
        <div key={s} className="h-2 flex-1 rounded-sm" style={{ background: s === 0 ? 'rgba(255,255,255,0.06)' : auroraColor(s) }} />
      ))}
      <span className="text-[9px] text-white/30 ml-1">High</span>
    </div>
  );
}

// Draws one hemisphere's grid as an azimuthal (polar) projection: pole
// at the canvas center, colatitude (90° - |lat|) as radius, longitude as
// angle. Cropped to |lat| >= 35 (see the edge function), which caps the
// radius so the whole plotted band fits the canvas comfortably.
function useDrawAuroraPolar(
  ref: RefObject<HTMLCanvasElement | null>,
  points: AuroraGridPoint[],
  hemisphere: 'north' | 'south',
  station: WeatherStation | null,
  // Not read directly — included only so the effect re-runs (and picks
  // up the canvas's new clientWidth) when switching between the compact
  // card and the fullscreen overlay, which render at very different sizes.
  sizeKey: 'compact' | 'full',
) {
  useEffect(() => {
    const canvas = ref.current;
    if (!canvas || points.length === 0) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const size = canvas.clientWidth || 220;
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, size, size);

    const cx = size / 2;
    const cy = size / 2;
    const maxColat = 55; // 90 - 35 (grid crop floor)
    const maxRadius = size / 2 - 4;

    // Latitude gridlines at 80/70/60/50/40° for orientation.
    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;
    for (const lat of [80, 70, 60, 50, 40]) {
      const r = ((90 - lat) / maxColat) * maxRadius;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    }

    const cellPx = Math.max(1.5, (maxRadius / maxColat) * 1.8);
    for (const [lon, lat, val] of points) {
      if (val <= 0) continue;
      const colat = 90 - Math.abs(lat);
      const r = (colat / maxColat) * maxRadius;
      const theta = degToRad(lon);
      const x = cx + r * Math.sin(theta);
      // Southern hemisphere is mirrored so it still reads pole-at-center,
      // increasing-latitude-outward like the northern plot.
      const y = hemisphere === 'north' ? cy - r * Math.cos(theta) : cy + r * Math.cos(theta);
      ctx.fillStyle = auroraColor(val);
      ctx.fillRect(x - cellPx / 2, y - cellPx / 2, cellPx, cellPx);
    }

    // Station marker.
    const lat = station?.latitude;
    const lon = station?.longitude;
    if (lat != null && lon != null) {
      const inHemi = hemisphere === 'north' ? lat > 0 : lat < 0;
      if (inHemi && Math.abs(lat) >= 90 - maxColat) {
        const colat = 90 - Math.abs(lat);
        const r = (colat / maxColat) * maxRadius;
        const theta = degToRad(lon < 0 ? lon + 360 : lon);
        const x = cx + r * Math.sin(theta);
        const y = hemisphere === 'north' ? cy - r * Math.cos(theta) : cy + r * Math.cos(theta);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(x, y, 1.5, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
      }
    }

    // Pole marker.
    ctx.beginPath();
    ctx.arc(cx, cy, 2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();
  }, [ref, points, hemisphere, station?.latitude, station?.longitude, sizeKey]);
}

function degToRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function SunImageCard({ imgIndex, setImgIndex }: { imgIndex: number; setImgIndex: (n: number) => void }) {
  const img = SDO_IMAGES[imgIndex];
  // Timelapse state. When mode === 'live' we show the latest NASA/SDO
  // image direct from sdo.gsfc.nasa.gov. When 'timelapse' we render a
  // Helioviewer screenshot for a specific past timestamp; the slider
  // covers the last 14 days at hourly resolution and the play button
  // auto-advances the timestamp at a configurable speed.
  const [mode, setMode] = useState<'live' | 'timelapse'>('live');
  const HOUR_MS = 3600_000;
  const STEP_HOURS = 1;
  const SPAN_HOURS = 14 * 24; // 14 days
  const [endRef, setEndRef] = useState<number>(() => {
    // Snap to the top of the current hour so frames align.
    return Math.floor(Date.now() / HOUR_MS) * HOUR_MS;
  });
  const [offsetHours, setOffsetHours] = useState<number>(SPAN_HOURS); // 0 = newest, SPAN_HOURS = oldest
  const [playing, setPlaying] = useState(false);
  // Default 2 fps because Helioviewer's takeScreenshot endpoint takes
  // ~0.5–2 seconds to render uncached frames. Faster defaults caused
  // the image to flash blank between every step on first playback.
  const [speed, setSpeed] = useState<number>(2);

  // Re-anchor "now" once when entering timelapse mode.
  useEffect(() => {
    if (mode !== 'timelapse') return;
    setEndRef(Math.floor(Date.now() / HOUR_MS) * HOUR_MS);
    setOffsetHours(SPAN_HOURS); // start at oldest so play moves toward present
  }, [mode]);

  // Prefetch the next ~20 frames into the browser cache whenever the
  // playhead moves. Helioviewer's first-time render of a screenshot
  // takes 0.5–2s; if we only request a frame at the moment we want to
  // display it, the next src change aborts that in-flight request and
  // we never see anything. By pre-warming the cache, the visible
  // <img>'s src swaps hit instantly. `new Image()` lets the browser
  // start loading without inserting anything into the DOM.
  useEffect(() => {
    if (mode !== 'timelapse') return;
    const PREFETCH = 20;
    for (let i = 1; i <= PREFETCH; i++) {
      const futureOffset = offsetHours - i;
      if (futureOffset < 0) break;
      const url = helioviewerImageUrl(
        img.helioviewerSourceId,
        new Date(endRef - futureOffset * HOUR_MS),
      );
      const pre = new window.Image();
      pre.src = url;
    }
  }, [mode, offsetHours, endRef, img.helioviewerSourceId]);

  // Playback tick.
  useEffect(() => {
    if (!playing || mode !== 'timelapse') return;
    const id = window.setInterval(() => {
      setOffsetHours((h) => {
        const next = h - STEP_HOURS;
        if (next <= 0) {
          setPlaying(false);
          return 0;
        }
        return next;
      });
    }, 1000 / speed);
    return () => window.clearInterval(id);
  }, [playing, speed, mode]);

  const currentTs = endRef - offsetHours * HOUR_MS;
  const currentDate = new Date(currentTs);
  const currentSrc =
    mode === 'live' ? img.url : helioviewerImageUrl(img.helioviewerSourceId, currentDate);

  return (
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 overflow-hidden">
      <div className="px-4 pt-4 pb-2 flex items-baseline justify-between gap-2 flex-wrap">
        <div>
          <div className="text-xs uppercase tracking-wide text-white/40 font-semibold">
            {mode === 'live' ? 'The Sun right now' : 'The Sun — timelapse'}
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

      {/* Mode toggle */}
      <div className="px-4 pb-2 flex items-center gap-2 text-[11px]">
        <button
          onClick={() => {
            setMode('live');
            setPlaying(false);
          }}
          className={`px-2 py-1 rounded-md transition-colors ${
            mode === 'live'
              ? 'bg-white/10 text-white border border-white/15'
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          Live
        </button>
        <button
          onClick={() => setMode('timelapse')}
          className={`px-2 py-1 rounded-md transition-colors ${
            mode === 'timelapse'
              ? 'bg-white/10 text-white border border-white/15'
              : 'text-white/50 hover:text-white/80'
          }`}
        >
          Timelapse
        </button>
        {mode === 'timelapse' && (
          <span className="text-white/40 ml-auto font-mono">
            {currentDate.toLocaleString([], {
              month: 'short',
              day: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </span>
        )}
      </div>

      <div className="bg-black flex items-center justify-center min-h-[300px]">
        {/* No `key` here — letting the browser update src in place keeps
            the previous frame visible while the next one decodes, instead
            of remounting and showing a blank box every step. */}
        <img
          src={currentSrc}
          alt={`Sun: ${img.description}${mode === 'timelapse' ? ` · ${currentDate.toISOString()}` : ''}`}
          className="max-w-full h-auto max-h-[480px]"
        />
      </div>

      {mode === 'timelapse' && (
        <div className="px-4 py-3 space-y-2">
          <input
            type="range"
            min={0}
            max={SPAN_HOURS}
            step={STEP_HOURS}
            value={SPAN_HOURS - offsetHours}
            onChange={(e) => {
              setOffsetHours(SPAN_HOURS - Number(e.target.value));
              setPlaying(false);
            }}
            className="w-full accent-amber-500"
            aria-label="Timelapse position"
          />
          <div className="flex items-center gap-2 text-[11px]">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="px-3 py-1 rounded-md bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 transition-colors"
            >
              {playing ? '❚❚ Pause' : '▶ Play'}
            </button>
            <button
              onClick={() => {
                setOffsetHours(SPAN_HOURS);
                setPlaying(false);
              }}
              className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/70 transition-colors"
              title="Jump to oldest frame"
            >
              ⏮
            </button>
            <button
              onClick={() => {
                setOffsetHours(0);
                setPlaying(false);
              }}
              className="px-2 py-1 rounded-md bg-white/5 hover:bg-white/10 text-white/70 transition-colors"
              title="Jump to newest frame"
            >
              ⏭
            </button>
            <div className="ml-auto flex items-center gap-1 text-white/50">
              <span>Speed</span>
              {[1, 2, 4, 8].map((s) => (
                <button
                  key={s}
                  onClick={() => setSpeed(s)}
                  className={`px-1.5 py-0.5 rounded ${
                    speed === s ? 'bg-white/10 text-white' : 'hover:text-white/80'
                  }`}
                >
                  {s}×
                </button>
              ))}
            </div>
          </div>
          <div className="text-[10px] text-white/30 text-center">
            14 days · {SPAN_HOURS - offsetHours + 1} of {SPAN_HOURS + 1} hourly frames · imagery via Helioviewer.org
          </div>
        </div>
      )}

      {mode === 'live' && (
        <div className="px-4 py-2 text-[10px] text-white/30 text-center">
          NASA/SDO · refreshes every few minutes
        </div>
      )}
    </div>
  );
}

function AlertsCard({ alerts }: { alerts: { issued: string; product_id: string; message: string }[] }) {
  return (
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
      <CardHeader title="What NOAA is warning about">
        Official advisories from NOAA's Space Weather Prediction Center, last 36 hours. Tap
        any item below to read the full text.
      </CardHeader>
      <div className="space-y-2">
        {alerts.map((a, i) => (
          <details key={i} className="bg-black/20 backdrop-blur-md rounded-lg border border-white/5 overflow-hidden">
            <summary className="cursor-pointer list-none flex items-baseline gap-2 p-3 hover:bg-white/5 transition-colors flex-wrap">
              <span className="text-sm text-white font-medium flex-1 min-w-0">
                {alertSummary(a.product_id, a.message)}
              </span>
              <span className="text-[10px] text-white/40 font-mono">
                {new Date(a.issued + 'Z').toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}
              </span>
              <span className="text-[10px] text-white/30 font-mono">{a.product_id}</span>
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
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
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
