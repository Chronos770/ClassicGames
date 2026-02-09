interface PlayerAvatarProps {
  name: string;
  isActive: boolean;
  isHuman: boolean;
  size?: 'sm' | 'md' | 'lg';
  avatarEmoji?: string;
  avatarUrl?: string | null;
}

export default function PlayerAvatar({ name, isActive, isHuman, size = 'md', avatarEmoji, avatarUrl }: PlayerAvatarProps) {
  const sizeClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-14 h-14 text-lg',
  };

  const initials = name
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2);

  const getContent = () => {
    if (avatarUrl) {
      return (
        <img
          src={avatarUrl}
          alt={name}
          className="w-full h-full rounded-full object-cover"
        />
      );
    }
    if (avatarEmoji) return avatarEmoji;
    if (!isHuman) return '\u{1F916}';
    return initials;
  };

  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={`${sizeClasses[size]} rounded-full flex items-center justify-center font-semibold transition-all overflow-hidden ${
          isActive
            ? 'bg-amber-500 text-black ring-2 ring-amber-400 ring-offset-2 ring-offset-slate-900'
            : 'bg-white/10 text-white/60'
        }`}
      >
        {getContent()}
      </div>
      <span className={`text-xs ${isActive ? 'text-amber-400' : 'text-white/40'}`}>{name}</span>
    </div>
  );
}
