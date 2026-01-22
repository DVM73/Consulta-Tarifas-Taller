/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f5f7ff', 100: '#ebf0fe', 200: '#dae3ff', 300: '#b8c7ff', 400: '#8ca1ff',
          500: '#5e71ff', 600: '#4f46e5', 700: '#3d34c1', 800: '#332c9c', 900: '#2e2a7d',
        },
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}
