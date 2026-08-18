'use client';

import React, { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { Trophy, RefreshCw, Loader2, Crown, BookOpen } from 'lucide-react';
import { LeaderboardEntry } from '@/types';
import { LEADERBOARD_LIMIT, fetchLeaderboard } from '@/lib/api/leaderboard-client';
import { buildMockLeaderboard } from '@/data/mockLeaderboard';

interface LeaderboardCardProps {
  /** Highlights the signed-in learner's own row; null when the token carried no id. */
  currentUserId: number | null;
  /** Only used to name the current user's row in the mock board. */
  currentUserName?: string;
}

/**
 * Gold / silver / bronze for the podium. The badge is the saturated version of
 * the row tint, so it still reads against a row of the same hue.
 */
function rankStyle(rank: number): string {
  switch (rank) {
    case 1:
      return 'bg-amber-400 dark:bg-amber-500 text-white border-amber-500 dark:border-amber-400';
    case 2:
      return 'bg-slate-300 dark:bg-slate-400 text-slate-700 border-slate-400 dark:border-slate-300';
    case 3:
      return 'bg-orange-400 dark:bg-orange-500 text-white border-orange-500 dark:border-orange-400';
    default:
      return 'bg-white dark:bg-slate-900 text-slate-400 border-blue-200 dark:border-slate-700';
  }
}

/**
 * Row tint. The podium keeps its metal even when it is the current user's row —
 * the "You" pill already marks that — so first place never loses its gold.
 */
function rowStyle(rank: number, isCurrentUser: boolean): string {
  switch (rank) {
    case 1:
      return 'bg-amber-100 dark:bg-amber-500/15 border-amber-300 dark:border-amber-500/40';
    case 2:
      return 'bg-slate-200 dark:bg-slate-600/30 border-slate-300 dark:border-slate-500/50';
    case 3:
      return 'bg-orange-100 dark:bg-orange-500/15 border-orange-300 dark:border-orange-500/40';
    default:
      return isCurrentUser
        ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700'
        : 'bg-slate-50 dark:bg-slate-900/40 border-blue-100 dark:border-slate-700';
  }
}

/**
 * Top learners by words added.
 *
 * The endpoint is not built yet, so a failed fetch is the expected first state:
 * it falls back to a labelled sample board so the screen is reviewable, and
 * never takes the rest of the stats screen down with it. Once `/users/leaderboard`
 * answers, the real rows replace the sample and the badge disappears.
 */
export const LeaderboardCard: React.FC<LeaderboardCardProps> = ({
  currentUserId,
  currentUserName,
}) => {
  const [entries, setEntries] = useState<LeaderboardEntry[] | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMock, setIsMock] = useState(false);

  const load = async () => {
    setIsLoading(true);
    setIsMock(false);
    try {
      setEntries(await fetchLeaderboard(LEADERBOARD_LIMIT));
    } catch (err) {
      console.warn('Leaderboard unavailable, showing sample data:', err);
      setEntries(buildMockLeaderboard(currentUserId, currentUserName));
      setIsMock(true);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    void load();
    // Re-reads when the account changes — the board highlights the current user.
  }, [currentUserId]);

  const rows = entries ?? [];

  return (
    <div className="bg-white dark:bg-slate-800 rounded-card p-5 border-clay border-blue-200 dark:border-slate-700">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Trophy className="w-4 h-4 text-amber-500" />
          <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
            Top Learners
          </h4>
        </div>
        <div className="flex items-center gap-2">
          {isMock ? (
            <span className="text-[10px] font-bold text-amber-600 dark:text-amber-300 bg-amber-100 dark:bg-amber-500/20 px-2 py-0.5 rounded-full">
              Sample data
            </span>
          ) : (
            <span className="text-[11px] text-slate-400 font-medium">
              Top {LEADERBOARD_LIMIT} by words
            </span>
          )}
          <button
            type="button"
            onClick={() => void load()}
            disabled={isLoading}
            aria-label="Refresh leaderboard"
            className="p-1.5 rounded-xl text-slate-400 hover:text-blue-500 disabled:opacity-50 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {isLoading && rows.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-slate-400">
          <Loader2 className="w-4 h-4 animate-spin" />
          <span>Loading ranking…</span>
        </div>
      ) : rows.length === 0 ? (
        <div className="clay-well px-4 py-6 text-center">
          <p className="text-xs font-semibold text-slate-500 dark:text-slate-300">
            No one is on the board yet.
          </p>
          <p className="text-[11px] text-slate-400 mt-1">
            Add words and you could be first.
          </p>
        </div>
      ) : (
        <ul className="space-y-2">
          {rows.map((entry, index) => {
            const isCurrentUser = currentUserId !== null && entry.userId === currentUserId;
            return (
              <motion.li
                key={entry.userId}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.03 }}
                className={`flex items-center gap-3 p-2.5 rounded-2xl border-clay ${
                  entry.rank <= 3 ? 'shadow-clay-sm' : ''
                } ${rowStyle(entry.rank, isCurrentUser)}`}
              >
                <span
                  className={`shrink-0 w-8 h-8 rounded-xl border-2 flex items-center justify-center text-xs font-black ${rankStyle(
                    entry.rank
                  )}`}
                >
                  {entry.rank === 1 ? <Crown className="w-4 h-4" /> : entry.rank}
                </span>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-slate-900 dark:text-slate-100 truncate">
                    {entry.name}
                    {isCurrentUser && (
                      // A white pill keeps its edge on the amber and orange
                      // podium rows, where an amber fill would vanish.
                      <span className="ml-2 align-middle text-[10px] font-bold text-amber-600 dark:text-amber-300 bg-white dark:bg-slate-900/70 px-2 py-0.5 rounded-full border border-amber-300 dark:border-amber-500/40">
                        You
                      </span>
                    )}
                  </p>
                  {entry.masteredCount !== undefined && (
                    <span className="text-[10px] text-emerald-500 font-semibold">
                      {entry.masteredCount} mastered
                    </span>
                  )}
                </div>

                <div className="shrink-0 flex items-center gap-1.5 text-slate-900 dark:text-slate-100">
                  <BookOpen className="w-3.5 h-3.5 text-blue-500" />
                  <span className="text-sm font-black">{entry.wordsLearned}</span>
                </div>
              </motion.li>
            );
          })}
        </ul>
      )}

      {isMock && (
        <p className="text-[10px] text-slate-400 text-center mt-3">
          Placeholder ranking — real numbers land once the server publishes them.
        </p>
      )}
    </div>
  );
};
