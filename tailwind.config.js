/** @type {import('tailwindcss').Config} */
export default {
  content: ["./src/**/*.{html,js,svelte,ts}"],
  theme: {
    extend: {
      colors: {
        bg: "#0f0f0f",
        surface: "#1e1e1e",
        sidebar: "#161616",
        border: "#2a2a2a",
        accent: "#6366f1",
      },
    },
  },
  plugins: [],
}
