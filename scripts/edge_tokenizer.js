const fs = require("fs");
const path = require("path");

function readLines(filePath) {
  const raw = fs.readFileSync(filePath, "utf8");
  return raw.split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
}

function nowMs() {
  const [s, ns] = process.hrtime();
  return s * 1000 + ns / 1e6;
}

function tokenizeGreedy(word, vocabSet) {
  // Greedy longest-match subword tokenization
  const tokens = [];
  let i = 0;
  while (i < word.length) {
    let best = null;
    let bestLen = 0;
    for (let j = i + 1; j <= word.length; j += 1) {
      const sub = word.slice(i, j);
      if (vocabSet.has(sub) && sub.length >= bestLen) {
        best = sub;
        bestLen = sub.length;
      }
    }
    if (best) {
      tokens.push(best);
      i += bestLen;
    } else {
      tokens.push(word[i]);
      i += 1;
    }
  }
  return tokens;
}

function buildTrie(vocab) {
  const root = { next: {}, end: false };
  for (let i = 0; i < vocab.length; i += 1) {
    const w = vocab[i];
    let node = root;
    for (let j = 0; j < w.length; j += 1) {
      const ch = w[j];
      if (!node.next[ch]) node.next[ch] = { next: {}, end: false };
      node = node.next[ch];
    }
    node.end = true;
  }
  return root;
}

function tokenizeTrie(word, trie) {
  const tokens = [];
  let i = 0;
  while (i < word.length) {
    let node = trie;
    let lastMatch = -1;
    let j = i;
    while (j < word.length && node.next[word[j]]) {
      node = node.next[word[j]];
      if (node.end) lastMatch = j;
      j += 1;
    }
    if (lastMatch >= i) {
      const tok = word.slice(i, lastMatch + 1);
      tokens.push(tok);
      i = lastMatch + 1;
    } else {
      tokens.push(word[i]);
      i += 1;
    }
  }
  return tokens;
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

function main() {
  const vocabPath = process.argv[2] || path.join("outputs", "bpe", "bpe_32000_vocab.txt");
  const corpusPath = process.argv[3] || path.join("corpus", "hindi_words.txt");
  const maxWordsArg = process.argv[4] ? parseInt(process.argv[4], 10) : 0;

  if (!fs.existsSync(vocabPath)) {
    console.error("Vocab file not found:", vocabPath);
    process.exit(1);
  }
  if (!fs.existsSync(corpusPath)) {
    console.error("Corpus file not found:", corpusPath);
    process.exit(1);
  }

  let vocab = readLines(vocabPath).filter(Boolean);
  let words = readLines(corpusPath).filter(Boolean);
  if (maxWordsArg && words.length > maxWordsArg) {
    words = words.slice(0, maxWordsArg);
  }

  const vocabSet = new Set(vocab);
  const t0 = nowMs();
  const trie = buildTrie(vocab);
  const trieBuildMs = nowMs() - t0;

  const t1 = nowMs();
  let totalTokensGreedy = 0;
  for (let i = 0; i < words.length; i += 1) {
    const toks = tokenizeGreedy(words[i], vocabSet);
    totalTokensGreedy += toks.length;
  }
  const greedyMs = nowMs() - t1;

  const t2 = nowMs();
  let totalTokensTrie = 0;
  for (let i = 0; i < words.length; i += 1) {
    const toks = tokenizeTrie(words[i], trie);
    totalTokensTrie += toks.length;
  }
  const trieMs = nowMs() - t2;

  const memVocab = estimateMemory(vocab);
  const memTrie = estimateMemory(trie);

  const out = {
    vocab_size: vocab.length,
    words: words.length,
    greedy_time_ms: greedyMs,
    trie_build_ms: trieBuildMs,
    trie_time_ms: trieMs,
    greedy_tokens_per_word: totalTokensGreedy / words.length,
    trie_tokens_per_word: totalTokensTrie / words.length,
    mem_vocab_est_bytes: memVocab,
    mem_trie_est_bytes: memTrie
  };

  const outDir = path.join("outputs", "edge");
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(path.join(outDir, "edge_metrics.json"), JSON.stringify(out, null, 2), "utf8");

  const csv = [
    "vocab_size,words,greedy_time_ms,trie_build_ms,trie_time_ms,greedy_tokens_per_word,trie_tokens_per_word,mem_vocab_est_bytes,mem_trie_est_bytes",
    [
      out.vocab_size,
      out.words,
      out.greedy_time_ms,
      out.trie_build_ms,
      out.trie_time_ms,
      out.greedy_tokens_per_word,
      out.trie_tokens_per_word,
      out.mem_vocab_est_bytes,
      out.mem_trie_est_bytes
    ].join(",")
  ].join("\n") + "\n";

  fs.writeFileSync(path.join(outDir, "edge_metrics.csv"), csv, "utf8");
  console.log("Edge tokenizer metrics written to", outDir);
}

main();
