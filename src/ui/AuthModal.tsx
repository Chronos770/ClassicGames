import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { supabase } from '../lib/supabase';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  guestUpgrade?: boolean;
}

type Tab = 'login' | 'signup' | 'forgot';

export default function AuthModal({ isOpen, onClose, guestUpgrade }: AuthModalProps) {
  const [tab, setTab] = useState<Tab>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
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
      if (password.length < 8) {
        return 'Password must be at least 8 characters';
      }
    }
    if (tab === 'signup' && !name.trim()) {
      return 'Please enter a display name';
    }
    if (tab === 'signup' && name.trim().length > 30) {
      return 'Display name must be 30 characters or less';
    }
    return null;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);

    if (tab === 'forgot') {
      const result = await resetPassword(email.trim());
      setLoading(false);
      if (result.error) {
        setError(result.error);
      } else {
        setResetSent(true);
      }
      return;
    }

    let result;
    if (tab === 'login') {
      result = await signInWithEmail(email.trim(), password);
    } else {
      // Check if display name is already taken
      if (supabase) {
        const { data: existing } = await supabase
          .from('profiles')
          .select('id')
          .ilike('display_name', name.trim())
          .limit(1)
          .maybeSingle();
        if (existing) {
          setLoading(false);
          setError('That display name is already taken. Please choose another.');
          return;
        }
      }
      result = await signUpWithEmail(email.trim(), password, name.trim());
    }

    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else if (tab === 'signup') {
      setSignupSuccess(true);
    } else {
      onClose();
    }
  };

  const switchTab = (newTab: Tab) => {
    setTab(newTab);
    setError('');
    setSignupSuccess(false);
    setResetSent(false);
  };

  const handleClose = () => {
    setError('');
    setSignupSuccess(false);
    setResetSent(false);
    setTab('login');
    onClose();
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={handleClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="glass-panel max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Signup success state */}
            {signupSuccess ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-4">&#9993;</div>
                <h2 className="text-2xl font-display font-bold text-white mb-2">Check Your Email</h2>
                <p className="text-white/60 text-sm mb-6">
                  We've sent a confirmation link to <span className="text-amber-400">{email}</span>.
                  <br />Click the link to activate your account and start playing!
                </p>
                <button
                  onClick={() => switchTab('login')}
                  className="btn-primary px-6 py-2"
                >
                  Back to Log In
                </button>
              </div>
            ) : resetSent ? (
              <div className="text-center py-4">
                <div className="text-4xl mb-4">&#128274;</div>
                <h2 className="text-2xl font-display font-bold text-white mb-2">Reset Link Sent</h2>
                <p className="text-white/60 text-sm mb-6">
                  If an account exists for <span className="text-amber-400">{email}</span>,
                  <br />you'll receive a password reset link shortly.
                </p>
                <button
                  onClick={() => switchTab('login')}
                  className="btn-primary px-6 py-2"
                >
                  Back to Log In
                </button>
              </div>
            ) : (
              <>
                <h2 className="text-2xl font-display font-bold text-white mb-6 text-center">
                  {tab === 'login' ? 'Welcome Back' : tab === 'signup' ? 'Create Account' : 'Reset Password'}
                </h2>

                {/* Tabs */}
                {tab !== 'forgot' && (
                  <div className="flex gap-2 mb-6">
                    <button
                      onClick={() => switchTab('login')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        tab === 'login' ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      Log In
                    </button>
                    <button
                      onClick={() => switchTab('signup')}
                      className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                        tab === 'signup' ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'
                      }`}
                    >
                      Sign Up
                    </button>
                  </div>
                )}

                {guestUpgrade && tab !== 'forgot' && (
                  <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mb-4">
                    <p className="text-sm text-amber-200/80 text-center">
                      Your game history and stats will be preserved when you create an account.
                    </p>
                  </div>
                )}

                {tab === 'forgot' && (
                  <p className="text-white/50 text-sm text-center mb-6">
                    Enter your email and we'll send you a link to reset your password.
                  </p>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                  {tab === 'signup' && (
                    <input
                      type="text"
                      placeholder="Display Name"
                      value={name}
                      onChange={(e) => setName(e.target.value.slice(0, 30))}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
                      required
                      maxLength={30}
                    />
                  )}
                  <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
                    required
                  />
                  {tab !== 'forgot' && (
                    <input
                      type="password"
                      placeholder="Password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
                      required
                      minLength={8}
                    />
                  )}

                  {error && (
                    <p className="text-red-400 text-sm text-center">{error}</p>
                  )}

                  <button
                    type="submit"
                    disabled={loading}
                    className="btn-primary w-full py-3 font-semibold"
                  >
                    {loading
                      ? 'Loading...'
                      : tab === 'login'
                        ? 'Log In'
                        : tab === 'signup'
                          ? 'Sign Up'
                          : 'Send Reset Link'}
                  </button>
                </form>

                {/* Forgot password / back link */}
                {tab === 'login' && (
                  <button
                    onClick={() => switchTab('forgot')}
                    className="w-full mt-2 py-1 text-xs text-white/30 hover:text-amber-400/70 transition-colors"
                  >
                    Forgot your password?
                  </button>
                )}
                {tab === 'forgot' && (
                  <button
                    onClick={() => switchTab('login')}
                    className="w-full mt-2 py-1 text-xs text-white/30 hover:text-white/60 transition-colors"
                  >
                    &#8592; Back to Log In
                  </button>
                )}

                <button
                  onClick={handleClose}
                  className="w-full mt-2 py-2 text-sm text-white/40 hover:text-white/60 transition-colors"
                >
                  Continue as Guest
                </button>
              </>
            )}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
