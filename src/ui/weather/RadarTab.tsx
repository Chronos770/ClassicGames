import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../lib/supabase';
import { getAlerts, type NwsAlert } from '../../lib/nwsService';
import type { WeatherStation } from '../../lib/weatherService';

type Provider = 'windy' | 'radar';

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

export default function RadarTab({ station }: { station: WeatherStation | null }) {
  const [provider, setProvider] = useState<Provider>('windy');

  if (!station || station.latitude === null || station.longitude === null) {
    return <div className="text-white/30 text-sm py-8 text-center">Station location missing; radar unavailable.</div>;
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2 bg-white/5 rounded-xl border border-white/10 p-3">
        <span className="text-[10px] uppercase tracking-wide text-white/40 mr-1">Provider</span>
        {(['windy', 'radar'] as Provider[]).map((p) => (
          <button
            key={p}
            onClick={() => setProvider(p)}
            className={`text-xs px-3 py-1 rounded transition-colors ${
              provider === p
                ? 'bg-amber-500/20 text-amber-400 font-medium'
                : 'text-white/50 hover:text-white/80 hover:bg-white/5'
            }`}
          >
            {p === 'windy' ? 'Windy' : 'RainViewer'}
          </button>
        ))}
      </div>

      {provider === 'windy' ? (
        <WindyEmbed station={station} />
      ) : (
        <RainViewerMap station={station} />
      )}
    </div>
  );
}

// ── Windy embed ───────────────────────────────────────────────────

