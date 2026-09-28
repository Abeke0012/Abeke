import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// `npm run build:single` emits one self-contained index.html that opens straight from disk.
export default defineConfig(({ mode }) => ({
  base: "./",
  plugins: mode === "single" ? [viteSingleFile()] : [],
  build: { outDir: mode === "single" ? "dist-single" : "dist" },
}));
