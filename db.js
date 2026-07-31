const Database = require("better-sqlite3");
const path = require("path");

const db = new Database(path.join(__dirname, "data.db"));

db.pragma("journal_mode = WAL");

db.exec(`
  CREATE TABLE IF NOT EXISTS categories (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    created_at TEXT DEFAULT (datetime('now'))
  );

  CREATE TABLE IF NOT EXISTS competitors (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    category_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    car TEXT NOT NULL,
    db_level REAL NOT NULL,
    photo_path TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
  );
`);

// Seed default categories only if the table is empty (first run)
const count = db.prepare("SELECT COUNT(*) AS n FROM categories").get().n;
if (count === 0) {
  const insert = db.prepare("INSERT INTO categories (name) VALUES (?)");
  const seed = [
    "SPL 0-3000W",
    "SPL 3000-5000W",
    "SPL 5000-8000W",
    "Open Show Cat. 1",
    "Open Show Cat. 2",
    "Open Show Cat. 3",
    "Open Show Cat. 4",
    "Open Show Cat. 5",
  ];
  const insertMany = db.transaction((names) => {
    for (const n of names) insert.run(n);
  });
  insertMany(seed);
}

module.exports = db;
