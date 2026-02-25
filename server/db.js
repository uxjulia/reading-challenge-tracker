const Database = require("better-sqlite3");
const path = require("path");

const DB_PATH = path.resolve(process.cwd(), "books.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  year INTEGER NOT NULL,
  title TEXT NOT NULL,
  author TEXT NOT NULL,
  date_finished TEXT,
  rating REAL CHECK(rating >= 0.5 AND rating <= 5),
  genre TEXT,
  notes TEXT,
  cover_url TEXT,
  is_private INTEGER NOT NULL DEFAULT 0,
  currently_reading INTEGER NOT NULL DEFAULT 0,
  want_to_read INTEGER NOT NULL DEFAULT 0,
  date_started TEXT,
  page_count INTEGER,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_books_year ON books(year);
CREATE TABLE IF NOT EXISTS reading_goals (
  year INTEGER PRIMARY KEY,
  goal INTEGER NOT NULL CHECK(goal > 0)
);
`;

const MIGRATIONS = [
  "ALTER TABLE books ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE books ADD COLUMN currently_reading INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE books ADD COLUMN want_to_read INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE books ADD COLUMN date_started TEXT",
  "ALTER TABLE books ADD COLUMN page_count INTEGER",
];

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");

function toSqlValue(value) {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return value;
}

function initDb() {
  db.exec(SCHEMA);
  for (const sql of MIGRATIONS) {
    try {
      db.exec(sql);
    } catch {
      // Column already exists.
    }
  }
}

function toBook(row) {
  if (!row) return null;
  return {
    ...row,
    is_private: Boolean(row.is_private),
    currently_reading: Boolean(row.currently_reading),
    want_to_read: Boolean(row.want_to_read),
  };
}

function getBooksForYear(year, includePrivate = true) {
  const privateFilter = includePrivate ? "" : "AND is_private = 0";
  const rows = db
    .prepare(
      `SELECT * FROM books
       WHERE year = ? AND currently_reading = 0 AND want_to_read = 0 ${privateFilter}
       ORDER BY
         CASE WHEN date_finished IS NULL THEN 1 ELSE 0 END,
         date_finished DESC,
         created_at DESC`
    )
    .all(year);
  return rows.map(toBook);
}

function getCurrentlyReading(year, includePrivate = true) {
  const privateFilter = includePrivate ? "" : "AND is_private = 0";
  const rows = db
    .prepare(
      `SELECT * FROM books
       WHERE year = ? AND currently_reading = 1 AND want_to_read = 0 ${privateFilter}
       ORDER BY date_started DESC, created_at DESC`
    )
    .all(year);
  return rows.map(toBook);
}

function getWantToRead(year, includePrivate = true) {
  const privateFilter = includePrivate ? "" : "AND is_private = 0";
  const rows = db
    .prepare(
      `SELECT * FROM books
       WHERE year = ? AND want_to_read = 1 ${privateFilter}
       ORDER BY created_at DESC`
    )
    .all(year);
  return rows.map(toBook);
}

function getAllYears() {
  const currentYear = new Date().getFullYear();
  const rows = db
    .prepare("SELECT DISTINCT year FROM books ORDER BY year DESC")
    .all();
  const years = rows.map((r) => r.year);
  if (!years.includes(currentYear)) {
    years.unshift(currentYear);
  }
  return years;
}

function getYearStats(year, includePrivate = true) {
  const privateFilter = includePrivate ? "" : "AND is_private = 0";
  const row = db
    .prepare(
      `SELECT COUNT(*) as count, AVG(rating) as avg_rating, SUM(page_count) as total_pages
       FROM books
       WHERE year = ? AND currently_reading = 0 AND want_to_read = 0 ${privateFilter}`
    )
    .get(year);

  const genreRows = db
    .prepare(
      `SELECT genre, COUNT(*) as cnt FROM books
       WHERE year = ? AND genre IS NOT NULL AND currently_reading = 0 AND want_to_read = 0 ${privateFilter}
       GROUP BY genre ORDER BY cnt DESC`
    )
    .all(year);

  return {
    count: row.count,
    avg_rating: row.avg_rating,
    total_pages: row.total_pages || 0,
    genres: Object.fromEntries(genreRows.map((r) => [r.genre, r.cnt])),
  };
}

function getAllGenres() {
  const rows = db
    .prepare(
      "SELECT DISTINCT genre FROM books WHERE genre IS NOT NULL ORDER BY genre"
    )
    .all();
  return rows.map((r) => r.genre);
}

function createBook(data) {
  const fields = [
    "year",
    "title",
    "author",
    "date_finished",
    "rating",
    "genre",
    "notes",
    "cover_url",
    "is_private",
    "currently_reading",
    "want_to_read",
    "date_started",
    "page_count",
  ];

  const cols = fields.filter((f) => data[f] !== undefined && data[f] !== null);
  const placeholders = cols.map(() => "?").join(", ");
  const values = cols.map((c) => toSqlValue(data[c]));

  const info = db
    .prepare(`INSERT INTO books (${cols.join(", ")}) VALUES (${placeholders})`)
    .run(...values);
  const row = db
    .prepare("SELECT * FROM books WHERE id = ?")
    .get(info.lastInsertRowid);
  return toBook(row);
}

function getBook(bookId) {
  const row = db.prepare("SELECT * FROM books WHERE id = ?").get(bookId);
  return toBook(row);
}

function updateBook(bookId, data) {
  if (!data || !Object.keys(data).length) {
    return getBook(bookId);
  }
  const keys = Object.keys(data);
  const setClause = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => toSqlValue(data[k]));
  db.prepare(`UPDATE books SET ${setClause} WHERE id = ?`).run(
    ...values,
    bookId
  );
  return getBook(bookId);
}

function deleteBook(bookId) {
  const info = db.prepare("DELETE FROM books WHERE id = ?").run(bookId);
  return info.changes > 0;
}

function getGoal(year) {
  const row = db
    .prepare("SELECT goal FROM reading_goals WHERE year = ?")
    .get(year);
  return row ? row.goal : null;
}

function setGoal(year, goal) {
  if (goal === 0) {
    db.prepare("DELETE FROM reading_goals WHERE year = ?").run(year);
    return 0;
  }
  db.prepare(
    `INSERT INTO reading_goals (year, goal) VALUES (?, ?)
     ON CONFLICT(year) DO UPDATE SET goal = excluded.goal`
  ).run(year, goal);
  return goal;
}

module.exports = {
  initDb,
  getBooksForYear,
  getCurrentlyReading,
  getWantToRead,
  getAllYears,
  getYearStats,
  getAllGenres,
  createBook,
  getBook,
  updateBook,
  deleteBook,
  getGoal,
  setGoal,
};
