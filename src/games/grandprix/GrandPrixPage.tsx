// ═══════════════════════════════════════════════════════════════════
// grandprix/GrandPrixPage.tsx — React wrapper + HUD overlay
// ═══════════════════════════════════════════════════════════════════

import { useEffect, useRef, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';
import { GrandPrixGame } from './GrandPrixGame';
import { GrandPrixRenderer, HUDData } from './GrandPrixRenderer';
import { GP_CONFIG, DRIVERS, TEAMS } from './rules';

// ── Time formatting ─────────────────────────────────────────────

function formatLapTime(seconds: number): string {
  if (!isFinite(seconds) || seconds <= 0) return '--:--.---';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toFixed(3).padStart(6, '0')}`;
}

// ── Setup Screen ────────────────────────────────────────────────

interface SetupProps {
  onStart: (laps: number, difficulty: number) => void;
  onBack: () => void;
}

function SetupScreen({ onStart, onBack }: SetupProps) {
  const [laps, setLaps] = useState(5);
  const [difficulty, setDifficulty] = useState(1);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-4 px-4">
      <div className="bg-white/5 rounded-xl p-8 max-w-md w-full border border-white/10">
        <h1 className="text-2xl font-display font-bold text-white mb-6 text-center">
          Grand Prix 3D
        </h1>

        <div className="mb-6">
          <h2 className="text-white/70 text-sm mb-2 font-medium">Track</h2>
          <div className="bg-white/10 rounded-lg p-3">
            <div className="text-white font-bold">Autodromo Nazionale</div>
            <div className="text-white/50 text-xs">Italy — High-speed with chicanes</div>
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-white/70 text-sm mb-2 font-medium">Race Distance</h2>
          <div className="flex gap-2">
            {[3, 5, 10, 15].map(n => (
              <button
                key={n}
                onClick={() => setLaps(n)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                  laps === n
                    ? 'bg-red-600 text-white'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {n} Laps
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-white/70 text-sm mb-2 font-medium">Difficulty</h2>
          <div className="flex gap-2">
            {['Easy', 'Medium', 'Hard'].map((name, i) => (
              <button
                key={name}
                onClick={() => setDifficulty(i)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition-colors ${
                  difficulty === i
                    ? 'bg-red-600 text-white'
                    : 'bg-white/10 text-white/60 hover:bg-white/20'
                }`}
              >
                {name}
              </button>
            ))}
          </div>
        </div>

        <div className="mb-6">
          <h2 className="text-white/70 text-sm mb-2 font-medium">Grid (10 Cars)</h2>
          <div className="grid grid-cols-2 gap-1 text-xs">
            {DRIVERS.map((d, i) => (
              <div key={i} className="flex items-center gap-2 py-1">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: '#' + TEAMS[d.team].primary.toString(16).padStart(6, '0') }}
                />
                <span className="text-white/60">{d.name}</span>
              </div>
            ))}
          </div>
          <div className="text-white/40 text-xs mt-2">You start from P10</div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-colors text-sm"
          >
            Back
          </button>
          <button
            onClick={() => onStart(laps, difficulty)}
            className="flex-1 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors text-sm"
          >
            Start Race
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Results Screen ──────────────────────────────────────────────

interface ResultsProps {
  hud: HUDData;
  onRestart: () => void;
  onBack: () => void;
}

