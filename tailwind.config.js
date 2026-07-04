/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        paper: '#F5F1E8',
        ink: '#14171C',
        amber: {
          DEFAULT: '#F2A900',
          dark: '#C98A00',
          light: '#FFD166',
        },
        rust: '#B23A2E',
        rustdark: '#8A2A20',
        stone: {
          50: '#FAF8F2',
          100: '#F0EBE0',
          200: '#E2DCCB',
          300: '#CFC7B0',
          400: '#A89F84',
          500: '#7A7259',
          600: '#5C5540',
          700: '#3F3A2C',
          800: '#2A2620',
          900: '#1B1813',
        },
      },
      fontFamily: {
        headline: ['Archivo', 'sans-serif'],
        body: ['"IBM Plex Sans"', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      boxShadow: {
        'paper': '0 1px 2px rgba(20,23,28,0.04), 0 4px 12px rgba(20,23,28,0.06)',
        'paper-lg': '0 2px 4px rgba(20,23,28,0.05), 0 12px 32px rgba(20,23,28,0.10)',
        'inset-line': 'inset 0 -1px 0 rgba(20,23,28,0.08)',
      },
    },
  },
  plugins: [],
};
