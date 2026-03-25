# BPE Report (Part 1) – Hindi Corpus

## Assumptions
- Corpus: `corpus/hindi_words.txt` (Hindi words, one per line).
- Training/test split: 90/10 (random shuffle).
- Target vocab sizes: 8K, 16K, 32K, 64K, 128K, 256K.
- This run used a **subset of 5,000 words** for speed, with a **merge cap of 5,000** to keep runtime practical.
- OOV is computed at **character level** using base vocabulary (characters).
- Tokenization metrics are reported for both train and test splits.

## Outputs
For each vocab size `V`, files are generated in `outputs/bpe/`:
- `bpe_V_vocab.txt`
- `bpe_V_merges.txt`
- `bpe_V_top_tokens.txt`
- `bpe_V_top_merges.txt`
- `bpe_V_examples.txt`

Metrics:
- `metrics.csv`
- `metrics.json`

Plots (SVG):
- `plots/avg_tokens_per_word_test.svg`
- `plots/oov_rate_test.svg`
- `plots/compression_ratio.svg`
- `plots/train_time_ms.svg`
- `plots/tokenization_time_ms.svg`
- `plots/memory_bytes_est.svg`
- `plots/actual_vocab_size.svg`

## Notes
- With small corpora or a merge cap, the **actual vocab size saturates** below the target. This is visible in `actual_vocab_size.svg`.
- For full-scale BPE (true 256K vocabulary), a much larger corpus and higher merge cap are needed.

## How to Reproduce
```bash
node scripts/bpe_train.js corpus/hindi_words.txt outputs/bpe 5000 5000
node scripts/bpe_plot_svg.js
```
