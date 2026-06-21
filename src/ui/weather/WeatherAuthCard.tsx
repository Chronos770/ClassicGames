import { useState } from 'react';
import { useAuthStore } from '../../stores/authStore';

type Tab = 'login' | 'signup' | 'forgot';

/**
 * Inline weather-branded sign-in. Replaces the generic "Sign in on
 * Castle & Cards" CTA when running in the weather PWA / native app so
 * the user never sees the games-hub auth styling. Same Supabase
 * backend under the hood — once signed in, the WeatherPage gating
 * re-evaluates and lets the dashboard render.
 */
export default function WeatherAuthCard() {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [resetSent, setResetSent] = useState(false);

  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  const resetPassword = useAuthStore((s) => s.resetPassword);

  const validate = (): string | null => {
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      return 'Please enter a valid email address';
    }
    if (tab !== 'forgot') {
      if (password.length < 12) {
        return 'Password must be at least 12 characters';
      }
    }
    if (tab === 'signup' && !name.trim()) {
      return 'Please enter a display name';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const v = validate();
    if (v) {
      setError(v);
      return;
    }
    setBusy(true);
    try {
      if (tab === 'forgot') {
        const r = await resetPassword(email.trim());
        if (r.error) setError(r.error);
        else setResetSent(true);
      } else if (tab === 'login') {
        const r = await signInWithEmail(email.trim(), password);
        if (r.error) setError(r.error);
      } else {
        const r = await signUpWithEmail(email.trim(), password, name.trim());
        if (r.error) setError(r.error);
        else setSignupSuccess(true);
      }
    } finally {
      setBusy(false);
    }
  };

  const switchTab = (t: Tab) => {
    setTab(t);
    setError('');
    setSignupSuccess(false);
    setResetSent(false);
  };

  if (signupSuccess) {
    return (
      <div className="bg-gradient-to-br from-sky-500/20 to-sky-700/10 backdrop-blur-md border border-sky-500/40 rounded-2xl p-6 max-w-sm w-full text-center">
        <div className="text-3xl mb-3" aria-hidden>
          &#9928;&#65039;
        </div>
        <div className="text-white text-lg font-display font-semibold mb-2">Check your email</div>
        <div className="text-sm text-white/70">
          We sent a confirmation link to <span className="text-white">{email}</span>. Click it and
          come back here to sign in.
        </div>
      </div>
    );
  }

  if (resetSent) {
    return (
      <div className="bg-gradient-to-br from-sky-500/20 to-sky-700/10 backdrop-blur-md border border-sky-500/40 rounded-2xl p-6 max-w-sm w-full text-center">
        <div className="text-3xl mb-3" aria-hidden>
          &#128231;
        </div>
        <div className="text-white text-lg font-display font-semibold mb-2">Reset email sent</div>
        <div className="text-sm text-white/70">
          Open the link in your email to choose a new password.
        </div>
        <button
          onClick={() => switchTab('login')}
          className="mt-4 text-sm px-4 py-2 bg-sky-500/30 hover:bg-sky-500/40 text-sky-100 rounded-lg transition-colors"
        >
          Back to sign in
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-sky-500/15 to-sky-700/5 backdrop-blur-md border border-sky-500/30 rounded-2xl p-6 max-w-sm w-full">
      <div className="text-center mb-5">
        <div className="text-4xl mb-2" aria-hidden>
          &#9928;&#65039;
        </div>
        <h2 className="text-white text-xl font-display font-semibold">Castle &amp; Cards Weather</h2>
        <p className="text-xs text-white/55 mt-1">
          Sign in to your Castle &amp; Cards account to unlock the dashboard.
        </p>
      </div>

      {/* Tab strip */}
      <div className="flex bg-black/30 rounded-lg p-1 mb-4">
        {(['login', 'signup', 'forgot'] as Tab[]).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => switchTab(t)}
            className={`flex-1 text-xs py-1.5 rounded-md transition-colors capitalize ${
              tab === t
                ? 'bg-sky-500/30 text-sky-100 font-medium'
                : 'text-white/55 hover:text-white/85'
            }`}
          >
            {t === 'forgot' ? 'Reset' : t === 'login' ? 'Sign in' : 'Sign up'}
          </button>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="space-y-3">
        {tab === 'signup' && (
          <div>
            <label className="block text-xs text-white/60 mb-1">Display name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500/60 focus:outline-none"
              autoComplete="name"
              maxLength={30}
            />
          </div>
        )}

        <div>
          <label className="block text-xs text-white/60 mb-1">Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500/60 focus:outline-none"
            autoComplete="email"
            inputMode="email"
          />
        </div>

        {tab !== 'forgot' && (
          <div>
            <label className="block text-xs text-white/60 mb-1">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-black/30 border border-white/15 rounded-lg px-3 py-2 text-sm text-white focus:border-sky-500/60 focus:outline-none"
              autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              minLength={12}
            />
            {tab === 'signup' && (
              <div className="text-[10px] text-white/40 mt-1">At least 12 characters.</div>
            )}
          </div>
        )}

        {error && (
          <div className="text-xs text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="w-full text-sm font-medium px-4 py-2.5 bg-sky-500/40 hover:bg-sky-500/55 text-sky-50 rounded-lg transition-colors disabled:opacity-50"
        >
          {busy
            ? '…'
            : tab === 'login'
              ? 'Sign in'
              : tab === 'signup'
                ? 'Create account'
                : 'Send reset email'}
        </button>
      </form>
    </div>
  );
}
