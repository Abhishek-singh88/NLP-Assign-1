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
  const outDir = process.argv[3] || path.join("outputs", "codemix");
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

  const enWords = [
    "india", "school", "mobile", "network", "data", "project", "model",
    "health", "market", "train", "bus", "road", "teacher", "student",
    "city", "village", "bank", "police", "doctor", "computer"
  ];

  const lines = [];
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    const en = enWords[i % enWords.length];

    // Different code-mix patterns
    if (i % 3 === 0) {
      lines.push("hi_en\t" + w + " " + en);
    } else if (i % 3 === 1) {
      lines.push("en_hi\t" + en + " " + w);
    } else {
      lines.push("mixed_in_word\t" + w + "-" + en);
    }
  }

  writeLines(path.join(outDir, "codemix_dataset.tsv"), lines);
  console.log("Code-mix dataset written to", path.join(outDir, "codemix_dataset.tsv"));
}

main();
