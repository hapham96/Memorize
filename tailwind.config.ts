import type { Config } from 'tailwindcss';

/**
 * Modern Sleek / Glass theme (Apple & Linear inspired).
 *
 * Clean geometric lines, subtle 1px borders, ambient layered shadows,
 * glassmorphism surfaces, and modern typography (Plus Jakarta Sans).
 */
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
        // Modern refined slate neutrals
        slate: {
          50: '#F8FAFC',
          100: '#F1F5F9',
          200: '#E2E8F0',
          300: '#CBD5E1',
          400: 'rgb(var(--slate-400) / <alpha-value>)',
          500: '#64748B',
          600: '#475569',
          700: '#334155',
          800: '#1E293B',
          900: '#0F172A',
          950: '#0B0F19',
        },
        // Modern energetic indigo/violet primary ramp
        blue: {
          50: '#EEF2FF',
          100: '#E0E7FF',
          200: '#C7D2FE',
          300: '#A5B4FC',
          400: '#818CF8',
          500: '#6366F1',
          600: '#4F46E5',
          700: '#4338CA',
          800: '#3730A3',
          900: '#312E81',
          950: '#1E1B4B',
        },
        // Modern soft pastel tints for badges & highlights
        clay: {
          peach: '#FFE4E6',
          sky: '#E0F2FE',
          mint: '#DCFCE7',
          lilac: '#EDE9FE',
          butter: '#FEF9C3',
          cta: '#4F46E5',
        },
        apple: {
          blue: '#4F46E5',
          green: '#10B981',
          accent: '#6366F1',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          bgLight: '#F8FAFC',
          cardLight: '#FFFFFF',
          textPrimary: '#0F172A',
          textSecondary: '#64748B',
          bgDark: '#0B0F19',
          cardDark: '#131B2E',
          darkBorder: '#1E293B',
          lightBorder: '#E2E8F0',
        },
      },
      // Modern refined radii (12-24px band)
      borderRadius: {
        lg: '12px',
        xl: '16px',
        '2xl': '20px',
        '3xl': '24px',
        card: '20px',
        button: '14px',
        input: '12px',
        nav: '24px',
      },
      borderWidth: {
        3: '1px',
        clay: '1px',
      },
      // Soft ambient layered shadows & glass reflections
      boxShadow: {
        'clay-sm': 'var(--shadow-sm)',
        clay: 'var(--shadow-md)',
        'clay-lg': 'var(--shadow-lg)',
        'clay-xl': 'var(--shadow-xl)',
        'clay-inset': 'inset 0 1px 2px 0 rgba(0, 0, 0, 0.05)',
        'clay-glow': '0 0 0 3px rgba(99, 102, 241, 0.25), 0 8px 20px -4px rgba(79, 70, 229, 0.2)',
        glass: '0 8px 30px rgba(0, 0, 0, 0.06)',
        'glass-dark': '0 8px 30px rgba(0, 0, 0, 0.35)',
        ambient: '0 4px 20px -2px rgba(15, 23, 42, 0.05), 0 2px 6px -1px rgba(15, 23, 42, 0.02)',
        // Legacy aliases
        'apple-soft': 'var(--shadow-sm)',
        'apple-card': 'var(--shadow-md)',
        'apple-glow': '0 0 0 3px rgba(99, 102, 241, 0.25)',
      },
      fontFamily: {
        sans: ['var(--font-nunito)', 'Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Baloo 2', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        clay: 'cubic-bezier(0.16, 1, 0.3, 1)',
        'clay-out': 'cubic-bezier(0.16, 1, 0.3, 1)',
      },
      keyframes: {
        clayPop: {
          '0%': { transform: 'scale(0.96) translateY(6px)', opacity: '0' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        claySquish: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.98)' },
        },
        clayFloat: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-4px)' },
        },
        battleShake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-4px)' },
          '40%, 80%': { transform: 'translateX(4px)' },
        },
        battleStamp: {
          '0%': { transform: 'scale(1.5) rotate(-8deg)', opacity: '0' },
          '100%': { transform: 'scale(1) rotate(0deg)', opacity: '1' },
        },
        battleFloatUp: {
          '0%': { transform: 'translateY(4px)', opacity: '0' },
          '30%': { opacity: '1' },
          '100%': { transform: 'translateY(-16px)', opacity: '0' },
        },
        battleConfetti: {
          '0%': { transform: 'translate(-50%, -50%) rotate(0)', opacity: '1' },
          '100%': {
            transform: 'translate(calc(-50% + var(--dx)), calc(-50% + var(--dy))) rotate(var(--rot))',
            opacity: '0',
          },
        },
      },
      animation: {
        'clay-pop': 'clayPop 0.25s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'clay-squish': 'claySquish 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
        'clay-float': 'clayFloat 4s ease-in-out infinite',
        'battle-shake': 'battleShake 0.35s ease-in-out',
        'battle-stamp': 'battleStamp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards',
        'battle-float-up': 'battleFloatUp 1s ease-out forwards',
        'battle-confetti': 'battleConfetti 0.85s cubic-bezier(0.16, 1, 0.3, 1) forwards',
      },
    },
  },
  plugins: [],
};

export default config;
