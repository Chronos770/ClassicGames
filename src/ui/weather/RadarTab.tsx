import { useEffect, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getAlerts, type NwsAlert } from '../../lib/nwsService';
import type { WeatherStation } from '../../lib/weatherService';

type Layer = 'radar' | 'clouds' | 'temp' | 'precip' | 'wind' | 'none';

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
  satellite: {
    infrared: RainViewerFrame[];
  };
}

export default function RadarTab({ station }: { station: WeatherStation | null }) {
  const mapEl = useRef<HTMLDivElement>(null);
  const mapRef = useRef<L.Map | null>(null);
  const radarLayerRef = useRef<L.TileLayer | null>(null);
  const overlayLayerRef = useRef<L.TileLayer | null>(null);
  const alertsLayerRef = useRef<L.LayerGroup | null>(null);
  const stationMarkerRef = useRef<L.CircleMarker | null>(null);

  const [frames, setFrames] = useState<RainViewerFrame[]>([]);
  const [frameIdx, setFrameIdx] = useState(0);
  const [playing, setPlaying] = useState(true);
  const [host, setHost] = useState<string>('');
  const [overlayType, setOverlayType] = useState<Layer>('radar');
  const [alerts, setAlerts] = useState<NwsAlert[]>([]);
  const [showAlerts, setShowAlerts] = useState(true);
  const [status, setStatus] = useState<string>('');

  // Init map
  useEffect(() => {
    if (!mapEl.current || mapRef.current) return;
    if (!station || station.latitude === null || station.longitude === null) return;

    const map = L.map(mapEl.current, {
      center: [station.latitude, station.longitude],
      zoom: 8,
      zoomControl: true,
      attributionControl: true,
    });

    // Dark base map (CARTO Dark) — fits the app theme
    L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
      attribution: '&copy; OpenStreetMap &copy; CARTO',
      subdomains: 'abcd',
      maxZoom: 19,
    }).addTo(map);

    // Station marker
    stationMarkerRef.current = L.circleMarker([station.latitude, station.longitude], {
      radius: 8,
      fillColor: '#fbbf24',
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9,
    })
      .addTo(map)
      .bindTooltip(`<b>${station.station_name}</b><br/>${station.city ?? ''}${station.region ? ', ' + station.region : ''}`, {
        direction: 'top',
        offset: [0, -8],
        className: 'leaflet-dark-tooltip',
      });

    // Alerts layer group
    alertsLayerRef.current = L.layerGroup().addTo(map);

    mapRef.current = map;

    // Cleanup
    return () => {
      map.remove();
      mapRef.current = null;
      radarLayerRef.current = null;
      overlayLayerRef.current = null;
      alertsLayerRef.current = null;
      stationMarkerRef.current = null;
    };
  }, [station?.station_id, station?.latitude, station?.longitude]);

  // Fetch RainViewer frame manifest
  useEffect(() => {
    setStatus('Loading radar frames...');
    fetch('https://api.rainviewer.com/public/weather-maps.json')
      .then((r) => r.json() as Promise<RainViewerWeatherMaps>)
      .then((data) => {
        setHost(data.host);
        const allFrames = [...data.radar.past, ...data.radar.nowcast];
        setFrames(allFrames);
        setFrameIdx(Math.max(0, data.radar.past.length - 1));
        setStatus('');
      })
      .catch((e) => setStatus(`Radar unavailable: ${String(e?.message ?? e)}`));
  }, []);

  // Fetch NWS alerts
  useEffect(() => {
    if (!station || station.latitude === null || station.longitude === null) return;
    getAlerts(station.latitude, station.longitude).then(setAlerts).catch(() => setAlerts([]));
  }, [station?.latitude, station?.longitude]);

  // Render radar frame
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !host || frames.length === 0) return;

    if (radarLayerRef.current) {
      map.removeLayer(radarLayerRef.current);
      radarLayerRef.current = null;
    }

    if (overlayType === 'none') return;

    const frame = frames[frameIdx];
    if (!frame) return;

    // RainViewer tile options
    // color=1 (Original), smooth=1, snow=1
    const layerUrl = `${host}${frame.path}/256/{z}/{x}/{y}/1/1_1.png`;
    const layer = L.tileLayer(layerUrl, {
      opacity: 0.7,
      attribution: '&copy; RainViewer',
      maxZoom: 12,
    });
    layer.addTo(map);
    radarLayerRef.current = layer;
  }, [frames, frameIdx, host, overlayType]);

  // Render overlay (temp/clouds/wind/precip via Open-Meteo tiles or OWM public tiles)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;

    if (overlayLayerRef.current) {
      map.removeLayer(overlayLayerRef.current);
      overlayLayerRef.current = null;
    }

    // Only radar is wired for now — the other layers are placeholders kept in
    // the UI for future integration of a keyed service (OWM requires key).
  }, [overlayType]);

  // Render alerts polygons
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
          `<b>${alert.properties.event}</b><br/>
          <i>${alert.properties.severity} / ${alert.properties.urgency}</i><br/>
          <div style="max-width:280px; font-size:11px; margin-top:4px;">${alert.properties.headline}</div>`,
        );
        layer.addLayer(geo);
      } catch (_) { /* skip */ }
    }
  }, [alerts, showAlerts]);

  // Animation
  useEffect(() => {
    if (!playing || frames.length === 0) return;
    const t = setInterval(() => {
      setFrameIdx((i) => (i + 1) % frames.length);
    }, 600);
    return () => clearInterval(t);
  }, [playing, frames.length]);

  if (!station || station.latitude === null || station.longitude === null) {
    return <div className="text-white/30 text-sm py-8 text-center">Station location missing; radar unavailable.</div>;
  }

  const currentFrame = frames[frameIdx];
  const frameTime = currentFrame ? new Date(currentFrame.time * 1000) : null;
  const isNowcast = currentFrame && frames.indexOf(currentFrame) >= frames.findIndex((f) => f.time > Date.now() / 1000 - 60);
  const pastCount = frames.filter((f) => f.time * 1000 <= Date.now()).length;

  return (
    <div className="space-y-3">
      {/* Layer & alert controls */}
      <div className="flex flex-wrap items-center gap-2 bg-white/5 rounded-xl border border-white/10 p-3">
        <div className="flex items-center gap-1">
          <span className="text-[10px] uppercase tracking-wide text-white/40 mr-1">Layer</span>
          {([
            { id: 'radar' as Layer, label: 'Radar' },
            { id: 'none' as Layer, label: 'None' },
          ]).map((l) => (
            <button
              key={l.id}
              onClick={() => setOverlayType(l.id)}
              className={`text-xs px-2.5 py-1 rounded transition-colors ${
                overlayType === l.id ? 'bg-amber-500/20 text-amber-400' : 'text-white/50 hover:text-white/80 hover:bg-white/5'
              }`}
            >
              {l.label}
            </button>
          ))}
        </div>
        <span className="text-white/20">|</span>
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

      {/* Map */}
      <div
        ref={mapEl}
        className="h-[480px] rounded-xl border border-white/10 overflow-hidden relative"
        style={{ background: '#0a0a0d' }}
      />

      {/* Playback controls */}
      {frames.length > 0 && overlayType !== 'none' && (
        <div className="bg-white/5 rounded-xl border border-white/10 p-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setPlaying((p) => !p)}
              className="text-xs px-3 py-1.5 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 rounded-lg transition-colors"
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
              {frameTime?.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}{' '}
              {isNowcast && frameIdx >= pastCount ? (
                <span className="text-amber-400 ml-1">(forecast)</span>
              ) : (
                <span className="text-white/40 ml-1">(past)</span>
              )}
            </div>
          </div>
          <div className="text-[10px] text-white/30 text-center mt-2">
            {pastCount} past frames · {frames.length - pastCount} nowcast frames · tiles by RainViewer
          </div>
        </div>
      )}

      <div className="text-[10px] text-white/30 text-center">
        Map: OpenStreetMap/CARTO &middot; Radar: RainViewer &middot; Alerts: NWS
      </div>
    </div>
  );
}
