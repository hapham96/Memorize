'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, RefreshCw, Loader2, Crown, Sparkles } from 'lucide-react';
import { Leaderboard } from '@/types';
import { LEADERBOARD_LIMIT, fetchLeaderboard } from '@/lib/api/leaderboard-client';
import { buildMockLeaderboard } from '@/data/mockLeaderboard';

interface LeaderboardCardProps {
  currentUserId: number | null;
  currentUserName?: string;
}

function rankBadgeStyle(rank: number): string {
  switch (rank) {
    case 1:
      return 'bg-amber-500 text-white shadow-sm shadow-amber-500/30';
    case 2:
      return 'bg-slate-400 dark:bg-slate-500 text-white';
    case 3:
      return 'bg-amber-700 text-white';
    default:
      return 'bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400';
  }
}

function rowStyle(rank: number, isCurrentUser: boolean): string {
  if (isCurrentUser) {
    return 'bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200/80 dark:border-indigo-800/60 shadow-sm';
  }
  switch (rank) {
    case 1:
      return 'bg-amber-50/60 dark:bg-amber-950/20 border-amber-200/80 dark:border-amber-800/40';
    case 2:
      return 'bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-700/60';
    case 3:
      return 'bg-orange-50/60 dark:bg-orange-950/20 border-orange-200/80 dark:border-orange-800/40';
    default:
      return 'bg-white dark:bg-slate-900/40 border-slate-100 dark:border-slate-800/80';
  }
}

function formatPeriod(period: Date): string {
  return period.toLocaleDateString('vi-VN', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  currentUserId,
  currentUserName,
}) => {
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setIsMock(false);
    try {
      setBoard(await fetchLeaderboard(LEADERBOARD_LIMIT));
    } catch (err) {
      console.warn('Leaderboard unavailable, showing sample data:', err);
      setBoard(buildMockLeaderboard(currentUserId, currentUserName));
      setIsMock(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, [currentUserId]);

  const rows = board?.entries ?? [];
  const period = board?.period ?? null;

  return (
    <div className="bg-white dark:bg-slate-800/80 rounded-2xl p-5 border border-slate-200/80 dark:border-slate-800/80 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-amber-500/10 text-amber-500 flex items-center justify-center shrink-0">
            <Trophy className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
              Bảng vàng thành tích
            </h4>
            {period && (
              <p className="text-[11px] text-slate-400 font-medium truncate capitalize">
                {formatPeriod(period)}
              </p>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {isMock ? (
            <span className="text-[10px] font-semibold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-200 dark:border-amber-800">
              Dữ liệu mẫu
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium">
              Top {LEADERBOARD_LIMIT} tháng
            </span>
          )}
          <button
            type="button"
            onClick={() => void load()}
            disabled={isLoading}
            aria-label="Tải lại bảng xếp hạng"
            className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading && rows.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Đang tải bảng xếp hạng…</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="p-6 text-center rounded-xl bg-slate-50 dark:bg-slate-900/50 border border-slate-200/60 dark:border-slate-800">
          <p className="text-xs font-semibold text-slate-600 dark:text-slate-300">
            Chưa có thành viên nào trong tháng này.
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Hãy tích lũy điểm và bạn sẽ là người đầu tiên!
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((entry, index) => {
            const isCurrentUser = currentUserId !== null && entry.userId === currentUserId;
            return (
              <motion.li
                key={entry.userId}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.18, delay: index * 0.02 }}
                className={`flex items-center gap-3 p-2.5 rounded-xl border transition-all ${rowStyle(
                  entry.rank,
                  isCurrentUser
                )}`}
              >
                <span
                  className={`shrink-0 w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold ${rankBadgeStyle(
                    entry.rank
                  )}`}
                >
                  {entry.rank === 1 ? <Crown className="w-3.5 h-3.5" /> : entry.rank}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-xs sm:text-sm font-semibold text-slate-900 dark:text-slate-100 truncate">
                    {entry.name}
                    {isCurrentUser && (
                      <span className="ml-2 align-middle text-[10px] font-bold text-indigo-700 dark:text-indigo-300 bg-indigo-100 dark:bg-indigo-950/80 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                        Bạn
                      </span>
                    )}
                  </p>
                </div>

                <div className="shrink-0 flex items-baseline gap-1 text-slate-900 dark:text-slate-100">
                  <Sparkles className="w-3 h-3 self-center text-indigo-500" />
                  <span className="text-xs sm:text-sm font-extrabold">{entry.score}</span>
                  <span className="text-[10px] font-medium text-slate-400">pts</span>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}

      {isMock && (
        <p className="text-[10px] text-slate-400 text-center mt-3">
          Bảng xếp hạng mô phỏng — dữ liệu thật sẽ cập nhật tự động từ máy chủ.
        </p>
      )}
    </div>
  );
};
