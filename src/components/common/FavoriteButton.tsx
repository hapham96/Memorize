'use client';

import React from 'react';
import { Heart } from 'lucide-react';
import { soundFX } from '@/lib/audio';

interface FavoriteButtonProps {
  isFavorite: boolean;
  onToggle: () => void;
  className?: string;
}

/** The heart that marks a word as Favorite, the same wherever a word is shown. */
export const FavoriteButton: React.FC<FavoriteButtonProps> = ({
  isFavorite,
  onToggle,
  className = '',
}) => (
  <button
    type="button"
    onClick={(e) => {
      // Rows and cards around it have their own click.
      e.stopPropagation();
      soundFX.playPop();
      onToggle();
    }}
    aria-pressed={isFavorite}
    aria-label={isFavorite ? 'Bỏ yêu thích' : 'Thêm vào yêu thích'}
    title={isFavorite ? 'Bỏ yêu thích' : 'Yêu thích'}
    className={`shrink-0 p-2 rounded-full hover:bg-red-50 dark:hover:bg-red-950/40 active:scale-90 transition-all ${className}`}
  >
    <Heart className={`w-4 h-4 ${isFavorite ? 'fill-red-500 text-red-500' : 'text-slate-400'}`} />
  </button>
);
