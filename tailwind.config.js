/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          DEFAULT: '#0f5132',
          dark: '#0a3b25',
          light: '#1a6b44',
        },
        gold: {
          DEFAULT: '#d4af37',
          dark: '#b08d1f',
          light: '#f0c75e',
        },
      },
      fontFamily: {
        display: ['"Cinzel"', 'serif'],
      },
    },
  },
  plugins: [],
};

