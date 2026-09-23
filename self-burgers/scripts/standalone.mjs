// Writes standalone/index.html: the same page with every image under public/ inlined as a data URI,
// so the single file opens straight from disk. Videos stay external (they are too large to inline).
import { readFileSync, writeFileSync, mkdirSync, existsSync } from "node:fs";
import { dirname, join, extname } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const types = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".avif": "image/avif" };
let html = readFileSync(join(root, "index.html"), "utf8");
let count = 0;
html = html.replace(/(["'])(images\/[^"']+\.(?:jpe?g|png|webp|avif))\1/g, (match, quote, path) => {
  const file = join(root, "public", path);
  if (!existsSync(file)) return match;
  count++;
  return `${quote}data:${types[extname(file).toLowerCase()]};base64,${readFileSync(file).toString("base64")}${quote}`;
});
mkdirSync(join(root, "standalone"), { recursive: true });
writeFileSync(join(root, "standalone", "index.html"), html);
console.log(`standalone/index.html — ${count} image(s) inlined, ${(html.length / 1024).toFixed(0)} KB`);
