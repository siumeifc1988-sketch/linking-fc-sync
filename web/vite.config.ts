import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import path from "node:path";

// GitHub Pages: https://siumeifc1988-sketch.github.io/linking-fc-sync/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  base: "/linking-fc-sync/",
  resolve: {
    alias: { "@": path.resolve(__dirname, "src") },
  },
  publicDir: "public",
  build: {
    outDir: "dist",
    emptyOutDir: true,
  },
});
