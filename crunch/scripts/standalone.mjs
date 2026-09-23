// Writes index.standalone.html: the page with both clips and posters inlined, so it opens
// straight from disk (no server, no media/ folder). Usage: npm run standalone
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");
// Smaller encodes keep the single file light; fall back to the full clips.
const pick = (name) => [path.join(root, "media/standalone", name), path.join(root, "media", name)].find(fs.existsSync);
const TYPES = { ".mp4": "video/mp4", ".jpg": "image/jpeg" };
const media = {};
for (const name of ["video1.mp4", "video2.mp4", "poster1.jpg", "poster2.jpg"]) {
  const file = pick(name);
  media[`media/${name}`] = `data:${TYPES[path.extname(name)]};base64,${fs.readFileSync(file).toString("base64")}`;
}
const inject = `<script>window.__INLINE_MEDIA__ = ${JSON.stringify(media)};</script>\n`;
const out = html.replace("<script>\n(() => {", inject + "<script>\n(() => {");
if (out === html) throw new Error("could not find the page script");
fs.writeFileSync(path.join(root, "index.standalone.html"), out);
console.log(`index.standalone.html — ${(out.length / 1048576).toFixed(1)} MB`);
