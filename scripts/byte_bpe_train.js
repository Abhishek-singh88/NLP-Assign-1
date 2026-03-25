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

function buildWordCounts(words) {
  const counts = new Map();
  for (let i = 0; i < words.length; i += 1) {
    const w = words[i];
    counts.set(w, (counts.get(w) || 0) + 1);
  }
  return counts;
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

function getPairCounts(wordSymbols, wordCounts) {
  const pairCounts = new Map();
  for (const [word, count] of wordCounts.entries()) {
    const symbols = wordSymbols.get(word);
    for (let i = 0; i < symbols.length - 1; i += 1) {
      const pair = symbols[i] + " " + symbols[i + 1];
      pairCounts.set(pair, (pairCounts.get(pair) || 0) + count);
    }
  }
  return pairCounts;
}

function mergePair(wordSymbols, pairToMerge) {
  const [a, b] = pairToMerge.split(" ");
  const merged = a + b;

  for (const [word, symbols] of wordSymbols.entries()) {
    const newSymbols = [];
    let i = 0;
    while (i < symbols.length) {
      if (i < symbols.length - 1 && symbols[i] === a && symbols[i + 1] === b) {
        newSymbols.push(merged);
        i += 2;
      } else {
        newSymbols.push(symbols[i]);
        i += 1;
      }
    }
    wordSymbols.set(word, newSymbols);
  }
}

function trainByteBPEOnce(words, maxVocabSize, maxMerges) {
  const wordCounts = buildWordCounts(words);
  const wordSymbols = new Map();

  for (const word of wordCounts.keys()) {
    wordSymbols.set(word, wordToSymbols(word));
  }

  const baseVocab = new Set();
  for (const symbols of wordSymbols.values()) {
    for (let i = 0; i < symbols.length; i += 1) {
      baseVocab.add(symbols[i]);
    }
  }

  const merges = [];
  while (baseVocab.size + merges.length < maxVocabSize) {
    if (maxMerges && merges.length >= maxMerges) {
      break;
    }
    const pairCounts = getPairCounts(wordSymbols, wordCounts);
    let bestPair = null;
    let bestCount = 0;

    for (const [pair, count] of pairCounts.entries()) {
      if (count > bestCount) {
        bestCount = count;
        bestPair = pair;
      }
    }

    if (!bestPair) {
      break;
    }

    merges.push(bestPair);
    mergePair(wordSymbols, bestPair);
  }

  return { merges, baseVocab };
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

  for (let i = 0; i < words.length; i += 1) {
    const tokens = applyByteBPE(words[i], merges);
    const filtered = tokens.filter((t) => t !== "</w>");
    tokensPerWord.push(filtered.length);
    for (let j = 0; j < filtered.length; j += 1) {
      const t = filtered[j];
      tokenFreq.set(t, (tokenFreq.get(t) || 0) + 1);
    }
  }

  return { tokensPerWord, tokenFreq };
}

function avg(arr) {
  if (!arr.length) return 0;
  let sum = 0;
  for (let i = 0; i < arr.length; i += 1) sum += arr[i];
  return sum / arr.length;
}

function nowMs() {
  const [s, ns] = process.hrtime();
  return s * 1000 + ns / 1e6;
}

function estimateMemory(obj) {
  const seen = new Set();
  function sizeOf(o) {
    if (o === null || o === undefined) return 0;
    if (typeof o === "string") return o.length * 2;
    if (typeof o === "number") return 8;
    if (typeof o !== "object") return 0;
    if (seen.has(o)) return 0;
    seen.add(o);
    let bytes = 0;
    if (Array.isArray(o)) {
      for (let i = 0; i < o.length; i += 1) bytes += sizeOf(o[i]);
    } else if (o instanceof Map) {
      for (const [k, v] of o.entries()) {
        bytes += sizeOf(k) + sizeOf(v);
      }
    } else if (o instanceof Set) {
      for (const v of o.values()) bytes += sizeOf(v);
    } else {
      const keys = Object.keys(o);
      for (let i = 0; i < keys.length; i += 1) {
        const k = keys[i];
        bytes += sizeOf(k) + sizeOf(o[k]);
      }
    }
    return bytes;
  }
  return sizeOf(obj);
}

function writeJSON(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf8");
}

function writeLines(filePath, lines) {
  fs.writeFileSync(filePath, lines.join("\n") + "\n", "utf8");
}

function main() {
  const corpusPath = process.argv[2] || path.join("corpus", "hindi_words.txt");
  const outDir = process.argv[3] || path.join("outputs", "byte_bpe");
  const maxWordsArg = process.argv[4] ? parseInt(process.argv[4], 10) : 0;
  const maxMergesArg = process.argv[5] ? parseInt(process.argv[5], 10) : 0;

  if (!fs.existsSync(corpusPath)) {
    console.error("Corpus file not found:", corpusPath);
    process.exit(1);
  }
  if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
  }

  let rawWords = readLines(corpusPath).filter(isDevanagariWord);
  if (maxWordsArg && rawWords.length > maxWordsArg) {
    rawWords = rawWords.slice(0, maxWordsArg);
  }
  const words = shuffle(rawWords.slice());
  const splitIdx = Math.floor(words.length * 0.9);
  const trainWords = words.slice(0, splitIdx);
  const testWords = words.slice(splitIdx);

  const vocabSizes = [8000, 16000, 32000, 64000, 128000, 256000];
  const metrics = [];

  const maxTarget = Math.max.apply(null, vocabSizes);
  const t0 = nowMs();
  const model = trainByteBPEOnce(trainWords, maxTarget, maxMergesArg);
  const trainTime = nowMs() - t0;

  for (let i = 0; i < vocabSizes.length; i += 1) {
    const vocabSize = vocabSizes[i];
    const baseSize = model.baseVocab.size;
    const neededMerges = Math.max(0, vocabSize - baseSize);
    const merges = model.merges.slice(0, neededMerges);

    const vocabSet = new Set(model.baseVocab);
    for (let j = 0; j < merges.length; j += 1) {
      vocabSet.add(merges[j].split(" ").join(""));
    }
    const vocabArray = Array.from(vocabSet).sort();

    const t1 = nowMs();
    const trainTok = tokenizeWords(trainWords, merges);
    const testTok = tokenizeWords(testWords, merges);
    const tokTime = nowMs() - t1;

    const avgTrain = avg(trainTok.tokensPerWord);
    const avgTest = avg(testTok.tokensPerWord);

    const totalChars = trainWords.join("").length + testWords.join("").length;
    const compressionRatio = totalChars ? vocabArray.length / totalChars : 0;

    const memoryBytes = estimateMemory({ vocab: vocabArray, merges });

    const topTokens = Array.from(trainTok.tokenFreq.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 50)
      .map(([t, c]) => t + "\t" + c);

    const topMerges = merges.slice(0, 50);

    const modelPrefix = path.join(outDir, "byte_bpe_" + vocabSize);
    writeLines(modelPrefix + "_vocab.txt", vocabArray);
    writeLines(modelPrefix + "_merges.txt", merges);
    writeLines(modelPrefix + "_top_tokens.txt", topTokens);
    writeLines(modelPrefix + "_top_merges.txt", topMerges);

    const sampleWords = testWords.slice(0, 20);
    const segExamples = sampleWords.map((w) => {
      const toks = applyByteBPE(w, merges).filter((t) => t !== "</w>");
      return w + "\t" + toks.join(" ");
    });
    writeLines(modelPrefix + "_examples.txt", segExamples);

    metrics.push({
      vocab_size: vocabArray.length,
      target_vocab_size: vocabSize,
      train_words: trainWords.length,
      test_words: testWords.length,
      avg_tokens_per_word_train: avgTrain,
      avg_tokens_per_word_test: avgTest,
      compression_ratio: compressionRatio,
      train_time_ms: trainTime,
      tokenization_time_ms: tokTime,
      memory_bytes_est: memoryBytes
    });
  }

  writeJSON(path.join(outDir, "metrics.json"), metrics);

  const csvLines = [
    "vocab_size,target_vocab_size,train_words,test_words,avg_tokens_per_word_train,avg_tokens_per_word_test,compression_ratio,train_time_ms,tokenization_time_ms,memory_bytes_est"
  ];
  for (let i = 0; i < metrics.length; i += 1) {
    const m = metrics[i];
    csvLines.push([
      m.vocab_size,
      m.target_vocab_size,
      m.train_words,
      m.test_words,
      m.avg_tokens_per_word_train,
      m.avg_tokens_per_word_test,
      m.compression_ratio,
      m.train_time_ms,
      m.tokenization_time_ms,
      m.memory_bytes_est
    ].join(","));
  }
  writeLines(path.join(outDir, "metrics.csv"), csvLines);

  console.log("Byte-level BPE training done. Outputs in:", outDir);
}

main();
