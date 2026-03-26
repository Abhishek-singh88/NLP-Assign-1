const fs = require("fs");
const path = require("path");

function readLines(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return raw.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
}

function isDevanagariWord(w) {
  return /[\u0900-\u097F]/.test(w);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

function writeLines(filePath, lines) {
  fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf8");
}

function main() {
  const corpusPath = process.argv[2] || path.join("corpus", "hindi_words.txt");
  const outDir = process.argv[3] || path.join("outputs", "fairness");
  const maxWordsArg = process.argv[4] ? parseInt(process.argv[4], 10) : 0;

  if (!fs.existsSync(corpusPath)) {
    console.error("Corpus file not found:", corpusPath);
    process.exit(1);
  }
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  let words = readLines(corpusPath).filter(isDevanagariWord);
  if (maxWordsArg && words.length > maxWordsArg) {
    words = words.slice(0, maxWordsArg);
  }
  words = shuffle(words);

  // Build synthetic fairness groups
  const groups = [];
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    let group = "hi";
    if (i % 6 === 1) group = "hi_noisy";
    else if (i % 6 === 2) group = "hi_code_mixed";
    else if (i % 6 === 3) group = "hi_romanized";
    else if (i % 6 === 4) group = "hi_long";
    else if (i % 6 === 5) group = "hi_short";

    let text = w;
    if (group === "hi_noisy") {
      text = w + "ं";
    } else if (group === "hi_code_mixed") {
      text = w + " india";
    } else if (group === "hi_romanized") {
      text = "bharat " + w;
    } else if (group === "hi_long") {
      text = w + w;
    } else if (group === "hi_short") {
      text = w.slice(0, Math.max(1, Math.floor(w.length / 2)));
    }

    groups.push({ group, text });
  }

  const lines = groups.map((g) => g.group + "\t" + g.text);
  writeLines(path.join(outDir, "fairness_dataset.tsv"), lines);

  console.log("Fairness dataset written to", path.join(outDir, "fairness_dataset.tsv"));
}

main();
