'use client';

import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { Bell, X } from 'lucide-react';
import { DueReminderItem } from '@/lib/notifications';

interface DueReminderToastProps {
  items: DueReminderItem[];
  onReview: () => void;
  onDismiss: () => void;
}

/**
 * In-app half of the due-review reminder. Always shown when a reminder is
 * raised, so the feature still works for users who declined (or whose browser
 * does not support) system notifications.
 *
 * Portalled to `document.body` for the same reason as `ModalPortal`: the
 * `overflow-hidden` on `MobileContainer` would otherwise clip this fixed
 * element. Unlike `ModalPortal` it must not lock page scroll — the banner is
 * non-blocking.
 */
export const DueReminderToast: React.FC<DueReminderToastProps> = ({
  items,
  onReview,
  onDismiss,
}) => {
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  if (!mounted || items.length === 0) return null;

  const preview = items.slice(0, 3).map((item) => item.word.word).join(', ');
  const rest = items.length - Math.min(items.length, 3);

  return createPortal(
    <AnimatePresence>
      <motion.div
        key="due-reminder"
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 24 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        // bottom-24 clears the floating BottomNav (fixed bottom-4).
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-50 w-[calc(100%-2rem)] max-w-sm sm:max-w-md"
      >
        <div className="flex items-start gap-3 p-4 rounded-[24px] bg-white dark:bg-slate-800 shadow-clay-xl border-clay border-blue-200 dark:border-slate-700">
          <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/50 flex items-center justify-center">
            <Bell className="w-5 h-5 text-amber-500" />
          </div>

          <div className="flex-1 min-w-0">
            <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
              Đến giờ ôn tập rồi!
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-2">
              {items.length} từ đang chờ: {preview}
              {rest > 0 ? ` và ${rest} từ khác` : ''}.
            </p>

            <button
              onClick={onReview}
              className="mt-2.5 px-4 py-2 rounded-button bg-blue-600 border-clay border-blue-400 text-white text-xs font-bold shadow-clay active:scale-95 transition-transform"
            >
              Ôn ngay
            </button>
          </div>

          <button
            onClick={onDismiss}
            aria-label="Đóng nhắc nhở"
            className="flex-shrink-0 p-1.5 rounded-full text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>,
    document.body
  );
};
