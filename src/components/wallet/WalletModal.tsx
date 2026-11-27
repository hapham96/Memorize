'use client';

import React, { useState } from 'react';
import { Coins, X } from 'lucide-react';
import { Wallet } from '@/lib/api/wallet-client';
import { ModalPortal } from '@/components/layout/ModalPortal';

interface WalletModalProps {
  wallet: Extract<Wallet, { enabled: true }>;
  onClose: () => void;
}

export const WalletModal: React.FC<WalletModalProps> = ({ wallet, onClose }) => {
  const [askedToBuy, setAskedToBuy] = useState(false);
  const { prices, supportEmails } = wallet;
  const rows: [string, number][] = [
    ['AI viết câu ví dụ', prices.example],
    ['AI tạo nghĩa cho từ mới', prices.wordEntry],
    ['Giải thích đoạn văn', prices.passage],
    ['Chấm phát âm', prices.pronunciation],
    ['Chấm nói (mỗi phút)', prices.speakingPerMinute],
  ];

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
        <div className="w-full max-w-sm bg-white dark:bg-slate-800 rounded-[32px] p-6 shadow-clay-xl border-clay border-blue-200 dark:border-slate-700 space-y-4 animate-scaleUp max-h-[90dvh] overflow-y-auto overscroll-contain">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-slate-100 flex items-center gap-2">
              <Coins className="w-5 h-5 text-amber-500" />
              {wallet.balance} xu
            </h3>
            <button
              onClick={onClose}
              aria-label="Đóng"
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
            Học là có xu: cứ 2 lượt ôn đúng được 1 xu (tối đa 5 xu mỗi ngày), mỗi 7
            ngày chuỗi thưởng thêm 10 xu.
          </p>

          <ul className="space-y-1.5">
            {rows.map(([label, price]) => (
              <li
                key={label}
                className="flex justify-between text-xs font-bold text-slate-700 dark:text-slate-200 px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-900"
              >
                <span>{label}</span>
                <span>{price} xu</span>
              </li>
            ))}
          </ul>

          <button
            onClick={() => setAskedToBuy(true)}
            className="w-full py-3 rounded-button bg-blue-600 hover:bg-blue-700 border-clay border-blue-400 text-white font-semibold text-sm shadow-clay active:scale-[0.97] transition-all"
          >
            Mua thêm xu
          </button>

          {askedToBuy && (
            <p
              role="status"
              className="text-xs font-bold text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/30 border-clay border-amber-300 dark:border-amber-900/50 rounded-xl p-3 leading-relaxed"
            >
              Hiện chưa bán xu.
              {supportEmails.length > 0 && (
                <>
                  {' '}
                  Gửi mail tới{' '}
                  {supportEmails.map((email, i) => (
                    <React.Fragment key={email}>
                      {i > 0 && ', '}
                      <a href={`mailto:${email}`} className="underline break-all">
                        {email}
                      </a>
                    </React.Fragment>
                  ))}{' '}
                  để được thêm xu.
                </>
              )}
            </p>
          )}
        </div>
      </div>
    </ModalPortal>
  );
};
