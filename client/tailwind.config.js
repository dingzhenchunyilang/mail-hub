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
        'line-soft': 'var(--line-soft)',
        'ink-faint': 'var(--ink-faint)',
        'stamp-red': 'var(--stamp-red)',
      },
      fontFamily: {
        serif: ['Fraunces', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
        mono: ['IBM Plex Mono', 'Menlo', 'monospace'],
      },
      borderRadius: {
        'card': '5px',
      },
      fontSize: {
        'display': ['1.75rem', { lineHeight: '1.2', fontWeight: '600' }],
        'heading': ['1.25rem', { lineHeight: '1.35', fontWeight: '600' }],
        'subheading': ['1rem', { lineHeight: '1.5', fontWeight: '500' }],
      },
      spacing: {
        '18': '4.5rem',
      },
    },
  },
  plugins: [],
}
