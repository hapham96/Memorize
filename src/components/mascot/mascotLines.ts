import { useState } from 'react';

/**
 * Memori's speech-bubble lines, hand-written per moment. Each mount picks one
 * at random so a screen the user sees daily doesn't always say the same thing.
 * `{n}` is replaced with the count the caller passes.
 */
export const MASCOT_LINES = {
  greetMorning: ['Chào buổi sáng! ☀️', 'Sáng nay học vài từ nhé! 🌤️', 'Dậy sớm học bài, giỏi quá! 🌅'],
  greetAfternoon: ['Chào buổi chiều! 🌿', 'Nghỉ trưa xong rồi, học tiếp nào! 📖', 'Chiều nay ôn chút nhé! ✨'],
  greetEvening: ['Chào buổi tối! 🌙', 'Tối nay ôn vài từ trước khi nghỉ nhé! 📚', 'Học một chút rồi thư giãn nha! 🌆'],
  greetNight: ['Khuya rồi đó, học nhẹ thôi nhé! 🌌', 'Ôn vài từ rồi đi ngủ nha! 😴', 'Cú đêm à? Memo thức cùng bạn! 🦉'],
  authLogin: ['Memo nhớ bạn ghé học! 👋', 'Chào mừng bạn quay lại! 🐘', 'Lâu quá không gặp! ✨'],
  authRegister: ['Memo chào bạn mới! ✨', 'Cùng học từ vựng nào! 🎓', 'Voi con không bao giờ quên! 🐘'],
  dueReview: ['Có {n} từ đang chờ bạn ôn! 📚', '{n} từ sắp quên rồi, ôn ngay nhé! ⏰', 'Đến giờ ôn {n} từ rồi! 🔔'],
  goalDone: ['Đạt mục tiêu rồi! 🏆', 'Hôm nay xuất sắc quá! 🎉', 'Mục tiêu hôm nay: xong! ✅'],
  streakAtRisk: ['Chuỗi {n} ngày sắp mất rồi! 😰', 'Học 1 từ để giữ chuỗi {n} ngày nhé! 🔥', 'Đừng để mất chuỗi {n} ngày nha! 🥺'],
  correct: ['Chính xác! 🎉', 'Giỏi quá! ⭐', 'Đúng rồi! 👏', 'Tuyệt vời! ✨'],
  wrong: ['Không sao, lần sau sẽ nhớ! 💪', 'Suýt đúng rồi! 🤏', 'Memo sẽ nhắc lại từ này! 🔁'],
  resultHigh: ['Xuất sắc quá bạn ơi! 🏆', 'Trí nhớ siêu voi! 🐘', 'Đỉnh thật sự! 🎉'],
  resultLow: ['Cố gắng lên nhé! ⭐', 'Mỗi lần sai là một lần nhớ lâu hơn! 💪', 'Ôn lại rồi mình làm tiếp nha! 📖'],
  emptyLibrary: ['Chưa có từ nào, thêm từ đầu tiên nhé! ✏️', 'Memo đang chờ từ mới đó! 💤'],
  allReviewed: ['Đã ôn hết rồi! 🎉', 'Hết bài rồi, Memo đi ngủ đây! 💤', 'Xong hết rồi, nghỉ ngơi thôi! 😌'],
  loading: ['Đang lật sách… 📖', 'Chờ Memo một chút nhé! ⏳', 'Đang chuẩn bị bài… ✨'],
  battleWin: ['Chiến thắng! 🏆', 'Bạn là nhà vô địch! 🥇', 'Trí nhớ siêu voi! 🐘'],
  battleLoss: ['Trận sau mình thắng! 💪', 'Thua keo này ta bày keo khác! 🔁', 'Ôn thêm rồi phục thù nhé! 📚'],
} as const;

export type MascotMoment = keyof typeof MASCOT_LINES;

export function pickMascotLine(moment: MascotMoment, n?: number): string {
  const lines = MASCOT_LINES[moment];
  const line = lines[Math.floor(Math.random() * lines.length)];
  return n === undefined ? line : line.replace('{n}', String(n));
}

/**
 * A line that stays put across re-renders and only re-rolls when the moment
 * changes — a bubble that changed text on every parent render would flicker.
 */
export function useMascotLine(moment: MascotMoment, n?: number): string {
  const [picked, setPicked] = useState(() => ({ moment, index: Math.random() }));
  if (picked.moment !== moment) setPicked({ moment, index: Math.random() });

  const lines = MASCOT_LINES[moment];
  const line = lines[Math.floor(picked.index * lines.length)];
  return n === undefined ? line : line.replace('{n}', String(n));
}

/** The time-of-day greeting moment for the local clock. */
export function greetingMoment(date = new Date()): MascotMoment {
  const hour = date.getHours();
  if (hour >= 5 && hour < 12) return 'greetMorning';
  if (hour >= 12 && hour < 18) return 'greetAfternoon';
  if (hour >= 18 && hour < 23) return 'greetEvening';
  return 'greetNight';
}
