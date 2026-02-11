import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { GAME_CONFIGS } from '../gameConfigs';

const GAME_RULES = Object.values(GAME_CONFIGS).map(g => ({
  id: g.id,
  name: g.name,
  icon: g.icon,
  rules: g.rules,
}));

export default function HowToPlaySection() {
  const [openId, setOpenId] = useState<string | null>(null);

  return (
    <div className="max-w-4xl mx-auto">
      <h3 className="text-2xl font-display font-bold text-white mb-6 text-center">
        How to Play
      </h3>
      <div className="space-y-2">
        {GAME_RULES.map((game) => (
          <div key={game.id} className="rounded-lg overflow-hidden">
            <button
              onClick={() => setOpenId(openId === game.id ? null : game.id)}
              className="w-full flex items-center gap-3 px-5 py-3.5 bg-white/5 hover:bg-white/8 transition-colors text-left"
            >
              <span className="text-xl">{game.icon}</span>
              <span className="text-white font-medium flex-1">{game.name}</span>
              <motion.span
                animate={{ rotate: openId === game.id ? 180 : 0 }}
                transition={{ duration: 0.2 }}
                className="text-white/40 text-sm"
              >
                &#9660;
              </motion.span>
            </button>

            <AnimatePresence>
              {openId === game.id && (
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
    </div>
  );
}
