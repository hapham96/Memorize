import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        apple: {
          blue: '#2563EB',
          green: '#34D399',
          accent: '#60A5FA',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          bgLight: '#F8FAFC',
          cardLight: '#FFFFFF',
          textPrimary: '#111827',
          textSecondary: '#6B7280',
          bgDark: '#0F172A',
          cardDark: '#1E293B',
          darkBorder: '#334155',
          lightBorder: '#E2E8F0',
        },
      },
      borderRadius: {
        'card': '24px',
        'button': '18px',
        'input': '16px',
        'nav': '28px',
      },
      boxShadow: {
        'apple-soft': '0 10px 30px -5px rgba(0, 0, 0, 0.05)',
        'apple-card': '0 14px 34px 0 rgba(0, 0, 0, 0.06)',
        'apple-glow': '0 0 20px rgba(37, 99, 235, 0.25)',
      },
      fontFamily: {
        sans: ['-apple-system', 'BlinkMacSystemFont', 'SF Pro Display', 'Inter', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
