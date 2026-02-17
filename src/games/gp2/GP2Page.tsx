import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../../stores/authStore';

export default function GP2Page() {
  const navigate = useNavigate();
  const profile = useAuthStore((s) => s.profile);
  const user = useAuthStore((s) => s.user);
  const isAdmin = profile?.role === 'admin';

  const containerRef = useRef<HTMLDivElement>(null);
  const instanceRef = useRef<DosInstance | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Admin gate
  useEffect(() => {
    if (!user || !isAdmin) {
      navigate('/', { replace: true });
    }
  }, [user, isAdmin, navigate]);

  // Mount js-dos
  useEffect(() => {
    if (!isAdmin || !containerRef.current) return;

    let cancelled = false;

    async function init() {
      try {
        if (typeof Dos === 'undefined') {
          setError('js-dos failed to load. Please refresh the page.');
          return;
        }

        const ci = await Dos(containerRef.current!, {
          url: '/games/gp2.jsdos',
          autoStart: true,
          theme: 'dark',
          noSideBar: true,
          noSocialLinks: true,
        });

        if (cancelled) {
          ci.stop();
          return;
        }

        instanceRef.current = ci;
        setLoading(false);
      } catch (err) {
        if (!cancelled) {
          setError(`Failed to start GP2: ${err}`);
          setLoading(false);
        }
      }
    }

    init();

    return () => {
      cancelled = true;
      if (instanceRef.current) {
        instanceRef.current.stop();
        instanceRef.current = null;
      }
    };
  }, [isAdmin]);

  if (!isAdmin) return null;

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      <div className="flex items-center gap-3 mb-4">
        <button
          onClick={() => navigate('/lobby/gp2')}
          className="text-white/50 hover:text-white transition-colors text-sm"
        >
          &larr; Back
        </button>
        <h1 className="text-2xl font-display font-bold text-white flex items-center gap-2">
          <span className="text-3xl">🏎️</span> Grand Prix II
        </h1>
        <span className="bg-red-600/30 text-red-400 text-xs font-bold px-2 py-0.5 rounded-full">
          ADMIN ONLY
        </span>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/30 rounded-lg p-4 mb-4 text-red-300 text-sm">
          {error}
        </div>
      )}

      {/* js-dos container */}
      <div className="relative bg-black rounded-lg overflow-hidden" style={{ width: 800, height: 600 }}>
        {loading && !error && (
          <div className="absolute inset-0 flex flex-col items-center justify-center z-10 bg-black">
            <div className="text-white/60 animate-pulse text-sm mb-2">Loading Grand Prix II...</div>
            <div className="text-white/30 text-xs">~32 MB download - please wait</div>
          </div>
        )}
        <div
          ref={containerRef}
          style={{ width: 800, height: 600 }}
        />
      </div>

      {/* Controls hint */}
      <div className="mt-4 bg-white/5 rounded-lg p-4">
        <h3 className="text-sm font-bold text-white/70 mb-2">Controls</h3>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs text-white/50">
          <div><span className="text-white/70 font-medium">Arrow keys</span> - Steer / Accelerate / Brake</div>
          <div><span className="text-white/70 font-medium">Enter</span> - Select / Confirm</div>
          <div><span className="text-white/70 font-medium">Esc</span> - Menu / Back</div>
          <div><span className="text-white/70 font-medium">Space</span> - Gear shift</div>
        </div>
      </div>
    </div>
  );
}
