/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        security: {
          green: "#10b981",
          amber: "#f59e0b",
          red: "#ef4444",
          dark: "#0f172a",
          card: "#1e293b",
          border: "#334155"
        }
      }
    },
  },
  plugins: [],
}
