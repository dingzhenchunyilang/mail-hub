/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        ink: 'var(--ink)',
        paper: 'var(--paper)',
        'paper-dim': 'var(--paper-dim)',
        surface: 'var(--surface)',
        accent: 'var(--accent)',
        'line-soft': 'var(--line-soft)',
        'ink-faint': 'var(--ink-faint)',
        'stamp-red': 'var(--stamp-red)',
      },
      fontFamily: {
        serif: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['JetBrains Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        'card': '0.875rem',
      },
      fontSize: {
        'display': ['2rem', { lineHeight: '1.08', fontWeight: '700' }],
        'heading': ['1.1875rem', { lineHeight: '1.35', fontWeight: '600' }],
        'subheading': ['1rem', { lineHeight: '1.55', fontWeight: '500' }],
      },
      spacing: {
        '18': '4.5rem',
      },
    },
  },
  plugins: [],
}
