'use client';

import React from 'react';
import { useMascotMotion } from '@/lib/mascot-motion';
import { MemoriPose, MemoriSvg } from './MemoriSvg';

/**
 * - `greet`: nothing focused.
 * - `look`: a text field is focused; eyes and trunk follow the caret.
 * - `cover` / `peek`: a password field is focused, hidden / shown.
 * - `sad`: the login failed. `cheer`: it worked, one beat before leaving.
 */
export type AuthMascotPose = 'greet' | 'look' | 'cover' | 'peek' | 'sad' | 'cheer';

interface AuthMascotProps {
  pose: AuthMascotPose;
  /** Caret position: -1 at the start of the field, 1 at the far end. */
  lookX?: number;
  bubble?: string;
  size?: number;
}

function poseFor(pose: AuthMascotPose, lookX: number): MemoriPose {
  // Memori looks down at the form, and keeps sneaking glances at what's
  // typed even behind its paws.
  const glance = { x: lookX, y: 0.5 };
  switch (pose) {
    case 'look':
      return { eyes: 'open', brows: 'calm', mouth: 'o', arms: ['rest', 'rest'], glance, trunk: lookX * 10 };
    case 'cover':
      return { eyes: 'open', brows: 'calm', mouth: 'smile', arms: ['cover', 'cover'], armNudge: lookX * 4, glance, trunk: lookX * 10 };
    case 'peek':
      return { eyes: 'open', brows: 'calm', mouth: 'o', arms: ['cover', 'peek'], armNudge: lookX * 4, glance, trunk: lookX * 10 };
    case 'sad':
      return { eyes: 'open', brows: 'sad', mouth: 'frown', arms: ['low', 'low'], ears: 'droop', motion: 'shake' };
    case 'cheer':
      return { eyes: 'happy', brows: 'calm', mouth: 'grin', arms: ['up', 'up'], trunk: -14, extra: 'sparkles', motion: 'hop' };
    default:
      return { eyes: 'open', brows: 'calm', mouth: 'smile', arms: ['rest', 'rest'], motion: 'bob' };
  }
}

/** The login-screen Memori: the shared SVG figure in a round avatar, reacting to the form. */
export const AuthMascot: React.FC<AuthMascotProps> = ({ pose, lookX = 0, bubble, size = 150 }) => {
  const motionEnabled = useMascotMotion();
  const showBubble = bubble && (pose === 'greet' || pose === 'look');

  return (
    <div className="relative inline-flex flex-col items-center select-none" style={{ width: size }}>
      {showBubble && (
        <div className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-3 py-1.5 rounded-2xl bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 text-xs font-bold shadow-clay-md border-2 border-blue-200 dark:border-slate-700 whitespace-nowrap pointer-events-none">
          {bubble}
        </div>
      )}
      <MemoriSvg pose={poseFor(pose, lookX)} size={size} animated={motionEnabled} framed label="Memo" />
    </div>
  );
};
