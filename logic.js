let currentStats = {};

async function uploadImage() {
  const file = document.getElementById("imageInput").files[0];
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
  const avgWordLength = (characters / words).toFixed(2);

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
