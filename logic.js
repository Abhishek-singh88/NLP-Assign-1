let currentStats = {};
let normalizedHindiDictionary = [];
let hindiDictionarySet = new Set();
let dictionaryLoaded = false;
const FALLBACK_HINDI_WORDS = ["यह", "है", "और", "में", "का", "की", "के", "से", "पर", "को"];

async function loadHindiDictionary() {
  if (dictionaryLoaded) {
    return;
  }

  try {
    const res = await fetch("./corpus/hindi_words.txt");
    if (!res.ok) {
      throw new Error("dictionary file not found");
    }

    const raw = await res.text();
    const words = raw
      .split(/\r?\n/)
      .map((w) => normalizeWord(w))
      .filter((w) => w && /[\u0900-\u097F]/.test(w));

    const uniqueWords = Array.from(new Set(words));
    if (!uniqueWords.length) {
      throw new Error("dictionary file is empty");
    }

    normalizedHindiDictionary = uniqueWords;
    hindiDictionarySet = new Set(uniqueWords);
    dictionaryLoaded = true;
  } catch (err) {
    normalizedHindiDictionary = FALLBACK_HINDI_WORDS.map((w) => normalizeWord(w));
    hindiDictionarySet = new Set(normalizedHindiDictionary);
    dictionaryLoaded = true;
    console.warn("Hindi dictionary fallback is being used:", err.message);
  }
}

async function uploadImage() {
  const file = document.getElementById("imageInput").files[0];
  if (!file) {
    alert("Please select an image first.");
    return;
  }

  const formData = new FormData();
  formData.append("image", file);

  const res = await fetch("http://localhost:3000/ocr", {
    method: "POST",
    body: formData
  });


  const data = await res.json();
  document.getElementById("output").value = data.text;
  showStats(data.text);
}

function showStats(text) {
  const words = text.trim().split(/\s+/).length;
  const sentences = countSentences(text);
  const characters = text.length;
  const avgWordLength = (characters/words).toFixed(2);

    currentStats = {
    words,
    sentences,
    characters,
    avgWordLength
  };

  document.getElementById("stats").innerHTML = `
    Words: ${words}<br>
    Sentences: ${sentences}<br>
    Characters: ${characters}<br>
    Avg Word Length: ${avgWordLength}
  `;
}

function downloadDoc() {
  const text = document.getElementById("output").value;

  if (!text.trim()) {
    alert("No text to download");
    return;
  }

  const content =
`${text}

Text Statistics:

Number of Words: ${currentStats.words}
Number of Sentences: ${currentStats.sentences}
Number of Characters: ${currentStats.characters}
Average Word Length: ${currentStats.avgWordLength}
`;

  const blob = new Blob([content], { type: "application/msword" });
  const link = document.createElement("a");

  link.href = URL.createObjectURL(blob);
  link.download = "ocr.docx";
  link.click();
}


function countSentences(text) {
  let s = text
    .split(/[।.!?]/)
    .filter(t => t.trim().length > 0);
  if (s.length <= 1) {
    s = text
      .split(/\n+/)
      .filter(t => t.trim().length > 0);
  }

  return s.length;
}

async function checkSpelling() {
  await loadHindiDictionary();

  const text = document.getElementById("output").value;
  if (!text.trim()) {
    alert("No text found. Run OCR first or add text in the box.");
    return;
  }

  const tokens = extractTokens(text);
  if (tokens.length === 0) {
    alert("No valid tokens found for spell checking.");
    return;
  }

  const rows = tokens.map((token) => analyzeToken(token));
  renderSpellResults(rows);
  renderComplexity();
}

function extractTokens(text) {
  const matches = text.match(/[\u0900-\u097F]+/g) || [];
  return matches.filter(Boolean);
}

function normalizeWord(word) {
  return (word || "").toLowerCase().trim();
}

function getCandidates(word) {
  const normalized = normalizeWord(word);
  const byFirstChar = normalizedHindiDictionary.filter((c) => {
    return c[0] === normalized[0] || Math.abs(c.length - normalized.length) <= 2;
  });
  return byFirstChar.length ? byFirstChar : normalizedHindiDictionary;
}

function hammingDistance(a, b) {
  const maxLen = Math.max(a.length, b.length);
  let distance = 0;
  for (let i = 0; i < maxLen; i += 1) {
    const chA = a[i] || "";
    const chB = b[i] || "";
    if (chA !== chB) {
      distance += 1;
    }
  }
  return distance;
}

function lcsLength(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  return dp[a.length][b.length];
}

