require("dotenv").config();

const express = require("express");
const session = require("express-session");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const path = require("path");
const db = require("./db");
const { fetchCoverUrl } = require("./scraper");
const {
  titleCase,
  normalizeBookState,
  computePace,
  computeReadingPace,
} = require("./utils");
const {
  validateCreate,
  validateUpdate,
  validateGoal,
  compactUndefined,
} = require("./validation");

const PORT = Number(process.env.PORT || 8000);
const SECRET_KEY =
  process.env.SECRET_KEY || "dev-secret-key-change-in-production";
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173";

db.initDb();

const app = express();

app.use(express.json());
app.use(
  session({
    secret: SECRET_KEY,
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 86400 * 30 * 1000,
      httpOnly: true,
      sameSite: "lax",
    },
  })
);

if (process.env.NODE_ENV !== "production") {
  app.use(
    cors({
      origin: CLIENT_ORIGIN,
      credentials: true,
    })
  );
}

function isAuthenticated(req) {
  return Boolean(req.session?.userId);
}

function requireAuth(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ detail: "Authentication required" });
  }
  next();
}

function requireAdmin(req, res, next) {
  if (!req.session?.userId) {
    return res.status(401).json({ detail: "Authentication required" });
  }
  if (!req.session?.isAdmin) {
    return res.status(403).json({ detail: "Admin access required" });
  }
  next();
}

function attachDaysReading(books) {
  const today = new Date();
  const safeToday = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  return books.map((book) => {
    if (!book.date_started) {
      return book;
    }
    const started = new Date(`${book.date_started}T00:00:00`);
    const days = Math.floor((safeToday - started) / 86400000);
    return {
      ...book,
      days_reading: Math.max(0, days),
    };
  });
}

function buildYearPayload(year, userId, username, isAdmin, includePrivate) {
  const books = db.getBooksForYear(year, userId, includePrivate);
  const currentlyReading = attachDaysReading(
    db.getCurrentlyReading(year, userId, includePrivate)
  );
  const wantToRead = db.getWantToRead(year, userId, includePrivate);
  const allYears = db.getAllYears(userId);
  const stats = db.getYearStats(year, userId, includePrivate);
  const genres = db.getAllGenres(userId);
  const goal = db.getGoal(year, userId);
  const pace = goal ? computePace(year, stats.count, goal) : null;
  const readingPace = computeReadingPace(books, year);

  return {
    books,
    currently_reading: currentlyReading,
    want_to_read: wantToRead,
    current_year: year,
    all_years: allYears,
    stats,
    genres,
    goal,
    pace,
    reading_pace: readingPace,
    is_authenticated: includePrivate,
    is_admin: isAdmin,
    app_user: username,
  };
}

// ── Auth routes ───────────────────────────────────────────────────────────────

app.get("/auth/status", (req, res) => {
  res.json({
    authenticated: isAuthenticated(req),
    userId: req.session?.userId || null,
    username: req.session?.username || null,
    isAdmin: req.session?.isAdmin || false,
  });
});

app.post("/auth/login", async (req, res) => {
  const { username, password } = req.body || {};
  if (typeof username !== "string" || typeof password !== "string") {
    return res
      .status(400)
      .json({ detail: "username and password are required" });
  }

  const user = db.getUserByUsername(username);
  if (!user) {
    return res.status(401).json({ detail: "Incorrect username or password" });
  }

  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) {
    return res.status(401).json({ detail: "Incorrect username or password" });
  }

  req.session.userId = user.id;
  req.session.username = user.username;
  req.session.isAdmin = Boolean(user.is_admin);

  return res.json({ ok: true, isAdmin: Boolean(user.is_admin) });
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

// ── Admin routes ──────────────────────────────────────────────────────────────

app.get("/admin/users", requireAdmin, (_req, res) => {
  const users = db.getAllUsers();
  return res.json(users);
});

app.post("/admin/users", requireAdmin, async (req, res) => {
  const { username, password, isAdmin } = req.body || {};
  if (typeof username !== "string" || !username.trim()) {
    return res.status(422).json({ detail: "username is required" });
  }
  if (typeof password !== "string" || password.length < 1) {
    return res.status(422).json({ detail: "password is required" });
  }

  const existing = db.getUserByUsername(username.trim());
  if (existing) {
    return res.status(409).json({ detail: "Username already taken" });
  }

  const hash = await bcrypt.hash(password, 10);
  const user = db.createUser(username.trim(), hash, Boolean(isAdmin));
  return res.status(201).json(user);
});

app.patch("/admin/users/:userId/password", requireAdmin, async (req, res) => {
  const userId = Number(req.params.userId);
  const { password } = req.body || {};
  if (typeof password !== "string" || password.length < 1) {
    return res.status(422).json({ detail: "password is required" });
  }

  const user = db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ detail: "User not found" });
  }

  const hash = await bcrypt.hash(password, 10);
  db.updateUserPassword(userId, hash);
  return res.json({ ok: true });
});

