/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{js,jsx,ts,tsx}", "./src/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0B',
        surface: 'rgba(255, 255, 255, 0.05)',
        primary: '#00D2FF',
        'primary-dark': '#3A7BD5',
        secondary: '#9D50BB',
        'secondary-dark': '#6E48AA',
        accent: '#FF00E5',
        text: {
          primary: '#FFFFFF',
          secondary: '#A0A0A0',
          muted: '#666666',
        },
        status: {
          success: '#00FF94',
          warning: '#FFB800',
          error: '#FF4D4D',
          info: '#00D2FF',
        },
        border: 'rgba(255, 255, 255, 0.1)',
      },
    },
  },
  plugins: [],
}
