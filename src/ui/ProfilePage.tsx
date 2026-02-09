import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import { supabase } from '../lib/supabase';
import AvatarPicker from './AvatarPicker';

export default function ProfilePage() {
  const { user, isGuest, profile, fetchProfile } = useAuthStore();
  const stats = useUserStore((s) => s.stats);

  const [displayName, setDisplayName] = useState(profile?.display_name ?? 'Player');
  const [currentEmoji, setCurrentEmoji] = useState(profile?.avatar_emoji ?? '\u{1F3AE}');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  if (isGuest || !user) {
    return (
      <div className="max-w-2xl mx-auto px-6 py-16 text-center">
        <h2 className="text-2xl font-display font-bold text-white mb-4">Profile</h2>
        <p className="text-white/50">Sign in to customize your profile and track your stats across devices.</p>
      </div>
    );
  }

  const handleSave = async () => {
    if (!supabase) return;
    setSaving(true);
    await supabase
      .from('profiles')
      .update({ display_name: displayName, avatar_emoji: currentEmoji })
      .eq('id', user.id);
    await fetchProfile();
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleEmojiSelect = (emoji: string) => {
    setCurrentEmoji(emoji);
  };

  const totalGames = Object.values(stats).reduce((sum, s) => sum + s.played, 0);
  const totalWins = Object.values(stats).reduce((sum, s) => sum + s.won, 0);

  return (
    <div className="max-w-2xl mx-auto px-6 py-12">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel"
      >
        <h2 className="text-2xl font-display font-bold text-white mb-6">Your Profile</h2>

        {/* Avatar */}
        <div className="mb-6">
          <div className="text-center mb-4">
            <span className="text-6xl">{currentEmoji}</span>
          </div>
          <AvatarPicker currentEmoji={currentEmoji} onSelect={handleEmojiSelect} />
        </div>

        {/* Display Name */}
        <div className="mb-6">
          <label className="block text-sm text-white/60 mb-2 uppercase tracking-wider">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50"
            maxLength={30}
          />
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="btn-primary w-full py-3 font-semibold mb-6"
        >
          {saving ? 'Saving...' : saved ? 'Saved!' : 'Save Changes'}
        </button>

        {/* Stats summary */}
        <div className="border-t border-white/10 pt-6">
          <h3 className="text-lg font-display font-bold text-white mb-4">Quick Stats</h3>
          <div className="grid grid-cols-3 gap-4">
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-2xl font-mono font-bold text-white">{totalGames}</div>
              <div className="text-xs text-white/40 uppercase">Games Played</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-2xl font-mono font-bold text-amber-400">{totalWins}</div>
              <div className="text-xs text-white/40 uppercase">Wins</div>
            </div>
            <div className="bg-white/5 rounded-lg p-4 text-center">
              <div className="text-2xl font-mono font-bold text-green-400">
                {totalGames > 0 ? Math.round((totalWins / totalGames) * 100) : 0}%
              </div>
              <div className="text-xs text-white/40 uppercase">Win Rate</div>
            </div>
          </div>
        </div>

        <div className="mt-6 text-center text-xs text-white/30">
          {user.email}
        </div>
      </motion.div>
    </div>
  );
}
