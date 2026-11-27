'use client';

import React, { useEffect, useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { ChainSummary } from '@/types/chain';
import { fetchChains } from '@/lib/api/chain-client';
import { cardClass } from './ChainViews';

const SHOWN = 5;

/** The saved chains, newest first. Shows nothing until there is one. */
export const SavedChains: React.FC<{ onOpen: (chainId: number) => void }> = ({ onOpen }) => {
  const [chains, setChains] = useState<ChainSummary[]>([]);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    let isCurrent = true;
    fetchChains()
      .then((next) => isCurrent && setChains(next))
      .catch((err) => console.warn('Could not load saved chains:', err));
    return () => {
      isCurrent = false;
    };
  }, []);

  if (!chains.length) return null;

  return (
    <section className={`${cardClass} space-y-1.5`}>
      <h3 className="text-sm font-extrabold text-slate-900 dark:text-slate-100">
        Chuỗi nhớ đã lưu
      </h3>
      {(showAll ? chains : chains.slice(0, SHOWN)).map((chain) => (
        <button
          key={chain.id}
          type="button"
          onClick={() => onOpen(chain.id)}
          className="w-full flex items-center gap-2 p-2.5 rounded-2xl border-2 border-slate-200 dark:border-slate-700 text-left"
        >
          <span className="min-w-0 truncate text-sm font-semibold text-slate-700 dark:text-slate-300">
            {chain.headwords.join(' → ')}
          </span>
          <ChevronRight className="w-4 h-4 ml-auto shrink-0 text-slate-400" />
        </button>
      ))}
      {chains.length > SHOWN && (
        <button
          type="button"
          onClick={() => setShowAll(!showAll)}
          className="text-xs font-bold text-blue-600 dark:text-blue-400"
        >
          {showAll ? 'Thu gọn' : `Xem tất cả (${chains.length})`}
        </button>
      )}
    </section>
  );
};
