/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,jsx,ts,tsx}",
    "./components/**/*.{js,jsx,ts,tsx}",
    "./lib/**/*.{js,jsx,ts,tsx}",
  ],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        // Primary yellow accent (matches web #eab308)
        accent: {
          50: "#FFFBEB",
          100: "#FEF3C7",
          200: "#FDE68A",
          300: "#FCD34D",
          400: "#EAB308",
          500: "#CA8A04",
          600: "#A16207",
          700: "#854D0E",
          800: "#713F12",
          900: "#422006",
        },
        // Light app backgrounds
        surface: {
          DEFAULT: "#F5F5F5",
          50: "#FAFAFA",
          100: "#F5F5F5",
          200: "#EEEEEE",
          300: "#E0E0E0",
        },
        // Glass effects
        glass: {
          DEFAULT: "rgba(255,255,255,0.75)",
          light: "rgba(255,255,255,0.5)",
          border: "rgba(200,200,200,0.3)",
          dark: "rgba(0,0,0,0.05)",
        },
        // Keep dark for text and some elements
        dark: {
          DEFAULT: "#1A1A1A",
          100: "#2A2A2A",
          200: "#3A3A3A",
          300: "#4A4A4A",
          400: "#6B7280",
        },
        // Category colors (same as before)
        teal: {
          50: "#E6F5F5",
          100: "#B3E0E0",
          200: "#80CCCC",
          300: "#4DB8B8",
          400: "#269E9E",
          500: "#0D7A7A",
          600: "#0B6666",
          700: "#0D4F4F",
          800: "#0A3D3D",
          900: "#072B2B",
        },
      },
      fontFamily: {
        sans: ["Inter", "System"],
      },
      borderRadius: {
        "glass": "25px",
      },
    },
  },
  plugins: [],
};
