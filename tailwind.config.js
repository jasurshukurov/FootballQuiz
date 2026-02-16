/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,jsx,ts,tsx}', './components/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        'pitch-green': '#05F26C',
        'chalk-white': '#F5F5F0',
        'card-red': '#E63946',
        'card-yellow': '#F4A261',
        'retro-black': '#1A1A2E',
        'match-green': '#52B788',
        'steel-gray': '#6C757D',
        'offside-red': '#FF2D55',
        'floodlight-white': '#F0F6FC',
      },
    },
  },
  plugins: [],
};