function ResultsScreen({ hud, onRestart, onBack }: ResultsProps) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-4 px-4">
      <div className="bg-white/5 rounded-xl p-8 max-w-lg w-full border border-white/10">
        <h1 className="text-2xl font-display font-bold text-white mb-2 text-center">
          Race Results
        </h1>
        <p className="text-white/40 text-sm text-center mb-6">
          You finished P{hud.position} of {hud.totalCars}
        </p>

        <div className="mb-6 space-y-1">
          {hud.standings.sort((a, b) => a.position - b.position).map((s) => (
            <div
              key={s.position}
              className={`flex items-center justify-between py-2 px-3 rounded-lg text-sm ${
                s.name === 'YOU' ? 'bg-red-600/20 text-white' : 'text-white/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <span className="w-6 text-right font-bold">{s.position}</span>
                <span>{s.name}</span>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-white/40">
                  {s.position === 1 ? 'Winner' : `+${s.gap.toFixed(1)}s`}
                </span>
                <span className="text-white/40 w-24 text-right">
                  Best: {formatLapTime(s.bestLap)}
                </span>
              </div>
            </div>
          ))}
        </div>

        {isFinite(hud.fastestLap) && (
          <div className="text-center text-sm text-purple-400 mb-6">
            Fastest Lap: {formatLapTime(hud.fastestLap)} — {hud.fastestLapDriverName}
          </div>
        )}

        <div className="flex gap-3">
          <button
            onClick={onBack}
            className="flex-1 py-3 rounded-lg bg-white/10 text-white/60 hover:bg-white/20 transition-colors text-sm"
          >
            Exit
          </button>
          <button
            onClick={onRestart}
            className="flex-1 py-3 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold transition-colors text-sm"
          >
            Race Again
          </button>
        </div>
      </div>
    </div>
  );
}

// ── HUD Overlay ─────────────────────────────────────────────────

function HUDOverlay({ hud }: { hud: HUDData }) {
  if (hud.phase === 'setup' || hud.phase === 'results') return null;

  const rpmPercent = Math.min(100, (hud.rpm / 14500) * 100);
  const rpmColor = rpmPercent > 90 ? '#FF2222' : rpmPercent > 70 ? '#FFAA00' : '#22CC22';

  return (
    <div className="absolute inset-0 pointer-events-none" style={{ fontFamily: 'monospace' }}>
      {/* Top bar */}
      <div className="absolute top-3 left-4 bg-black/60 px-3 py-1.5 rounded text-white text-sm">
        LAP {hud.lap}/{hud.totalLaps}
      </div>
      <div className="absolute top-3 right-4 bg-black/60 px-3 py-1.5 rounded text-white">
        <span className="text-2xl font-bold">P{hud.position}</span>
        <span className="text-white/50 text-sm"> / {hud.totalCars}</span>
      </div>

      {/* Start lights / GO */}
      {hud.phase === 'grid' && hud.startLights < 6 && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 flex gap-3">
          {[0, 1, 2, 3, 4].map(i => (
            <div
              key={i}
              className="w-8 h-8 rounded-full border-2 border-white/30"
              style={{
                backgroundColor: i < hud.startLights ? '#FF0000' : '#333333',
                boxShadow: i < hud.startLights ? '0 0 15px #FF0000' : 'none',
              }}
            />
          ))}
        </div>
      )}
      {hud.startLights === 6 && hud.raceTime < 2 && (
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 text-green-400 text-5xl font-bold animate-pulse">
          GO!
        </div>
      )}

      {/* Bottom bar */}
      <div className="absolute bottom-3 left-4 flex items-end gap-4">
        {/* RPM bar */}
        <div className="bg-black/60 p-2 rounded">
          <div className="w-40 h-3 bg-white/10 rounded-full overflow-hidden mb-1">
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${rpmPercent}%`, backgroundColor: rpmColor }}
            />
          </div>
          <div className="flex items-center gap-3 text-white text-sm">
            <span className="text-lg font-bold">{hud.speed}</span>
            <span className="text-white/40 text-xs">km/h</span>
            <span className="w-7 h-7 rounded-full bg-white/20 flex items-center justify-center font-bold text-sm">
              {hud.gear}
            </span>
          </div>
        </div>
      </div>

      {/* Lap times */}
      <div className="absolute bottom-3 right-4 bg-black/60 p-2 rounded text-right">
        <div className="text-white text-lg font-bold">{formatLapTime(hud.currentLapTime)}</div>
        <div className="text-white/40 text-xs">Best: {formatLapTime(hud.bestLapTime)}</div>
      </div>

      {/* Surface warning */}
      {hud.surface !== 'asphalt' && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-yellow-600/80 text-white px-3 py-1 rounded text-sm">
          {hud.surface.toUpperCase()}
        </div>
      )}

      {/* Damage indicator */}
      {hud.damage > 0.1 && (
        <div className="absolute top-12 right-4 bg-red-800/70 text-white px-2 py-1 rounded text-xs">
          DMG {Math.round(hud.damage * 100)}%
        </div>
      )}

      {/* Driving aids */}
      <div className="absolute top-12 left-4 flex gap-2 text-xs">
        {hud.autoGears && (
          <span className="bg-blue-800/60 text-white/70 px-2 py-0.5 rounded">AUTO</span>
        )}
        {hud.autoBrakes && (
          <span className="bg-green-800/60 text-white/70 px-2 py-0.5 rounded">ABS</span>
        )}
      </div>

      {/* Cockpit view — centered speed/gear display */}
      {hud.cameraMode === 'cockpit' && (
        <div className="absolute bottom-16 left-1/2 -translate-x-1/2 bg-black/70 rounded-lg px-6 py-2 flex items-center gap-6">
          <div className="text-center">
            <div className="text-green-400 text-3xl font-bold tabular-nums">{hud.speed}</div>
            <div className="text-white/30 text-[10px]">KM/H</div>
          </div>
          <div className="w-px h-10 bg-white/20" />
          <div className="text-center">
            <div className="text-yellow-400 text-3xl font-bold">{hud.gear}</div>
            <div className="text-white/30 text-[10px]">GEAR</div>
          </div>
          <div className="w-px h-10 bg-white/20" />
          <div className="text-center">
            <div className="text-white text-sm font-mono tabular-nums">{formatLapTime(hud.currentLapTime)}</div>
            <div className="text-white/30 text-[10px]">LAP TIME</div>
          </div>
        </div>
      )}

      {/* Standings overlay (Tab held) */}
      {hud.showStandings && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="bg-black/80 rounded-xl p-4 min-w-[300px]">
            <h3 className="text-white text-sm font-bold mb-2 text-center">Standings</h3>
            {hud.standings.sort((a, b) => a.position - b.position).map(s => (
              <div
                key={s.position}
                className={`flex justify-between text-xs py-0.5 ${
                  s.name === 'YOU' ? 'text-yellow-400' : 'text-white/60'
                }`}
              >
                <span>P{s.position} {s.name}</span>
                <span>
                  {s.position === 1 ? 'Leader' : `+${s.gap.toFixed(1)}s`}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Pause overlay */}
      {hud.phase === 'race' && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 text-white/20 text-xs">
          C: Camera | Tab: Standings | Esc: Pause | F1: ABS | F2: Auto-gear
        </div>
      )}
    </div>
  );
}

// ── Main Page ───────────────────────────────────────────────────

export default function GrandPrixPage() {
  const containerRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const isAdmin = profile?.role === 'admin';

  // Admin gate
  useEffect(() => {
    if (!isAdmin) navigate('/', { replace: true });
  }, [isAdmin, navigate]);

  const rendererRef = useRef<GrandPrixRenderer | null>(null);
  const gameRef = useRef<GrandPrixGame | null>(null);

  const [phase, setPhase] = useState<'setup' | 'racing' | 'results'>('setup');
  const [hud, setHud] = useState<HUDData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pendingStart, setPendingStart] = useState<{ laps: number; difficulty: number } | null>(null);

  const handleHUDUpdate = useCallback((data: HUDData) => {
    setHud(data);
    if (data.phase === 'results') {
      setPhase('results');
    }
  }, []);

  // When "Start Race" is clicked, switch to racing phase first (so container mounts)
  const handleStart = useCallback((laps: number, difficulty: number) => {
    setPendingStart({ laps, difficulty });
    setPhase('racing');
  }, []);

  // Once the container is mounted and we have a pending start, initialize the renderer
  useEffect(() => {
    if (!pendingStart || !containerRef.current || rendererRef.current) return;

    const { laps, difficulty } = pendingStart;
    setPendingStart(null);

    const game = new GrandPrixGame();
    game.state.totalLaps = laps;
    game.state.difficulty = difficulty;
    gameRef.current = game;

    const renderer = new GrandPrixRenderer(containerRef.current, game);
    renderer.onHUDUpdate = handleHUDUpdate;
    rendererRef.current = renderer;

    renderer.init().then(() => {
      renderer.startRace();
    }).catch((err) => {
      console.error('GrandPrix init error:', err);
      setError(err instanceof Error ? err.message : String(err));
    });
  }, [pendingStart, handleHUDUpdate]);

  const handleBack = useCallback(() => {
    rendererRef.current?.dispose();
    rendererRef.current = null;
    gameRef.current = null;
    navigate('/lobby/grandprix');
  }, [navigate]);

  const handleRestart = useCallback(() => {
    rendererRef.current?.dispose();
    rendererRef.current = null;
    gameRef.current = null;
    setPhase('setup');
    setHud(null);
    setError(null);
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      rendererRef.current?.dispose();
    };
  }, []);

  // ── Setup phase ─────────────────────────────────────────
  if (phase === 'setup') {
    return <SetupScreen onStart={handleStart} onBack={handleBack} />;
  }

  // ── Results phase ───────────────────────────────────────
  if (phase === 'results' && hud) {
    return <ResultsScreen hud={hud} onRestart={handleRestart} onBack={handleBack} />;
  }

  // ── Racing phase ────────────────────────────────────────
  return (
    <div className="min-h-screen flex flex-col items-center justify-center py-4 px-4">
      <div className="flex items-center gap-4 mb-3">
        <button
          onClick={handleBack}
          className="text-white/50 hover:text-white text-sm transition-colors"
        >
          &larr; Back
        </button>
        <h1 className="text-xl font-display font-bold text-white">Grand Prix 3D</h1>
      </div>

      <div className="relative">
        <div
          ref={containerRef}
          className="rounded-lg overflow-hidden shadow-2xl border border-white/10"
          style={{
            width: GP_CONFIG.resolution.width,
            height: GP_CONFIG.resolution.height,
            background: '#333',
          }}
        />
        {hud && <HUDOverlay hud={hud} />}
      </div>

      {error && (
        <div className="mt-4 p-4 bg-red-900/50 border border-red-500/50 rounded-lg max-w-lg">
          <p className="text-red-300 text-sm font-mono">{error}</p>
        </div>
      )}

      <div className="mt-3 flex gap-6 text-xs text-white/30">
        <span>Arrow keys / WASD — Drive</span>
        <span>C — Camera</span>
        <span>Tab — Standings</span>
        <span>Esc — Pause</span>
      </div>
    </div>
  );
}
