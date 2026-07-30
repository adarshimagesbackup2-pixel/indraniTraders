/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: "#1F6F3A",
          dark: "#164F29",
        },
        slate: {
          DEFAULT: "#334155",
        },
        danger: "#DC2626",
        warning: "#D97706",
        success: "#16A34A",
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["Roboto Mono", "monospace"],
      },
      borderRadius: {
        DEFAULT: "8px",
      },
    },
  },
  plugins: [],
};
