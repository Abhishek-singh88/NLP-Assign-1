# Code-mixed Tokenizer Evaluation (Part 4) – Hindi Corpus

## Assumptions
- Corpus: `corpus/hindi_words.txt`.
- This run uses **5,000 words** to keep runtime practical.
- Tokenizer: Byte-level BPE (vocab size 32K).
- We create **code-mixed synthetic data** by mixing Hindi with English words.

## Dataset
`outputs/codemix/codemix_dataset.tsv` contains three types:
- `hi_en` (Hindi + English)
- `en_hi` (English + Hindi)
- `mixed_in_word` (Hindi-Word-EN combined)

## Tokenizers Compared
1. **Baseline byte-BPE** (no script segmentation)
2. **Script-aware byte-BPE** (splits by script boundaries before tokenization)

## Metrics Reported
- Average tokens per input
- Fragmentation rate (tokens per character)

## Outputs
- `outputs/codemix/codemix_metrics.csv`
- `outputs/codemix/codemix_metrics.json`
- `outputs/codemix/report.md`

## How to Reproduce
```bash
node scripts/codemix_dataset.js corpus/hindi_words.txt outputs/codemix 5000
node scripts/codemix_eval.js outputs/codemix/codemix_dataset.tsv outputs/byte_bpe 32000
```
