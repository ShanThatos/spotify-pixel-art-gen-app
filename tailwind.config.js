/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'spotify-black': '#121212',
        'spotify-gray': '#191919', // A slightly lighter gray for cards/elements
        'spotify-gray-dark': '#101010', // Original intended for gradient middle color
        'spotify-gradient-dark-gray': '#0D0D0D', // Renamed from spotify-dark-gray, for gradient end color
        'spotify-light-gray': '#282828',
        'spotify-text': '#FFFFFF',
        'spotify-text-subdued': '#B3B3B3',
        'spotify-green': '#1DB954',
        'spotify-green-hover': '#1ED760',
      }
    },
  },
  plugins: [],
}

