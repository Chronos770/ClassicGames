import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GameRulesSectionProps {
  rules: string[];
  gameName: string;
}

export default function GameRulesSection({ rules, gameName }: GameRulesSectionProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className="rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-3 px-5 py-3.5 bg-white/5 hover:bg-white/[0.08] transition-colors text-left rounded-xl"
      >
        <span className="text-white/70 text-sm">{'?'}</span>
        <span className="text-white font-medium text-sm flex-1">How to Play {gameName}</span>
        <motion.span
          animate={{ rotate: open ? 180 : 0 }}
          transition={{ duration: 0.2 }}
          className="text-white/40 text-xs"
        >
          {'\u25BC'}
        </motion.span>
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <ul className="px-5 py-4 bg-white/[0.02] space-y-2">
              {rules.map((rule, i) => (
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
  );
}
