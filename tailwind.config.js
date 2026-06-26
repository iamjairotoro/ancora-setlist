/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        crema: { DEFAULT: '#F5F0E6', dark: '#E0D8C8' },
        ancora: { DEFAULT: '#1A1A1A' },
      },
      fontFamily: {
        sans: ['"Helvetica Neue"', 'Helvetica', 'Arial', 'sans-serif'],
        script: ['"Dancing Script"', 'cursive'],
      },
    },
  },
  plugins: [],
}
