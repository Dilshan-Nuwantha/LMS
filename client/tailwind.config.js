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
        primary: '#2563EB', // Soft Blue
        background: '#F8FAFC', // Off White
        textPrimary: '#0F172A', // Dark Navy
        textSecondary: '#475569', // Gray
        accent: '#22C55E', // Soft Green
      }
    },
  },
  plugins: [],
}
