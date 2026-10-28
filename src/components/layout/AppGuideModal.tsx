'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bell,
  BookOpen,
  Brain,
  FileSpreadsheet,
  Flame,
  Gamepad2,
  Headphones,
  Layers,
  ListChecks,
  Plus,
  Rocket,
  Search,
  Sparkles,
  User,
  X,
  Zap,
} from 'lucide-react';
import { ModalPortal } from '@/components/layout/ModalPortal';

interface AppGuideModalProps {
  onClose: () => void;
  /** The last slide's main action — the guide ends where a new account has to start. */
  onAddFirstWord: () => void;
}

const SWIPE_THRESHOLD_PX = 40;

const slideMotion = {
  enter: (direction: number) => ({ x: direction >= 0 ? 48 : -48, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction >= 0 ? -48 : 48, opacity: 0 }),
};

/** A titled icon row, the building block most slides are made of. */
const GuideRow: React.FC<{
  icon: React.ElementType;
  tone: string;
  title: string;
  children: React.ReactNode;
}> = ({ icon: Icon, tone, title, children }) => (
  <div className="flex items-start gap-3 p-3 rounded-2xl bg-slate-50 dark:bg-slate-900 border-2 border-blue-100 dark:border-slate-700">
    <div className={`w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 ${tone}`}>
      <Icon className="w-[18px] h-[18px]" />
    </div>
    <div className="min-w-0">
      <p className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{title}</p>
      <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed mt-0.5">
        {children}
      </p>
    </div>
  </div>
);

/** The core loop: what a word goes through from the day it is added. */
const FLOW_STEPS = [
  { icon: Plus, label: 'Thêm từ', tone: 'bg-blue-600 text-white' },
  { icon: BookOpen, label: 'Luyện tập', tone: 'bg-amber-500 text-white' },
  { icon: Brain, label: 'Ôn đúng hạn', tone: 'bg-emerald-500 text-white' },
  { icon: Bell, label: 'Được nhắc', tone: 'bg-rose-500 text-white' },
];

/**
 * Mirrors the rating buttons on the review card and `calculateNextSRS()`:
 * below 3 the word starts over, from 3 up the gap keeps growing.
 */
