const fs = require("fs");
const path = require("path");

const base = path.resolve(__dirname, "..");
const outDir = path.join(base, "outputs", "bpe");
const plotsDir = path.join(outDir, "plots");
if (!fs.existsSync(plotsDir)) fs.mkdirSync(plotsDir, { recursive: true });

const metricsPath = path.join(outDir, "metrics.csv");
if (!fs.existsSync(metricsPath)) {
  console.error("metrics.csv not found. Run BPE training first.");
  process.exit(1);
}

function parseCSV(csv) {
  const lines = csv.trim().split(/\r?\n/);
  const header = lines.shift().split(",");
  return lines.map((line) => {
    const cols = line.split(",");
    const obj = {};
    for (let i = 0; i < header.length; i += 1) {
      obj[header[i]] = cols[i];
    }
    return obj;
  });
}

function svgLineChart(xs, ys, title, yLabel, outPath) {
  const width = 640;
  const height = 360;
  const padding = 50;

  const minX = Math.min.apply(null, xs);
  const maxX = Math.max.apply(null, xs);
  const minY = Math.min.apply(null, ys);
  const maxY = Math.max.apply(null, ys);

  function scaleX(x) {
    if (maxX === minX) return padding;
    return padding + ((x - minX) / (maxX - minX)) * (width - 2 * padding);
  }

  function scaleY(y) {
    if (maxY === minY) return height - padding;
    return height - padding - ((y - minY) / (maxY - minY)) * (height - 2 * padding);
  }

  let pathD = "";
  for (let i = 0; i < xs.length; i += 1) {
    const x = scaleX(xs[i]);
    const y = scaleY(ys[i]);
    pathD += i === 0 ? `M ${x} ${y}` : ` L ${x} ${y}`;
  }

  const circles = xs.map((x, i) => {
    const cx = scaleX(x);
    const cy = scaleY(ys[i]);
    return `<circle cx="${cx}" cy="${cy}" r="3" fill="#1f77b4" />`;
  }).join("\n");

  const svg = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect x="0" y="0" width="${width}" height="${height}" fill="#ffffff" />
  <text x="${width / 2}" y="24" text-anchor="middle" font-family="sans-serif" font-size="16">${title}</text>
  <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#333" />
  <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#333" />
  <text x="${width / 2}" y="${height - 10}" text-anchor="middle" font-family="sans-serif" font-size="12">Target vocab size</text>
  <text x="15" y="${height / 2}" text-anchor="middle" font-family="sans-serif" font-size="12" transform="rotate(-90 15 ${height / 2})">${yLabel}</text>
  <path d="${pathD}" fill="none" stroke="#1f77b4" stroke-width="2" />
  ${circles}
</svg>`;

  fs.writeFileSync(outPath, svg, "utf8");
}

const rows = parseCSV(fs.readFileSync(metricsPath, "utf8"));
const sizes = rows.map((r) => Number(r.target_vocab_size));

const plots = [
  ["avg_tokens_per_word_test", "Avg tokens/word (test)", "avg_tokens_per_word_test.svg"],
  ["oov_rate_test", "OOV rate (test)", "oov_rate_test.svg"],
  ["compression_ratio", "Compression ratio", "compression_ratio.svg"],
  ["train_time_ms", "Train time (ms)", "train_time_ms.svg"],
  ["tokenization_time_ms", "Tokenization time (ms)", "tokenization_time_ms.svg"],
  ["memory_bytes_est", "Memory (bytes, est)", "memory_bytes_est.svg"],
  ["vocab_size", "Actual vocab size", "actual_vocab_size.svg"],
];

for (const [key, title, filename] of plots) {
  const ys = rows.map((r) => Number(r[key]));
  svgLineChart(sizes, ys, title, title, path.join(plotsDir, filename));
}

console.log("SVG plots written to", plotsDir);
