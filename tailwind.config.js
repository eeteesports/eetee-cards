/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Primary — the existing navy, extended into a full scale (brand
        // refresh, 2026-08-17). navy-900 is unchanged from before so
        // anything still hardcoding #0f1b35 stays visually consistent.
        navy: {
          50:  '#eef1f7',
          100: '#d6ddec',
          200: '#aebbd9',
          300: '#8699c6',
          400: '#5d76ad',
          500: '#3f5790',
          600: '#2c4270',
          700: '#1e3a5f',
          800: '#16294a',
          900: '#0f1b35',
          950: '#0a1226',
        },
        // Accent — warm gold, replacing the mixed bright-yellow/blue accent
        // usage across the storefront. Pairs with navy for the classic
        // "established brand" feel (Evan's ask: legitimate business, not
        // hobby-site) — used for CTAs, prices, and highlight badges.
        gold: {
          50:  '#fdf8ec',
          100: '#faedc4',
          200: '#f5da89',
          300: '#f0c34d',
          400: '#e8ac24',
          500: '#c98a15',
          600: '#a36c12',
          700: '#7d5313',
          800: '#664414',
          900: '#553914',
        },
      },
    },
  },
  plugins: [],
};
