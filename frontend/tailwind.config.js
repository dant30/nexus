/** @type {import('tailwindcss').Config} */
const forms = require("@tailwindcss/forms");
const typography = require("@tailwindcss/typography");
const aspectRatio = require("@tailwindcss/aspect-ratio");
const plugin = require("tailwindcss/plugin");

module.exports = {
  content: ["./index.html", "./src/**/*.{js,jsx,ts,tsx}"],
  darkMode: "class",

  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.25rem",
        lg: "2rem",
      },
    },

    extend: {
      colors: {
        ink: "#0b0f1a",
        slate: "#111827",

        accent: {
          DEFAULT: "#22c55e",
          hover: "#16a34a",
          muted: "#86efac",
        },

        primary: {
          DEFAULT: "#0ea5a4",
          dark: "#0b7280",
        },

        warn: {
          DEFAULT: "#f59e0b",
          soft: "#fde68a",
        },

        danger: {
          DEFAULT: "#ef4444",
          soft: "#fecaca",
        },

        glass: "rgba(255,255,255,0.04)",
        "glass-strong": "rgba(255,255,255,0.06)",
      },

      fontFamily: {
        sans: ["Space Grotesk", "system-ui", "sans-serif"],
        mono: ["JetBrains Mono", "ui-monospace", "SFMono-Regular", "monospace"],
      },

      boxShadow: {
        soft: "0 10px 30px rgba(0,0,0,0.15)",
        card: "0 4px 20px rgba(0,0,0,0.08)",
        glow: "0 8px 40px rgba(34,197,94,0.08)",
      },

      borderRadius: {
        xl: "1rem",
        "2xl": "1.5rem",
      },

      spacing: {
        13: "3.25rem",
        18: "4.5rem",
      },

      maxWidth: {
        "8xl": "90rem",
      },

      transitionTimingFunction: {
        spring: "cubic-bezier(.22,.9,.27,1)",
      },

      keyframes: {
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
        float: {
          "0%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-6px)" },
          "100%": { transform: "translateY(0px)" },
        },
        pulseGlow: {
          "0%": { boxShadow: "0 0 0 0 rgba(34,197,94,0.06)" },
          "70%": { boxShadow: "0 0 0 10px rgba(34,197,94,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(34,197,94,0)" },
        },
      },

      animation: {
        fadeIn: "fadeIn 300ms ease-out both",
        float: "float 4s ease-in-out infinite",
        pulseGlow: "pulseGlow 2.5s ease-out infinite",
      },
    },
  },

  plugins: [
    forms,
    typography,
    aspectRatio,
    plugin(function ({ addUtilities }) {
      addUtilities({
        ".backdrop-soft": {
          "backdrop-filter": "blur(6px)",
          "-webkit-backdrop-filter": "blur(6px)",
        },
        ".text-gradient": {
          "background-clip": "text",
          "-webkit-background-clip": "text",
          color: "transparent",
        },
      });
    }),
  ],
};
