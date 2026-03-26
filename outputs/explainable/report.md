# Explainable Tokenizer (Part 6)

## What this provides
- A simple HTML dashboard to visualize token boundaries.
- Side‑by‑side view: baseline byte‑BPE vs script‑aware byte‑BPE.
- Saliency proxy (longer tokens highlighted more).
- Case studies embedded from `explainer_data.json`.

## Files
- `outputs/explainable/index.html`
- `outputs/explainable/explainer_data.json`
- `outputs/explainable/report.md`

## How to open
Serve the project and open:

```
http://localhost:3000/outputs/explainable/index.html
```

## How to regenerate
```bash
node scripts/explainable_tokens.js outputs/byte_bpe/byte_bpe_32000_merges.txt outputs/explainable/explainer_data.json
```
