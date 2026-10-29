import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  Brain,
  FileSpreadsheet,
  Flame,
  Layers,
  Swords,
  Volume2,
} from 'lucide-react';
import { SignedInRedirect } from '@/components/landing/SignedInRedirect';
import { APP_PATH, SITE_DESCRIPTION, SITE_NAME, SITE_URL } from '@/lib/site';

// The public, server-rendered face of the site — the one page search engines
// index. The app itself lives at `/app` behind sign-in (see app/app/layout.tsx).

const FEATURES = [
  {
    icon: Brain,
    title: 'Lặp lại ngắt quãng (SRS)',
    body: 'Thuật toán SuperMemo SM-2 tính đúng thời điểm bạn sắp quên một từ và nhắc ôn lại ngay lúc đó — ôn ít hơn, nhớ lâu hơn.',
  },
  {
    icon: Layers,
    title: 'Flashcard & 5 dạng bài tập',
    body: 'Flashcard lật, trắc nghiệm, điền từ vào chỗ trống, gõ lại từ và nghe chép — mỗi từ được luyện theo nhiều cách khác nhau.',
  },
  {
    icon: Volume2,
    title: 'Phiên âm IPA & phát âm',
    body: 'Mỗi từ có phiên âm IPA, loại từ, nghĩa và câu ví dụ, kèm phát âm để bạn học đúng ngay từ đầu.',
  },
  {
    icon: FileSpreadsheet,
    title: 'Bộ từ của riêng bạn',
    body: 'Thêm từ chỉ với vài ký tự nhờ gợi ý tự động, hoặc nhập cả danh sách từ file Excel / CSV và xuất lại bất cứ lúc nào.',
  },
  {
    icon: Swords,
    title: 'Đấu từ vựng cùng bạn bè',
    body: 'Tạo phòng Battle, gửi mã mời và thi xem ai nhớ từ nhanh hơn — học mà như chơi.',
  },
  {
    icon: BellRing,
    title: 'Nhắc ôn tập đúng lúc',
    body: 'Thông báo khi có từ đến hạn ôn, cùng chuỗi ngày học (streak), XP và thống kê tiến độ theo tuần.',
  },
];

const STEPS = [
  { title: 'Thêm từ cần học', body: 'Gõ từ mới, chọn từ gợi ý hoặc nhập cả bộ từ file Excel.' },
  { title: 'Học qua flashcard & quiz', body: 'Tự đánh giá mức độ nhớ sau mỗi từ — dễ, vừa hay khó.' },
  { title: 'Ôn đúng hạn, nhớ lâu', body: 'Hệ thống tự xếp lịch ôn: từ khó gặp lại sớm, từ đã thuộc giãn dần đến hàng tháng.' },
];

const FAQ = [
  {
    q: 'Lặp lại ngắt quãng (spaced repetition) là gì?',
    a: 'Là phương pháp ôn tập theo các khoảng thời gian tăng dần — ngay trước thời điểm bạn sắp quên. Mỗi lần nhớ lại thành công, khoảng cách đến lần ôn tiếp theo được kéo dài, nhờ vậy từ vựng chuyển dần vào trí nhớ dài hạn với ít thời gian ôn nhất.',
  },
  {
    q: 'Memorize khác gì so với học từ vựng bằng sổ tay?',
    a: 'Thay vì đọc lại cả cuốn sổ, Memorize chỉ đưa ra những từ thực sự đến hạn ôn và luyện chúng qua nhiều dạng bài: flashcard, trắc nghiệm, điền từ, gõ từ và nghe. Tiến độ của từng từ được theo dõi tự động.',
  },
  {
    q: 'Mỗi ngày nên học bao lâu?',
    a: 'Chỉ khoảng 5–15 phút. Điều quan trọng là học đều đặn mỗi ngày để giữ chuỗi streak và ôn đúng các từ đến hạn.',
  },
  {
    q: 'Tôi có thể học từ vựng IELTS, TOEIC hay từ vựng chuyên ngành không?',
    a: 'Có. Bạn tự xây bộ từ của mình — gõ từng từ hoặc nhập cả danh sách từ file Excel / CSV — nên có thể học bất kỳ chủ đề nào: IELTS, TOEIC, giao tiếp hay chuyên ngành.',
  },
  {
    q: 'Có dùng được trên điện thoại không?',
    a: 'Có. Memorize chạy ngay trên trình duyệt điện thoại và máy tính, và có thể cài lên màn hình chính như một ứng dụng.',
  },
];

// Structured data: what the site is, plus the FAQ above, so Google can show
// rich results. Kept in sync with the visible FAQ — Google penalises markup
// that does not match the page.
const JSON_LD = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'WebApplication',
      name: SITE_NAME,
      url: SITE_URL,
      description: SITE_DESCRIPTION,
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web, iOS, Android',
      inLanguage: 'vi',
    },
    {
      '@type': 'FAQPage',
      mainEntity: FAQ.map(({ q, a }) => ({
        '@type': 'Question',
        name: q,
        acceptedAnswer: { '@type': 'Answer', text: a },
      })),
    },
  ],
};

