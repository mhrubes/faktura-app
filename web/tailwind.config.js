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
        "2xs": ["8px", { lineHeight: "1" }],
        xxs: ["8.5px", { lineHeight: "1.2" }],
        invoice: ["13px", { lineHeight: "1.45" }],
        "invoice-sm": ["12px", { lineHeight: "1.4" }],
        "invoice-num": ["15px", { lineHeight: "1.2" }],
        "invoice-title": ["26px", { lineHeight: "1" }],
      },
    },
  },
  plugins: [],
};
