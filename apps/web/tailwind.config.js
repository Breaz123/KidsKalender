/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        sleep: {
          papa: { bg: '#DBEAFE', text: '#1E3A8A', border: '#3B82F6' },
          mama: { bg: '#FCE7F3', text: '#831843', border: '#EC4899' },
          oma: { bg: '#DCFCE7', text: '#14532D', border: '#22C55E' },
          vakantie: { bg: '#FEF3C7', text: '#78350F', border: '#F59E0B' },
          empty: { bg: '#F9FAFB', text: '#374151', border: '#E5E7EB' },
        },
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
};
