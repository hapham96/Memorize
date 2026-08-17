'use client';

import React from 'react';
import { X, Sun, Moon, Volume2, Bell, Target, Trash2, Check, AlertCircle } from 'lucide-react';
import { Category, WordCategory } from '@/types';
import { categoryNames } from '@/lib/api/category-client';
import { AppSettings } from '@/lib/storage';
import { NotificationPermissionState } from '@/lib/notifications';
import { PushSubscriptionStatus } from '@/hooks/usePushSubscription';
import { ModalPortal } from '@/components/layout/ModalPortal';

interface SettingsModalProps {
  settings: AppSettings;
  /** The account's `/categories` list; the focus picker is built from it. */
  categories?: Category[];
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetProgress: () => void;
  onClose: () => void;
  notificationPermission?: NotificationPermissionState;
  /** Must be triggered by this click — browsers reject the prompt otherwise. */
  onRequestNotificationPermission?: () => void;
  /** Drives the push-subscribe status hint below the toggle; owned by usePushSubscription. */
  pushStatus?: PushSubscriptionStatus;
}

const REMINDER_INTERVALS = [30, 60, 180, 360];

/**
 * Emoji per category name — decoration only. The list itself comes from
 * `/categories`, so a name that is not here still renders, just without an icon.
 */
const CATEGORY_EMOJI: Record<string, string> = {
  IELTS: '🎓',
  TOEIC: '💼',
  TOEFL: '🏫',
  Custom: '✏️',
  'Daily Life': '💬',
  Business: '📊',
  Academic: '📚',
  Travel: '✈️',
  Technology: '💻',
  Emotions: '❤️',
  'Idioms & Phrasal Verbs': '🗣️',
};

