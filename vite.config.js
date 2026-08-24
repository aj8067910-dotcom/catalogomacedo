import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base: "./" -> caminhos relativos, funciona em GitHub Pages, Netlify ou Vercel
// sem precisar ajustar o nome do repositório.
export default defineConfig({
  base: "./",
  plugins: [react()],
});
