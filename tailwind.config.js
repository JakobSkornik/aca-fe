/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        background: 'var(--background)',
        foreground: 'var(--foreground)',
        'transparent-orange': 'var(--transparent-orange)',
        orange: 'var(--orange)',
        'lightest-gray': 'var(--lightest-gray)',
        'light-gray': 'var(--light-gray)',
        'dark-gray': 'var(--dark-gray)',
        'darkest-gray': 'var(--darkest-gray)',
      },
    },
  },
  plugins: [],
}
