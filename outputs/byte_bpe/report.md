# Byte-level BPE Robustness Report (Part 2) – Hindi Corpus

## Assumptions
- Corpus: `corpus/hindi_words.txt` (Hindi words, one per line).
- Evaluation uses a **subset of 5,000 words** for speed.
- Tokenizer: byte-level BPE trained with merge cap 5,000.
- Noise types: spelling edits, OCR-like distortions, transliteration errors.
- Perplexity is computed using a **unigram token model** trained on clean tokens (proxy perplexity).

## Outputs
- `outputs/byte_bpe/robustness/robustness_metrics.json`
- `outputs/byte_bpe/robustness/robustness_metrics.csv`
- `outputs/byte_bpe/robustness/spelling_examples.txt`
- `outputs/byte_bpe/robustness/ocr_examples.txt`
- `outputs/byte_bpe/robustness/translit_examples.txt`

## Metrics Reported
- Token drift: fraction of words whose tokenization changes under noise
- Token length increase: avg(tokens/word) noisy – clean
- Vocabulary inflation: unique noisy tokens / unique clean tokens
- Perplexity delta: proxy perplexity increase using unigram LM

## How to Reproduce
```bash
node scripts/byte_bpe_train.js corpus/hindi_words.txt outputs/byte_bpe 5000 5000
node scripts/byte_bpe_eval.js corpus/hindi_words.txt outputs/byte_bpe 32000 5000
```