const categoryLabel = (name: WordCategory): string => {
  const emoji = CATEGORY_EMOJI[name];
  const suffix = name === 'Custom' ? ' (Tự thêm)' : '';
  return `${emoji ? `${emoji} ` : ''}${name}${suffix}`;
};

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  categories = [],
  onUpdateSettings,
  onResetProgress,
  onClose,
  notificationPermission = 'unsupported',
  onRequestNotificationPermission,
  pushStatus = 'idle',
}) => {
  const handleToggleNotifications = () => {
    const next = !settings.notifications;
    onUpdateSettings({ notifications: next });
    // Enabling is a user gesture, so it is the right moment to ask the browser.
    if (next && notificationPermission === 'default') {
      onRequestNotificationPermission?.();
    }
  };

  return (
    <ModalPortal>
    <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
      <div className="w-full max-w-md sm:max-w-lg bg-white dark:bg-slate-800 rounded-[32px] p-6 md:p-8 shadow-clay-xl border-clay border-blue-200 dark:border-slate-700 space-y-6 animate-scaleUp max-h-[90dvh] overflow-y-auto overscroll-contain">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100">
            Settings
          </h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Appearance Mode */}
        <div className="space-y-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-wider">
            Appearance
          </label>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onUpdateSettings({ theme: 'light' })}
              className={`p-3 rounded-button border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${settings.theme === 'light'
                ? 'bg-blue-600 text-white border-blue-600 shadow-clay-sm'
                : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                }`}
            >
              <Sun className="w-4 h-4" />
              <span>Light</span>
            </button>

            <button
              onClick={() => onUpdateSettings({ theme: 'dark' })}
              className={`p-3 rounded-button border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${settings.theme === 'dark'
                ? 'bg-blue-600 text-white border-blue-600 shadow-clay-sm'
                : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                }`}
            >
              <Moon className="w-4 h-4" />
              <span>Dark</span>
            </button>
          </div>
        </div>

        {/* Sound Effects */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border-clay border-blue-200 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Volume2 className="w-5 h-5 text-blue-500" />
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Sound Effects
              </p>
              <p className="text-[10px] text-slate-400">Play correct/incorrect audio feedback</p>
            </div>
          </div>
          <button
            onClick={() => onUpdateSettings({ soundEnabled: !settings.soundEnabled })}
            className={`w-11 h-6 rounded-full transition-colors relative ${settings.soundEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform transform ${settings.soundEnabled ? 'translate-x-5' : 'translate-x-0.5'
                }`}
            />
          </button>
        </div>

        {/* Due-review reminders */}
        <div className="space-y-2">
          <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border-clay border-blue-200 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <Bell className="w-5 h-5 text-amber-500" />
              <div>
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  Nhắc ôn tập
                </p>
                <p className="text-[10px] text-slate-400">
                  Báo khi có từ tới hạn ôn tập
                </p>
              </div>
            </div>
            <button
              onClick={handleToggleNotifications}
              className={`w-11 h-6 rounded-full transition-colors relative ${settings.notifications ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                }`}
            >
              <div
                className={`w-5 h-5 rounded-full bg-white transition-transform transform ${settings.notifications ? 'translate-x-5' : 'translate-x-0.5'
                  }`}
              />
            </button>
          </div>

          {settings.notifications && (
            <div className="space-y-2.5 pl-1">
              {/* Browser permission — without it only the in-app banner shows. */}
              {notificationPermission === 'default' && (
                <button
                  onClick={onRequestNotificationPermission}
                  className="w-full p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border-clay border-amber-300 dark:border-amber-900/50 text-[11px] font-bold text-amber-700 dark:text-amber-300 flex items-center justify-center gap-2 hover:bg-amber-100 dark:hover:bg-amber-950/50 transition-colors"
                >
                  <Bell className="w-4 h-4" />
                  <span>Bật thông báo trình duyệt</span>
                </button>
              )}

              {notificationPermission === 'denied' && (
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-clay border-blue-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-px" />
                  <span>
                    Trình duyệt đang chặn thông báo. Bạn vẫn nhận nhắc nhở ngay trong app —
                    mở cài đặt trình duyệt để cho phép thông báo hệ thống.
                  </span>
                </div>
              )}

              {notificationPermission === 'unsupported' && (
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-clay border-blue-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-px" />
                  <span>
                    Trình duyệt không hỗ trợ thông báo hệ thống. Nhắc nhở sẽ hiện trong app.
                  </span>
                </div>
              )}

              {/* Push subscribe status — silent on success, since the toggle already shows on. */}
              {/* Only when notifications themselves work: a browser with no
                  Notification API already said so above, and two hints for the
                  same limitation read as two separate problems. */}
              {pushStatus === 'unsupported' && notificationPermission !== 'unsupported' && (
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-clay border-blue-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-px" />
                  <span>
                    Trình duyệt không hỗ trợ thông báo đẩy. Nhắc nhở vẫn hiện khi ứng dụng đang mở.
                  </span>
                </div>
              )}

              {pushStatus === 'subscribing' && (
                <div className="p-3 rounded-xl bg-slate-100 dark:bg-slate-800 border-clay border-blue-200 dark:border-slate-700 text-[11px] text-slate-500 dark:text-slate-400 flex items-start gap-2">
                  <Bell className="w-4 h-4 flex-shrink-0 mt-px" />
                  <span>Đang bật thông báo đẩy…</span>
                </div>
              )}

              {pushStatus === 'error' && (
                <div className="p-3 rounded-xl bg-amber-50 dark:bg-amber-950/30 border-clay border-amber-300 dark:border-amber-900/50 text-[11px] text-amber-700 dark:text-amber-300 flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 mt-px" />
                  <span>
                    Không thể đăng ký thông báo đẩy từ máy chủ. Nhắc nhở vẫn hiện khi ứng dụng đang mở.
                  </span>
                </div>
              )}

              {/* Throttle — a big due batch should not turn into a stream of pings. */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  Khoảng cách tối thiểu giữa 2 lần nhắc
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {REMINDER_INTERVALS.map((minutes) => (
                    <button
                      key={minutes}
                      onClick={() => onUpdateSettings({ reminderIntervalMinutes: minutes })}
                      className={`py-2 rounded-button text-[11px] font-bold border transition-all ${settings.reminderIntervalMinutes === minutes
                        ? 'bg-blue-600 text-white border-blue-600'
                        : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                        }`}
                    >
                      {minutes < 60 ? `${minutes} phút` : `${minutes / 60} giờ`}
                    </button>
                  ))}
                </div>
              </div>

              {/* Quiet hours */}
              <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border-clay border-blue-200 dark:border-slate-800">
                <div className="flex items-center gap-3">
                  <Moon className="w-5 h-5 text-indigo-400" />
                  <div>
                    <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                      Không làm phiền
                    </p>
                    <p className="text-[10px] text-slate-400">
                      Tắt nhắc nhở từ {settings.quietHoursStart}:00 đến {settings.quietHoursEnd}:00
                    </p>
                  </div>
                </div>
                <button
                  onClick={() =>
                    onUpdateSettings({ quietHoursEnabled: !settings.quietHoursEnabled })
                  }
                  className={`w-11 h-6 rounded-full transition-colors relative flex-shrink-0 ${settings.quietHoursEnabled ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
                    }`}
                >
                  <div
                    className={`w-5 h-5 rounded-full bg-white transition-transform transform ${settings.quietHoursEnabled ? 'translate-x-5' : 'translate-x-0.5'
                      }`}
                  />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Daily Word Goal */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-wider">
            <Target className="w-4 h-4 text-emerald-500" />
            <span>Daily Word Goal</span>
          </div>
          <div className="grid grid-cols-4 gap-2">
            {[5, 10, 20, 30].map((goal) => (
              <button
                key={goal}
                onClick={() => onUpdateSettings({ dailyGoal: goal })}
                className={`py-2.5 rounded-button text-xs font-bold border transition-all ${settings.dailyGoal === goal
                  ? 'bg-emerald-600 text-white border-emerald-600'
                  : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                  }`}
              >
                {goal} words
              </button>
            ))}
          </div>
        </div>

        {/* Focus Vocabulary Categories Selection */}
        <div className="space-y-2.5 pt-2 border-t border-slate-200 dark:border-slate-700">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>🎯 Chọn bộ từ vựng học</span>
            </label>
            <button
              onClick={() => onUpdateSettings({ focusCategories: [] })}
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full transition-all ${(!settings.focusCategories || settings.focusCategories.length === 0)
                ? 'bg-blue-600 text-white'
                : 'bg-slate-200 dark:bg-slate-700 text-slate-600 dark:text-slate-300'
                }`}
            >
              Tất cả (All)
            </button>
          </div>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Chọn các bộ từ muốn tập trung ôn luyện & làm bài quiz:
          </p>

          <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto pr-1">
            {categoryNames(categories).map((cat) => {
              const isSelected = settings.focusCategories?.includes(cat);

              const handleToggleCat = () => {
                const current = settings.focusCategories || [];
                let next: any[];
                if (isSelected) {
                  next = current.filter((c) => c !== cat);
                } else {
                  next = [...current, cat];
                }
                onUpdateSettings({ focusCategories: next });
              };

              return (
                <button
                  key={cat}
                  onClick={handleToggleCat}
                  className={`p-2 rounded-xl text-xs font-bold border flex items-center justify-between transition-all ${isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-clay-sm'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                >
                  <span className="truncate">{categoryLabel(cat)}</span>
                  {isSelected && <Check className="w-3.5 h-3.5 flex-shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* Reset Data Option */}
        <div className="pt-2 border-t border-slate-200 dark:border-slate-700">
          <button
            onClick={() => {
              if (confirm('Are you sure you want to reset all progress data?')) {
                onResetProgress();
              }
            }}
            className="w-full py-3 rounded-button bg-red-50 dark:bg-red-950/40 text-red-600 dark:text-red-400 text-xs font-bold border border-red-200/50 flex items-center justify-center gap-2 hover:bg-red-100 transition-all"
          >
            <Trash2 className="w-4 h-4" />
            <span>Reset All Progress Data</span>
          </button>
        </div>
      </div>
    </div>
    </ModalPortal>
  );
};
