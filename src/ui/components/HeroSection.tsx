import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

export default function HeroSection() {
  const navigate = useNavigate();

  return (
    <div className="relative overflow-hidden mb-12">
      {/* Animated gradient background */}
      <div
        className="absolute inset-0 opacity-30"
        style={{
          background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 25%, #0f3460 50%, #533483 75%, #1a1a2e 100%)',
          backgroundSize: '400% 400%',
          animation: 'gradientShift 12s ease infinite',
        }}
      />

      {/* Grid pattern overlay */}
      <div
        className="absolute inset-0 opacity-5"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '40px 40px',
        }}
      />

      <div className="relative max-w-7xl mx-auto px-6 py-16 md:py-24">
        <div className="flex flex-col md:flex-row items-center gap-8 md:gap-16">
          {/* Left: About Us content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
            className="flex-1 text-center md:text-left"
          >
            <h1 className="text-5xl md:text-6xl lg:text-7xl font-display font-bold text-white mb-4 leading-tight">
              Castle &{' '}
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-amber-600">
                Cards
              </span>
            </h1>
            <p className="text-lg md:text-xl text-white/60 mb-4 max-w-xl leading-relaxed">
              Our boys have always loved playing chess, rummy, and card games. We grew up
              playing cards with their great-grandma — it's always been a family tradition, passed
              down around the kitchen table.
            </p>
            <p className="text-base text-white/40 mb-8 max-w-xl">
              We built Castle & Cards to share our love for classic games with anyone who
              feels the same way about family, friends, and a good hand of cards.
            </p>
            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <button
                onClick={() => navigate('/lobby/chess')}
                className="btn-primary text-base px-6 py-3 flex items-center gap-2"
              >
                <span className="text-lg">{'\u265A'}</span>
                Play Chess
              </button>
              <button
                onClick={() => {
                  document.getElementById('games-grid')?.scrollIntoView({ behavior: 'smooth' });
                }}
                className="btn-secondary text-base px-6 py-3"
              >
                Browse All Games
              </button>
            </div>
          </motion.div>

          {/* Right: Floating game icons */}
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="flex-shrink-0"
          >
            <div className="relative w-64 h-64 md:w-80 md:h-80">
              {[
                { icon: '\u265A', x: '35%', y: '25%', delay: 0, size: 'text-7xl' },
                { icon: '\u265E', x: '65%', y: '10%', delay: 0.5, size: 'text-5xl' },
                { icon: '\u265B', x: '10%', y: '50%', delay: 0.3, size: 'text-5xl' },
                { icon: '\u265C', x: '75%', y: '55%', delay: 1, size: 'text-4xl' },
                { icon: '\u2665', x: '85%', y: '85%', delay: 0.8, size: 'text-3xl' },
                { icon: '\u2660', x: '5%', y: '80%', delay: 1.2, size: 'text-3xl' },
                { icon: '\u26C0', x: '50%', y: '80%', delay: 1.5, size: 'text-3xl' },
              ].map((item, i) => (
                <motion.span
                  key={i}
                  className={`absolute ${item.size} drop-shadow-lg`}
                  style={{ left: item.x, top: item.y }}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{
                    opacity: [0.4, 0.8, 0.4],
                    y: [0, -10, 0],
                  }}
                  transition={{
                    delay: item.delay,
                    duration: 3,
                    repeat: Infinity,
                    repeatType: 'reverse',
                  }}
                >
                  {item.icon}
                </motion.span>
              ))}

              {/* Glow effect */}
              <div className="absolute inset-0 rounded-full bg-amber-500/10 blur-3xl" />
            </div>
          </motion.div>
        </div>

        {/* Stats row */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.6 }}
          className="mt-12 flex items-center justify-center md:justify-start gap-8 md:gap-12"
        >
          {[
            { value: '6', label: 'Games' },
            { value: '3', label: 'Categories' },
            { value: '\u221E', label: 'Family Fun' },
          ].map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-2xl md:text-3xl font-bold text-white">{stat.value}</div>
              <div className="text-xs text-white/40 uppercase tracking-wider">{stat.label}</div>
            </div>
          ))}
        </motion.div>
      </div>

      {/* CSS animation for gradient */}
      <style>{`
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
      `}</style>
    </div>
  );
}
