import { useState } from 'react';

// USDM releases weekly on Thursdays. Map images use the Tuesday date (end of
// the data period). Images are freely available for non-commercial embedding
// with attribution per NDMC/USDA/NOAA policy.

function latestUSDMTuesday(): string {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun, 2=Tue
  const daysAgo = (day - 2 + 7) % 7; // days elapsed since last Tuesday
  const d = new Date(now);
  d.setUTCDate(now.getUTCDate() - daysAgo);
  return [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, '0'),
    String(d.getUTCDate()).padStart(2, '0'),
  ].join('');
}

function prevTuesdayStr(s: string): string {
  const d = new Date(Date.UTC(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8))));
  d.setUTCDate(d.getUTCDate() - 7);
  return [
    d.getUTCFullYear(),
    String(d.getUTCMonth() + 1).padStart(2, '0'),
    String(d.getUTCDate()).padStart(2, '0'),
  ].join('');
}

function fmtDate(s: string) {
  return new Date(Date.UTC(Number(s.slice(0, 4)), Number(s.slice(4, 6)) - 1, Number(s.slice(6, 8))))
    .toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
}

const LEGEND = [
  { label: 'None',                color: 'bg-emerald-400/30' },
  { label: 'D0 Abnormally Dry',  color: 'bg-yellow-300/80'  },
  { label: 'D1 Moderate',        color: 'bg-amber-400/80'   },
  { label: 'D2 Severe',          color: 'bg-orange-500/80'  },
  { label: 'D3 Extreme',         color: 'bg-red-600/80'     },
  { label: 'D4 Exceptional',     color: 'bg-red-950/90'     },
];

export default function DroughtMap() {
  const [dateStr, setDateStr] = useState(latestUSDMTuesday);
  const [fallbacks, setFallbacks] = useState(0);
  const [loaded, setLoaded] = useState(false);
  const [failed, setFailed] = useState(false);

  const imgUrl = `https://droughtmonitor.unl.edu/data/png/${dateStr}_usdm.png`;

  const handleError = () => {
    if (fallbacks < 3) {
      setFallbacks(f => f + 1);
      setDateStr(prev => prevTuesdayStr(prev));
      setLoaded(false);
    } else {
      setFailed(true);
    }
  };

  return (
    <div className="bg-black/30 backdrop-blur-md rounded-xl border border-white/10 p-4">
      <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
        <div className="text-xs uppercase tracking-wide text-white/40 font-semibold">
          US Drought Monitor
        </div>
        {!failed && loaded && (
          <div className="text-[10px] text-white/35 font-mono">
            Valid: {fmtDate(dateStr)}
          </div>
        )}
      </div>

      {failed ? (
        <div className="flex items-center justify-center h-32 text-white/30 text-sm rounded-lg bg-black/20">
          Map unavailable — visit{' '}
          <a
            href="https://droughtmonitor.unl.edu"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 text-sky-400/70 hover:text-sky-400 transition-colors underline"
          >
            droughtmonitor.unl.edu
          </a>
        </div>
      ) : (
        <div className="relative rounded-lg overflow-hidden bg-black/20">
          {!loaded && (
            <div className="h-40 flex items-center justify-center text-white/30 text-sm animate-pulse">
              Loading map…
            </div>
          )}
          <img
            key={dateStr}
            src={imgUrl}
            alt={`US Drought Monitor map valid ${fmtDate(dateStr)}`}
            className={`w-full h-auto rounded-lg transition-opacity duration-500 ${loaded ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
            onLoad={() => setLoaded(true)}
            onError={handleError}
          />
        </div>
      )}

      {/* Category legend */}
      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3">
        {LEGEND.map(({ label, color }) => (
          <div key={label} className="flex items-center gap-1.5 text-[10px] text-white/50">
            <span className={`inline-block w-2.5 h-2.5 rounded-sm flex-shrink-0 ${color}`} />
            {label}
          </div>
        ))}
      </div>

      <a
        href="https://droughtmonitor.unl.edu"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-2 block text-[10px] text-white/25 hover:text-white/45 transition-colors"
      >
        Source: US Drought Monitor (NDMC · USDA · NOAA) ↗
      </a>
    </div>
  );
}
