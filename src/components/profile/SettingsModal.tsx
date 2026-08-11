'use client';

import React from 'react';
import { X, Sun, Moon, Volume2, Bell, Target, Trash2, Check } from 'lucide-react';
import { AppSettings } from '@/lib/storage';

interface SettingsModalProps {
  settings: AppSettings;
  onUpdateSettings: (newSettings: Partial<AppSettings>) => void;
  onResetProgress: () => void;
  onClose: () => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  settings,
  onUpdateSettings,
  onResetProgress,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950/70 backdrop-blur-md flex items-center justify-center p-4">
      <div className="w-full max-w-md sm:max-w-lg bg-white dark:bg-slate-800 rounded-[32px] p-6 md:p-8 shadow-2xl border border-slate-200/80 dark:border-slate-700/80 space-y-6 animate-scaleUp max-h-[90vh] overflow-y-auto">
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
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                }`}
            >
              <Sun className="w-4 h-4" />
              <span>Light</span>
            </button>

            <button
              onClick={() => onUpdateSettings({ theme: 'dark' })}
              className={`p-3 rounded-button border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${settings.theme === 'dark'
                ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                : 'bg-slate-100 dark:bg-slate-700 border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200'
                }`}
            >
              <Moon className="w-4 h-4" />
              <span>Dark</span>
            </button>
          </div>
        </div>

        {/* Sound Effects */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
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

        {/* Notifications */}
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <Bell className="w-5 h-5 text-amber-500" />
            <div>
              <p className="text-xs font-bold text-slate-800 dark:text-slate-200">
                Notifications
              </p>
              <p className="text-[10px] text-slate-400">Receive study reminders & updates</p>
            </div>
          </div>
          <button
            onClick={() => onUpdateSettings({ notifications: !settings.notifications })}
            className={`w-11 h-6 rounded-full transition-colors relative ${settings.notifications ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white transition-transform transform ${settings.notifications ? 'translate-x-5' : 'translate-x-0.5'
                }`}
            />
          </button>
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
            {[
              { id: 'IELTS', label: '🎓 IELTS', color: 'border-purple-300 bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-300' },
              { id: 'TOEIC', label: '💼 TOEIC', color: 'border-blue-300 bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300' },
              { id: 'TOEFL', label: '🏫 TOEFL', color: 'border-indigo-300 bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-300' },
              { id: 'Custom', label: '✏️ Custom (Tự thêm)', color: 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' },
              { id: 'Daily Life', label: '💬 Daily Life', color: 'border-slate-300 bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200' },
              { id: 'Business', label: '📊 Business', color: 'border-amber-300 bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' },
              { id: 'Academic', label: '📚 Academic', color: 'border-rose-300 bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' },
              { id: 'Travel', label: '✈️ Travel', color: 'border-cyan-300 bg-cyan-50 text-cyan-700 dark:bg-cyan-950/40 dark:text-cyan-300' },
              { id: 'Technology', label: '💻 Technology', color: 'border-teal-300 bg-teal-50 text-teal-700 dark:bg-teal-950/40 dark:text-teal-300' },
              { id: 'Emotions', label: '❤️ Emotions', color: 'border-pink-300 bg-pink-50 text-pink-700 dark:bg-pink-950/40 dark:text-pink-300' },
            ].map((catItem) => {
              const cat = catItem.id as any;
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
                  key={catItem.id}
                  onClick={handleToggleCat}
                  className={`p-2 rounded-xl text-xs font-bold border flex items-center justify-between transition-all ${isSelected
                    ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:border-slate-300'
                    }`}
                >
                  <span className="truncate">{catItem.label}</span>
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
  );
};
