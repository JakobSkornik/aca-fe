/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'media',
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      borderRadius: {
        md: 'var(--border-radius-md)',
        lg: 'var(--border-radius-lg)',
      },
      colors: {
        background: {
          primary: 'var(--color-background-primary)',
          secondary: 'var(--color-background-secondary)',
          info: 'var(--color-background-info)',
          warning: 'var(--color-background-warning)',
          success: 'var(--color-background-success)',
          danger: 'var(--color-background-danger)',
        },
        text: {
          primary: 'var(--color-text-primary)',
          secondary: 'var(--color-text-secondary)',
          tertiary: 'var(--color-text-tertiary)',
          info: 'var(--color-text-info)',
          warning: 'var(--color-text-warning)',
          success: 'var(--color-text-success)',
          danger: 'var(--color-text-danger)',
        },
        border: {
          tertiary: 'var(--color-border-tertiary)',
          secondary: 'var(--color-border-secondary)',
          primary: 'var(--color-border-primary)',
          info: 'var(--color-border-info)',
          danger: 'var(--color-border-danger)',
        },
        board: {
          light: 'var(--board-light)',
          dark: 'var(--board-dark)',
        },
        accent: {
          engine: 'var(--accent-engine)',
          commentary: 'var(--accent-commentary)',
          progress: 'var(--accent-progress)',
        },
      },
    },
  },
  plugins: [],
}
