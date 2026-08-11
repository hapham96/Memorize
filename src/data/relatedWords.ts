import { Word, LevelDifficulty, WordCategory } from '@/types';

export interface SuggestedWordDetails {
  word: string;
  ipa: string;
  pos: string;
  vietnamese: string;
  example: string;
  translation: string;
  level: LevelDifficulty;
  category: WordCategory;
}

// Semantic Dictionary & Lookup Database for Smart Suggestions
export const SMART_WORDS_DATABASE: Record<string, SuggestedWordDetails> = {
  // Occupations & Professions
  doctor: {
    word: 'doctor',
    ipa: '/ˈdɒk.tər/',
    pos: 'n.',
    vietnamese: 'bác sĩ',
    example: 'The doctor examined the patient carefully.',
    translation: 'Bác sĩ đã khám cho bệnh nhân một cách cẩn thận.',
    level: 'A1',
    category: 'Daily Life',
  },
  tailor: {
    word: 'tailor',
    ipa: '/ˈteɪ.lər/',
    pos: 'n.',
    vietnamese: 'thợ may',
    example: 'The tailor measured him for a custom suit.',
    translation: 'Người thợ may đã đo đạc để may cho anh ấy một bộ âu phục.',
    level: 'A2',
    category: 'Daily Life',
  },
  engineer: {
    word: 'engineer',
    ipa: '/ˌen.dʒɪˈnɪər/',
    pos: 'n.',
    vietnamese: 'kỹ sư',
    example: 'The software engineer developed a new application.',
    translation: 'Kỹ sư phần mềm đã phát triển một ứng dụng mới.',
    level: 'A2',
    category: 'Technology',
  },
  professor: {
    word: 'professor',
    ipa: '/prəˈfes.ər/',
    pos: 'n.',
    vietnamese: 'giáo sư, giảng viên đại học',
    example: 'The professor gave a lecture on artificial intelligence.',
    translation: 'Giáo sư đã có một bài giảng về trí tuệ nhân tạo.',
    level: 'B1',
    category: 'Academic',
  },
  student: {
    word: 'student',
    ipa: '/ˈstjuː.dənt/',
    pos: 'n.',
    vietnamese: 'học sinh, sinh viên',
    example: 'Every student in the class prepared a presentation.',
    translation: 'Mỗi sinh viên trong lớp đều chuẩn bị một bài thuyết trình.',
    level: 'A1',
    category: 'Daily Life',
  },
  nurse: {
    word: 'nurse',
    ipa: '/nɜːs/',
    pos: 'n.',
    vietnamese: 'y tá, điều dưỡng',
    example: 'The nurse checked my blood pressure.',
    translation: 'Y tá đã kiểm tra huyết áp của tôi.',
    level: 'A1',
    category: 'Daily Life',
  },
  lawyer: {
    word: 'lawyer',
    ipa: '/ˈlɔɪ.ər/',
    pos: 'n.',
    vietnamese: 'luật sư',
    example: 'She hired a lawyer to review the contract.',
    translation: 'Cô ấy đã thuê một luật sư để xem xét hợp đồng.',
    level: 'B1',
    category: 'Business',
  },
  architect: {
    word: 'architect',
    ipa: '/ˈɑː.kɪ.tekt/',
    pos: 'n.',
    vietnamese: 'kiến trúc sư',
    example: 'The architect designed a modern eco-friendly house.',
    translation: 'Kiến trúc sư đã thiết kế một ngôi nhà hiện đại thân thiện với môi trường.',
    level: 'B2',
    category: 'Business',
  },
  pharmacist: {
    word: 'pharmacist',
    ipa: '/ˈfɑː.mə.sɪst/',
    pos: 'n.',
    vietnamese: 'dược sĩ',
    example: 'The pharmacist explained how to take the medication.',
    translation: 'Dược sĩ đã giải thích cách dùng thuốc.',
    level: 'B1',
    category: 'Daily Life',
  },
  surgeon: {
    word: 'surgeon',
    ipa: '/ˈsɜː.dʒən/',
    pos: 'n.',
    vietnamese: 'bác sĩ phẫu thuật',
    example: 'The surgeon successfully performed the operation.',
    translation: 'Bác sĩ phẫu thuật đã thực hiện thành công ca mổ.',
    level: 'B2',
    category: 'Daily Life',
  },

  // Education & School
  teacher: {
    word: 'teacher',
    ipa: '/ˈtiː.tʃər/',
    pos: 'n.',
    vietnamese: 'giáo viên',
    example: 'Our English teacher explains grammar very clearly.',
    translation: 'Giáo viên tiếng Anh của chúng tôi giải thích ngữ pháp rất rõ ràng.',
    level: 'A1',
    category: 'Daily Life',
  },
  classroom: {
    word: 'classroom',
    ipa: '/ˈklɑːs.ruːm/',
    pos: 'n.',
    vietnamese: 'phòng học, lớp học',
    example: 'Students entered the classroom quietly.',
    translation: 'Các học sinh bước vào phòng học một cách trật tự.',
    level: 'A1',
    category: 'Daily Life',
  },
  curriculum: {
    word: 'curriculum',
    ipa: '/kəˈrɪk.jə.ləm/',
    pos: 'n.',
    vietnamese: 'chương trình giảng dạy',
    example: 'The university updated its computer science curriculum.',
    translation: 'Trường đại học đã cập nhật chương trình giảng dạy khoa học máy tính.',
    level: 'B2',
    category: 'Academic',
  },

  // Business & Corporate
  manager: {
    word: 'manager',
    ipa: '/ˈmæn.ɪ.dʒər/',
    pos: 'n.',
    vietnamese: 'quản lý, giám đốc',
    example: 'The project manager scheduled a team sync.',
    translation: 'Quản lý dự án đã lên lịch họp đội ngũ.',
    level: 'A2',
    category: 'Business',
  },
  negotiation: {
    word: 'negotiation',
    ipa: '/nəˌɡəʊ.ʃiˈeɪ.ʃən/',
    pos: 'n.',
    vietnamese: 'cuộc đàm phán',
    example: 'Contract negotiation took three business days.',
    translation: 'Cuộc đàm phán hợp đồng kéo dài 3 ngày làm việc.',
    level: 'B2',
    category: 'TOEIC',
  },
  invoice: {
    word: 'invoice',
    ipa: '/ˈɪn.vɔɪs/',
    pos: 'n.',
    vietnamese: 'hóa đơn thanh toán',
    example: 'Please send us the final invoice via email.',
    translation: 'Vui lòng gửi cho chúng tôi hóa đơn cuối cùng qua email.',
    level: 'B1',
    category: 'TOEIC',
  },

  // Technology & Computer
  software: {
    word: 'software',
    ipa: '/ˈsɒft.weər/',
    pos: 'n.',
    vietnamese: 'phần mềm',
    example: 'This software helps automate daily tasks.',
    translation: 'Phần mềm này giúp tự động hóa công việc hàng ngày.',
    level: 'A2',
    category: 'Technology',
  },
  algorithm: {
    word: 'algorithm',
    ipa: '/ˈæl.ɡə.rɪ.ðəm/',
    pos: 'n.',
    vietnamese: 'thuật toán',
    example: 'The search algorithm ranks pages by relevance.',
    translation: 'Thuật toán tìm kiếm xếp hạng các trang theo độ tương quan.',
    level: 'B2',
    category: 'Technology',
  },
  database: {
    word: 'database',
    ipa: '/ˈdeɪ.tə.beɪs/',
    pos: 'n.',
    vietnamese: 'cơ sở dữ liệu',
    example: 'User accounts are safely stored in the database.',
    translation: 'Tài khoản người dùng được lưu trữ an toàn trong cơ sở dữ liệu.',
    level: 'B1',
    category: 'Technology',
  },

  // Travel & Mobility
  passport: {
    word: 'passport',
    ipa: '/ˈpɑːs.pɔːt/',
    pos: 'n.',
    vietnamese: 'hộ chiếu',
    example: 'Don’t forget to bring your passport to the airport.',
    translation: 'Đừng quên mang theo hộ chiếu của bạn ra sân bay.',
    level: 'A1',
    category: 'Travel',
  },
  destination: {
    word: 'destination',
    ipa: '/ˌdes.tɪˈneɪ.ʃən/',
    pos: 'n.',
    vietnamese: 'điểm đến',
    example: 'Danang is a popular holiday destination.',
    translation: 'Đà Nẵng là một điểm đến nghỉ dưỡng phổ biến.',
    level: 'B1',
    category: 'Travel',
  },
};

