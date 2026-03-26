const fs = require("fs");
const path = require("path");

function readLines(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return raw.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
}

function normalizeWord(word) {
  if (!word) return "";
  let w = String(word).trim().toLowerCase();
  const slashIdx = w.indexOf("/");
  if (slashIdx !== -1) w = w.slice(0, slashIdx);
  w = w.replace(/[^\u0900-\u097F]+/g, "");
  return w;
}

function byteToSymbol(b) {
  return "<" + b + ">";
}

function wordToSymbols(word) {
  const buf = Buffer.from(word, "utf8");
  const symbols = [];
  for (let i = 0; i < buf.length; i += 1) {
    symbols.push(byteToSymbol(buf[i]));
  }
  symbols.push("</w>");
  return symbols;
}

function applyByteBPE(word, merges) {
  let symbols = wordToSymbols(word);
  for (let i = 0; i < merges.length; i += 1) {
    const pair = merges[i];
    const [a, b] = pair.split(" ");
    const merged = a + b;
    const newSymbols = [];
    let j = 0;
    while (j < symbols.length) {
      if (j < symbols.length - 1 && symbols[j] === a && symbols[j + 1] === b) {
        newSymbols.push(merged);
        j += 2;
      } else {
        newSymbols.push(symbols[j]);
        j += 1;
      }
    }
    symbols = newSymbols;
  }
  return symbols;
}

function tokenizeWord(word, merges) {
  return applyByteBPE(word, merges).filter((t) => t !== "</w>");
}

function avg(arr) {
  if (!arr.length) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i += 1) sum += arr[i];
  return sum / arr.length;
}

function main() {
  const datasetPath = process.argv[2] || path.join("outputs", "fairness", "fairness_dataset.tsv");
  const bpeDir = process.argv[3] || path.join("outputs", "byte_bpe");
  const vocabSize = process.argv[4] || "32000";

  if (!fs.existsSync(datasetPath)) {
    console.error("Dataset not found:", datasetPath);
    process.exit(1);
  }

  const mergesPath = path.join(bpeDir, "byte_bpe_" + vocabSize + "_merges.txt");
  if (!fs.existsSync(mergesPath)) {
    console.error("Merges file not found:", mergesPath);
    process.exit(1);
  }

  const merges = readLines(mergesPath);
  const rows = readLines(datasetPath).map((line) => {
    const parts = line.split(/\t/);
    return { group: parts[0], text: parts.slice(1).join("\t") };
  });

  const groupStats = new Map();
  for (let i = 0; i < rows.length; i += 1) {
    const g = rows[i].group;
    const text = rows[i].text;
    const tokens = tokenizeWord(text, merges);

    if (!groupStats.has(g)) {
      groupStats.set(g, { count: 0, tokensPerWord: [], oov: 0 });
    }

    const entry = groupStats.get(g);
    entry.count += 1;
    entry.tokensPerWord.push(tokens.length);

    // OOV proxy: if any non-Devanagari character exists in normalized word
    const normalized = normalizeWord(text);
    if (!normalized) {
      entry.oov += 1;
    }
  }

  const results = [];
  for (const [group, stats] of groupStats.entries()) {
    results.push({
      group,
      count: stats.count,
      avg_tokens_per_word: avg(stats.tokensPerWord),
      oov_rate: stats.count ? stats.oov / stats.count : 0
    });
  }

  const outDir = path.join("outputs", "fairness");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, "fairness_metrics.json"), JSON.stringify(results, null, 2), "utf8");

  const csvLines = ["group,count,avg_tokens_per_word,oov_rate"];
  for (let i = 0; i < results.length; i += 1) {
    const r = results[i];
    csvLines.push([r.group, r.count, r.avg_tokens_per_word, r.oov_rate].join(","));
  }
  fs.writeFileSync(path.join(outDir, "fairness_metrics.csv"), csvLines.join("\n") + "\n", "utf8");

  console.log("Fairness metrics written to", outDir);
}

main();
