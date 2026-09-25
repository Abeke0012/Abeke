// Writes index.standalone.html: the page with every file found in the assets folder inlined,
// so it opens straight from disk with no server and no assets/ folder next to it.
// Usage: node scripts/standalone.mjs [assetsDir]   (default: ./assets)
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dir = path.resolve(process.argv[2] || path.join(root, "assets"));
const TYPES = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp", ".mp4": "video/mp4", ".mp3": "audio/mpeg" };
const FILES = ["hero-halcyon.jpg", "halcyon.mp4", "halcyon-flight.mp4", "hero-stratos.jpg", "stratos.mp4", "hero-wraith.jpg", "wraith.mp4", "wraith-persona.jpg", "smoke-wipe.mp4", "theme.mp3"];

const inline = {};
for (const name of FILES) {
  const file = path.join(dir, name);
  if (!fs.existsSync(file)) { console.warn(`  missing: ${name}`); continue; }
  inline[name] = `data:${TYPES[path.extname(name)]};base64,${fs.readFileSync(file).toString("base64")}`;
}
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
const marker = '<script type="module">';
if (!html.includes(marker)) throw new Error("page script not found");
const out = html.replace(marker, `<script>window.__INLINE_ASSETS__ = ${JSON.stringify(inline)};</script>\n${marker}`);
fs.writeFileSync(path.join(root, "index.standalone.html"), out);
console.log(`index.standalone.html — ${Object.keys(inline).length} files, ${(out.length / 1048576).toFixed(1)} MB`);
