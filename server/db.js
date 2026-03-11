const Database = require("better-sqlite3");
const bcrypt = require("bcryptjs");
const path = require("path");

const DB_PATH = path.resolve(process.cwd(), "data/books.db");

const SCHEMA = `
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  is_admin INTEGER NOT NULL DEFAULT 0,
  created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS books (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
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
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER REFERENCES users(id),
  year INTEGER NOT NULL,
  goal INTEGER NOT NULL CHECK(goal > 0),
  UNIQUE(user_id, year)
);
`;

const MIGRATIONS = [
  "ALTER TABLE books ADD COLUMN is_private INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE books ADD COLUMN currently_reading INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE books ADD COLUMN want_to_read INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE books ADD COLUMN date_started TEXT",
  "ALTER TABLE books ADD COLUMN page_count INTEGER",
  "ALTER TABLE books ADD COLUMN wtr_sort_order INTEGER",
  "ALTER TABLE books ADD COLUMN has_audiobook INTEGER NOT NULL DEFAULT 0",
  "ALTER TABLE books ADD COLUMN user_id INTEGER REFERENCES users(id)",
  "ALTER TABLE reading_goals ADD COLUMN user_id INTEGER",
  "ALTER TABLE reading_goals ADD COLUMN id INTEGER",
  "CREATE UNIQUE INDEX IF NOT EXISTS idx_goals_user_year ON reading_goals(user_id, year)",
];

const db = new Database(DB_PATH);

db.pragma("journal_mode = WAL");

function toSqlValue(value) {
  if (typeof value === "boolean") {
    return value ? 1 : 0;
  }
  return value;
}

function serializeGenre(genre) {
  if (!genre || (Array.isArray(genre) && genre.length === 0)) return null;
  return JSON.stringify(genre);
}

