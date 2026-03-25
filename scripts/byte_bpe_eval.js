const fs = require("fs");
const path = require("path");

function readLines(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return raw.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
}

function isDevanagariWord(w) {
  return /[\u0900-\u097F]/.test(w);
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

function tokenizeWords(words, merges) {
  const tokensPerWord = [];
  const tokenFreq = new Map();
  const tokenized = [];

  for (let i = 0; i < words.length; i += 1) {
    const tokens = applyByteBPE(words[i], merges).filter((t) => t !== "</w>");
    tokenized.push(tokens);
    tokensPerWord.push(tokens.length);
    for (let j = 0; j < tokens.length; j += 1) {
      const t = tokens[j];
      tokenFreq.set(t, (tokenFreq.get(t) || 0) + 1);
    }
  }

  return { tokensPerWord, tokenFreq, tokenized };
}

function avg(arr) {
  if (!arr.length) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i += 1) sum += arr[i];
  return sum / arr.length;
}

function noiseSpelling(word) {
  if (word.length < 2) return word;
  const chars = Array.from(word);
  const r = Math.random();
  const idx = Math.floor(Math.random() * chars.length);
  if (r < 0.34) {
    // delete
    chars.splice(idx, 1);
  } else if (r < 0.67) {
    // swap
    if (idx < chars.length - 1) {
      const tmp = chars[idx];
      chars[idx] = chars[idx + 1];
      chars[idx + 1] = tmp;
    }
  } else {
    // substitute
    const repl = "अआइईउऊएऐओऔकखगघचछजझटठडढतथदधनपफबभमयरलवशषसह";
    chars[idx] = repl[Math.floor(Math.random() * repl.length)];
  }
  return chars.join("");
}

const ocrMap = {
  "ी": "ि",
  "ि": "ी",
  "ा": "ै",
  "ै": "ा",
  "ु": "ू",
  "ू": "ु",
  "ं": "ँ",
  "ँ": "ं",
  "श": "ष",
  "ष": "श",
  "द": "ध",
  "ध": "द",
  "ब": "भ",
  "भ": "ब",
  "क": "ख",
  "ख": "क"
};

function noiseOCR(word) {
  const chars = Array.from(word);
  for (let i = 0; i < chars.length; i += 1) {
    if (ocrMap[chars[i]] && Math.random() < 0.25) {
      chars[i] = ocrMap[chars[i]];
    }
  }
  return chars.join("");
}

const translitMap = {
  "अ": "a",
  "आ": "aa",
  "इ": "i",
  "ई": "ee",
  "उ": "u",
  "ऊ": "uu",
  "क": "k",
  "ख": "kh",
  "ग": "g",
  "घ": "gh",
  "च": "ch",
  "छ": "chh",
  "ज": "j",
  "झ": "jh",
  "ट": "t",
  "ठ": "th",
  "ड": "d",
  "ढ": "dh",
  "त": "t",
  "थ": "th",
  "द": "d",
  "ध": "dh",
  "प": "p",
  "फ": "ph",
  "ब": "b",
  "भ": "bh",
  "म": "m",
  "य": "y",
  "र": "r",
  "ल": "l",
  "व": "v",
  "स": "s",
  "ह": "h",
  "ा": "a",
  "ि": "i",
  "ी": "i",
  "ु": "u",
  "ू": "u",
  "े": "e",
  "ै": "ai",
  "ो": "o",
  "ौ": "au"
};

function noiseTranslit(word) {
  const chars = Array.from(word);
  let out = "";
  for (let i = 0; i < chars.length; i += 1) {
    const ch = chars[i];
    if (translitMap[ch] && Math.random() < 0.3) {
      out += translitMap[ch];
    } else {
      out += ch;
    }
  }
  return out;
}

function makeNoisy(words, kind) {
  const out = [];
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    if (kind === "spelling") out.push(noiseSpelling(w));
    else if (kind === "ocr") out.push(noiseOCR(w));
    else if (kind === "translit") out.push(noiseTranslit(w));
    else out.push(w);
  }
  return out;
}

function tokenDrift(cleanTok, noisyTok) {
  let drift = 0;
  for (let i = 0; i < cleanTok.length; i += 1) {
    const a = cleanTok[i];
    const b = noisyTok[i];
    if (a.length !== b.length) {
      drift += 1;
      continue;
    }
    let same = true;
    for (let j = 0; j < a.length; j += 1) {
      if (a[j] !== b[j]) {
        same = false;
        break;
      }
    }
    if (!same) drift += 1;
  }
  return cleanTok.length ? drift / cleanTok.length : 0;
}

function vocabInflation(cleanFreq, noisyFreq) {
  const cleanSet = new Set(cleanFreq.keys());
  const noisySet = new Set(noisyFreq.keys());
  return cleanSet.size ? noisySet.size / cleanSet.size : 0;
}

function buildUnigramLM(tokenFreq) {
  const total = Array.from(tokenFreq.values()).reduce((a, b) => a + b, 0);
  return { tokenFreq, total };
}