const RATING_SCALE = [
  { score: 0, label: 'Quên hẳn', tone: 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200' },
  { score: 1, label: 'Nhớ khi xem', tone: 'bg-red-100 dark:bg-red-500/15 text-red-600 dark:text-red-300' },
  { score: 2, label: 'Thấy quen', tone: 'bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-300' },
  { score: 3, label: 'Vật lộn', tone: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300' },
  { score: 4, label: 'Đắn đo', tone: 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300' },
  { score: 5, label: 'Hoàn hảo', tone: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300' },
];

/** The four statuses a word shows in the library, in the order it earns them. */
const STATE_STEPS = [
  { label: 'Mới', tone: 'bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-600' },
  { label: 'Đang học', tone: 'bg-amber-100 dark:bg-amber-500/15 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-500/30' },
  { label: 'Đang ôn', tone: 'bg-blue-100 dark:bg-blue-500/15 text-blue-700 dark:text-blue-300 border-blue-200 dark:border-blue-500/30' },
  { label: 'Thành thạo', tone: 'bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-500/30' },
];

interface GuideSlide {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  body: React.ReactNode;
}

const SLIDES: GuideSlide[] = [
  {
    icon: Sparkles,
    title: 'Chào mừng đến Memorize!',
    subtitle:
      'Kho từ bắt đầu trống — mọi từ bạn học đều do chính bạn thêm vào. Đây là vòng lặp mỗi ngày:',
    body: (
      <div className="space-y-4">
        <div className="grid grid-cols-4 gap-2">
          {FLOW_STEPS.map((step, idx) => {
            const Icon = step.icon;
            return (
              <div key={step.label} className="flex flex-col items-center text-center gap-1.5">
                <div className={`w-11 h-11 rounded-2xl flex items-center justify-center shadow-clay-sm ${step.tone}`}>
                  <Icon className="w-5 h-5" />
                </div>
                <span className="text-[10px] font-extrabold text-slate-400">{idx + 1}</span>
                <span className="text-[11px] font-bold text-slate-700 dark:text-slate-200 leading-tight">
                  {step.label}
                </span>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-center text-slate-500 dark:text-slate-400 leading-relaxed px-2">
          Chỉ cần <b className="text-slate-700 dark:text-slate-200">5–10 phút mỗi ngày</b>. App tự tính
          khi nào bạn sắp quên một từ và đưa nó quay lại đúng lúc đó.
        </p>
      </div>
    ),
  },
  {
    icon: Plus,
    title: '1. Thêm từ vựng',
    subtitle: 'Bấm nút + ở góc trên (hoặc trên Trang chủ) để mở form thêm từ.',
    body: (
      <div className="space-y-2.5">
        <GuideRow icon={Search} tone="bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300" title="Gõ từ, chọn gợi ý">
          App tự điền phiên âm IPA, loại từ, định nghĩa và câu ví dụ. Bạn chỉ cần sửa lại nghĩa theo cách mình hiểu.
        </GuideRow>
        <GuideRow icon={FileSpreadsheet} tone="bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" title="Nhập hàng loạt từ Excel">
          Tải file mẫu ngay trong form, điền danh sách từ rồi tải lên — thêm hàng chục từ chỉ trong một lần.
        </GuideRow>
        <GuideRow icon={Zap} tone="bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300" title="+20 XP mỗi từ mới">
          Mỗi từ thêm vào sẽ vào hàng đợi ôn tập ngay lập tức.
        </GuideRow>
      </div>
    ),
  },
  {
    icon: BookOpen,
    title: '2. Luyện tập',
    subtitle: 'Tab Luyện tập có nhiều dạng bài, câu hỏi lấy từ chính kho từ của bạn.',
    body: (
      <div className="space-y-2.5">
        <GuideRow icon={Layers} tone="bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300" title="Flashcards">
          Lật thẻ, nghe phát âm, tự chấm mức độ nhớ — cách tốt nhất để học từ mới.
        </GuideRow>
        <GuideRow icon={ListChecks} tone="bg-purple-100 dark:bg-purple-500/15 text-purple-600 dark:text-purple-300" title="Trắc nghiệm & Điền từ">
          Chọn đáp án đúng hoặc gõ từ còn thiếu trong câu ví dụ thật.
        </GuideRow>
        <GuideRow icon={Headphones} tone="bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300" title="Nghe">
          Nghe phát âm rồi gõ lại từ — luyện tai và chính tả cùng lúc.
        </GuideRow>
        <GuideRow icon={Gamepad2} tone="bg-amber-100 dark:bg-amber-500/15 text-amber-600 dark:text-amber-300" title="Battle Game">
          Đấu từ vựng trực tiếp với 1–3 bạn bè qua mã phòng.
        </GuideRow>
      </div>
    ),
  },
  {
    icon: Brain,
    title: '3. Ôn tập hoạt động thế nào?',
    subtitle:
      'Tab Ôn tập dùng thuật toán lặp lại ngắt quãng (SM-2): bạn ôn một từ ngay trước khi sắp quên nó.',
    body: (
      <div className="space-y-3.5">
        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Lật thẻ rồi tự chấm 0 – 5
          </p>
          <div className="grid grid-cols-6 gap-1">
            {RATING_SCALE.map((r) => (
              <div key={r.score} className={`rounded-xl py-1.5 text-center ${r.tone}`}>
                <div className="text-sm font-black leading-none">{r.score}</div>
                <div className="text-[8.5px] font-semibold mt-1 leading-tight">{r.label}</div>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-1.5 text-[10.5px] font-semibold leading-snug">
            <div className="rounded-xl px-2.5 py-1.5 bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-300">
              Dưới 3: từ quay lại từ đầu, ôn lại sau 1 ngày
            </div>
            <div className="rounded-xl px-2.5 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 text-emerald-700 dark:text-emerald-300">
              Từ 3 trở lên: khoảng cách giãn dần
            </div>
          </div>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Lịch ôn khi bạn nhớ tốt
          </p>
          <div className="flex items-center justify-between gap-1 px-1">
            {['1 ngày', '6 ngày', '~2 tuần', '~1 tháng+'].map((gap, idx, arr) => (
              <React.Fragment key={gap}>
                <span className="text-[11px] font-extrabold text-blue-700 dark:text-blue-300 bg-blue-50 dark:bg-blue-500/10 rounded-full px-2 py-0.5 whitespace-nowrap">
                  {gap}
                </span>
                {idx < arr.length - 1 && <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />}
              </React.Fragment>
            ))}
          </div>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed px-1">
            Chấm càng cao, lần ôn sau càng xa. Hãy chấm thật lòng — chấm sai chỉ khiến bạn quên nhanh hơn.
          </p>
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
            Trạng thái của một từ
          </p>
          <div className="flex items-center justify-between gap-1">
            {STATE_STEPS.map((s, idx) => (
              <React.Fragment key={s.label}>
                <span className={`text-[10.5px] font-extrabold px-2 py-0.5 rounded-full border-2 whitespace-nowrap ${s.tone}`}>
                  {s.label}
                </span>
                {idx < STATE_STEPS.length - 1 && <ArrowRight className="w-3 h-3 text-slate-400 flex-shrink-0" />}
              </React.Fragment>
            ))}
          </div>
          <p className="text-[10.5px] text-slate-500 dark:text-slate-400 leading-relaxed px-1">
            Khi khoảng cách ôn đạt từ 21 ngày trở lên, từ được tính là <b>Thành thạo</b>.
          </p>
        </div>
      </div>
    ),
  },
  {
    icon: Bell,
    title: '4. Nhắc nhở & tiến độ',
    subtitle: 'Bạn không cần nhớ lịch ôn — app sẽ nhắc khi có từ đến hạn.',
    body: (
      <div className="space-y-2.5">
        <GuideRow icon={Bell} tone="bg-rose-100 dark:bg-rose-500/15 text-rose-600 dark:text-rose-300" title="Bật thông báo">
          Vào Cài đặt (biểu tượng bánh răng) → bật thông báo và chọn tần suất nhắc. Trong app sẽ hiện thẻ nhắc khi có từ cần ôn.
        </GuideRow>
        <GuideRow icon={Flame} tone="bg-orange-100 dark:bg-orange-500/15 text-orange-600 dark:text-orange-300" title="Chuỗi ngày & XP">
          Học mỗi ngày để giữ streak. +5 XP mỗi câu đúng, +10 XP khi xong một phiên, lên cấp mỗi 300 XP.
        </GuideRow>
        <GuideRow icon={BarChart3} tone="bg-blue-100 dark:bg-blue-500/15 text-blue-600 dark:text-blue-300" title="Thống kê & đua top">
          Xem số từ đã học, đang ôn, đã thành thạo và hoạt động 7 ngày gần nhất. Bảng xếp hạng Top 10 tính điểm theo tháng và làm mới vào đầu mỗi tháng — học đều để giữ chỗ trên bảng!
        </GuideRow>
        <GuideRow icon={User} tone="bg-emerald-100 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-300" title="Cá nhân → Kho từ">
          Tìm, sửa nghĩa, xoá từ và xuất toàn bộ kho từ ra Excel.
        </GuideRow>
      </div>
    ),
  },
  {
    icon: Rocket,
    title: 'Sẵn sàng rồi!',
    subtitle: 'Hãy bắt đầu bằng việc thêm vài từ bạn đang muốn học.',
    body: (
      <div className="space-y-2.5">
        <div className="rounded-2xl p-4 bg-blue-50 dark:bg-blue-950/40 border-2 border-blue-200 dark:border-slate-700 text-xs text-slate-600 dark:text-slate-300 leading-relaxed space-y-1.5">
          <p>💡 Mẹo: thêm khoảng <b>5–10 từ</b> rồi học bằng Flashcards trước.</p>
          <p>📅 Sau đó mỗi ngày mở tab <b>Ôn tập</b> và ôn hết các từ đến hạn.</p>
          <p>⚙️ Bạn có thể xem lại hướng dẫn này bất cứ lúc nào trong <b>Cài đặt</b>.</p>
        </div>
      </div>
    ),
  },
];

/**
 * The in-app tour shown once after sign-up, and again on demand from settings.
 * It explains the core loop — add, practise, review on schedule, get reminded —
 * and, at length, how the SRS rating decides when a word comes back.
 *
 * Steps by the arrows, ←/→, a swipe or the dots; Esc and the X close it.
 */
export const AppGuideModal: React.FC<AppGuideModalProps> = ({ onClose, onAddFirstWord }) => {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const touchStartX = useRef<number | null>(null);

  const isLast = index === SLIDES.length - 1;
  const slide = SLIDES[index];
  const Icon = slide.icon;

  const goTo = useCallback(
    (next: number) => {
      const clamped = Math.max(0, Math.min(SLIDES.length - 1, next));
      if (clamped === index) return;
      setDirection(clamped > index ? 1 : -1);
      setIndex(clamped);
    },
    [index]
  );

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goTo(index + 1);
      else if (e.key === 'ArrowLeft') goTo(index - 1);
      else if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [goTo, index, onClose]);

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX.current === null) return;
    const deltaX = e.changedTouches[0].clientX - touchStartX.current;
    touchStartX.current = null;
    if (Math.abs(deltaX) < SWIPE_THRESHOLD_PX) return;
    goTo(deltaX < 0 ? index + 1 : index - 1);
  };

  return (
    <ModalPortal>
      <div className="fixed inset-0 z-50 bg-slate-950/70 flex items-center justify-center p-4">
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Hướng dẫn sử dụng"
          className="w-full max-w-md sm:max-w-lg bg-white dark:bg-slate-800 rounded-[32px] shadow-clay-xl border-clay border-blue-200 dark:border-slate-700 animate-scaleUp max-h-[90dvh] flex flex-col overflow-hidden"
        >
          {/* Header: progress + close */}
          <div className="flex items-center justify-between px-6 pt-5 md:px-8">
            <span className="text-[11px] font-extrabold text-slate-400 uppercase tracking-wider">
              Hướng dẫn · {index + 1}/{SLIDES.length}
            </span>
            <button
              onClick={onClose}
              aria-label="Đóng hướng dẫn"
              className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-500"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Slide */}
          <div
            className="flex-1 min-h-0 overflow-y-auto overscroll-contain overflow-x-hidden px-6 pb-2 pt-3 md:px-8"
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}
          >
            <AnimatePresence mode="wait" custom={direction} initial={false}>
              <motion.div
                key={index}
                custom={direction}
                variants={slideMotion}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="space-y-4"
              >
                <div className="text-center space-y-2">
                  <div className="w-14 h-14 mx-auto rounded-2xl bg-blue-600 border-clay border-blue-400 flex items-center justify-center text-white shadow-clay-glow">
                    <Icon className="w-7 h-7" />
                  </div>
                  <h3 className="text-xl font-extrabold text-slate-900 dark:text-slate-100">
                    {slide.title}
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    {slide.subtitle}
                  </p>
                </div>
                {slide.body}
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Footer: dots + navigation */}
          <div className="px-6 pb-6 pt-3 md:px-8 space-y-3 border-t-2 border-blue-50 dark:border-slate-700/60">
            <div className="flex justify-center gap-2">
              {SLIDES.map((s, idx) => (
                <button
                  key={s.title}
                  onClick={() => goTo(idx)}
                  aria-label={`Trang ${idx + 1}`}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === index ? 'w-8 bg-blue-600 dark:bg-blue-400' : 'w-2 bg-slate-300 dark:bg-slate-700'
                  }`}
                />
              ))}
            </div>

            {isLast ? (
              <div className="space-y-2">
                <button
                  onClick={onAddFirstWord}
                  className="w-full py-3.5 rounded-button bg-blue-600 hover:bg-blue-700 border-clay border-blue-400 active:shadow-clay-inset active:scale-[0.97] text-white font-semibold text-sm shadow-clay flex items-center justify-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>Thêm từ đầu tiên</span>
                </button>
                <button
                  onClick={onClose}
                  className="w-full py-2 text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                >
                  Để sau, tôi tự khám phá
                </button>
              </div>
            ) : (
              <div className="flex gap-2">
                {index > 0 ? (
                  <button
                    onClick={() => goTo(index - 1)}
                    aria-label="Trang trước"
                    className="px-4 py-3.5 rounded-button bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border-2 border-blue-100 dark:border-slate-700 transition-all"
                  >
                    <ArrowLeft className="w-4 h-4" />
                  </button>
                ) : (
                  <button
                    onClick={onClose}
                    className="px-4 py-3.5 rounded-button text-xs font-semibold text-slate-500 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
                  >
                    Bỏ qua
                  </button>
                )}
                <button
                  onClick={() => goTo(index + 1)}
                  className="flex-1 py-3.5 rounded-button bg-blue-600 hover:bg-blue-700 border-clay border-blue-400 active:shadow-clay-inset active:scale-[0.97] text-white font-semibold text-sm shadow-clay flex items-center justify-center gap-2 transition-all"
                >
                  <span>Tiếp tục</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </ModalPortal>
  );
};
