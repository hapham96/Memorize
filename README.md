# 📚 Memorize - Smart English Vocabulary Learning & Review App

**Memorize** is a mobile-first web application designed for learning English vocabulary. Powered by the **Spaced Repetition System (SRS)** algorithm, it offers multiple interactive quiz modes and gamification features to make vocabulary retention effective, engaging, and fun.

---

## ✨ Key Features

- 🎴 **Diverse Practice Modes**:
  - **Flashcards**: Interactive card flipping with audio pronunciation and self-assessment ratings.
  - **Multiple Choice**: Speed quiz testing word definitions.
  - **Fill in the Blank**: Contextual sentence completion exercises.
  - **Type Word**: Spelling and recall challenges by typing target words.
- 🧠 **Spaced Repetition System (SRS)**: Smart algorithm that schedules word reviews based on your memory retention level.
- ➕ **Custom Vocabulary**: Easily add and study your own custom word lists.
- 🎮 **Gamification & Progress Tracking**:
  - Experience Points (XP), Levels, and Daily Streaks.
  - Daily Goals tracking.
- 📊 **Detailed Analytics**: Comprehensive view of quiz history, accuracy rates, and learning statistics.
- 🌙 **Modern UI & Dark Mode**: Mobile-first responsive UI with smooth Framer Motion animations, Dark/Light theme switching, and sound effects.

---

## 🛠️ Tech Stack

- **Framework**: [Next.js 14](https://nextjs.org/) (App Router)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Animations**: [Framer Motion](https://www.framer.com/motion/)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Effects**: `canvas-confetti` (Celebration effects on quiz completion)

---

## 🚀 Getting Started

### Prerequisites
- **Node.js**: `v18.x` or higher
- **npm**, **yarn**, **pnpm**, or **bun**

### 1. Clone the repository
```bash
git clone https://github.com/hapham96/Memorize.git
cd Memorize
```

### 2. Install dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```
Open your browser and navigate to: [http://localhost:3000](http://localhost:3000)

### 4. Build for Production
```bash
# Build production bundle
npm run build

# Start production server
npm run start
```

---

## 📂 Project Structure

```text
Memorize/
├── src/
│   ├── app/                # Next.js App Router (Layouts, Pages, Global CSS)
│   ├── components/         # UI Components
│   │   ├── auth/           # Onboarding & Auth screens
│   │   ├── dashboard/      # Main Dashboard & Add Word modal
│   │   ├── layout/         # Header, BottomNav, MobileContainer
│   │   ├── profile/        # User Profile & Settings modal
│   │   ├── quiz/           # Quiz screens (Flashcard, Multiple Choice, etc.)
│   │   ├── review/         # SRS Review Dashboard
│   │   └── stats/          # Statistics & Progress dashboards
│   ├── data/               # Local fallback datasets (related words, definitions)
│   ├── lib/                # Utilities (SRS, Audio FX, LocalStorage persistence)
│   └── types/              # TypeScript Type Definitions
├── public/                 # Static Assets (Images, Audio)
├── package.json
└── README.md
```

---

## 📝 License

This project is open-source and available for educational and personal use.
