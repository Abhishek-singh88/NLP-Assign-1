const express = require("express");
const multer = require("multer");
const Tesseract = require("tesseract.js");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const upload = multer({ dest: "uploads/" });

app.post("/ocr", upload.single("image"), async (req, res) => {
  try {
    const result = await Tesseract.recognize(
      req.file.path,
      "hin"
    );

    res.json({ text: result.data.text });
  } catch (err) {
    res.status(500).json({ error: "ocr failed" });
  }
});

app.listen(3000, () => {
  console.log("server running on port 3000");
});
