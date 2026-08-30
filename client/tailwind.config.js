/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      screens: {
        'xs': '480px', // Extra small breakpoint for mobile
      },
      colors: {
        primary: {
          DEFAULT: '#066ac9',
          hover: '#0556a3',
          light: '#e6f0f9',
          50: '#f0f7ff',
          100: '#e0effe',
          500: '#066ac9',
          600: '#0556a3',
          700: '#04427e',
        },
        danger: {
          DEFAULT: '#d6293e',
          light: '#fbe7e8',
        },
        warning: {
          DEFAULT: '#f7c32e',
          light: '#fef8e7',
        },
        success: {
          DEFAULT: '#0cbd68',
          light: '#e6f8ef',
        },
        purple: {
          DEFAULT: '#6f42c1',
          light: '#f1ecf9',
        },
        orange: {
          DEFAULT: '#fd7e14',
          light: '#fff2e7',
        },
        background: '#f5f7f9',
        dark: '#0f172a',
        textPrimary: '#0f172a',
        textSecondary: '#67748e',
        accent: '#0cbd68',
      },
      boxShadow: {
        'TENZE': '0 0.5rem 1rem rgba(0, 0, 0, 0.08)',
        'TENZE-lg': '0 1rem 3rem rgba(0, 0, 0, 0.12)',
        'TENZE-sm': '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
      }
    },
  },
  plugins: [],
}
