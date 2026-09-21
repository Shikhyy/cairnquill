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
        ink: 'var(--ink)',
        'ink-2': 'var(--ink-2)',
        hairline: 'var(--hairline)',
        accent: 'var(--accent)',
        verified: 'var(--verified)',
        contradicted: 'var(--contradicted)',
        unsupported: 'var(--unsupported)',
        judgement: 'var(--judgement)',
        danger: 'var(--danger)',
      },
      borderRadius: {
        control: '10px',
        card: '20px',
        sheet: '28px',
        pill: '999px',
      },
      boxShadow: {
        1: 'var(--shadow-1)',
        2: 'var(--shadow-2)',
      },
      fontFamily: {
        sans: ['var(--font-ui)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'monospace'],
      },
      fontSize: {
        display: ['56px', { lineHeight: '60px', letterSpacing: '-0.03em', fontWeight: '600' }],
        title1: ['34px', { lineHeight: '40px', letterSpacing: '-0.02em', fontWeight: '600' }],
        title2: ['24px', { lineHeight: '30px', letterSpacing: '-0.01em', fontWeight: '600' }],
        headline: ['17px', { lineHeight: '24px', fontWeight: '600' }],
        body: ['15px', { lineHeight: '22px' }],
        caption: ['13px', { lineHeight: '18px' }],
        code: ['13px', { lineHeight: '20px' }],
      },
    },
  },
  plugins: [],
}
