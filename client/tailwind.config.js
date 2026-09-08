/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        phonepe: {
          50: '#f6f4fa',
          100: '#ede8f6',
          200: '#ddd2ed',
          300: '#c3aee0',
          400: '#a382cf',
          500: '#865bbd',
          600: '#6f42a6',
          700: '#5f259f', // Iconic PhonePe Violet
          800: '#4e1e82',
          900: '#3c1464',
          950: '#250a40',
        }
      }
    },
  },
  plugins: [],
}
