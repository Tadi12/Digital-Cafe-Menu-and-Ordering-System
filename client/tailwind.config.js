/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        cafe: {
          50: '#FAF7F2',
          100: '#F4EBDC',
          200: '#E8D8C3',
          300: '#D4A373',
          400: '#BC7D46',
          500: '#9C5B27',
          600: '#8B5A2B',
          700: '#5C3A21',
          800: '#3D2314',
          900: '#2C1A1D',
        },
        gold: {
          500: '#D97706',
          600: '#B45309',
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      }
    },
  },
  plugins: [],
}