function CtaButton({ children }: { children: React.ReactNode }) {
  return (
    <Link
      href={APP_PATH}
      className="clay-btn inline-flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-display font-bold text-lg px-6 py-3"
    >
      {children}
      <ArrowRight className="w-5 h-5" aria-hidden />
    </Link>
  );
}

export default function LandingPage() {
  return (
    <>
      <SignedInRedirect />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }}
      />

      <header className="max-w-5xl mx-auto px-4 py-5 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white font-display font-bold">
            M
          </span>
          <span className="font-display font-bold text-xl text-slate-900">{SITE_NAME}</span>
        </Link>
        <Link
          href={APP_PATH}
          className="text-sm font-semibold text-blue-600 hover:text-blue-700 px-3 py-2"
        >
          Đăng nhập
        </Link>
      </header>

      <main className="max-w-5xl mx-auto px-4 pb-16">
        {/* Hero */}
        <section className="py-12 md:py-20 text-center">
          <p className="inline-flex items-center gap-1.5 clay-pill bg-clay-butter/60 text-slate-900 text-sm font-semibold px-3 py-1 mb-5">
            <Flame className="w-4 h-4 text-clay-cta" aria-hidden />
            Chỉ 5 phút mỗi ngày
          </p>
          <h1 className="font-display font-extrabold text-4xl md:text-6xl leading-tight text-slate-900 mb-5">
            Học từ vựng tiếng Anh
            <br className="hidden sm:block" /> <span className="text-blue-600">nhớ lâu, không học vẹt</span>
          </h1>
          <p className="max-w-2xl mx-auto text-lg text-slate-600 mb-8">
            Memorize kết hợp flashcard, quiz và phương pháp <strong>lặp lại ngắt quãng (SRS)</strong> để
            nhắc bạn ôn đúng từ, đúng lúc — trước khi bạn kịp quên.
          </p>
          <CtaButton>Bắt đầu học ngay</CtaButton>
        </section>

        {/* Features */}
        <section aria-labelledby="features-heading" className="py-10">
          <h2 id="features-heading" className="font-display font-bold text-3xl text-center text-slate-900 mb-8">
            Mọi thứ bạn cần để làm chủ từ vựng
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {FEATURES.map(({ icon: Icon, title, body }) => (
              <article key={title} className="clay-card p-6">
                <div className="w-11 h-11 rounded-xl bg-clay-lilac flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-blue-600" aria-hidden />
                </div>
                <h3 className="font-display font-bold text-xl text-slate-900 mb-2">{title}</h3>
                <p className="text-slate-600">{body}</p>
              </article>
            ))}
          </div>
        </section>

        {/* How it works */}
        <section aria-labelledby="steps-heading" className="py-10">
          <h2 id="steps-heading" className="font-display font-bold text-3xl text-center text-slate-900 mb-8">
            Học từ vựng với Memorize như thế nào?
          </h2>
          <ol className="grid gap-4 md:grid-cols-3">
            {STEPS.map(({ title, body }, i) => (
              <li key={title} className="clay-card p-6">
                <span className="font-display font-extrabold text-3xl text-blue-600">{i + 1}</span>
                <h3 className="font-display font-bold text-xl text-slate-900 mt-1 mb-2">{title}</h3>
                <p className="text-slate-600">{body}</p>
              </li>
            ))}
          </ol>
        </section>

        {/* FAQ — mirrored in JSON_LD */}
        <section aria-labelledby="faq-heading" className="py-10 max-w-3xl mx-auto">
          <h2 id="faq-heading" className="font-display font-bold text-3xl text-center text-slate-900 mb-8">
            Câu hỏi thường gặp
          </h2>
          <div className="space-y-3">
            {FAQ.map(({ q, a }) => (
              <details key={q} className="clay-card p-5 group">
                <summary className="font-display font-bold text-lg text-slate-900 cursor-pointer list-none flex justify-between gap-4">
                  {q}
                  <span className="text-blue-600 transition-transform group-open:rotate-45" aria-hidden>
                    +
                  </span>
                </summary>
                <p className="text-slate-600 mt-3">{a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Closing CTA */}
        <section className="py-12 text-center">
          <h2 className="font-display font-bold text-3xl text-slate-900 mb-4">
            Sẵn sàng nhớ từ vựng lâu hơn?
          </h2>
          <p className="text-slate-600 mb-6">Tạo tài khoản và thêm những từ đầu tiên chỉ trong một phút.</p>
          <CtaButton>Tạo tài khoản</CtaButton>
        </section>
      </main>

      <footer className="border-t border-slate-200 py-6 text-center text-sm text-slate-500">
        © {new Date().getFullYear()} {SITE_NAME} — Học từ vựng tiếng Anh với lặp lại ngắt quãng
      </footer>
    </>
  );
}
