import { motion, AnimatePresence } from 'framer-motion';

interface CommentaryBubbleProps {
  message: string | null;
  avatar?: string;
  name?: string;
}

export default function CommentaryBubble({ message, avatar, name }: CommentaryBubbleProps) {
  return (
    <AnimatePresence mode="wait">
      {message && (
        <motion.div
          key={message}
          initial={{ opacity: 0, y: 10, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: -5, scale: 0.95 }}
          transition={{ duration: 0.3 }}
          className="flex items-start gap-2 mt-2"
        >
          {avatar && (
            <div className="text-xl flex-shrink-0 mt-0.5">{avatar}</div>
          )}
          <div className="relative bg-white/10 rounded-xl rounded-tl-none px-3 py-2 max-w-[280px]">
            {name && (
              <div className="text-[10px] text-amber-400/70 font-medium mb-0.5">{name}</div>
            )}
            <p className="text-xs text-white/70 leading-relaxed">{message}</p>
            {/* Speech bubble tail */}
            <div className="absolute -left-1.5 top-2 w-3 h-3 bg-white/10 rotate-45" />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
