/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],

  theme: {
    extend: {
      colors: {
        ink: "#0b0f1a",
        slate: "#111827",

        accent: {
          DEFAULT: "#22c55e",
          hover: "#16a34a",
          muted: "#86efac",
        },

        warn: {
          DEFAULT: "#f59e0b",
          soft: "#fde68a",
        },

        danger: {
          DEFAULT: "#ef4444",
          soft: "#fecaca",
        },
      },

      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
      },

      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.15)",
        card: "0 4px 20px rgba(0,0,0,0.08)",
      },

      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },
    },
  },

  plugins: [],
};
