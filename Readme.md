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

## BPE (Part 1)

This project includes a simple BPE trainer for the Hindi corpus.

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
├── public/
│ ├── index.html
│ ├── script.js
│ └── style.css
│
├── uploads/
│
├── server.js
├── package.json
└── README.md
```

### OCR Language

- OCR is configured for Hindi (hin)
- Works for Bhojpuri text written in Devanagari script


### screenshot
![OCR App Screenshot](ss2.png)
![OCR App Screenshot](ss.png)
