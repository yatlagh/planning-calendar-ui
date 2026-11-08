/// <reference types="vitest/config" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

// `base` matches the GitHub Pages project path so built asset URLs resolve
// at https://<user>.github.io/planning-calendar-ui/.
export default defineConfig({
  base: "/planning-calendar-ui/",
  plugins: [react(), tailwindcss()],
  test: {
    environment: "jsdom",
    globals: true,
    setupFiles: ["./src/test/setup.ts"],
    css: false,
  },
});
