import { useState, ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface PlayOptionCardProps {
  icon: string;
  title: string;
  description: string;
  accentColor: string;
  disabled?: boolean;
  disabledText?: string;
  onClick?: () => void;
  expandable?: boolean;
  children?: ReactNode;
}

export default function PlayOptionCard({
  icon,
  title,
  description,
  accentColor,
  disabled,
  disabledText,
  onClick,
  expandable,
  children,
}: PlayOptionCardProps) {
  const [expanded, setExpanded] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    if (expandable) {
      setExpanded(!expanded);
    } else {
      onClick?.();
    }
  };

  return (
    <div className="rounded-xl overflow-hidden">
      <button
        onClick={handleClick}
        disabled={disabled}
        className={`w-full text-left p-5 transition-all border-2 rounded-xl ${
          disabled
            ? 'border-white/5 bg-white/[0.02] opacity-50 cursor-not-allowed'
            : expanded
              ? 'border-amber-500 bg-amber-500/10'
              : 'border-white/10 bg-white/5 hover:bg-white/10 hover:border-white/20'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center text-xl"
            style={{ backgroundColor: `${accentColor}22` }}
          >
            {icon}
          </div>
          <div className="flex-1">
            <div className="text-white font-medium text-sm">{title}</div>
            <div className="text-white/40 text-xs">{disabled ? disabledText : description}</div>
          </div>
          {expandable && !disabled && (
            <motion.span
              animate={{ rotate: expanded ? 180 : 0 }}
              className="text-white/30 text-xs"
            >
              {'\u25BC'}
            </motion.span>
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && children && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div className="p-4 bg-white/[0.02] border-x-2 border-b-2 border-white/10 rounded-b-xl -mt-2">
              {children}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
