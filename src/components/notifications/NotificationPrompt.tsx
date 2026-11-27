'use client';

import React from 'react';
import { Bell } from 'lucide-react';
import { ModalPortal } from '@/components/layout/ModalPortal';

interface NotificationPromptProps {
  /** An iPhone/iPad browser tab: push only works from the home-screen app. */
  needsHomeScreen: boolean;
  /** Must call the browser's prompt from this click. */
  onAccept: () => void;
  onLater: () => void;
}

/**
 * Asked in the app first: a "no" on the browser's own prompt is final, so that
 * prompt only appears once the learner has said yes here.
 */
export const NotificationPrompt: React.FC<NotificationPromptProps> = ({
  needsHomeScreen,
  onAccept,
  onLater,
}) => (
  <ModalPortal>
    <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
      <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-clay-xl border-clay border-blue-200 dark:border-slate-700 space-y-4 text-center animate-scaleUp">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-amber-500 border-clay border-amber-300 flex items-center justify-center text-white shadow-clay">
          <Bell className="w-7 h-7" />
        </div>
        <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
          Mai Memo nhắc bạn ôn nhé?
        </h3>
        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
          {needsHomeScreen
            ? 'Trên iPhone/iPad: bấm nút Chia sẻ của trình duyệt, chọn “Thêm vào MH chính”, rồi mở Memorize từ màn hình chính và bật nhắc trong Settings.'
            : 'Mỗi ngày tối đa một thông báo, và chỉ khi bạn chưa học.'}
        </p>

        {needsHomeScreen ? (
          <button
            onClick={onLater}
            className="w-full py-3.5 rounded-button bg-blue-600 border-clay border-blue-400 text-white font-semibold text-sm shadow-clay active:scale-[0.97] transition-all"
          >
            Đã hiểu
          </button>
        ) : (
          <div className="space-y-2">
            <button
              onClick={onAccept}
              className="w-full py-3.5 rounded-button bg-blue-600 hover:bg-blue-700 border-clay border-blue-400 text-white font-semibold text-sm shadow-clay active:scale-[0.97] transition-all"
            >
              Bật nhắc
            </button>
            <button
              onClick={onLater}
              className="w-full py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 transition-colors"
            >
              Để sau
            </button>
          </div>
        )}
      </div>
    </div>
  </ModalPortal>
);
