const express = require("express");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

app.get("/health", (_req, res) => {
  res.json({ ok: true, mode: "DEMO" });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Demo trading site running on port ${PORT}`);
});
