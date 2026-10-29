/**
 * BrandSentinel design system — warm ivory / ink / vermilion editorial palette.
 *
 * LEGACY TOKEN REMAP
 * ------------------
 * The original application was built against a dark "midnight/indigo/slate" palette.
 * Rather than rewriting every class name in 14 pages (and risking behavioural regressions),
 * the legacy scales are re-defined here so that every existing utility class resolves to
 * its light-theme semantic role:
 *
 *   midnight.950  -> page background (warm ivory)      text-white  -> primary ink
 *   midnight.900  -> card surface (warm white)         text-slate  -> secondary/muted text ramp
 *   midnight.800  -> inset surface + hairline border   indigo      -> vermilion (primary action)
 *   midnight.700  -> hover surface / stronger border   teal|emerald-> verified / success
 *                                                     amber       -> caution / needs review
 *                                                     red         -> critical / danger
 *
 * Semantic aliases (ivory, ink, vermilion, surface, line, muted) are also exported and
 * used by the landing page, application shell and shared UI primitives.
 */

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        // ── Semantic brand tokens ────────────────────────────────────────
        ivory: '#F8F4EC',
        ink: {
          DEFAULT: '#251C19',
          soft: '#4A3F3A',
          muted: '#6E625A',
          faint: '#7A6E65',
        },
        vermilion: {
          DEFAULT: '#C83232',
          hover: '#A82B27',
          tint: '#F9EAE7',
        },
        surface: {
          DEFAULT: '#FFFFFF',
          alt: '#FDFBF7',
          inset: '#F1EADD',
        },
        line: {
          DEFAULT: '#E6DDCC',
          strong: '#D8CDB8',
        },

        // ── Legacy: page + surface chrome ────────────────────────────────
        midnight: {
          950: '#F8F4EC', // page background
          900: '#FFFFFF', // card surface
          850: '#FDFBF7', // gradient partner
          800: '#E6DDCC', // inset surface / default hairline border
          700: '#D8CDB8', // hover surface / stronger border
          600: '#C3B79F',
          500: '#A99C85',
          400: '#8C7F6B',
        },

        // ── Legacy: neutral text ramp (inverted: 100 = darkest) ──────────
        slate: {
          50: '#FBF8F2',
          100: '#251C19', // primary text
          200: '#3A302B', // headings
          300: '#4F443E', // strong secondary text
          400: '#6E625A', // muted text
          500: '#7C6F67', // placeholder / faint
          600: '#9E9187',
          700: '#C7BCAD',
          800: '#E6DDCC', // hairline border
          900: '#F1EBE0',
          950: '#FAF7F1',
        },

        // ── Legacy accent → vermilion (primary action / brand) ───────────
        indigo: {
          50: '#FDF3F2',
          100: '#FBE4E1',
          200: '#EFC9C4',
          300: '#BC3F38',
          400: '#A32B26',
          500: '#D2413A',
          600: '#C83232',
          700: '#8E2521',
          800: '#E0B0AA',
          900: '#F3D9D5',
          950: '#F9EAE7',
        },

        // ── Verified / success ───────────────────────────────────────────
        teal: {
          200: '#A7D3C2',
          300: '#1F6E52',
          400: '#17614A',
          500: '#125640',
          600: '#0F4C39',
          700: '#0C4031',
          800: '#B9DBCB',
          900: '#D9EDE4',
          950: '#E3F0EA',
        },
        emerald: {
          200: '#A5D6BC',
          300: '#1E7A4F',
          400: '#1A6E47',
          500: '#17633F',
          600: '#14593A',
          700: '#104B31',
          800: '#B6DDC7',
          900: '#DFF0E7',
          950: '#E9F5EF',
        },

        // ── Caution / needs review ───────────────────────────────────────
        amber: {
          200: '#A87C1B',
          300: '#8A5F0C',
          400: '#7A5309',
          500: '#8A5F0C',
          600: '#6E4A07',
          700: '#5A3D06',
          800: '#E0CDA0',
          900: '#F0E4C6',
          950: '#FAF2E0',
        },

        // ── Critical / danger ────────────────────────────────────────────
        red: {
          200: '#B8433B',
          300: '#A3231D',
          400: '#8E1D18',
          500: '#C83232',
          600: '#A82B27',
          700: '#8E1D18',
          800: '#E3B3AE',
          900: '#F6DEDB',
          950: '#FBEDEB',
        },

        // ── Supporting roles & categories ────────────────────────────────
        purple: {
          200: '#CFC6E8',
          300: '#5B4B8A',
          400: '#4E3F7C',
          500: '#6A5AA8',
          600: '#4E3F7C',
          700: '#423568',
          800: '#C9BFE6',
          900: '#E5DFF5',
          950: '#F0ECFB',
        },
        blue: {
          300: '#2F5E8C',
          400: '#2A5480',
          500: '#35689A',
          600: '#2C5A8A',
          700: '#244B75',
          800: '#B9CFE6',
          900: '#DCE9F5',
          950: '#E9F1FA',
        },
        pink: {
          200: '#E9BCC8',
          300: '#A63A5A',
          400: '#96314F',
          500: '#B83A60',
          600: '#A63A5A',
          700: '#8E2F4C',
          800: '#E5B9C6',
          900: '#F6E1E8',
          950: '#FAEEF2',
        },
      },

      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['"JetBrains Mono"', '"Fira Code"', 'monospace'],
        display: ['Fraunces', 'Georgia', '"Times New Roman"', 'serif'],
      },

      // Warm, restrained shadows (no coloured glows).
      boxShadow: {
        xs: '0 1px 2px rgba(37, 28, 25, 0.05)',
        sm: '0 1px 2px rgba(37, 28, 25, 0.06)',
        md: '0 1px 3px rgba(37, 28, 25, 0.07), 0 1px 2px rgba(37, 28, 25, 0.04)',
        lg: '0 4px 14px -4px rgba(37, 28, 25, 0.12), 0 2px 6px -4px rgba(37, 28, 25, 0.06)',
        xl: '0 10px 30px -12px rgba(37, 28, 25, 0.18), 0 4px 10px -8px rgba(37, 28, 25, 0.08)',
        '2xl': '0 24px 56px -24px rgba(37, 28, 25, 0.28)',
        inner: 'inset 0 1px 2px rgba(37, 28, 25, 0.06)',
        card: '0 1px 2px rgba(37, 28, 25, 0.05), 0 8px 24px -18px rgba(37, 28, 25, 0.25)',
        none: 'none',
      },

      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'fade-in': {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        'scale-in': {
          '0%': { opacity: '0', transform: 'translateY(8px) scale(0.985)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-400px 0' },
          '100%': { backgroundPosition: '400px 0' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.5s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.35s ease both',
        'scale-in': 'scale-in 0.28s cubic-bezier(0.22, 1, 0.36, 1) both',
        shimmer: 'shimmer 1.4s linear infinite',
      },
    },
  },
  plugins: [],
}
