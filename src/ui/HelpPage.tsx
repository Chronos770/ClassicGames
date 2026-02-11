import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GAME_CONFIGS } from './gameConfigs';
import { useAuthStore } from '../stores/authStore';
import { createTicket, getUserTickets, type SupportTicket } from '../lib/adminService';

const sections = [
  {
    title: 'Getting Started',
    icon: '\u{1F680}',
    content: [
      'Browse the game library from the home page and pick any game to play.',
      'Choose your opponent: play against AI at different difficulty levels, or challenge friends online.',
      'No account needed to play! But signing up lets you track stats, earn ELO ratings, add friends, and send messages.',
      'Guest progress is saved locally. When you create an account, your stats are merged automatically.',
    ],
  },
  {
    title: 'Game Modes',
    icon: '\u{1F3AE}',
    content: [
      'VS AI — Play against computer opponents at Easy, Medium, or Hard difficulty. Each AI personality has a unique playstyle.',
      'Find Match — Queue up and get matched with another player looking for a game.',
      'Private Room — Create a room and share the invite code with a friend to play together.',
      'Chess Time Controls — Choose from Bullet (1-2 min), Blitz (3-5 min), Rapid (10-15 min), Classical (30+ min), or Unlimited.',
      'Solo Games — Solitaire is a single-player experience you can enjoy anytime.',
    ],
  },
  {
    title: 'Your Account',
    icon: '\u{1F4CA}',
    content: [
      'Stats Tracking — View your win rate, streak, and games played for every game on the Stats page.',
      'Match History — See a log of your recent games with opponents, results, and details.',
      'Leaderboard — Compete for the top spot! Rankings are based on ELO rating per game.',
      'ELO Ratings — Start at 1200. Win against higher-rated players to climb faster. Ratings update after each online match.',
    ],
  },
  {
    title: 'Social Features',
    icon: '\u{1F465}',
    content: [
      'Adding Friends — Search for players by name on the Friends page and send a friend request.',
      'Messaging — Send direct messages to friends from the Messages page. Chat in real time!',
      'Challenges — Challenge a friend to any game directly from their friend card. They\'ll receive a challenge message with a "Join Game" button.',
      'Online Status — See which friends are currently online with the green status dot.',
    ],
  },
];

export default function HelpPage() {
  const [openRules, setOpenRules] = useState<string | null>(null);

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}>
        <h1 className="text-3xl font-display font-bold text-white mb-2">Help & Guide</h1>
        <p className="text-white/40 mb-8">Everything you need to know about Castle & Cards.</p>

        {/* Info sections */}
        <div className="space-y-6 mb-12">
          {sections.map((section, i) => (
            <motion.div
              key={section.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="bg-white/5 rounded-xl p-6 border border-white/5"
            >
              <h2 className="text-xl font-display font-bold text-white mb-4 flex items-center gap-3">
                <span className="text-2xl">{section.icon}</span>
                {section.title}
              </h2>
              <ul className="space-y-3">
                {section.content.map((item, j) => (
                  <li key={j} className="flex gap-3 text-sm text-white/60">
                    <span className="text-amber-500 mt-0.5 flex-shrink-0">{'\u2022'}</span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </motion.div>
          ))}
        </div>

        {/* Game Rules */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
        >
          <h2 className="text-2xl font-display font-bold text-white mb-4 flex items-center gap-3">
            <span className="text-2xl">{'\u{1F3B2}'}</span>
            Game Rules
          </h2>
          <div className="space-y-2">
            {Object.values(GAME_CONFIGS).map((game) => (
              <div key={game.id} className="rounded-lg overflow-hidden">
                <button
                  onClick={() => setOpenRules(openRules === game.id ? null : game.id)}
                  className="w-full flex items-center gap-3 px-5 py-3.5 bg-white/5 hover:bg-white/8 transition-colors text-left"
                >
                  <span className="text-xl">{game.icon}</span>
                  <span className="text-white font-medium flex-1">{game.name}</span>
                  <motion.span
                    animate={{ rotate: openRules === game.id ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-white/40 text-sm"
                  >
                    {'\u25BC'}
                  </motion.span>
                </button>

                <AnimatePresence>
                  {openRules === game.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="overflow-hidden"
                    >
                      <ul className="px-5 py-4 bg-white/[0.02] space-y-2">
                        {game.rules.map((rule, i) => (
                          <li key={i} className="flex gap-2 text-sm text-white/60">
                            <span className="text-amber-500 mt-0.5">{'\u2022'}</span>
                            <span>{rule}</span>
                          </li>
                        ))}
                      </ul>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            ))}
          </div>
        </motion.div>

        {/* Support Ticket Section */}
        <SupportSection />
      </motion.div>
    </div>
  );
}

function SupportSection() {
  const user = useAuthStore((s) => s.user);
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent] = useState(false);
  const [tickets, setTickets] = useState<SupportTicket[]>([]);

  useEffect(() => {
    if (user) {
      getUserTickets(user.id).then(setTickets);
    }
  }, [user]);

  const handleSubmit = async () => {
    if (!user || !subject.trim() || !message.trim()) return;
    const ok = await createTicket(user.id, subject.trim(), message.trim());
    if (ok) {
      setSent(true);
      setSubject('');
      setMessage('');
      setTimeout(() => setSent(false), 3000);
      getUserTickets(user.id).then(setTickets);
    }
  };

  if (!user) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.5 }}
      className="mt-12"
    >
      <h2 className="text-2xl font-display font-bold text-white mb-4 flex items-center gap-3">
        <span className="text-2xl">{'\u{1F4E9}'}</span>
        Need Help?
      </h2>

      <div className="bg-white/5 rounded-xl p-6 border border-white/5 mb-6">
        <p className="text-sm text-white/50 mb-4">Submit a support ticket and we'll get back to you.</p>
        <div className="space-y-3">
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            maxLength={200}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none"
          />
          <textarea
            placeholder="Describe your issue..."
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            maxLength={2000}
            rows={4}
            className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder-white/30 focus:border-amber-500/50 focus:outline-none resize-none"
          />
          <div className="flex items-center gap-3">
            <button
              onClick={handleSubmit}
              disabled={!subject.trim() || !message.trim()}
              className="btn-primary text-sm py-2 px-4 disabled:opacity-30"
            >
              Send Ticket
            </button>
            {sent && <span className="text-xs text-green-400">Ticket sent! We'll respond soon.</span>}
          </div>
        </div>
      </div>

      {tickets.length > 0 && (
        <div>
          <h3 className="text-sm text-white/60 mb-3">Your Tickets</h3>
          <div className="space-y-3">
            {tickets.map((t) => (
              <div key={t.id} className="bg-white/5 rounded-xl p-4 border border-white/5">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-xs px-2 py-0.5 rounded-full ${
                    t.status === 'open' ? 'bg-blue-500/20 text-blue-400' :
                    t.status === 'in_progress' ? 'bg-amber-500/20 text-amber-400' :
                    t.status === 'resolved' ? 'bg-green-500/20 text-green-400' :
                    'bg-white/10 text-white/40'
                  }`}>
                    {t.status}
                  </span>
                  <h4 className="text-sm font-medium text-white">{t.subject}</h4>
                  <span className="text-xs text-white/30 ml-auto">{new Date(t.created_at).toLocaleDateString()}</span>
                </div>
                <p className="text-xs text-white/50">{t.message}</p>
                {t.admin_response && (
                  <div className="mt-2 bg-white/5 rounded-lg p-3">
                    <p className="text-xs text-amber-400/80 mb-0.5">Admin Response:</p>
                    <p className="text-xs text-white/60">{t.admin_response}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
