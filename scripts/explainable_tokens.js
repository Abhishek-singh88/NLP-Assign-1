const fs = require("fs");
const path = require("path");

function readLines(filePath) {
  if (!fs.existsSync(filePath)) return [];
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

function applyByteBPE(text, merges) {
  let symbols = wordToSymbols(text);
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
  return symbols.filter((t) => t !== "</w>");
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
    const toks = applyByteBPE(seg, merges);
    for (let j = 0; j < toks.length; j += 1) allTokens.push(toks[j]);
  }
  return allTokens;
}

function estimateSaliency(tokens) {
  // Simple proxy: longer tokens get higher score
  const scores = [];
  for (let i = 0; i < tokens.length; i += 1) {
    scores.push(tokens[i].length);
  }
  const max = Math.max.apply(null, scores.concat([1]));
  return scores.map((s) => s / max);
}

function decodeByteToken(token) {
  const bytes = [];
  const re = /<(\d+)>/g;
  let match = re.exec(token);
  while (match) {
    const v = parseInt(match[1], 10);
    if (!Number.isNaN(v)) bytes.push(v);
    match = re.exec(token);
  }
  if (!bytes.length) return token;
  return Buffer.from(bytes).toString("utf8");
}

function decodeTokens(tokens) {
  const out = [];
  for (let i = 0; i < tokens.length; i += 1) {
    out.push(decodeByteToken(tokens[i]));
  }
  return out;
}

function main() {
  const mergesPath = process.argv[2] || path.join("outputs", "byte_bpe", "byte_bpe_32000_merges.txt");
  const outPath = process.argv[3] || path.join("outputs", "explainable", "explainer_data.json");

  if (!fs.existsSync(mergesPath)) {
    console.error("Merges file not found:", mergesPath);
    process.exit(1);
  }

  const merges = readLines(mergesPath);
  const samples = [
    "हमारा देश भारत विविधताओं से भरा है",
    "शिक्षा और technology दोनों जरूरी हैं",
    "भारत में data science तेजी से बढ़ रहा है"
  ];

  const entries = [];
  for (let i = 0; i < samples.length; i += 1) {
    const text = samples[i];
    const baseline = applyByteBPE(text, merges);
    const scriptAware = tokenizeScriptAware(text, merges);
    const baseSal = estimateSaliency(baseline);
    const saSal = estimateSaliency(scriptAware);
    const baselineDisplay = decodeTokens(baseline);
    const scriptAwareDisplay = decodeTokens(scriptAware);

    entries.push({
      text,
      baseline_tokens: baseline,
      baseline_tokens_display: baselineDisplay,
      baseline_saliency: baseSal,
      script_aware_tokens: scriptAware,
      script_aware_tokens_display: scriptAwareDisplay,
      script_aware_saliency: saSal
    });
  }

  const outDir = path.dirname(outPath);
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify({ samples: entries }, null, 2), "utf8");
  console.log("Explainer data written to", outPath);
}

main();
