'use client';

import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Mascot } from '@/components/mascot/Mascot';
import { pickMascotLine } from '@/components/mascot/mascotLines';
import { useMascotMotion } from '@/lib/mascot-motion';

const VISIBLE_MS = 1400;

interface MascotReactionProps {
  /** The verdict on the answer just given, or null while the question is open. */
  result: 'correct' | 'wrong' | null;
  /**
   * Identifies the question — a new value with the same verdict (two right
   * answers in a row) must still replay the reaction.
   */
  questionKey: string | number;
}

/**
 * Memori's ~1s reaction to a quiz answer: a pill with Memori's head and a
 * line, centred under the progress bar. Centred so lines of any length grow
 * evenly instead of shifting one edge around. Positioned against the app
 * shell (not the scrolling quiz), never takes pointer events, and leaves on
 * its own — it must not delay or cover the next question.
 *
 * Skipped entirely when mascot animations are off: a pill flashing in and
 * out is itself motion.
 */
export const MascotReaction: React.FC<MascotReactionProps> = ({ result, questionKey }) => {
  const motionEnabled = useMascotMotion();
  const [shown, setShown] = useState<{ result: 'correct' | 'wrong'; line: string } | null>(null);

  useEffect(() => {
    if (!result || !motionEnabled) {
      setShown(null);
      return;
    }
    setShown({ result, line: pickMascotLine(result) });
    const timer = setTimeout(() => setShown(null), VISIBLE_MS);
    return () => clearTimeout(timer);
  }, [result, questionKey, motionEnabled]);

  return (
    <div className="absolute inset-x-0 top-16 z-30 flex justify-center pointer-events-none" aria-live="polite">
      <AnimatePresence>
        {shown && (
          <motion.div
            key={`${questionKey}-${shown.result}`}
            initial={{ opacity: 0, y: -10, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.9 }}
            transition={{ type: 'spring', stiffness: 400, damping: 26 }}
            className={`flex items-center gap-2 pl-1 pr-4 py-1 rounded-full bg-white dark:bg-slate-800 shadow-clay-md border-2 ${
              shown.result === 'correct'
                ? 'border-emerald-300 dark:border-emerald-600'
                : 'border-rose-300 dark:border-rose-600'
            }`}
          >
            <Mascot mood={shown.result === 'correct' ? 'happy' : 'sad'} size={40} interactive={false} />
            <span className="text-sm font-bold text-slate-800 dark:text-slate-100 whitespace-nowrap">{shown.line}</span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
