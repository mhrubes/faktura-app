/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./*.html", "./app.js", "./app-list.js", "./js/**/*.js"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#00b5c8",
          dark: "#009aad",
          light: "#f0fbfd",
        },
      },
      fontFamily: {
        sans: ['"Segoe UI"', "Arial", "Helvetica", "sans-serif"],
      },
      fontSize: {
        "2xs": ["6.5px", { lineHeight: "1" }],
        xxs: ["7px", { lineHeight: "1.2" }],
        invoice: ["11px", { lineHeight: "1.45" }],
      },
    },
  },
  plugins: [],
};
