'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { useMascotMotion } from '@/lib/mascot-motion';
import { MemoriPose, MemoriSvg } from './MemoriSvg';

export type MascotMood =
  | 'idle'
  | 'wave'
  | 'happy'
  | 'sad'
  | 'cheer'
  | 'encourage'
  | 'worried'
  | 'sleep'
  | 'think'
  | 'fight'
  | 'icon';

interface MascotProps {
  mood?: MascotMood;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | number;
  bubble?: string;
  bubblePosition?: 'top' | 'right' | 'bottom' | 'left';
  className?: string;
  interactive?: boolean;
  /** Per-instance opt-out; the global switch is `useMascotMotion`. */
  animated?: boolean;
  onClick?: () => void;
  alt?: string;
}

const SIZE_MAP: Record<string, number> = {
  xs: 24,
  sm: 36,
  md: 56,
  lg: 96,
  xl: 144,
  '2xl': 192,
};

/** Below this the body is noise; show just the head. */
const HEAD_ONLY_BELOW = 44;

const LABELS: Record<MascotMood, string> = {
  idle: 'Memo đứng chờ',
  wave: 'Memo vẫy tay chào',
  happy: 'Memo vui vẻ',
  sad: 'Memo buồn',
  cheer: 'Memo ăn mừng',
  encourage: 'Memo động viên',
  worried: 'Memo lo lắng',
  sleep: 'Memo đang ngủ',
  think: 'Memo đang học',
  fight: 'Memo sẵn sàng chiến đấu',
  icon: 'Biểu tượng Memo',
};

const IDLE: MemoriPose = { eyes: 'open', brows: 'calm', mouth: 'smile', arms: ['rest', 'rest'], motion: 'bob' };

const MOOD_POSES: Record<MascotMood, MemoriPose> = {
  idle: IDLE,
  wave: { ...IDLE, mouth: 'grin', arms: ['rest', 'wave'], waving: true },
  happy: { ...IDLE, eyes: 'happy', mouth: 'grin', trunk: -10, motion: 'hop' },
  sad: { eyes: 'open', brows: 'sad', mouth: 'frown', arms: ['low', 'low'], ears: 'droop', tilt: 6, extra: 'tear' },
  cheer: { eyes: 'happy', brows: 'calm', mouth: 'grin', arms: ['up', 'up'], trunk: -14, extra: 'sparkles', motion: 'hop' },
  encourage: { ...IDLE, mouth: 'grin', arms: ['fist', 'fist'], motion: 'nod' },
  worried: { eyes: 'open', brows: 'sad', mouth: 'wavy', arms: ['low', 'low'], glance: { x: -0.6, y: 0 }, extra: 'sweat', motion: 'bob' },
  sleep: { eyes: 'closed', brows: 'none', mouth: 'o', arms: ['low', 'low'], ears: 'droop', tilt: 10, extra: 'zzz', motion: 'breathe' },
  think: { eyes: 'open', brows: 'calm', mouth: 'flat', arms: ['rest', 'cheek'], glance: { x: 0.6, y: -0.8 }, tilt: -6, extra: 'dots', motion: 'bob' },
  fight: { eyes: 'open', brows: 'angry', mouth: 'grin', arms: ['fist', 'fist'], trunk: -16, motion: 'bounce' },
  icon: { ...IDLE, motion: undefined },
};

/**
 * Action moods play once, then Memori settles back into `idle` — a cheer
 * held forever reads as stuck. Ambient moods keep their loop.
 */
const ONE_SHOT_MOODS = new Set<MascotMood>(['wave', 'happy', 'cheer', 'encourage']);
const ONE_SHOT_MS = 2600;

export const Mascot: React.FC<MascotProps> = ({
  mood = 'wave',
  size = 'md',
  bubble,
  bubblePosition = 'top',
  className = '',
  interactive = true,
  animated = true,
  onClick,
  alt,
}) => {
  const motionEnabled = useMascotMotion();
  const animate = animated && motionEnabled;

  const [settled, setSettled] = useState<MascotMood | null>(null);
  const isOneShot = animate && ONE_SHOT_MOODS.has(mood);
  useEffect(() => {
    setSettled(null);
    if (!isOneShot) return;
    const timer = setTimeout(() => setSettled(mood), ONE_SHOT_MS);
    return () => clearTimeout(timer);
  }, [mood, isOneShot]);
  const shownMood: MascotMood = isOneShot && settled === mood ? 'idle' : mood;

  const pixelSize = typeof size === 'number' ? size : SIZE_MAP[size] ?? SIZE_MAP.md;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      onClick={onClick}
    >
      {bubble && (
        <motion.div
          key={bubble}
          initial={animate ? { opacity: 0, scale: 0.85, y: 4 } : false}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          className={`absolute z-20 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold shadow-clay-md border-2 border-blue-200 dark:border-slate-700 pointer-events-none flex items-center gap-1 ${
            bubblePosition === 'top'
              ? 'bottom-full mb-2 left-1/2 -translate-x-1/2 whitespace-nowrap'
              : bubblePosition === 'right'
              ? 'left-full ml-2 top-1/2 -translate-y-1/2 w-max max-w-[11rem]'
              : bubblePosition === 'bottom'
              ? 'top-full mt-2 left-1/2 -translate-x-1/2 whitespace-nowrap'
              : 'right-full mr-2 top-1/2 -translate-y-1/2 w-max max-w-[11rem]'
          }`}
        >
          <span>{bubble}</span>
        </motion.div>
      )}

      {/* A soft lean and a squash on tap, both on springs. */}
      <motion.div
        whileHover={interactive && animate ? { rotate: -4, y: -3 } : undefined}
        whileTap={interactive && animate ? { scaleX: 1.06, scaleY: 0.92 } : undefined}
        transition={{ type: 'spring', stiffness: 260, damping: 14 }}
        className={interactive ? 'cursor-pointer' : ''}
        style={{ width: pixelSize, height: pixelSize }}
      >
        {/* Not keyed by mood: the arms glide between poses, and a changed
            motion class restarts its animation on its own. */}
        <MemoriSvg
          pose={MOOD_POSES[shownMood]}
          size={pixelSize}
          animated={animate}
          headOnly={mood === 'icon' || pixelSize < HEAD_ONLY_BELOW}
          label={alt || LABELS[mood]}
          className="drop-shadow-clay-sm"
        />
      </motion.div>
    </div>
  );
};
