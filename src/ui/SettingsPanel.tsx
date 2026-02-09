import { motion, AnimatePresence } from 'framer-motion';
import { useSettingsStore, ChessPieceStyle, CardTheme } from '../stores/settingsStore';

interface SettingsPanelProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function SettingsPanel({ isOpen, onClose }: SettingsPanelProps) {
  const settings = useSettingsStore();

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
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-display font-bold text-white">Settings</h2>
              <button onClick={onClose} className="text-white/40 hover:text-white text-xl">
                &#10005;
              </button>
            </div>

            <div className="space-y-4">
              {/* Sound */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">Sound Effects</span>
                <button
                  onClick={settings.toggleSound}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.soundEnabled ? 'bg-amber-500' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      settings.soundEnabled ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Sound Volume */}
              {settings.soundEnabled && (
                <div>
                  <label className="text-xs text-white/50 mb-1 block">Volume</label>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.1}
                    value={settings.soundVolume}
                    onChange={(e) => settings.setSoundVolume(Number(e.target.value))}
                    className="w-full accent-amber-500"
                  />
                </div>
              )}

              {/* Hints */}
              <div className="flex items-center justify-between">
                <span className="text-sm text-white/70">Show Hints</span>
                <button
                  onClick={settings.toggleHints}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.showHints ? 'bg-amber-500' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      settings.showHints ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>

              {/* Animation Speed */}
              <div>
                <label className="text-sm text-white/70 mb-2 block">Animation Speed</label>
                <div className="flex gap-2">
                  {(['slow', 'normal', 'fast'] as const).map((speed) => (
                    <button
                      key={speed}
                      onClick={() => settings.setAnimationSpeed(speed)}
                      className={`flex-1 py-2 rounded-lg text-xs font-medium capitalize transition-all ${
                        settings.animationSpeed === speed
                          ? 'bg-amber-500 text-black'
                          : 'bg-white/5 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      {speed}
                    </button>
                  ))}
                </div>
              </div>

              {/* Divider */}
              <div className="border-t border-white/10 pt-4">
                <h3 className="text-sm font-medium text-white/80 mb-3">Game Customization</h3>
              </div>

              {/* Chess Piece Style */}
              <div>
                <label className="text-sm text-white/70 mb-2 block">Chess Piece Style</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'classic' as ChessPieceStyle, label: 'Classic', desc: 'Traditional Unicode' },
                    { id: 'minimalist' as ChessPieceStyle, label: 'Minimalist', desc: 'Clean & light' },
                    { id: 'bold' as ChessPieceStyle, label: 'Bold', desc: 'Heavy & dramatic' },
                    { id: 'pixel' as ChessPieceStyle, label: 'Pixel', desc: 'Geometric shapes' },
                  ]).map((style) => (
                    <button
                      key={style.id}
                      onClick={() => settings.setChessPieceStyle(style.id)}
                      className={`py-2 px-3 rounded-lg text-left transition-all ${
                        settings.chessPieceStyle === style.id
                          ? 'bg-amber-500/20 border border-amber-500 text-white'
                          : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      <div className="text-xs font-medium">{style.label}</div>
                      <div className="text-[10px] text-white/40">{style.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Card Theme */}
              <div>
                <label className="text-sm text-white/70 mb-2 block">Card Theme</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { id: 'classic-blue' as CardTheme, label: 'Classic Blue', color: '#1e3a5f' },
                    { id: 'royal-red' as CardTheme, label: 'Royal Red', color: '#7a1a1a' },
                    { id: 'forest-green' as CardTheme, label: 'Forest Green', color: '#1a4a2a' },
                    { id: 'midnight-purple' as CardTheme, label: 'Midnight', color: '#2e1a4a' },
                  ]).map((theme) => (
                    <button
                      key={theme.id}
                      onClick={() => settings.setCardTheme(theme.id)}
                      className={`py-2 px-3 rounded-lg flex items-center gap-2 transition-all ${
                        settings.cardTheme === theme.id
                          ? 'bg-amber-500/20 border border-amber-500 text-white'
                          : 'bg-white/5 border border-white/10 text-white/50 hover:bg-white/10'
                      }`}
                    >
                      <div className="w-5 h-7 rounded" style={{ backgroundColor: theme.color }} />
                      <div className="text-xs font-medium">{theme.label}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Chess Commentary */}
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-sm text-white/70">AI Commentary</span>
                  <p className="text-[10px] text-white/40">AI comments on chess moves</p>
                </div>
                <button
                  onClick={settings.toggleChessCommentary}
                  className={`w-12 h-6 rounded-full transition-colors ${
                    settings.chessCommentary ? 'bg-amber-500' : 'bg-white/20'
                  }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white shadow transition-transform ${
                      settings.chessCommentary ? 'translate-x-6' : 'translate-x-0.5'
                    }`}
                  />
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
