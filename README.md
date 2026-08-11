# 📚 Memorize - Ứng dụng Học & Ôn tập Từ vựng Tiếng Anh Thông Minh

**Memorize** là ứng dụng web học từ vựng tiếng Anh giao diện Mobile-first, tích hợp phương pháp lặp lại ngắt quãng (**Spaced Repetition System - SRS**) cùng các chế độ luyện tập đa dạng và tính năng gamification giúp việc ghi nhớ từ vựng trở nên hiệu quả và thú vị hơn.

---

## ✨ Tính năng nổi bật

- 🎴 **Đa dạng chế độ luyện tập**:
  - **Flashcards**: Lật thẻ từ vựng kết hợp âm thanh phát âm và đánh giá mức độ ghi nhớ.
  - **Trắc nghiệm (Multiple Choice)**: Lựa chọn đáp án đúng trong thời gian ngắn.
  - **Điền từ (Fill in the Blank)**: Hoàn thành câu mẫu với từ thích hợp.
  - **Gõ từ (Type Word)**: Kiểm tra chính tả và trí nhớ bằng cách gõ chính xác từ vựng.
- 🧠 **Thuật toán SRS (Spaced Repetition System)**: Tự động sắp xếp lịch ôn tập từ vựng dựa trên mức độ thuộc của bạn.
- ➕ **Thêm từ vựng tùy chỉnh**: Cho phép người dùng tự thêm từ vựng mới vào bộ sưu tập cá nhân.
- 🎮 **Gamification & Tiến độ**:
  - Hệ thống điểm kinh nghiệm (XP), Cấp độ (Level) và Chuỗi ngày học (Streak).
  - Mục tiêu hàng ngày (Daily Goal) & Hệ thống Danh hiệu / Thành tích (Achievements).
- 📊 **Thống kê chi tiết**: Xem lịch sử luyện tập, tỷ lệ chính xác và tiến độ học tập.
- 🌙 **Giao diện hiện đại & Dark Mode**: Thiết kế tối ưu cho thiết bị di động, hỗ trợ chế độ Sáng/Tối và hiệu ứng âm thanh sống động.

---

## 🛠️ Công nghệ sử dụng

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animation**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Effects**: `canvas-confetti` (Hiệu ứng ăn mừng khi hoàn thành bài tập)

---

## 🚀 Hướng dẫn cài đặt và chạy ứng dụng

### Yêu cầu hệ thống
- **Node.js**: `v18.x` trở lên
- **npm** hoặc **yarn** / **pnpm** / **bun**

### 1. Clone kho lưu trữ
```bash
git clone https://github.com/hapham96/Memorize.git
cd Memorize
```

### 2. Cài đặt các gói phụ thuộc (Dependencies)
```bash
npm install
```

### 3. Chạy môi trường phát triển (Development Mode)
```bash
npm run dev
```
Sau đó mở trình duyệt và truy cập: [http://localhost:3000](http://localhost:3000)

### 4. Build ứng dụng cho Production
```bash
# Đóng gói sản phẩm
npm run build

# Chạy bản production đã build
npm run start
```

---

## 📂 Cấu trúc thư mục dự án

```text
Memorize/
├── src/
│   ├── app/                # Next.js App Router (Layout, Page, Globals CSS)
│   ├── components/         # Các UI components
│   │   ├── auth/           # Màn hình Onboarding & Đăng nhập
│   │   ├── dashboard/      # Màn hình chính & Modal thêm từ vựng
│   │   ├── layout/         # Header, BottomNav, MobileContainer
│   │   ├── profile/        # Trang cá nhân & Cài đặt
│   │   ├── quiz/           # Các màn hình Quiz (Flashcard, Multiple Choice, v.v.)
│   │   ├── review/         # Màn hình Ôn tập SRS
│   │   └── stats/          # Màn hình Thống kê
│   ├── data/               # Dữ liệu mẫu (Từ vựng, Thành tích)
│   ├── lib/                # Tiện ích (SRS, Audio, LocalStorage)
│   └── types/              # Định nghĩa kiểu dữ liệu TypeScript
├── public/                 # Các tài nguyên tĩnh (Images, Audio, v.v.)
├── package.json
└── README.md
```

---

## 📝 Giấy phép (License)

Dự án được phát triển cho mục đích học tập và cá nhân.
