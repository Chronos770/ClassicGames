import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuthStore } from '../stores/authStore';

const EMOJI_OPTIONS = [
  '\u{1F3AE}', '\u{1F3B2}', '\u{1F3B4}', '\u{1F0CF}', '\u{265F}', '\u{1F451}',
  '\u{1F9D9}', '\u{1F977}', '\u{1F47B}', '\u{1F916}', '\u{1F431}', '\u{1F436}',
  '\u{1F98A}', '\u{1F985}', '\u{1F680}', '\u{2B50}', '\u{1F525}', '\u{1F48E}',
  '\u{1F3C6}', '\u{26A1}', '\u{1F308}', '\u{1F33F}', '\u{1F30D}', '\u{1F3AF}',
  '\u{1F466}', '\u{1F467}', '\u{1F468}', '\u{1F469}', '\u{1F474}', '\u{1F475}',
];

interface AvatarPickerProps {
  currentEmoji: string;
  onSelect: (emoji: string) => void;
}

export default function AvatarPicker({ currentEmoji, onSelect }: AvatarPickerProps) {
  const [uploading, setUploading] = useState(false);
  const user = useAuthStore((s) => s.user);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !supabase || !user) return;

    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${user.id}/avatar.${ext}`;

    const { error } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true });

    if (!error) {
      const { data } = supabase.storage.from('avatars').getPublicUrl(path);
      if (data.publicUrl) {
        await supabase
          .from('profiles')
          .update({ avatar_url: data.publicUrl })
          .eq('id', user.id);
      }
    }
    setUploading(false);
  };

  return (
    <div>
      <label className="block text-sm text-white/60 mb-3 uppercase tracking-wider">
        Choose Avatar
      </label>

      <div className="grid grid-cols-6 gap-2 mb-4">
        {EMOJI_OPTIONS.map((emoji) => (
          <button
            key={emoji}
            onClick={() => onSelect(emoji)}
            className={`w-12 h-12 text-2xl rounded-lg flex items-center justify-center transition-all ${
              currentEmoji === emoji
                ? 'bg-amber-500/20 border-2 border-amber-500 scale-110'
                : 'bg-white/5 border-2 border-transparent hover:bg-white/10'
            }`}
          >
            {emoji}
          </button>
        ))}
      </div>

      {supabase && (
        <div>
          <label className="block text-xs text-white/40 mb-2">Or upload an image</label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={uploading}
            className="text-sm text-white/60 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-sm file:bg-white/10 file:text-white/60 hover:file:bg-white/20 file:cursor-pointer"
          />
          {uploading && <span className="text-xs text-amber-400 ml-2">Uploading...</span>}
        </div>
      )}
    </div>
  );
}
