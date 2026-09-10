import fs from "node:fs";

const source = fs.readFileSync(new URL("../dist/jooshan.md", import.meta.url), "utf8");
const clean = text => text.replace(/\*\*/g, "").replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
const lines = source.split(/\r?\n/).map(clean).filter(Boolean);
const prayers = [];

for (let i = 0; i < lines.length; i++) {
  const match = lines[i].match(/\(([۰-۹]+)\)\s*$/);
  if (!match) continue;
  const number = Number(match[1].replace(/[۰-۹]/g, digit => "۰۱۲۳۴۵۶۷۸۹".indexOf(digit)));
  if (!number || number > 100 || prayers.some(prayer => prayer.number === number)) continue;
  const arabic = lines[i].replace(/\s*\([۰-۹]+\)\s*$/, "").replace(/^\([۰-۹]+\)\s*/, "");
  prayers.push({ number, arabic, translation: lines[i + 1] || "" });
}

prayers.sort((a, b) => a.number - b.number);
if (prayers.length !== 100 || prayers.some((prayer, index) => prayer.number !== index + 1)) {
  throw new Error(`Expected sections 1–100, found ${prayers.length}`);
}

fs.writeFileSync(
  new URL("../dist/prayers.js", import.meta.url),
  `window.JOOSHAN_PRAYERS = ${JSON.stringify(prayers)};\n`
);
console.log(`Embedded ${prayers.length} prayer sections.`);
