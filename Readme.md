# OCR Text Extraction Web App

This project is a simple **OCR (Optical Character Recognition) web application** that extracts text from an uploaded image and generates basic text statistics.

---

## Features

- Upload image (Hindi / Bhojpuri supported)
- Extract text using **Tesseract.js**
- Display extracted text on the UI
- Generate text statistics:
  - Number of words
  - Number of sentences
  - Number of characters
  - Average word length
- Download extracted text along with statistics as a **DOCX file**
- Spell checking with edit distances (Hamming, LCS, Levenshtein, Zaro/Jaro)
- Hindi dictionary support via `corpus/hindi_words.txt`

---

## How to Run the OCR App

```bash
node server.js
```

Open:

```
http://localhost:3000/index.html
```

---

## Corpus Assumptions (All Parts)

- `corpus/hindi_words.txt` is the main Hindi corpus.
- One word per line is expected.
- If corpus lines include metadata like `word/TAG`, the spell checker normalizes to just the Hindi word.
- Many experiments use a smaller subset (e.g., 5,000 words) for speed. This is stated in each report.

---

## BPE (Part 1)

This project includes a simple BPE trainer for the Hindi corpus.

**What it does:**
- Trains BPE with vocab sizes: 8K, 16K, 32K, 64K, 128K, 256K.
- Computes average tokens per word, OOV rate, compression ratio, time, and memory.
- Saves merges, vocabulary, top tokens/merges, and examples.
- Generates plots (SVG).

**Run:**

```bash
node scripts/bpe_train.js corpus/hindi_words.txt outputs/bpe 5000 5000
node scripts/bpe_plot_svg.js
```

**Outputs:**
- `outputs/bpe/bpe_<vocab>_vocab.txt`
- `outputs/bpe/bpe_<vocab>_merges.txt`
- `outputs/bpe/bpe_<vocab>_top_tokens.txt`
- `outputs/bpe/bpe_<vocab>_top_merges.txt`
- `outputs/bpe/bpe_<vocab>_examples.txt`
- `outputs/bpe/metrics.json`
- `outputs/bpe/metrics.csv`
- `outputs/bpe/plots/*.svg`
- `outputs/bpe/report.md`

---

## Byte-level BPE (Part 2)

**What it does:**
- Trains byte-level BPE on the Hindi corpus.
- Evaluates robustness with controlled noise:
  - spelling mistakes
  - OCR-like distortions
  - transliteration errors
- Reports token drift, token length increase, vocabulary inflation, and perplexity delta (proxy).

**Run:**

```bash
node scripts/byte_bpe_train.js corpus/hindi_words.txt outputs/byte_bpe 5000 5000
node scripts/byte_bpe_eval.js corpus/hindi_words.txt outputs/byte_bpe 32000 5000
```

**Outputs:**
- `outputs/byte_bpe/byte_bpe_<vocab>_vocab.txt`
- `outputs/byte_bpe/byte_bpe_<vocab>_merges.txt`
- `outputs/byte_bpe/byte_bpe_<vocab>_top_tokens.txt`
- `outputs/byte_bpe/byte_bpe_<vocab>_top_merges.txt`
- `outputs/byte_bpe/byte_bpe_<vocab>_examples.txt`
- `outputs/byte_bpe/metrics.json`
- `outputs/byte_bpe/metrics.csv`
- `outputs/byte_bpe/robustness/robustness_metrics.json`
- `outputs/byte_bpe/robustness/robustness_metrics.csv`
- `outputs/byte_bpe/robustness/*_examples.txt`
- `outputs/byte_bpe/report.md`

---

## Fairness & Bias (Part 3)

**What it does:**
- Builds a synthetic fairness dataset with group variations (noisy, code-mixed, romanized, long/short).
- Reports group-wise tokenization metrics (avg tokens/word, OOV rate).

**Run:**

```bash
node scripts/fairness_dataset.js corpus/hindi_words.txt outputs/fairness 5000
node scripts/fairness_eval.js outputs/fairness/fairness_dataset.tsv outputs/byte_bpe 32000
```

**Outputs:**
- `outputs/fairness/fairness_dataset.tsv`
- `outputs/fairness/fairness_metrics.csv`
- `outputs/fairness/fairness_metrics.json`
- `outputs/fairness/report.md`

---

## Code-mixed Tokenizer (Part 4)

**What it does:**
- Creates Hindi-English code-mixed inputs.
- Compares baseline byte-BPE vs script-aware byte-BPE.
- Reports fragmentation rate and token efficiency.

**Run:**

```bash
node scripts/codemix_dataset.js corpus/hindi_words.txt outputs/codemix 5000
node scripts/codemix_eval.js outputs/codemix/codemix_dataset.tsv outputs/byte_bpe 32000
```

**Outputs:**
- `outputs/codemix/codemix_dataset.tsv`
- `outputs/codemix/codemix_metrics.csv`
- `outputs/codemix/codemix_metrics.json`
- `outputs/codemix/report.md`

---

## Edge Tokenizer (Part 5)

**What it does:**
- Compares greedy longest-match vs trie-based tokenization.
- Measures throughput, memory estimates, and tokens/word.

**Run:**

```bash
node scripts/edge_tokenizer.js outputs/bpe/bpe_32000_vocab.txt corpus/hindi_words.txt 5000
```

**Outputs:**
- `outputs/edge/edge_metrics.json`
- `outputs/edge/edge_metrics.csv`
- `outputs/edge/report.md`

---

## Explainable Tokenizer (Part 6)

**What it does:**
- Provides a simple dashboard for visualizing token boundaries.
- Side-by-side baseline byte-BPE and script-aware tokenization.
- Includes a saliency proxy and case studies.

**Run:**

```bash
node scripts/explainable_tokens.js outputs/byte_bpe/byte_bpe_32000_merges.txt outputs/explainable/explainer_data.json
```

**Open:**

```
http://localhost:3000/outputs/explainable/index.html
```

**Outputs:**
- `outputs/explainable/index.html`
- `outputs/explainable/explainer_data.json`
- `outputs/explainable/report.md`

---

## Tech Stack

### Frontend
- HTML
- CSS
- JavaScript (Fetch API)

### Backend
- Node.js
- Express.js
- Multer (file upload)
- Tesseract.js (OCR)
- CORS

---

## 📂 Project Structure

```bash
NLP Assign-1/
│
├── outputs/
│ ├── bpe/
│ ├── byte_bpe/
│ ├── fairness/
│ ├── codemix/
│ ├── edge/
│ └── explainable/
│
├── uploads/
│
├── corpus/
│ └── hindi_words.txt
│
├── server.js
├── logic.js
├── index.html
├── style.css
├── package.json
└── README.md
```

### OCR Language

- OCR is configured for Hindi (hin)
- Works for Bhojpuri text written in Devanagari script


### screenshot
![OCR App Screenshot](ss2.png)
![OCR App Screenshot](ss.png)
