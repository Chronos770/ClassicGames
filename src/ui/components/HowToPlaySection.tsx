import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface GameRules {
  id: string;
  name: string;
  icon: string;
  rules: string[];
}

const GAME_RULES: GameRules[] = [
  {
    id: 'solitaire',
    name: 'Solitaire',
    icon: '\u2660',
    rules: [
      'Move cards between 7 tableau columns, building down in alternating colors',
      'Turn cards from the stock pile to find playable cards',
      'Build foundation piles from Ace to King by suit',
      'Win by moving all 52 cards to the 4 foundation piles',
    ],
  },
  {
    id: 'chess',
    name: 'Chess',
    icon: '\u265A',
    rules: [
      'Each piece moves differently: pawns forward, rooks in lines, bishops diagonally, etc.',
      'Capture opponent pieces by moving to their square',
      'Put the enemy King in checkmate (no escape from attack) to win',
      'Special moves: castling, en passant, and pawn promotion',
    ],
  },
  {
    id: 'hearts',
    name: 'Hearts',
    icon: '\u2665',
    rules: [
      'Pass 3 cards to another player each round, then play tricks',
      'Follow the lead suit if possible; highest card of lead suit wins the trick',
      'Each Heart = 1 point, Queen of Spades = 13 points (points are bad!)',
      'Or "Shoot the Moon" by taking ALL hearts + Queen of Spades to give 26 points to everyone else',
    ],
  },
  {
    id: 'checkers',
    name: 'Checkers',
    icon: '\u26C0',
    rules: [
      'Move pieces diagonally forward on dark squares',
      'Jump over opponent pieces to capture them (mandatory if possible)',
      'Reach the opposite end to become a King - Kings move backwards too',
      'Win by capturing all opponent pieces or blocking all their moves',
    ],
  },
  {
    id: 'rummy',
    name: 'Gin Rummy',
    icon: '\u2666',
    rules: [
      'Draw a card from the stock or discard pile each turn, then discard one',
      'Form melds: sets of 3-4 same-rank cards, or runs of 3+ consecutive suited cards',
      'Knock when your deadwood (unmelded cards) totals 10 or less',
      'Go Gin with zero deadwood for bonus points! First to 100 wins',
    ],
  },
  {
    id: 'battleship',
    name: 'Battleship',
    icon: '\u2693',
    rules: [
      'Place your fleet of 5 ships on your grid (ships cannot touch)',
      'Take turns firing shots at the enemy grid to find their ships',
      'Hits are marked red, misses are marked white',
      'Sink all 5 enemy ships before they sink yours to win!',
    ],
  },
  {
    id: 'towerdefense',
    name: 'Tower Defense',
    icon: '\u{1F3F0}',
    rules: [
      'Place towers on grass tiles adjacent to the enemy path',
      '4 tower types: Arrow (fast), Cannon (AoE), Ice (slow), Lightning (chain)',
      'Start waves when ready - enemies follow the path toward the exit',
      'Survive all 15 waves! Upgrade towers and earn gold from kills',
    ],
  },
];

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
