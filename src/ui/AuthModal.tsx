import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function AuthModal({ isOpen, onClose }: AuthModalProps) {
  const [tab, setTab] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const signInWithEmail = useAuthStore((s) => s.signInWithEmail);
  const signUpWithEmail = useAuthStore((s) => s.signUpWithEmail);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    let result;
    if (tab === 'login') {
      result = await signInWithEmail(email, password);
    } else {
      result = await signUpWithEmail(email, password, name);
    }

    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else {
      onClose();
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm"
          onClick={onClose}
        >
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.95, opacity: 0 }}
            className="glass-panel max-w-md w-full mx-4"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="text-2xl font-display font-bold text-white mb-6 text-center">
              {tab === 'login' ? 'Welcome Back' : 'Create Account'}
            </h2>

            {/* Tabs */}
            <div className="flex gap-2 mb-6">
              <button
                onClick={() => setTab('login')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === 'login' ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                Log In
              </button>
              <button
                onClick={() => setTab('signup')}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${
                  tab === 'signup' ? 'bg-amber-500 text-black' : 'bg-white/5 text-white/60 hover:bg-white/10'
                }`}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {tab === 'signup' && (
                <input
                  type="text"
                  placeholder="Display Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
                  required
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
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
                required
                minLength={6}
              />

              {error && (
                <p className="text-red-400 text-sm text-center">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="btn-primary w-full py-3 font-semibold"
              >
                {loading ? 'Loading...' : tab === 'login' ? 'Log In' : 'Sign Up'}
              </button>
            </form>

            <button
              onClick={onClose}
              className="w-full mt-3 py-2 text-sm text-white/40 hover:text-white/60 transition-colors"
            >
              Continue as Guest
            </button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