// Semantic Clusters mapping key tokens or prefixes to related words
const SEMANTIC_CLUSTERS: Record<string, string[]> = {
  // Job / Profession Cluster
  teacher: ['doctor', 'tailor', 'engineer', 'professor', 'student', 'nurse', 'lawyer', 'architect', 'pharmacist'],
  teach: ['teacher', 'professor', 'classroom', 'student', 'curriculum', 'lecture'],
  doctor: ['nurse', 'surgeon', 'pharmacist', 'hospital', 'patient', 'tailor', 'teacher'],
  work: ['manager', 'engineer', 'lawyer', 'invoice', 'negotiation', 'office'],
  job: ['doctor', 'tailor', 'engineer', 'lawyer', 'architect', 'manager', 'teacher'],
  profession: ['doctor', 'tailor', 'lawyer', 'engineer', 'architect', 'surgeon', 'pharmacist'],

  // Education Cluster
  school: ['teacher', 'student', 'classroom', 'professor', 'curriculum'],
  learn: ['student', 'teacher', 'classroom', 'curriculum', 'professor'],
  study: ['student', 'curriculum', 'professor', 'classroom', 'library'],

  // Business / TOEIC Cluster
  business: ['manager', 'negotiation', 'invoice', 'contract', 'agenda', 'reimburse', 'merger'],
  office: ['manager', 'invoice', 'negotiation', 'agenda', 'software'],
  money: ['invoice', 'reimburse', 'salary', 'budget', 'payment'],

  // Tech Cluster
  tech: ['software', 'algorithm', 'database', 'engineer', 'code', 'data'],
  computer: ['software', 'database', 'algorithm', 'engineer'],
  code: ['software', 'algorithm', 'database', 'developer'],

  // Travel Cluster
  travel: ['passport', 'destination', 'itinerary', 'hotel', 'flight'],
  flight: ['passport', 'destination', 'itinerary', 'airport'],
};

