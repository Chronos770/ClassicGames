import { useState } from 'react';
import { motion } from 'framer-motion';
import { useAuthStore } from '../stores/authStore';
import { useUserStore } from '../stores/userStore';
import { supabase } from '../lib/supabase';
import AvatarPicker from './AvatarPicker';

export default function ProfilePage() {
  const { user, isGuest, profile, fetchProfile, updatePassword, updateEmail, signOut } = useAuthStore();
  const stats = useUserStore((s) => s.stats);

  const [displayName, setDisplayName] = useState(profile?.display_name ?? 'Player');
  const [currentEmoji, setCurrentEmoji] = useState(profile?.avatar_emoji ?? '\u{1F3AE}');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Account settings state
  const [accountOpen, setAccountOpen] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [passwordSaving, setPasswordSaving] = useState(false);

  const [newEmail, setNewEmail] = useState('');
  const [emailMsg, setEmailMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [emailSaving, setEmailSaving] = useState(false);

  const [deleteConfirm, setDeleteConfirm] = useState(false);
  const [saveError, setSaveError] = useState('');

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
    setSaveError('');
    // Strip control characters and excessive whitespace
    const sanitized = displayName.replace(/[\x00-\x1F\x7F\u200B-\u200F\u202A-\u202E\uFEFF]/g, '').trim();
    if (!sanitized || sanitized.length > 30) return;

    // Check if name changed and if new name is taken
    if (sanitized.toLowerCase() !== (profile?.display_name ?? '').toLowerCase()) {
      const { data: existing } = await supabase
        .from('profiles')
        .select('id')
        .ilike('display_name', sanitized)
        .neq('id', user.id)
        .limit(1)
        .maybeSingle();
      if (existing) {
        setSaveError('That display name is already taken.');
        return;
      }
    }

    setSaving(true);
    await supabase
      .from('profiles')
      .update({ display_name: sanitized, avatar_emoji: currentEmoji })
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

        {saveError && <div className="text-red-400 text-sm mb-2">{saveError}</div>}
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

        {/* Account Settings */}
        <div className="mt-8 border-t border-white/10 pt-6">
          <button
            onClick={() => setAccountOpen(!accountOpen)}
            className="flex items-center justify-between w-full text-left"
          >
            <h3 className="text-lg font-display font-bold text-white">Account Settings</h3>
            <span className="text-white/40 text-sm">{accountOpen ? '▲' : '▼'}</span>
          </button>

          {accountOpen && (
            <div className="mt-4 space-y-6">
              {/* Change Password */}
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-3">Change Password</h4>
                <div className="space-y-3">
                  <input
                    type="password"
                    placeholder="New Password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 text-sm"
                    minLength={8}
                  />
                  <input
                    type="password"
                    placeholder="Confirm New Password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 text-sm"
                    minLength={8}
                  />
                  {passwordMsg && (
                    <p className={`text-sm ${passwordMsg.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                      {passwordMsg.text}
                    </p>
                  )}
                  <button
                    onClick={async () => {
                      if (newPassword.length < 8) {
                        setPasswordMsg({ type: 'error', text: 'Password must be at least 8 characters' });
                        return;
                      }
                      if (newPassword !== confirmPassword) {
                        setPasswordMsg({ type: 'error', text: 'Passwords do not match' });
                        return;
                      }
                      setPasswordSaving(true);
                      setPasswordMsg(null);
                      const result = await updatePassword(newPassword);
                      setPasswordSaving(false);
                      if (result.error) {
                        setPasswordMsg({ type: 'error', text: result.error });
                      } else {
                        setPasswordMsg({ type: 'success', text: 'Password updated successfully' });
                        setNewPassword('');
                        setConfirmPassword('');
                      }
                    }}
                    disabled={passwordSaving || !newPassword || !confirmPassword}
                    className="btn-primary py-2 px-4 text-sm"
                  >
                    {passwordSaving ? 'Updating...' : 'Update Password'}
                  </button>
                </div>
              </div>

              {/* Change Email */}
              <div className="bg-white/5 rounded-lg p-4">
                <h4 className="text-sm font-semibold text-white/80 uppercase tracking-wider mb-3">Change Email</h4>
                <p className="text-xs text-white/40 mb-3">
                  Current: <span className="text-white/60">{user.email}</span>
                </p>
                <div className="space-y-3">
                  <input
                    type="email"
                    placeholder="New Email Address"
                    value={newEmail}
                    onChange={(e) => setNewEmail(e.target.value)}
                    className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-amber-500/50 text-sm"
                  />
                  {emailMsg && (
                    <p className={`text-sm ${emailMsg.type === 'error' ? 'text-red-400' : 'text-green-400'}`}>
                      {emailMsg.text}
                    </p>
                  )}
                  <p className="text-xs text-white/30">A confirmation email will be sent to both your current and new address.</p>
                  <button
                    onClick={async () => {
                      if (!newEmail.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(newEmail.trim())) {
                        setEmailMsg({ type: 'error', text: 'Please enter a valid email address' });
                        return;
                      }
                      setEmailSaving(true);
                      setEmailMsg(null);
                      const result = await updateEmail(newEmail.trim());
                      setEmailSaving(false);
                      if (result.error) {
                        setEmailMsg({ type: 'error', text: result.error });
                      } else {
                        setEmailMsg({ type: 'success', text: 'Confirmation email sent — check your inbox' });
                        setNewEmail('');
                      }
                    }}
                    disabled={emailSaving || !newEmail}
                    className="btn-primary py-2 px-4 text-sm"
                  >
                    {emailSaving ? 'Sending...' : 'Change Email'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Danger Zone */}
        <div className="mt-8 border-t border-red-500/20 pt-6">
          <h3 className="text-lg font-display font-bold text-red-400 mb-2">Danger Zone</h3>
          {!deleteConfirm ? (
            <button
              onClick={() => setDeleteConfirm(true)}
              className="px-4 py-2 text-sm border border-red-500/30 text-red-400 rounded-lg hover:bg-red-500/10 transition-colors"
            >
              Delete Account
            </button>
          ) : (
            <div className="bg-red-500/10 border border-red-500/20 rounded-lg p-4">
              <p className="text-sm text-red-300 mb-3">
                This action is permanent. All your data, stats, and match history will be lost.
              </p>
              <div className="flex gap-3">
                <button
                  onClick={async () => {
                    if (!supabase) return;
                    try {
                      await supabase.rpc('delete_user');
                      await signOut();
                    } catch {
                      // If RPC not available, sign out and inform user
                      await signOut();
                      alert('Signed out. To fully delete your account data, please contact support.');
                    }
                  }}
                  className="px-4 py-2 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors font-semibold"
                >
                  Yes, Delete My Account
                </button>
                <button
                  onClick={() => setDeleteConfirm(false)}
                  className="px-4 py-2 text-sm text-white/60 hover:text-white transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