function perplexity(lm, tokenized) {
  const eps = 1e-12;
  let nll = 0;
  let count = 0;
  for (let i = 0; i < tokenized.length; i += 1) {
    const toks = tokenized[i];
    for (let j = 0; j < toks.length; j += 1) {
      const t = toks[j];
      const c = lm.tokenFreq.get(t) || 0;
      const p = c > 0 ? c / lm.total : eps;
      nll += -Math.log(p);
      count += 1;
    }
  }
  if (!count) return 0;
  return Math.exp(nll / count);
}

function saveExamples(outPath, examples) {
  const lines = [];
  for (let i = 0; i < examples.length; i += 1) {
    const e = examples[i];
    lines.push(e.word + "\t" + e.noisy + "\t" + e.cleanTokens.join(" ") + "\t" + e.noisyTokens.join(" "));
  }
  fs.writeFileSync(outPath, lines.join("\n") + "\n", "utf8");
}

function main() {
  const corpusPath = process.argv[2] || path.join("corpus", "hindi_words.txt");
  const bpeDir = process.argv[3] || path.join("outputs", "byte_bpe");
  const vocabSize = process.argv[4] || "32000";
  const maxWordsArg = process.argv[5] ? parseInt(process.argv[5], 10) : 0;

  const mergesPath = path.join(bpeDir, "byte_bpe_" + vocabSize + "_merges.txt");
  if (!fs.existsSync(mergesPath)) {
    console.error("Merges file not found:", mergesPath);
    process.exit(1);
  }

  let rawWords = readLines(corpusPath).filter(isDevanagariWord);
  if (maxWordsArg && rawWords.length > maxWordsArg) {
    rawWords = rawWords.slice(0, maxWordsArg);
  }

  const merges = readLines(mergesPath);
  const cleanTok = tokenizeWords(rawWords, merges);
  const cleanAvg = avg(cleanTok.tokensPerWord);
  const cleanVocabSize = cleanTok.tokenFreq.size;

  const lm = buildUnigramLM(cleanTok.tokenFreq);
  const pplClean = perplexity(lm, cleanTok.tokenized);

  const noiseKinds = ["spelling", "ocr", "translit"];
  const results = [];

  for (let i = 0; i < noiseKinds.length; i += 1) {
    const kind = noiseKinds[i];
    const noisy = makeNoisy(rawWords, kind);
    const noisyTok = tokenizeWords(noisy, merges);

    const drift = tokenDrift(cleanTok.tokenized, noisyTok.tokenized);
    const avgNoisy = avg(noisyTok.tokensPerWord);
    const lenIncrease = avgNoisy - cleanAvg;
    const infl = vocabInflation(cleanTok.tokenFreq, noisyTok.tokenFreq);
    const pplNoisy = perplexity(lm, noisyTok.tokenized);

    // Collect a few failure examples with highest token length increase
    const examples = [];
    for (let j = 0; j < rawWords.length; j += 1) {
      const inc = noisyTok.tokensPerWord[j] - cleanTok.tokensPerWord[j];
      if (inc > 0) {
        examples.push({
          inc,
          word: rawWords[j],
          noisy: noisy[j],
          cleanTokens: cleanTok.tokenized[j],
          noisyTokens: noisyTok.tokenized[j]
        });
      }
    }
    examples.sort((a, b) => b.inc - a.inc);
    const topExamples = examples.slice(0, 20);

    const outDir = path.join(bpeDir, "robustness");
    if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
    saveExamples(path.join(outDir, kind + "_examples.txt"), topExamples);

    results.push({
      noise: kind,
      clean_avg_tokens_per_word: cleanAvg,
      noisy_avg_tokens_per_word: avgNoisy,
      token_length_increase: lenIncrease,
      token_drift: drift,
      vocab_inflation: infl,
      ppl_clean: pplClean,
      ppl_noisy: pplNoisy,
      ppl_delta: pplNoisy - pplClean,
      clean_vocab_size: cleanVocabSize,
      noisy_vocab_size: noisyTok.tokenFreq.size
    });
  }

  const outMetrics = path.join(bpeDir, "robustness", "robustness_metrics.json");
  fs.writeFileSync(outMetrics, JSON.stringify(results, null, 2), "utf8");

  const csvLines = [
    "noise,clean_avg_tokens_per_word,noisy_avg_tokens_per_word,token_length_increase,token_drift,vocab_inflation,ppl_clean,ppl_noisy,ppl_delta,clean_vocab_size,noisy_vocab_size"
  ];
  for (let i = 0; i < results.length; i += 1) {
    const r = results[i];
    csvLines.push([
      r.noise,
      r.clean_avg_tokens_per_word,
      r.noisy_avg_tokens_per_word,
      r.token_length_increase,
      r.token_drift,
      r.vocab_inflation,
      r.ppl_clean,
      r.ppl_noisy,
      r.ppl_delta,
      r.clean_vocab_size,
      r.noisy_vocab_size
    ].join(","));
  }
  fs.writeFileSync(path.join(bpeDir, "robustness", "robustness_metrics.csv"), csvLines.join("\n") + "\n", "utf8");

  console.log("Byte-level BPE robustness evaluation done. Outputs in:", path.join(bpeDir, "robustness"));
}

main();
