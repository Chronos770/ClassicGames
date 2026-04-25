import ForecastSection from './ForecastSection';
import type { WeatherStation } from '../../lib/weatherService';

interface Props {
  station: WeatherStation | null;
  tick: number;
  onBack: () => void;
}

// Full-page Forecast view — accessed by tapping the Tomorrow banner on the
// overview, or via the "Forecast" tab. Wraps the existing ForecastSection
// (which already contains the Next 24 Hours and 7-Day Forecast cards) with
// page-level headings and a quick "back to overview" link.
export default function ForecastTab({ station, tick, onBack }: Props) {
  return (
    <div className="space-y-5">
      {/* Page header with back nav */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <button
            onClick={onBack}
            className="text-xs text-white/50 hover:text-white transition-colors flex items-center gap-1 mb-1"
          >
            <span aria-hidden>←</span> Back to Overview
          </button>
          <h1 className="text-2xl font-display font-bold text-white">Forecast</h1>
          <p className="text-xs text-white/40 mt-0.5">
            Driven by the National Weather Service for {station?.city ?? 'this location'}
            {station?.region ? `, ${station.region}` : ''}.
          </p>
        </div>
      </div>

      {/* Hourly + 7-Day cards (rendered by ForecastSection) plus the
          beyond-7-days note for context. */}
      <ForecastSection station={station} tick={tick} />

      <div className="bg-slate-900/70 backdrop-blur-sm rounded-xl border border-white/10 p-4 text-sm text-white/60">
        <div className="text-xs uppercase tracking-wide text-white/40 mb-1.5 font-semibold">
          Beyond 7 days
        </div>
        NWS hourly + daily forecasts only run ~7 days out — that's the limit of
        their public API. For longer-range outlooks, check the Climate Prediction
        Center 6-10 day and 8-14 day temperature/precipitation outlooks at
        weather.gov.
      </div>

      <div className="text-center pt-2">
        <button
          onClick={onBack}
          className="text-sm px-4 py-2 bg-white/5 hover:bg-white/10 text-white/70 rounded-lg transition-colors border border-white/10"
        >
          ← Back to Overview
        </button>
      </div>
    </div>
  );
}
