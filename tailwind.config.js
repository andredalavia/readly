export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: { extend: {
    colors: { forest: { 50: "#f0f5f1", 100: "#dce9df", 200: "#bfd6c5", 300: "#94bda0", 400: "#659d77", 500: "#427f59", 600: "#306548", 700: "#28513b", 800: "#214131", 900: "#1b3529" }, paper: "#f7f8f5", ink: "#1d2c25" },
    boxShadow: { soft: "0 12px 34px rgba(30,55,42,.07)" },
    fontFamily: { display: ["Playfair Display", "Georgia", "serif"], sans: ["DM Sans", "ui-sans-serif", "system-ui"] }
  } },
  plugins: []
};
