const fs = require("fs");
const path = require("path");

function readLines(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return raw.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
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

function tokenizeByteBPE(text, merges) {
  const tokens = applyByteBPE(text, merges).filter((t) => t !== "</w>");
  return tokens;
}

function isLatin(ch) {
  return /[A-Za-z]/.test(ch);
}

function isDevanagari(ch) {
  return /[\u0900-\u097F]/.test(ch);
}

function scriptAwareSegments(text) {
  const segments = [];
  let current = "";
  let currentType = "other";

  for (let i = 0; i < text.length; i += 1) {
    const ch = text[i];
    let type = "other";
    if (isLatin(ch)) type = "latin";
    else if (isDevanagari(ch)) type = "devanagari";

    if (current && type !== currentType) {
      segments.push({ type: currentType, value: current });
      current = "";
    }
    currentType = type;
    current += ch;
  }
  if (current) segments.push({ type: currentType, value: current });
  return segments;
}

function tokenizeScriptAware(text, merges) {
  const segments = scriptAwareSegments(text);
  const allTokens = [];
  for (let i = 0; i < segments.length; i += 1) {
    const seg = segments[i].value.trim();
    if (!seg) continue;
    const toks = tokenizeByteBPE(seg, merges);
    for (let j = 0; j < toks.length; j += 1) allTokens.push(toks[j]);
  }
  return allTokens;
}

function avg(arr) {
  if (!arr.length) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i += 1) sum += arr[i];
  return sum / arr.length;
}

function fragmentationRate(tokens) {
  // tokens per character
  let totalChars = 0;
  for (let i = 0; i < tokens.length; i += 1) {
    totalChars += tokens[i].length;
  }
  return totalChars ? tokens.length / totalChars : 0;
}

function main() {
  const datasetPath = process.argv[2] || path.join("outputs", "codemix", "codemix_dataset.tsv");
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

    const tokensBase = tokenizeByteBPE(text, merges);
    const tokensSA = tokenizeScriptAware(text, merges);

    if (!groupStats.has(g)) {
      groupStats.set(g, {
        count: 0,
        baseTokenCounts: [],
        saTokenCounts: [],
        baseFrag: [],
        saFrag: []
      });
    }

    const entry = groupStats.get(g);
    entry.count += 1;
    entry.baseTokenCounts.push(tokensBase.length);
    entry.saTokenCounts.push(tokensSA.length);
    entry.baseFrag.push(fragmentationRate(tokensBase));
    entry.saFrag.push(fragmentationRate(tokensSA));
  }

  const results = [];
  for (const [group, stats] of groupStats.entries()) {
    results.push({
      group,
      count: stats.count,
      avg_tokens_base: avg(stats.baseTokenCounts),
      avg_tokens_script_aware: avg(stats.saTokenCounts),
      frag_rate_base: avg(stats.baseFrag),
      frag_rate_script_aware: avg(stats.saFrag)
    });
  }

  const outDir = path.join("outputs", "codemix");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  fs.writeFileSync(path.join(outDir, "codemix_metrics.json"), JSON.stringify(results, null, 2), "utf8");

  const csvLines = [
    "group,count,avg_tokens_base,avg_tokens_script_aware,frag_rate_base,frag_rate_script_aware"
  ];
  for (let i = 0; i < results.length; i += 1) {
    const r = results[i];
    csvLines.push([
      r.group,
      r.count,
      r.avg_tokens_base,
      r.avg_tokens_script_aware,
      r.frag_rate_base,
      r.frag_rate_script_aware
    ].join(","));
  }
  fs.writeFileSync(path.join(outDir, "codemix_metrics.csv"), csvLines.join("\n") + "\n", "utf8");

  console.log("Code-mix evaluation written to", outDir);
}

main();
