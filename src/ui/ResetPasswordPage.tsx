import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';

export default function ResetPasswordPage() {
  const navigate = useNavigate();
  const updatePassword = useAuthStore((s) => s.updatePassword);
  const user = useAuthStore((s) => s.user);

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [ready, setReady] = useState(false);

  // Wait briefly for Supabase to process the recovery token from the URL hash
  useEffect(() => {
    const timer = setTimeout(() => setReady(true), 1000);
    return () => clearTimeout(timer);
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);
    const result = await updatePassword(password);
    setLoading(false);

    if (result.error) {
      setError(result.error);
    } else {
      setSuccess(true);
    }
  };

  if (!ready) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-white/40 animate-pulse">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel max-w-md w-full mx-4 text-center"
        >
          <div className="text-4xl mb-4">&#9888;</div>
          <h2 className="text-xl font-display font-bold text-white mb-2">Invalid or Expired Link</h2>
          <p className="text-white/50 text-sm mb-6">
            This password reset link is no longer valid. Please request a new one.
          </p>
          <button onClick={() => navigate('/')} className="btn-primary px-6 py-2">
            Go Home
          </button>
        </motion.div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel max-w-md w-full mx-4 text-center"
        >
          <div className="text-4xl mb-4">&#10003;</div>
          <h2 className="text-xl font-display font-bold text-white mb-2">Password Updated</h2>
          <p className="text-white/50 text-sm mb-6">
            Your password has been successfully changed. You're now logged in.
          </p>
          <button onClick={() => navigate('/')} className="btn-primary px-6 py-2">
            Start Playing
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel max-w-md w-full mx-4"
      >
        <h2 className="text-2xl font-display font-bold text-white mb-2 text-center">Set New Password</h2>
        <p className="text-white/50 text-sm text-center mb-6">
          Enter your new password below.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <input
            type="password"
            placeholder="New Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
            required
            minLength={8}
          />
          <input
            type="password"
            placeholder="Confirm New Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
            required
            minLength={8}
          />

          {error && (
            <p className="text-red-400 text-sm text-center">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="btn-primary w-full py-3 font-semibold"
          >
            {loading ? 'Updating...' : 'Update Password'}
          </button>
        </form>
      </motion.div>
    </div>
  );
}
