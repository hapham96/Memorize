import type { Config } from 'tailwindcss';

/**
 * Claymorphism theme.
 *
 * Design system sourced from the ui-ux-pro-max skill (style: `claymorphism`,
 * palette: "Educational App", type: Baloo 2 + Nunito):
 *   radius 16-24px | borders 3-4px | double shadows (inner + outer)
 *   soft bounce cubic-bezier(0.34, 1.56, 0.64, 1) | pastel accents
 *
 * Display face is Baloo 2 rather than the skill's first-choice Fredoka: the UI
 * copy is Vietnamese and Fredoka has no `vietnamese` subset. See layout.tsx.
 *
 * The `slate` and `blue` ramps are deliberately RE-TINTED rather than replaced:
 * components across the app already reference `slate-*` (neutrals) and `blue-*`
 * (primary), so retinting swaps the whole theme from one place instead of
 * rewriting every className. `slate` becomes a lavender-warm neutral and `blue`
 * becomes indigo. Use `clay-*` for the pastel decorative accents.
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
        // Neutral ramp — lavender-tinted, warmer than stock slate.
        slate: {
          50: '#F9F9FE',
          100: '#EFF1FB',
          200: '#E1E5F6',
          300: '#CBD1EC',
          // Secondary-label tone. A single fixed value cannot clear 4.5:1 on a
          // white card AND stay legible on a dark one, so it flips per mode via
          // a channel variable (see globals.css). Alpha modifiers still work.
          400: 'rgb(var(--slate-400) / <alpha-value>)',
          500: '#5F6489',
          600: '#4A4E70',
          700: '#3A3D5E',
          800: '#2C2F4C',
          900: '#20223A',
          950: '#141628',
        },
        // Primary ramp — indigo (#4F46E5 at 600, per the Educational App palette).
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
        // Pastel accents for decorative clay surfaces.
        clay: {
          peach: '#FDBCB4',
          sky: '#BAE0F5',
          mint: '#A7F3D0',
          lilac: '#DED9FB',
          butter: '#FDE9A9',
          cta: '#EA580C',
        },
        apple: {
          blue: '#4F46E5',
          green: '#34D399',
          accent: '#818CF8',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
          bgLight: '#EEF2FF',
          cardLight: '#FFFFFF',
          textPrimary: '#1E1B4B',
          textSecondary: '#5F6489',
          bgDark: '#141628',
          cardDark: '#2C2F4C',
          darkBorder: '#3A3D5E',
          lightBorder: '#C7D2FE',
        },
      },
      // Chunkier across the board — claymorphism sits in the 16-24px band.
      borderRadius: {
        lg: '14px',
        xl: '18px',
        '2xl': '24px',
        '3xl': '32px',
        card: '28px',
        button: '22px',
        input: '20px',
        nav: '34px',
      },
      borderWidth: {
        3: '3px',
        clay: '3px',
      },
      // Driven by CSS variables so dark mode can swap the inner highlight
      // (a white inset reads wrong on a dark surface). See globals.css.
      boxShadow: {
        'clay-sm': 'var(--clay-sm)',
        clay: 'var(--clay)',
        'clay-lg': 'var(--clay-lg)',
        'clay-xl': 'var(--clay-xl)',
        'clay-inset': 'var(--clay-inset)',
        'clay-glow': 'var(--clay-glow)',
        // Legacy aliases kept so any stale class still lands on a clay surface.
        'apple-soft': 'var(--clay-sm)',
        'apple-card': 'var(--clay)',
        'apple-glow': 'var(--clay-glow)',
      },
      fontFamily: {
        sans: ['var(--font-nunito)', 'Nunito', 'ui-rounded', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Baloo 2', 'ui-rounded', 'system-ui', 'sans-serif'],
      },
      transitionTimingFunction: {
        clay: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
        'clay-out': 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
      keyframes: {
        clayPop: {
          '0%': { transform: 'scale(0.85) translateY(10px)', opacity: '0' },
          '65%': { transform: 'scale(1.04) translateY(-2px)', opacity: '1' },
          '100%': { transform: 'scale(1) translateY(0)', opacity: '1' },
        },
        claySquish: {
          '0%, 100%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(0.96, 1.04)' },
        },
        clayFloat: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-6px)' },
        },
      },
      animation: {
        'clay-pop': 'clayPop 0.32s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
        'clay-squish': 'claySquish 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        'clay-float': 'clayFloat 3.5s ease-in-out infinite',
      },
    },
  },
  plugins: [],
};

export default config;