export function getRelatedWordSuggestions(input: string): string[] {
  const query = input.trim().toLowerCase();
  if (!query) return ['doctor', 'tailor', 'engineer', 'professor', 'software', 'passport', 'manager'];

  // Check exact or partial semantic cluster lookup first
  const suggestionsSet = new Set<string>();

  for (const [key, relatedList] of Object.entries(SEMANTIC_CLUSTERS)) {
    if (query.includes(key) || key.includes(query)) {
      relatedList.forEach((w) => {
        if (w.toLowerCase() !== query) {
          suggestionsSet.add(w);
        }
      });
    }
  }

  // If input matches an item in SMART_WORDS_DATABASE (e.g. "teacher"), add occupation peers
  if (SMART_WORDS_DATABASE[query]) {
    const defaultPeers = ['doctor', 'tailor', 'engineer', 'professor', 'lawyer', 'architect', 'nurse'];
    defaultPeers.forEach((peer) => {
      if (peer !== query) suggestionsSet.add(peer);
    });
  }

  // Prefix matching across database keys
  Object.keys(SMART_WORDS_DATABASE).forEach((dbKey) => {
    if (dbKey.startsWith(query) && dbKey !== query) {
      suggestionsSet.add(dbKey);
    }
  });

  // Fallback default suggestions if empty
  if (suggestionsSet.size === 0) {
    const fallback = ['doctor', 'tailor', 'engineer', 'professor', 'nurse', 'architect', 'lawyer'];
    fallback.forEach((f) => suggestionsSet.add(f));
  }

  return Array.from(suggestionsSet).slice(0, 8);
}

export function getWordDetails(wordName: string): SuggestedWordDetails | null {
  const normalized = wordName.trim().toLowerCase();
  return SMART_WORDS_DATABASE[normalized] || null;
}
