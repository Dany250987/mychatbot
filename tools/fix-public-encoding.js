const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..", "public");
const validExtensions = new Set([".html", ".js", ".css"]);

const replacements = [
  ["Ã¡", "á"],
  ["Ã©", "é"],
  ["Ã­", "í"],
  ["Ã³", "ó"],
  ["Ãº", "ú"],
  ["Ã±", "ñ"],
  ["Ã¼", "ü"],

  ["ÃÁ", "Á"],
  ["ÃÉ", "É"],
  ["ÃÍ", "Í"],
  ["ÃÓ", "Ó"],
  ["ÃÚ", "Ú"],
  ["ÃÑ", "Ñ"],

  ["Â¿", "¿"],
  ["Â¡", "¡"],
  ["Â°", "°"],

  ["â€¦", "…"],
  ["â€“", "–"],
  ["â€”", "—"],
  ["â€œ", "“"],
  ["â€", "”"],
  ["â€™", "’"],

  ["ÔÇ£", "“"],
  ["ÔÇØ", "”"],
  ["ÔÇÖ", "’"],
  ["ÔÇô", "–"],
  ["ÔÇö", "—"],
  ["ÔÜá´©Å", "⚠️"]
];

let changedFiles = 0;

function walk(directory) {
  const entries = fs.readdirSync(directory, { withFileTypes: true });

  for (const entry of entries) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      walk(fullPath);
      continue;
    }

    const extension = path.extname(entry.name).toLowerCase();

    if (!validExtensions.has(extension)) {
      continue;
    }

    let content = fs.readFileSync(fullPath, "utf8");
    const originalContent = content;

    for (const [badText, goodText] of replacements) {
      content = content.split(badText).join(goodText);
    }

    if (content !== originalContent) {
      fs.writeFileSync(fullPath, content, "utf8");
      changedFiles++;
      console.log("Corregido:", fullPath);
    }
  }
}

walk(root);

console.log("Archivos modificados:", changedFiles);