function WindyEmbed({ station }: { station: WeatherStation }) {
  const [overlay, setOverlay] = useState('radar');
  const [level, setLevel] = useState('surface');
  const [iframeKey, setIframeKey] = useState(0);

  const lat = station.latitude!;
  const lon = station.longitude!;

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

  const directSrc =
    `https://www.windy.com/?${overlay},${lat.toFixed(3)},${lon.toFixed(3)},7`;

  const levels = [
    { id: 'surface', label: 'Surface' },
    { id: '850h', label: '850 hPa' },
    { id: '700h', label: '700 hPa' },
    { id: '500h', label: '500 hPa' },
    { id: '300h', label: '300 hPa' },
  ];

  return (
    <>
      <div className="flex flex-col sm:flex-row sm:flex-wrap items-start sm:items-center gap-3 bg-white/5 rounded-xl border border-white/10 p-3">
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
            {levels.map((l) => (
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

      {/* Action buttons */}
      <div className="flex flex-wrap gap-2">
        <a
          href={directSrc}
          target="_blank"
          rel="noopener noreferrer"
          className="text-xs px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors flex items-center gap-1.5"
        >
          ↗ Open Full Windy Map
        </a>
        <button
          onClick={() => setIframeKey((k) => k + 1)}
          className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/60 rounded-lg transition-colors"
        >
          ↻ Reload embed
        </button>
      </div>

      <div className="rounded-xl border border-white/10 overflow-hidden bg-[#0a0a0d]">
        <iframe
          key={`${iframeKey}-${overlay}-${level}`}
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
        {level !== 'surface' && ` · ${levels.find((l) => l.id === level)?.label}`}
      </div>
    </>
  );
}

// ── RainViewer + Leaflet ─────────────────────────────────────────

interface RainViewerFrame {
  time: number;
  path: string;
}
interface RainViewerWeatherMaps {
  version: string;
  generated: number;
  host: string;
  radar: {
    past: RainViewerFrame[];
    nowcast: RainViewerFrame[];
  };
}

function RainViewerMap({ station }: { station: WeatherStation }) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const radarLayerRef = useRef<L.TileLayer | null>(null);
  const alertsLayerRef = useRef<L.LayerGroup | null>(null);

  const [frames, setFrames] = useState<RainViewerFrame[]>([]);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [host, setHost] = useState<string>('');
  const [alerts, setAlerts] = useState<NwsAlert[]>([]);
  const [showAlerts, setShowAlerts] = useState(true);
  const [status, setStatus] = useState<string>('');
  const [pastCount, setPastCount] = useState(0);

  // Init map (lat/lon change → re-init)
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    const map = L.map(mapEl.current, {
      center: [station.latitude!, station.longitude!],
      zoom: 8,
      zoomControl: true,
      attributionControl: true,
    });
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);
    L.circleMarker([station.latitude!, station.longitude!], {
      radius: 8,
      fillColor: '#fbbf24',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9,
    })
      .addTo(map)
      .bindTooltip(
        `<b>${station.station_name}</b><br/>${station.city ?? ''}${station.region ? ', ' + station.region : ''}`,
      );
    alertsLayerRef.current = L.layerGroup().addTo(map);
    mapRef.current = map;
    return () => {
      map.remove();
      mapRef.current = null;
      radarLayerRef.current = null;
      alertsLayerRef.current = null;
    };
  }, [station.station_id, station.latitude, station.longitude, station.station_name, station.city, station.region]);

  // Fetch RainViewer manifest via proxy (avoids any CORS quirks)
  useEffect(() => {
    let cancelled = false;
    setStatus('Loading radar frames...');
    supabase.functions
      .invoke('weather-proxy', { body: { kind: 'rainviewer' } })
      .then(({ data, error }) => {
        if (cancelled) return;
        if (error) throw new Error(error.message);
        const envelope = data as { ok?: boolean; data?: RainViewerWeatherMaps; error?: string };
        if (envelope?.ok === false) throw new Error(envelope.error || 'unknown');
        const d = (envelope?.ok === true ? envelope.data : (data as RainViewerWeatherMaps)) as RainViewerWeatherMaps;
        const past = d.radar?.past ?? [];
        const nowcast = d.radar?.nowcast ?? [];
        setHost(d.host);
        setFrames([...past, ...nowcast]);
        setPastCount(past.length);
        setFrameIdx(Math.max(0, past.length - 1));
        setStatus('');
      })
      .catch((e) => {
        if (!cancelled) setStatus(`Radar unavailable: ${String(e?.message ?? e)}`);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  // Alerts
  useEffect(() => {
    let cancelled = false;
    getAlerts(station.latitude!, station.longitude!)
      .then((a) => !cancelled && setAlerts(a))
      .catch(() => !cancelled && setAlerts([]));
    return () => {
      cancelled = true;
    };
  }, [station.latitude, station.longitude]);

  // Render active frame
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !host || frames.length === 0) return;
    if (radarLayerRef.current) {
      map.removeLayer(radarLayerRef.current);
      radarLayerRef.current = null;
    }
    const frame = frames[frameIdx];
    if (!frame) return;
    const layer = L.tileLayer(`${host}${frame.path}/256/{z}/{x}/{y}/1/1_1.png`, {
      opacity: 0.7,
      attribution: '&copy; RainViewer',
      maxZoom: 12,
    });
    layer.addTo(map);
    radarLayerRef.current = layer;
  }, [frames, frameIdx, host]);

  // Alerts polygons
  useEffect(() => {
    const layer = alertsLayerRef.current;
    if (!layer) return;
    layer.clearLayers();
    if (!showAlerts) return;
    const severityStyle: Record<string, L.PathOptions> = {
      Extreme: { color: '#ef4444', fillColor: '#ef4444', fillOpacity: 0.12, weight: 2 },
      Severe: { color: '#f97316', fillColor: '#f97316', fillOpacity: 0.1, weight: 2 },
      Moderate: { color: '#f59e0b', fillColor: '#f59e0b', fillOpacity: 0.1, weight: 1.5 },
      Minor: { color: '#eab308', fillColor: '#eab308', fillOpacity: 0.08, weight: 1.5 },
    };
    for (const alert of alerts) {
      const g = (alert as any).geometry;
      if (!g) continue;
      const style = severityStyle[alert.properties.severity] ?? severityStyle.Moderate;
      try {
        const geo = L.geoJSON(g, { style: () => style });
        geo.bindPopup(
          `<b>${alert.properties.event}</b><br/>` +
            `<i>${alert.properties.severity} / ${alert.properties.urgency}</i><br/>` +
            `<div style="max-width:280px; font-size:11px; margin-top:4px;">${alert.properties.headline}</div>`,
        );
        layer.addLayer(geo);
      } catch (_) {
        /* skip */
      }
    }
  }, [alerts, showAlerts]);

  // Animation loop
  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const t = setInterval(() => {
      setFrameIdx((i) => (i + 1) % frames.length);
    }, 600);
    return () => clearInterval(t);
  }, [playing, frames.length]);

  const currentFrame = frames[frameIdx];
  const frameTime = currentFrame ? new Date(currentFrame.time * 1000) : null;

  return (
    <>
      <div className="flex flex-wrap items-center gap-2 bg-white/5 rounded-xl border border-white/10 p-3">
        <button
          onClick={() => setShowAlerts((s) => !s)}
          className={`text-xs px-2.5 py-1 rounded transition-colors ${
            showAlerts ? 'bg-red-500/20 text-red-300' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
          }`}
        >
          NWS Alerts {alerts.length > 0 && `(${alerts.length})`}
        </button>
        {status && <span className="text-xs text-white/40 ml-auto">{status}</span>}
      </div>

      <div
        ref={mapEl}
        className="h-[540px] rounded-xl border border-white/10 overflow-hidden relative"
        style={{ background: '#0a0a0d' }}
      />

      {frames.length > 0 && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="text-xs px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors min-w-[80px]"
            >
              {playing ? '❚❚ Pause' : '▶ Play'}
            </button>
            <input
              type="range"
              min={0}
              max={frames.length - 1}
              value={frameIdx}
              onChange={(e) => {
                setFrameIdx(Number(e.target.value));
                setPlaying(false);
              }}
              className="flex-1"
            />
            <div className="text-xs tabular-nums text-white/70 min-w-[160px] text-right">
              {frameTime?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
              <span className={`ml-1 ${frameIdx >= pastCount ? 'text-amber-400' : 'text-white/40'}`}>
                ({frameIdx >= pastCount ? 'forecast' : 'past'})
              </span>
            </div>
          </div>
          <div className="text-[10px] text-white/30 text-center mt-2">
            {pastCount} past · {frames.length - pastCount} nowcast · tiles by RainViewer
          </div>
        </div>
      )}
    </>
  );
}
