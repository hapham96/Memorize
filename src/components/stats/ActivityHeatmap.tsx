'use client';

import React, { useState } from 'react';
import { CalendarDays } from 'lucide-react';
import { ActivityDay } from '@/types';
import { formatDay, totalReviewsIn, WEEKDAY_LABELS, weekdayColumn } from '@/lib/activity';

/** Review counts at which a day steps up one shade. */
const LEVEL_THRESHOLDS = [1, 5, 10, 20];

const SHADES = [
  'bg-slate-200 dark:bg-slate-700',
  'bg-emerald-200 dark:bg-emerald-900',
  'bg-emerald-300 dark:bg-emerald-700',
  'bg-emerald-500 dark:bg-emerald-500',
  'bg-emerald-700 dark:bg-emerald-300',
];

function shadeOf(count: number): string {
  return SHADES[LEVEL_THRESHOLDS.filter((min) => count >= min).length];
}

interface ActivityHeatmapProps {
  /** Oldest first, one entry per day; null until the server answers. */
  activity: ActivityDay[] | null;
}

export const ActivityHeatmap: React.FC<ActivityHeatmapProps> = ({ activity }) => {
  // A tap picks a day: hover tooltips never show on a phone.
  const [selected, setSelected] = useState<string | null>(null);

  const days = activity ?? [];
  const today = days[days.length - 1];
  const picked = days.find((d) => d.date === selected) ?? today;
  const activeDays = days.filter((d) => d.count > 0).length;
  // Blank cells so each column is one weekday.
  const leading = days.length ? weekdayColumn(days[0].date) : 0;

  return (
    <section className="bg-white dark:bg-slate-800 p-4 rounded-card border-clay border-blue-200 dark:border-slate-700 shadow-clay-sm">
      <div className="flex items-start justify-between gap-3 mb-3">
        <div>
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
            <CalendarDays className="w-4 h-4 text-emerald-500" />
            Chuyên cần 28 ngày
          </h3>
          <p className="text-[11px] text-slate-400 font-medium mt-0.5">
            {activity
              ? `${activeDays} ngày có học · ${totalReviewsIn(days)} lượt ôn`
              : 'Đang tải…'}
          </p>
        </div>
      </div>

      <div className="max-w-xs mx-auto">
        <div className="grid grid-cols-7 gap-1.5 mb-1.5">
          {WEEKDAY_LABELS.map((label) => (
            <span key={label} className="text-center text-[10px] font-bold text-slate-400">
              {label}
            </span>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: leading }, (_, i) => (
            <span key={`blank-${i}`} aria-hidden="true" />
          ))}
          {days.map((day) => (
            <button
              key={day.date}
              type="button"
              onClick={() => setSelected(day.date)}
              aria-label={`${formatDay(day.date)}: ${day.count} lượt ôn`}
              aria-pressed={picked?.date === day.date}
              title={`${formatDay(day.date)}: ${day.count} lượt ôn`}
              className={`aspect-square rounded-md cursor-pointer transition-transform duration-200 ease-clay hover:scale-110 ${shadeOf(day.count)} ${
                picked?.date === day.date ? 'ring-2 ring-blue-600 dark:ring-blue-300' : ''
              }`}
            />
          ))}
        </div>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3 text-[11px] font-semibold text-slate-400">
        <p aria-live="polite" className="text-slate-600 dark:text-slate-300">
          {picked &&
            (picked.count > 0
              ? `${formatDay(picked.date)}: ${picked.count} lượt ôn`
              : picked === today
              ? 'Hôm nay chưa ôn lượt nào, làm một bài nhé!'
              : `${formatDay(picked.date)}: không ôn`)}
        </p>
        <div className="flex items-center gap-1 shrink-0" aria-hidden="true">
          <span>Ít</span>
          {SHADES.map((shade) => (
            <span key={shade} className={`w-2.5 h-2.5 rounded-sm ${shade}`} />
          ))}
          <span>Nhiều</span>
        </div>
      </div>
    </section>
  );
};
