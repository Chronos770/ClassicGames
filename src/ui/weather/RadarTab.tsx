import { useState } from 'react';
import type { WeatherStation } from '../../lib/weatherService';

// Windy supports many overlays for free — these are the most useful ones.
const WINDY_OVERLAYS: { id: string; label: string }[] = [
  { id: 'radar', label: 'Radar (NEXRAD)' },
  { id: 'wind', label: 'Wind' },
  { id: 'rain', label: 'Precipitation' },
  { id: 'temp', label: 'Temperature' },
  { id: 'rh', label: 'Humidity' },
  { id: 'clouds', label: 'Clouds' },
  { id: 'pressure', label: 'Pressure' },
  { id: 'gust', label: 'Wind Gusts' },
  { id: 'snow', label: 'Snow Depth' },
  { id: 'thunder', label: 'Thunderstorms' },
  { id: 'cape', label: 'CAPE Index' },
  { id: 'waves', label: 'Waves' },
  { id: 'cloudtop', label: 'Cloud Tops' },
  { id: 'visibility', label: 'Visibility' },
];

const LEVELS = [
  { id: 'surface', label: 'Surface' },
  { id: '850h', label: '850 hPa' },
  { id: '700h', label: '700 hPa' },
  { id: '500h', label: '500 hPa' },
  { id: '300h', label: '300 hPa' },
];

export default function RadarTab({ station }: { station: WeatherStation | null }) {
  const [overlay, setOverlay] = useState('radar');
  const [level, setLevel] = useState('surface');

  if (!station || station.latitude === null || station.longitude === null) {
    return <div className="text-white/30 text-sm py-8 text-center">Station location missing; radar unavailable.</div>;
  }

  const lat = station.latitude;
  const lon = station.longitude;

  const embedSrc =
    `https://embed.windy.com/embed2.html?` +
    `lat=${lat}&lon=${lon}` +
    `&detailLat=${lat}&detailLon=${lon}` +
    `&zoom=7` +
    `&level=${encodeURIComponent(level)}` +
    `&overlay=${encodeURIComponent(overlay)}` +
    `&product=${overlay === 'radar' ? 'radar' : 'ecmwf'}` +
    `&menu=&message=&marker=true&calendar=now&pressure=&type=map` +
    `&location=coordinates&detail=` +
    `&metricWind=mph&metricTemp=%C2%B0F&radarRange=-1`;

  const directSrc = `https://www.windy.com/?${overlay},${lat.toFixed(3)},${lon.toFixed(3)},7`;

  return (
    <div className="space-y-3">
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 bg-slate-900/85 backdrop-blur-sm rounded-xl border border-white/10 p-3">
        <div className="flex flex-col gap-1 w-full sm:w-auto sm:flex-1">
          <span className="text-[10px] uppercase tracking-wider text-white/30">Overlay</span>
          <div className="flex flex-wrap gap-1">
            {WINDY_OVERLAYS.map((o) => (
              <button
                key={o.id}
                onClick={() => setOverlay(o.id)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  overlay === o.id
                    ? 'bg-amber-500/20 text-amber-400 font-medium'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                {o.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex flex-col gap-1">
          <span className="text-[10px] uppercase tracking-wider text-white/30">Altitude</span>
          <div className="flex flex-wrap gap-1">
            {LEVELS.map((l) => (
              <button
                key={l.id}
                onClick={() => setLevel(l.id)}
                className={`text-xs px-2 py-1 rounded transition-colors ${
                  level === l.id
                    ? 'bg-blue-500/20 text-blue-300 font-medium'
                    : 'text-white/50 hover:text-white/80 hover:bg-white/5'
                }`}
              >
                {l.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <a
          href={directSrc}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors"
        >
          ↗ Open Full Windy Map
        </a>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden bg-[#0a0a0d]">
        <iframe
          key={`${overlay}-${level}`}
          src={embedSrc}
          title="Windy map"
          width="100%"
          height="540"
          frameBorder="0"
          loading="lazy"
          referrerPolicy="origin"
          style={{ display: 'block', border: 0, minHeight: 540 }}
        />
      </div>

      <div className="text-[10px] text-white/30 text-center leading-relaxed">
        Windy.com · {overlay === 'radar' ? 'NEXRAD radar' : `ECMWF model · ${WINDY_OVERLAYS.find((o) => o.id === overlay)?.label}`}
        {level !== 'surface' && ` · ${LEVELS.find((l) => l.id === level)?.label}`}
      </div>
    </div>
  );
}
