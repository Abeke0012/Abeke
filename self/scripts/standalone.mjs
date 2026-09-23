// Writes index.standalone.html: index.html with every file in ./assets inlined as a data URI,
// so the page opens from anywhere as a single file.
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const assets = Object.fromEntries(readdirSync(join(root, "assets")).filter((f) => /\.(jpe?g|png|webp)$/i.test(f)).map((f) => {
  const type = f.endsWith(".png") ? "image/png" : f.endsWith(".webp") ? "image/webp" : "image/jpeg";
  return [f, `data:${type};base64,${readFileSync(join(root, "assets", f)).toString("base64")}`];
}));
const html = readFileSync(join(root, "index.html"), "utf8")
  .replace('<script type="module">', `<script>window.__INLINE_ASSETS__ = ${JSON.stringify(assets)};</script>\n<script type="module">`);
writeFileSync(join(root, "index.standalone.html"), html);
console.log(`index.standalone.html — ${Object.keys(assets).length} assets, ${(html.length / 1048576).toFixed(1)} MB`);