function migrateReadingGoals() {
  // The old schema had `year INTEGER PRIMARY KEY`, which prevents multiple users
  // having goals for the same year. Detect this and recreate the table if needed.
  const cols = db.prepare("PRAGMA table_info(reading_goals)").all();
  const yearCol = cols.find((c) => c.name === "year");
  if (!yearCol || yearCol.pk !== 1) {
    // Already on new schema (year is not the primary key).
    return;
  }
  db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS reading_goals_new (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER REFERENCES users(id),
        year INTEGER NOT NULL,
        goal INTEGER NOT NULL CHECK(goal > 0),
        UNIQUE(user_id, year)
      )
    `);
    db.exec(
      "INSERT INTO reading_goals_new (year, goal) SELECT year, goal FROM reading_goals"
    );
    db.exec("DROP TABLE reading_goals");
    db.exec("ALTER TABLE reading_goals_new RENAME TO reading_goals");
  })();
}

function migrateGenresToJson() {
  const rows = db
    .prepare("SELECT id, genre FROM books WHERE genre IS NOT NULL")
    .all();
  const update = db.prepare("UPDATE books SET genre = ? WHERE id = ?");
  for (const row of rows) {
    try {
      const parsed = JSON.parse(row.genre);
      if (Array.isArray(parsed)) continue; // already migrated
    } catch {
      // not JSON — migrate
    }
    const tags = row.genre
      .split(/,\s*/)
      .map((s) => s.trim())
      .filter(Boolean);
    update.run(JSON.stringify(tags), row.id);
  }
}

function initDb() {
  db.exec(SCHEMA);
  migrateReadingGoals();
  migrateGenresToJson();
  for (const sql of MIGRATIONS) {
    try {
      db.exec(sql);
    } catch {
      // Column/index already exists.
    }
  }

  // Seed admin user from env vars if no users exist yet.
  const adminRow = db.prepare("SELECT COUNT(*) as c FROM users").get();
  if (adminRow.c === 0 && process.env.APP_PASSWORD) {
    const hash = bcrypt.hashSync(process.env.APP_PASSWORD, 10);
    const username = process.env.USERNAME || "admin";
    const info = db
      .prepare(
        "INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, 1)"
      )
      .run(username, hash);
    const adminId = info.lastInsertRowid;
    db.prepare("UPDATE books SET user_id = ? WHERE user_id IS NULL").run(
      adminId
    );
    db.prepare(
      "UPDATE reading_goals SET user_id = ? WHERE user_id IS NULL"
    ).run(adminId);
  }
}

function toBook(row) {
  if (!row) return null;
  let genre = null;
  if (row.genre) {
    try {
      const parsed = JSON.parse(row.genre);
      genre = Array.isArray(parsed) ? parsed : [parsed];
    } catch {
      // legacy plain string — wrap in array
      genre = [row.genre];
    }
  }
  return {
    ...row,
    genre,
    is_private: Boolean(row.is_private),
    currently_reading: Boolean(row.currently_reading),
    want_to_read: Boolean(row.want_to_read),
    has_audiobook: Boolean(row.has_audiobook),
  };
}

// ── User management ──────────────────────────────────────────────────────────

function getUserByUsername(username) {
  return (
    db
      .prepare("SELECT * FROM users WHERE LOWER(username) = LOWER(?)")
      .get(username) || null
  );
}

function getUserById(id) {
  return db.prepare("SELECT * FROM users WHERE id = ?").get(id) || null;
}

function getAllUsers() {
  return db
    .prepare(
      "SELECT id, username, is_admin, created_at FROM users ORDER BY created_at ASC"
    )
    .all();
}

function createUser(username, passwordHash, isAdmin = false) {
  const info = db
    .prepare(
      "INSERT INTO users (username, password_hash, is_admin) VALUES (?, ?, ?)"
    )
    .run(username, passwordHash, isAdmin ? 1 : 0);
  return getUserById(info.lastInsertRowid);
}

function updateUserPassword(userId, passwordHash) {
  db.prepare("UPDATE users SET password_hash = ? WHERE id = ?").run(
    passwordHash,
    userId
  );
}

function deleteUser(userId) {
  db.transaction(() => {
    db.prepare("DELETE FROM books WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM reading_goals WHERE user_id = ?").run(userId);
    db.prepare("DELETE FROM users WHERE id = ?").run(userId);
  })();
}

// ── Books ─────────────────────────────────────────────────────────────────────

function getBooksForYear(year, userId, includePrivate = true) {
  const privateFilter = includePrivate ? "" : "AND is_private = 0";
  const rows = db
    .prepare(
      `SELECT * FROM books
       WHERE year = ? AND user_id = ? AND currently_reading = 0 AND want_to_read = 0 ${privateFilter}
       ORDER BY
         CASE WHEN date_finished IS NULL THEN 1 ELSE 0 END,
         date_finished DESC,
         created_at DESC`
    )
    .all(year, userId);
  return rows.map(toBook);
}

function getCurrentlyReading(year, userId, includePrivate = true) {
  const privateFilter = includePrivate ? "" : "AND is_private = 0";
  const rows = db
    .prepare(
      `SELECT * FROM books
       WHERE year = ? AND user_id = ? AND currently_reading = 1 AND want_to_read = 0 ${privateFilter}
       ORDER BY date_started DESC, created_at DESC`
    )
    .all(year, userId);
  return rows.map(toBook);
}

function getWantToRead(year, userId, includePrivate = true) {
  const privateFilter = includePrivate ? "" : "AND is_private = 0";
  const rows = db
    .prepare(
      `SELECT * FROM books
       WHERE year = ? AND user_id = ? AND want_to_read = 1 ${privateFilter}
       ORDER BY
         CASE WHEN wtr_sort_order IS NULL THEN 1 ELSE 0 END,
         wtr_sort_order ASC,
         created_at DESC`
    )
    .all(year, userId);
  return rows.map(toBook);
}

function reorderWantToRead(ids, userId) {
  const update = db.prepare(
    "UPDATE books SET wtr_sort_order = ? WHERE id = ? AND user_id = ? AND want_to_read = 1"
  );
  db.transaction(() => {
    ids.forEach((id, index) => update.run(index, id, userId));
  })();
}

function getAllYears(userId) {
  const currentYear = new Date().getFullYear();
  const rows = db
    .prepare(
      "SELECT DISTINCT year FROM books WHERE user_id = ? ORDER BY year DESC"
    )
    .all(userId);
  const years = rows.map((r) => r.year);
  if (!years.includes(currentYear)) {
    years.unshift(currentYear);
  }
  return years;
}

function getYearStats(year, userId, includePrivate = true) {
  const privateFilter = includePrivate ? "" : "AND is_private = 0";
  const row = db
    .prepare(
      `SELECT COUNT(*) as count, AVG(rating) as avg_rating, SUM(page_count) as total_pages
       FROM books
       WHERE year = ? AND user_id = ? AND currently_reading = 0 AND want_to_read = 0 ${privateFilter}`
    )
    .get(year, userId);

  const genreRows = db
    .prepare(
      `SELECT j.value as genre, COUNT(*) as cnt
       FROM books, json_each(books.genre) j
       WHERE year = ? AND user_id = ? AND genre IS NOT NULL AND currently_reading = 0 AND want_to_read = 0 ${privateFilter}
       GROUP BY j.value ORDER BY cnt DESC`
    )
    .all(year, userId);

  return {
    count: row.count,
    avg_rating: row.avg_rating,
    total_pages: row.total_pages || 0,
    genres: Object.fromEntries(genreRows.map((r) => [r.genre, r.cnt])),
  };
}

function getAllGenres(userId) {
  const rows = db
    .prepare(
      `SELECT DISTINCT j.value as genre
       FROM books, json_each(books.genre) j
       WHERE user_id = ? AND genre IS NOT NULL
       ORDER BY j.value`
    )
    .all(userId);
  return rows.map((r) => r.genre);
}

function createBook(data) {
  const fields = [
    "user_id",
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
    "has_audiobook",
  ];

  const processed = { ...data, genre: serializeGenre(data.genre) };
  const cols = fields.filter(
    (f) => processed[f] !== undefined && processed[f] !== null
  );
  const placeholders = cols.map(() => "?").join(", ");
  const values = cols.map((c) => toSqlValue(processed[c]));

  const info = db
    .prepare(`INSERT INTO books (${cols.join(", ")}) VALUES (${placeholders})`)
    .run(...values);
  const row = db
    .prepare("SELECT * FROM books WHERE id = ?")
    .get(info.lastInsertRowid);
  return toBook(row);
}

function getBook(bookId, userId) {
  const row = db
    .prepare("SELECT * FROM books WHERE id = ? AND user_id = ?")
    .get(bookId, userId);
  return toBook(row);
}

function updateBook(bookId, userId, data) {
  if (!data || !Object.keys(data).length) {
    return getBook(bookId, userId);
  }
  const processed = { ...data, ...(data.genre !== undefined && { genre: serializeGenre(data.genre) }) };
  const keys = Object.keys(processed);
  const setClause = keys.map((k) => `${k} = ?`).join(", ");
  const values = keys.map((k) => toSqlValue(processed[k]));
  db.prepare(`UPDATE books SET ${setClause} WHERE id = ? AND user_id = ?`).run(
    ...values,
    bookId,
    userId
  );
  return getBook(bookId, userId);
}

function deleteBook(bookId, userId) {
  const info = db
    .prepare("DELETE FROM books WHERE id = ? AND user_id = ?")
    .run(bookId, userId);
  return info.changes > 0;
}

function getGlobalStats(userId, includePrivate = true) {
  const privateFilter = includePrivate ? "" : "AND is_private = 0";

  const totals = db
    .prepare(
      `SELECT COUNT(*) as total_books,
              SUM(page_count) as total_pages,
              AVG(rating) as avg_rating,
              COUNT(DISTINCT author) as total_authors
       FROM books
       WHERE user_id = ? AND currently_reading = 0 AND want_to_read = 0 ${privateFilter}`
    )
    .get(userId);

  const topAuthors = db
    .prepare(
      `SELECT author, COUNT(*) as count, ROUND(AVG(rating), 1) as avg_rating
       FROM books
       WHERE user_id = ? AND currently_reading = 0 AND want_to_read = 0 ${privateFilter}
       GROUP BY author
       ORDER BY count DESC, avg_rating DESC
       LIMIT 5`
    )
    .all(userId);

  const topRatedAuthors = db
    .prepare(
      `SELECT author, COUNT(*) as count, ROUND(AVG(rating), 1) as avg_rating
       FROM books
       WHERE user_id = ? AND rating IS NOT NULL AND currently_reading = 0 AND want_to_read = 0 ${privateFilter}
       GROUP BY author
       HAVING COUNT(*) >= 3
       ORDER BY avg_rating DESC, count DESC
       LIMIT 5`
    )
    .all(userId);

  const topGenres = db
    .prepare(
      `SELECT j.value as genre, COUNT(*) as count
       FROM books, json_each(books.genre) j
       WHERE user_id = ? AND genre IS NOT NULL AND currently_reading = 0 AND want_to_read = 0 ${privateFilter}
       GROUP BY j.value
       ORDER BY count DESC
       LIMIT 5`
    )
    .all(userId);

  const booksByYear = db
    .prepare(
      `SELECT year, COUNT(*) as count
       FROM books
       WHERE user_id = ? AND currently_reading = 0 AND want_to_read = 0 ${privateFilter}
       GROUP BY year
       ORDER BY count DESC`
    )
    .all(userId);

  const topMonth = db
    .prepare(
      `SELECT strftime('%m', date_finished) as month, COUNT(*) as count
       FROM books
       WHERE user_id = ? AND date_finished IS NOT NULL AND currently_reading = 0 AND want_to_read = 0 ${privateFilter}
       GROUP BY month
       ORDER BY count DESC
       LIMIT 1`
    )
    .get(userId);

  const longestBook = db
    .prepare(
      `SELECT title, author, page_count
       FROM books
       WHERE user_id = ? AND page_count IS NOT NULL AND currently_reading = 0 AND want_to_read = 0 ${privateFilter}
       ORDER BY page_count DESC
       LIMIT 1`
    )
    .get(userId);

  return {
    totals: {
      books: totals.total_books,
      pages: totals.total_pages || 0,
      avg_rating: totals.avg_rating,
      authors: totals.total_authors,
    },
    top_authors: topAuthors,
    top_rated_authors: topRatedAuthors,
    top_genres: topGenres,
    books_by_year: booksByYear,
    top_month: topMonth || null,
    longest_book: longestBook || null,
  };
}

function getGoal(year, userId) {
  const row = db
    .prepare("SELECT goal FROM reading_goals WHERE year = ? AND user_id = ?")
    .get(year, userId);
  return row ? row.goal : null;
}

function setGoal(year, goal, userId) {
  if (goal === 0) {
    db.prepare("DELETE FROM reading_goals WHERE year = ? AND user_id = ?").run(
      year,
      userId
    );
    return 0;
  }
  db.prepare(
    `INSERT INTO reading_goals (year, goal, user_id) VALUES (?, ?, ?)
     ON CONFLICT(user_id, year) DO UPDATE SET goal = excluded.goal`
  ).run(year, goal, userId);
  return goal;
}

module.exports = {
  initDb,
  // Users
  getUserByUsername,
  getUserById,
  getAllUsers,
  createUser,
  updateUserPassword,
  deleteUser,
  // Books
  getBooksForYear,
  getCurrentlyReading,
  getWantToRead,
  reorderWantToRead,
  getAllYears,
  getYearStats,
  getAllGenres,
  getGlobalStats,
  createBook,
  getBook,
  updateBook,
  deleteBook,
  // Goals
  getGoal,
  setGoal,
};
