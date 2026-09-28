import { defineConfig } from "vite";
import { viteSingleFile } from "vite-plugin-singlefile";

// The build compiles everything (CSS + JS) into one self-contained dist/index.html.
export default defineConfig({
  base: "./",
  plugins: [viteSingleFile()],
});
