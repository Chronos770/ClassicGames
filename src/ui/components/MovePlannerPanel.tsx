interface PlannedArrow {
  from: string;
  to: string;
  color: number;
}

interface MovePlannerPanelProps {
  arrows: PlannedArrow[];
  onClear: () => void;
}

const COLOR_NAMES: Record<number, { name: string; class: string }> = {
  0xff8c00: { name: 'Plan', class: 'text-orange-400' },
  0x44ff44: { name: 'Good', class: 'text-green-400' },
  0x4488ff: { name: 'Option', class: 'text-blue-400' },
  0xff4444: { name: 'Danger', class: 'text-red-400' },
};

export default function MovePlannerPanel({ arrows, onClear }: MovePlannerPanelProps) {
  if (arrows.length === 0) {
    return (
      <div className="glass-panel !p-3">
        <h3 className="text-xs text-white/40 uppercase tracking-wider mb-2">Move Planner</h3>
        <p className="text-[10px] text-white/20 text-center py-2">
          Right-click drag on the board to draw arrows
        </p>
        <div className="text-[10px] text-white/15 space-y-0.5 mt-1">
          <div>Right-click = Plan (orange)</div>
          <div>Shift + Right = Good (green)</div>
          <div>Ctrl + Right = Option (blue)</div>
          <div>Alt + Right = Danger (red)</div>
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel !p-3">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-xs text-white/40 uppercase tracking-wider">Move Planner</h3>
        <button onClick={onClear} className="text-[10px] text-white/30 hover:text-white/60">
          Clear
        </button>
      </div>
      <div className="space-y-1">
        {arrows.map((arrow, i) => {
          const colorInfo = COLOR_NAMES[arrow.color] ?? { name: 'Move', class: 'text-white/50' };
          return (
            <div key={i} className="flex items-center gap-2 text-xs py-0.5">
              <span className={`${colorInfo.class} font-medium w-10`}>{colorInfo.name}</span>
              <span className="text-white/60 font-mono">
                {arrow.from} {'\u2192'} {arrow.to}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
