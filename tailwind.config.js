/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        'lb-olive-900': '#121a14',
        'lb-olive-800': '#17261c',
        'lb-olive-700': '#1e3a2a',
        'lb-olive-600': '#254c34',
        'lb-olive-500': '#2f6b3a',
        'lb-olive-400': '#6f8f62',
        'lb-olive-300': '#9fb48a',
        'lb-olive-200': '#c8d7a7',
        'lb-olive-100': '#e9f2c2',
        'lb-accent': '#c9ff8a'
      }
    }
  },
  plugins: [],
}
