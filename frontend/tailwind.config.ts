/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class', '[data-theme="dark"]'],
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        canvas: 'var(--canvas)',
        surface: 'var(--surface)',
        'surface-2': 'var(--surface-2)',
        'surface-3': 'var(--surface-3)',
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        hairline: 'var(--hairline)',
        accent: 'var(--accent)',
        terracotta: 'var(--terracotta)',
        verified: 'var(--verified)',
        contradicted: 'var(--contradicted)',
        unsupported: 'var(--unsupported)',
        judgement: 'var(--judgement)',
        danger: 'var(--danger)',
      },
      borderRadius: {
        control: '4px',
        card: '6px',
        sheet: '8px',
        pill: '999px',
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
        inset: 'inset 0 1px 0 rgba(255, 255, 255, 0.08)',
      },
      fontFamily: {
        sans: ['var(--font-ui)', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'var(--font-ui)', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
        serif: ['Instrument Serif', 'Georgia', 'serif'],
      },
      fontSize: {
        display: ['56px', { lineHeight: '60px', letterSpacing: '-0.03em', fontWeight: '600' }],
        title1: ['32px', { lineHeight: '38px', letterSpacing: '-0.025em', fontWeight: '600' }],
        title2: ['22px', { lineHeight: '28px', letterSpacing: '-0.015em', fontWeight: '600' }],
        headline: ['16px', { lineHeight: '22px', fontWeight: '600' }],
        body: ['14px', { lineHeight: '20px' }],
        caption: ['12px', { lineHeight: '16px' }],
        code: ['12px', { lineHeight: '18px' }],
      },
    },
  },
  plugins: [],
}
