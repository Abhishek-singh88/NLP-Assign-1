# Edge Tokenizer Report (Part 5) – Hindi Corpus

## Assumptions
- Tokenizer vocabulary from Part 1: `outputs/bpe/bpe_32000_vocab.txt`.
- Evaluation uses **5,000 words** for speed.
- Two implementations compared:
  - Greedy longest-match with hash-set lookup
  - Trie-based longest-match

## Outputs
- `outputs/edge/edge_metrics.json`
- `outputs/edge/edge_metrics.csv`
- `outputs/edge/report.md`

## Metrics Reported
- Tokenization time (greedy vs trie)
- Trie build time
- Approx. memory usage (vocab vs trie)
- Tokens per word (both methods)

## Notes
- Trie-based lookup is typically faster for large vocabularies.
- Memory cost increases with trie structure size.

## How to Reproduce
```bash
node scripts/edge_tokenizer.js outputs/bpe/bpe_32000_vocab.txt corpus/hindi_words.txt 5000
```
