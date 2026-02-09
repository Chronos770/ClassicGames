/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        felt: {
          50: '#f0fdf4',
          100: '#dcfce7',
          200: '#bbf7d0',
          300: '#86efac',
          400: '#4ade80',
          500: '#22c55e',
          600: '#16a34a',
          700: '#15803d',
          800: '#166534',
          900: '#14532d',
          950: '#052e16',
        },
        wood: {
          50: '#fdf8f0',
          100: '#f5e6d0',
          200: '#e8c99a',
          300: '#d4a563',
          400: '#c4883a',
          500: '#a66b2a',
          600: '#8b5423',
          700: '#6f3f1d',
          800: '#5a3219',
          900: '#4a2916',
        },
        navy: {
          800: '#1e293b',
          900: '#0f172a',
          950: '#020617',
        },
      },
      fontFamily: {
        display: ['Georgia', 'Cambria', 'serif'],
        body: ['system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        'game': '0 10px 40px rgba(0,0,0,0.4)',
        'card': '0 2px 8px rgba(0,0,0,0.3)',
        'piece': '0 4px 12px rgba(0,0,0,0.5)',
      },
    },
  },
  plugins: [],
};
