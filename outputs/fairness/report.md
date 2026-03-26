# Fairness & Bias Analysis (Part 3) – Hindi Corpus

## Assumptions
- Corpus: `corpus/hindi_words.txt` (Hindi words, one per line).
- This run uses **5,000 words** to keep runtime practical.
- Tokenizer: Byte-level BPE (vocab size 32K).
- We use **synthetic groups** to simulate language/script variation:
  - `hi` (clean Hindi)
  - `hi_noisy` (minor OCR-like noise)
  - `hi_code_mixed` (Hindi + English token)
  - `hi_romanized` (Romanized prefix)
  - `hi_long` (length-doubled words)
  - `hi_short` (truncated words)

## Outputs
- `outputs/fairness/fairness_dataset.tsv`
- `outputs/fairness/fairness_metrics.csv`
- `outputs/fairness/fairness_metrics.json`

## Metrics Reported
- Average tokens per word per group
- OOV rate per group

## Notes
- This is a **tokenization-only fairness audit** (no downstream classifier yet).
- If a classifier is required, we can add a small baseline next.

## How to Reproduce
```bash
node scripts/fairness_dataset.js corpus/hindi_words.txt outputs/fairness 5000
node scripts/fairness_eval.js outputs/fairness/fairness_dataset.tsv outputs/byte_bpe 32000
```
