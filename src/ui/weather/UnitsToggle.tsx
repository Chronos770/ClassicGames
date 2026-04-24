import { useEffect, useRef, useState } from 'react';
import { useWeatherUnitsStore } from '../../lib/weatherUnits';

// Compact dropdown toggling measurement units. Click to open, click outside to close.
export default function UnitsToggle() {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const temp = useWeatherUnitsStore((s) => s.temp);
  const wind = useWeatherUnitsStore((s) => s.wind);
  const pressure = useWeatherUnitsStore((s) => s.pressure);
  const precip = useWeatherUnitsStore((s) => s.precip);
  const distance = useWeatherUnitsStore((s) => s.distance);
  const setTemp = useWeatherUnitsStore((s) => s.setTemp);
  const setWind = useWeatherUnitsStore((s) => s.setWind);
  const setPressure = useWeatherUnitsStore((s) => s.setPressure);
  const setPrecip = useWeatherUnitsStore((s) => s.setPrecip);
  const setDistance = useWeatherUnitsStore((s) => s.setDistance);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const summary = `°${temp} · ${wind === 'ms' ? 'm/s' : wind} · ${pressure}`;

  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-xs px-2.5 py-1.5 border border-white/10 rounded-full text-white/60 hover:text-white hover:bg-white/5 transition-colors font-mono"
        aria-label="Change units"
      >
        {summary}
      </button>
      {open && (
        <div className="absolute right-0 top-full mt-2 w-60 bg-[#0b0b0d] border border-white/10 rounded-xl shadow-xl p-3 z-30">
          <div className="text-[10px] uppercase tracking-wide text-white/40 mb-2 font-semibold">Units</div>
          <Row label="Temperature">
            <Pill active={temp === 'F'} onClick={() => setTemp('F')}>°F</Pill>
            <Pill active={temp === 'C'} onClick={() => setTemp('C')}>°C</Pill>
          </Row>
          <Row label="Wind">
            <Pill active={wind === 'mph'} onClick={() => setWind('mph')}>mph</Pill>
            <Pill active={wind === 'kph'} onClick={() => setWind('kph')}>kph</Pill>
            <Pill active={wind === 'kt'} onClick={() => setWind('kt')}>kt</Pill>
            <Pill active={wind === 'ms'} onClick={() => setWind('ms')}>m/s</Pill>
          </Row>
          <Row label="Pressure">
            <Pill active={pressure === 'inHg'} onClick={() => setPressure('inHg')}>inHg</Pill>
            <Pill active={pressure === 'hPa'} onClick={() => setPressure('hPa')}>hPa</Pill>
            <Pill active={pressure === 'mb'} onClick={() => setPressure('mb')}>mb</Pill>
          </Row>
          <Row label="Precipitation">
            <Pill active={precip === 'in'} onClick={() => setPrecip('in')}>in</Pill>
            <Pill active={precip === 'mm'} onClick={() => setPrecip('mm')}>mm</Pill>
          </Row>
          <Row label="Distance" last>
            <Pill active={distance === 'mi'} onClick={() => setDistance('mi')}>mi</Pill>
            <Pill active={distance === 'km'} onClick={() => setDistance('km')}>km</Pill>
          </Row>
        </div>
      )}
    </div>
  );
}

function Row({
  label,
  children,
  last = false,
}: {
  label: string;
  children: React.ReactNode;
  last?: boolean;
}) {
  return (
    <div className={last ? '' : 'mb-2 pb-2 border-b border-white/5'}>
      <div className="text-[10px] text-white/40 mb-1">{label}</div>
      <div className="flex gap-1 flex-wrap">{children}</div>
    </div>
  );
}

function Pill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className={`text-[11px] px-2 py-0.5 rounded-md transition-colors font-mono ${
        active
          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
          : 'bg-white/5 text-white/60 border border-transparent hover:text-white hover:bg-white/10'
      }`}
    >
      {children}
    </button>
  );
}
