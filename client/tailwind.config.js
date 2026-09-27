/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',

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
        },
        recipe: {
          bg: '#121316',
          card: '#1e2126',
          cardHover: '#262930',
          border: '#2a2e36',
          orange: '#FF7A28',
          orangeDark: '#D95812',
          pill: '#272a31',
          pillActive: '#FF7A28',
          text: '#F5F5F7',
          muted: '#9CA3AF',
          subtle: '#6B7280',
        },

      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['Playfair Display', 'Georgia', 'serif'],
      }
    },
  },
  plugins: [],
}
