import { useState } from 'react';
import type { WeatherStation } from '../../lib/weatherService';
import type { RemoteStation } from '../../lib/remoteStationsService';
import ForecastSection from './ForecastSection';
import WeatherAlertsBanner from './WeatherAlertsBanner';
import PrecipOutlook from './PrecipOutlook';
import SunArc from './SunArc';

interface Props {
  station: RemoteStation;
  tick: number;
  onEdit: () => void;
  onDelete: () => void;
}

// Build a minimal synthetic WeatherStation so existing forecast/alerts/etc.
// components (which want a full WeatherStation) can be reused as-is.
function asSyntheticStation(rs: RemoteStation): WeatherStation {
  return {
    station_id: -1, // sentinel — components don't use this for NWS lookups
    station_id_uuid: null,
    station_name: rs.name,
    city: rs.region,
    region: rs.region,
    country: null,
    latitude: rs.latitude,
    longitude: rs.longitude,
    elevation: null,
    time_zone: null,
    gateway_type: null,
    product_number: null,
    subscription_type: null,
    recording_interval: null,
    firmware_version: null,
    registered_date: null,
    last_ingested_at: null,
  };
}

export default function RemoteStationCard({ station, tick, onEdit, onDelete }: Props) {
  const [iframeError, setIframeError] = useState(false);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const synthetic = asSyntheticStation(station);

  return (
    <div className="bg-white/5 rounded-xl border border-white/10 overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-white/5 bg-black/20 flex-wrap">
        <div className="min-w-0">
          <div className="text-base font-display font-semibold text-white truncate">
            {station.name}
          </div>
          <div className="text-[10px] text-white/40 font-mono">
            {station.region && <span>{station.region} · </span>}
            {station.latitude.toFixed(4)}°, {station.longitude.toFixed(4)}°
          </div>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="text-[11px] px-2 py-1 text-white/60 hover:text-white hover:bg-white/5 rounded transition-colors"
          >
            Edit
          </button>
          {confirmDelete ? (
            <>
              <button
                onClick={onDelete}
                className="text-[11px] px-2 py-1 bg-red-500/20 text-red-300 hover:bg-red-500/30 rounded transition-colors"
              >
                Confirm
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="text-[11px] px-2 py-1 text-white/40 hover:text-white/70 transition-colors"
              >
                Cancel
              </button>
            </>
          ) : (
            <button
              onClick={() => setConfirmDelete(true)}
              className="text-[11px] px-2 py-1 text-white/40 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
            >
              Remove
            </button>
          )}
        </div>
      </div>

      {/* Body */}
      <div className="p-4 space-y-4">
        {/* WeatherLink iframe (if provided) */}
        {station.embed_url && (
          <div>
            <div className="text-[10px] uppercase tracking-wide text-white/40 mb-2 font-semibold">
              WeatherLink Live Data
            </div>
            {iframeError ? (
              <div className="bg-amber-500/10 border border-amber-500/20 text-amber-200/80 rounded-lg p-3 text-xs">
                Couldn't load the WeatherLink embed. The owner may not have published this
                station, the URL may be wrong, or WeatherLink is blocking the iframe.
                <div className="mt-2">
                  <a
                    href={station.embed_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-amber-300 hover:text-amber-200 underline"
                  >
                    Open in new tab ↗
                  </a>
                </div>
              </div>
            ) : (
              <div className="bg-black/30 rounded-lg overflow-hidden border border-white/5 relative">
                {!iframeLoaded && (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-white/40 italic z-10 pointer-events-none">
                    Loading WeatherLink…
                  </div>
                )}
                <iframe
                  src={station.embed_url}
                  width="100%"
                  height="320"
                  style={{ border: 0, background: 'transparent', minHeight: 320 }}
                  loading="lazy"
                  onLoad={() => setIframeLoaded(true)}
                  onError={() => setIframeError(true)}
                  title={`WeatherLink for ${station.name}`}
                  sandbox="allow-scripts allow-same-origin allow-popups"
                  referrerPolicy="no-referrer-when-downgrade"
                />
              </div>
            )}
          </div>
        )}

        {/* NWS-driven panels — work for any lat/lon */}
        <WeatherAlertsBanner station={synthetic} tick={tick} />
        <PrecipOutlook station={synthetic} tick={tick} />
        <SunArc lat={station.latitude} lon={station.longitude} />
        <div>
          <div className="text-[10px] uppercase tracking-wide text-white/40 mb-2 font-semibold">
            NWS Forecast
          </div>
          <ForecastSection station={synthetic} tick={tick} />
        </div>

        {station.notes && (
          <div className="text-xs text-white/50 italic border-t border-white/5 pt-3">
            {station.notes}
          </div>
        )}
      </div>
    </div>
  );
}
