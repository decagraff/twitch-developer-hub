/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        twitch: {
          purple: '#9146FF',
          'purple-dark': '#772CE8',
          'purple-light': '#A970FF',
          dark: '#18181B',
          'dark-light': '#1F1F23',
          'gray-dark': '#2F2F35',
          'gray': '#53535F',
          'gray-light': '#9F9FA8',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
  darkMode: 'class',
}