app.delete("/admin/users/:userId", requireAdmin, (req, res) => {
  const userId = Number(req.params.userId);
  if (userId === req.session.userId) {
    return res.status(400).json({ detail: "Cannot delete your own account" });
  }

  const user = db.getUserById(userId);
  if (!user) {
    return res.status(404).json({ detail: "User not found" });
  }

  db.deleteUser(userId);
  return res.status(204).send();
});

// ── Book & year routes ────────────────────────────────────────────────────────

app.get("/api/u/:username/year/:year", (req, res) => {
  const year = Number(req.params.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return res.status(400).json({ detail: "Invalid year" });
  }
  const user = db.getUserByUsername(req.params.username);
  if (!user) {
    return res.status(404).json({ detail: "User not found" });
  }
  const payload = buildYearPayload(year, user.id, user.username, false, false);
  return res.json(payload);
});

app.get("/api/year/:year", (req, res) => {
  const year = Number(req.params.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return res.status(400).json({ detail: "Invalid year" });
  }

  if (!isAuthenticated(req)) {
    // Return empty payload for unauthenticated visitors
    return res.json({
      books: [],
      currently_reading: [],
      want_to_read: [],
      current_year: year,
      all_years: [year],
      stats: { count: 0, avg_rating: null, total_pages: 0, genres: {} },
      genres: [],
      goal: null,
      pace: null,
      reading_pace: null,
      is_authenticated: false,
      is_admin: false,
      app_user: null,
    });
  }

  const payload = buildYearPayload(
    year,
    req.session.userId,
    req.session.username,
    req.session.isAdmin,
    true
  );
  return res.json(payload);
});

app.get("/api/stats", requireAuth, (req, res) => {
  const stats = db.getGlobalStats(req.session.userId, true);
  return res.json(stats);
});

app.get("/api/cover", async (req, res) => {
  const title = String(req.query.title || "").trim();
  const author = String(req.query.author || "").trim();
  if (!title || !author) {
    return res.status(400).json({ detail: "title and author are required" });
  }

  const data = await fetchCoverUrl(title, author);
  return res.json(data);
});

app.get("/api/books/:bookId", requireAuth, (req, res) => {
  const bookId = Number(req.params.bookId);
  const book = db.getBook(bookId, req.session.userId);
  if (!book) {
    return res.status(404).json({ detail: "Book not found" });
  }
  return res.json(book);
});

app.post("/api/books", requireAuth, (req, res) => {
  try {
    const validated = validateCreate(req.body || {});
    const data = compactUndefined(validated);
    data.title = titleCase(data.title);
    data.author = titleCase(data.author);
    data.user_id = req.session.userId;

    normalizeBookState(data);
    const created = db.createBook(data);
    return res.status(201).json(created);
  } catch (error) {
    return res.status(422).json({ detail: error.message || "Invalid payload" });
  }
});

app.patch("/api/books/:bookId", requireAuth, (req, res) => {
  const bookId = Number(req.params.bookId);

  try {
    const validated = validateUpdate(req.body || {});
    const data = compactUndefined(validated);

    if (data.title) {
      data.title = titleCase(data.title);
    }
    if (data.author) {
      data.author = titleCase(data.author);
    }

    normalizeBookState(data);

    const updated = db.updateBook(bookId, req.session.userId, data);
    if (!updated) {
      return res.status(404).json({ detail: "Book not found" });
    }
    return res.json(updated);
  } catch (error) {
    return res.status(422).json({ detail: error.message || "Invalid payload" });
  }
});

app.delete("/api/books/:bookId", requireAuth, (req, res) => {
  const bookId = Number(req.params.bookId);
  if (!db.deleteBook(bookId, req.session.userId)) {
    return res.status(404).json({ detail: "Book not found" });
  }
  return res.status(204).send();
});

app.put("/api/want-to-read/reorder", requireAuth, (req, res) => {
  const { ids } = req.body || {};
  if (!Array.isArray(ids) || ids.some((id) => !Number.isInteger(id))) {
    return res.status(422).json({ detail: "ids must be an array of integers" });
  }
  db.reorderWantToRead(ids, req.session.userId);
  return res.json({ ok: true });
});

app.put("/api/goal/:year", requireAuth, (req, res) => {
  const year = Number(req.params.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return res.status(400).json({ detail: "Invalid year" });
  }

  try {
    const { goal } = validateGoal(req.body || {});
    db.setGoal(year, goal, req.session.userId);
    return res.json({ year, goal });
  } catch (error) {
    return res.status(422).json({ detail: error.message || "Invalid payload" });
  }
});

// ── Static / SPA ──────────────────────────────────────────────────────────────

if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(process.cwd(), "client", "dist");
  app.use(express.static(distPath));

  app.get(["/", "/year/:year", "/admin", "/u/:username", "/u/:username/year/:year", "*"], (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
}

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Reading Challenge server listening on http://localhost:${PORT}`);
});
