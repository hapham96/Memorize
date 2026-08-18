import { CEFRLevel } from '@/types';

export interface CEFRLevelInfo {
  id: CEFRLevel;
  /** English tier name, exactly as the CEFR scale labels it. */
  tier: string;
  /** Vietnamese tier name, shown as the primary label. */
  name: string;
  /** What a learner at this level can do — Vietnamese, one line. */
  description: string;
  emoji: string;
}

/**
 * The six CEFR bands, ordered A1 → C2. This is the learner's own proficiency,
 * a separate concept from a word's `LevelDifficulty` (which the backend caps at
 * C1) — a C2 user still studies A2 words.
 */
export const CEFR_LEVELS: CEFRLevelInfo[] = [
  {
    id: 'A1',
    tier: 'Beginner',
    name: 'Mới bắt đầu',
    description:
      'Hiểu những câu giao tiếp cơ bản hằng ngày và có thể tự giới thiệu về bản thân.',
    emoji: '🌱',
  },
  {
    id: 'A2',
    tier: 'Elementary',
    name: 'Sơ cấp',
    description:
      'Giao tiếp được trong các tình huống đơn giản, quen thuộc và hiểu các cách diễn đạt thường gặp.',
    emoji: '🍀',
  },
  {
    id: 'B1',
    tier: 'Intermediate',
    name: 'Trung cấp',
    description:
      'Xử lý được phần lớn tình huống khi đi lại, nói về chủ đề quen thuộc, quan điểm và trải nghiệm.',
    emoji: '🌤️',
  },
  {
    id: 'B2',
    tier: 'Upper-Intermediate',
    name: 'Trung cấp trên',
    description:
      'Nói khá tự nhiên và trao đổi với người bản xứ mà không thấy căng thẳng.',
    emoji: '🚀',
  },
  {
    id: 'C1',
    tier: 'Advanced',
    name: 'Cao cấp',
    description:
      'Diễn đạt ý tưởng lưu loát, linh hoạt cho mục đích xã hội, học thuật hoặc công việc phức tạp.',
    emoji: '🎯',
  },
  {
    id: 'C2',
    tier: 'Proficient',
    name: 'Thành thạo',
    description:
      'Hiểu gần như mọi thứ một cách dễ dàng, xử lý được văn bản trừu tượng, nhiều sắc thái.',
    emoji: '👑',
  },
];

/** Returns null for an account that has not picked a level yet. */
export function cefrLevelInfo(level: CEFRLevel | null | undefined): CEFRLevelInfo | null {
  if (!level) return null;
  return CEFR_LEVELS.find((entry) => entry.id === level) ?? null;
}
