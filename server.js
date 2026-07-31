const express = require("express");
const cors = require("cors");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const db = require("./db");

const app = express();
const PORT = process.env.PORT || 3000;

const uploadsDir = path.join(__dirname, "public", "uploads");
if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// ---- Multer config for photo uploads ----
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, uploadsDir),
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname) || ".jpg";
    cb(null, `${Date.now()}_${Math.round(Math.random() * 1e6)}${ext}`);
  },
});
const upload = multer({
  storage,
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith("image/")) cb(null, true);
    else cb(new Error("Solo se permiten imágenes"));
  },
});

// ---------- CATEGORIES ----------

app.get("/api/categories", (req, res) => {
  const categories = db.prepare("SELECT * FROM categories ORDER BY id ASC").all();
  res.json(categories);
});

app.post("/api/categories", (req, res) => {
  const { name } = req.body;
  if (!name || !name.trim()) return res.status(400).json({ error: "Nombre requerido" });
  const info = db.prepare("INSERT INTO categories (name) VALUES (?)").run(name.trim());
  const category = db.prepare("SELECT * FROM categories WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(category);
});

app.delete("/api/categories/:id", (req, res) => {
  db.prepare("DELETE FROM categories WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// ---------- COMPETITORS ----------

app.get("/api/categories/:id/competitors", (req, res) => {
  const competitors = db
    .prepare("SELECT * FROM competitors WHERE category_id = ? ORDER BY db_level DESC")
    .all(req.params.id);
  res.json(competitors);
});

app.post("/api/categories/:id/competitors", upload.single("photo"), (req, res) => {
  const { name, car, db_level } = req.body;
  const categoryId = req.params.id;

  if (!name || !car || db_level === undefined || db_level === "") {
    return res.status(400).json({ error: "Nombre, carro y dB son requeridos" });
  }

  const category = db.prepare("SELECT * FROM categories WHERE id = ?").get(categoryId);
  if (!category) return res.status(404).json({ error: "Categoría no encontrada" });

  const photoPath = req.file ? `/uploads/${req.file.filename}` : null;

  const info = db
    .prepare(
      "INSERT INTO competitors (category_id, name, car, db_level, photo_path) VALUES (?, ?, ?, ?, ?)"
    )
    .run(categoryId, name.trim(), car.trim(), parseFloat(db_level), photoPath);

  const competitor = db.prepare("SELECT * FROM competitors WHERE id = ?").get(info.lastInsertRowid);
  res.status(201).json(competitor);
});

app.delete("/api/competitors/:id", (req, res) => {
  const competitor = db.prepare("SELECT * FROM competitors WHERE id = ?").get(req.params.id);
  if (competitor && competitor.photo_path) {
    const filePath = path.join(__dirname, "public", competitor.photo_path);
    fs.unlink(filePath, () => {});
  }
  db.prepare("DELETE FROM competitors WHERE id = ?").run(req.params.id);
  res.json({ ok: true });
});

// Fallback to index.html for any non-API route (simple SPA support)
app.get(/^(?!\/api).*/, (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`Loud and Clear results app running on port ${PORT}`);
});