function levenshteinDistance(a, b) {
  const dp = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
  for (let i = 0; i <= a.length; i += 1) {
    dp[i][0] = i;
  }
  for (let j = 0; j <= b.length; j += 1) {
    dp[0][j] = j;
  }

  for (let i = 1; i <= a.length; i += 1) {
    for (let j = 1; j <= b.length; j += 1) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[a.length][b.length];
}

function jaroDistance(a, b) {
  if (a === b) {
    return 1;
  }
  if (!a.length || !b.length) {
    return 0;
  }

  const matchDistance = Math.floor(Math.max(a.length, b.length) / 2) - 1;
  const aMatches = new Array(a.length).fill(false);
  const bMatches = new Array(b.length).fill(false);
  let matches = 0;

  for (let i = 0; i < a.length; i += 1) {
    const start = Math.max(0, i - matchDistance);
    const end = Math.min(i + matchDistance + 1, b.length);
    for (let j = start; j < end; j += 1) {
      if (bMatches[j] || a[i] !== b[j]) {
        continue;
      }
      aMatches[i] = true;
      bMatches[j] = true;
      matches += 1;
      break;
    }
  }

  if (matches === 0) {
    return 0;
  }

  let t = 0;
  let k = 0;
  for (let i = 0; i < a.length; i += 1) {
    if (!aMatches[i]) {
      continue;
    }
    while (!bMatches[k]) {
      k += 1;
    }
    if (a[i] !== b[k]) {
      t += 1;
    }
    k += 1;
  }
  const transpositions = t / 2;

  return (
    (matches / a.length + matches / b.length + (matches - transpositions) / matches) / 3
  );
}

function partialBackoff(word, knownWords) {
  if (word.length < 5) {
    return null;
  }

  for (let i = word.length - 2; i >= 3; i -= 1) {
    const prefix = word.slice(0, i);
    const suffix = word.slice(i);
    if (knownWords.has(prefix) && suffix.length >= 2 && !knownWords.has(suffix)) {
      return { prefix, suffix };
    }
  }
  return null;
}

function analyzeToken(token) {
  const word = normalizeWord(token);
  const isCorrect = hindiDictionarySet.has(word);

  if (isCorrect) {
    return {
      token,
      reference: token,
      hamming: 0,
      lcs: token.length,
      levenshtein: 0,
      jaro: 1,
      benchmark: "Correct",
      displayWord: token
    };
  }

  let best = null;
  for (const candidate of getCandidates(word)) {
    const ref = normalizeWord(candidate);
    const hamming = hammingDistance(word, ref);
    const lcs = lcsLength(word, ref);
    const levenshtein = levenshteinDistance(word, ref);
    const jaro = jaroDistance(word, ref);

    if (
      !best ||
      levenshtein < best.levenshtein ||
      (levenshtein === best.levenshtein && jaro > best.jaro) ||
      (levenshtein === best.levenshtein && jaro === best.jaro && lcs > best.lcs)
    ) {
      best = { reference: candidate, hamming, lcs, levenshtein, jaro };
    }
  }

  const backoff = partialBackoff(word, hindiDictionarySet);
  const benchmark =
    backoff ? "Partially Correct" : best && (best.levenshtein <= 2 || best.jaro >= 0.88) ? "Wrong (Near)" : "Wrong";

  return {
    token,
    reference: best ? best.reference : "-",
    hamming: best ? best.hamming : "-",
    lcs: best ? best.lcs : "-",
    levenshtein: best ? best.levenshtein : "-",
    jaro: best ? best.jaro : "-",
    benchmark,
    displayWord: backoff
      ? `${token.slice(0, backoff.prefix.length)}<span class="wrong-part">${token.slice(backoff.prefix.length)}</span>`
      : token
  };
}

function renderSpellResults(rows) {
  const summary = {
    correct: rows.filter((r) => r.benchmark === "Correct").length,
    partial: rows.filter((r) => r.benchmark === "Partially Correct").length,
    wrong: rows.filter((r) => r.benchmark.startsWith("Wrong")).length
  };

  document.getElementById("spellSummary").innerHTML = `
    <h3>Spell Check Summary</h3>
    <p>Total Tokens: ${rows.length} | Correct: ${summary.correct} | Partially Correct: ${summary.partial} | Wrong: ${summary.wrong}</p>
  `;

  const header = `
    <table class="spell-table">
      <thead>
        <tr>
          <th>Word</th>
          <th>Reference</th>
          <th>Hamming</th>
          <th>LCS</th>
          <th>Levenshtein</th>
          <th>Zaro (Jaro)</th>
          <th>Benchmark</th>
        </tr>
      </thead>
      <tbody>
  `;

  const body = rows.map((r) => `
    <tr>
      <td>${r.displayWord}</td>
      <td>${r.reference}</td>
      <td>${r.hamming}</td>
      <td>${r.lcs}</td>
      <td>${r.levenshtein}</td>
      <td>${typeof r.jaro === "number" ? r.jaro.toFixed(3) : r.jaro}</td>
      <td>${r.benchmark}</td>
    </tr>
  `).join("");

  const footer = "</tbody></table>";
  document.getElementById("spellResults").innerHTML = header + body + footer;
}

function renderComplexity() {
  document.getElementById("spellResults").insertAdjacentHTML(
    "beforeend",
    `
      <div class="complexity">
        <h3>Complexity (Designed Approach)</h3>
        <p>
          Let N = number of tokens, D = dictionary size, M/L = token/reference lengths.
          Per token we compare with up to D candidates:
          Hamming O(max(M, L)), LCS O(M*L), Levenshtein O(M*L), Jaro O(M+L).
          Overall dominant complexity is O(N * D * M * L).
        </p>
      </div>
    `
  );
}
