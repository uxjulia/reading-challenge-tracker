require("dotenv").config();

const express = require("express");
const session = require("express-session");
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
const APP_PASSWORD = process.env.APP_PASSWORD || "";
const USERNAME = process.env.USERNAME || "My";
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
  return Boolean(req.session?.authenticated);
}

function requireAuth(req, res, next) {
  if (!isAuthenticated(req)) {
    return res.status(401).json({ detail: "Authentication required" });
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

function buildYearPayload(year, includePrivate) {
  const books = db.getBooksForYear(year, includePrivate);
  const currentlyReading = attachDaysReading(
    db.getCurrentlyReading(year, includePrivate)
  );
  const wantToRead = db.getWantToRead(year, includePrivate);
  const allYears = db.getAllYears();
  const stats = db.getYearStats(year, includePrivate);
  const genres = db.getAllGenres();
  const goal = db.getGoal(year);
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
    app_user: USERNAME,
  };
}

app.get("/auth/status", (req, res) => {
  res.json({
    authenticated: isAuthenticated(req),
    app_user: USERNAME,
  });
});

app.post("/auth/login", (req, res) => {
  const password = req.body?.password;
  if (!APP_PASSWORD) {
    return res.status(503).json({ detail: "APP_PASSWORD is not configured" });
  }
  if (typeof password !== "string" || password !== APP_PASSWORD) {
    return res.status(401).json({ detail: "Incorrect password" });
  }
  req.session.authenticated = true;
  return res.json({ ok: true });
});

app.post("/auth/logout", (req, res) => {
  req.session.destroy(() => {
    res.json({ ok: true });
  });
});

app.get("/api/year/:year", (req, res) => {
  const year = Number(req.params.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return res.status(400).json({ detail: "Invalid year" });
  }
  const payload = buildYearPayload(year, isAuthenticated(req));
  return res.json(payload);
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

app.get("/api/books/:bookId", (req, res) => {
  const bookId = Number(req.params.bookId);
  const book = db.getBook(bookId);
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

    const updated = db.updateBook(bookId, data);
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
  if (!db.deleteBook(bookId)) {
    return res.status(404).json({ detail: "Book not found" });
  }
  return res.status(204).send();
});

app.put("/api/goal/:year", requireAuth, (req, res) => {
  const year = Number(req.params.year);
  if (!Number.isInteger(year) || year < 2000 || year > 2100) {
    return res.status(400).json({ detail: "Invalid year" });
  }

  try {
    const { goal } = validateGoal(req.body || {});
    db.setGoal(year, goal);
    return res.json({ year, goal });
  } catch (error) {
    return res.status(422).json({ detail: error.message || "Invalid payload" });
  }
});

if (process.env.NODE_ENV === "production") {
  const distPath = path.resolve(process.cwd(), "client", "dist");
  app.use(express.static(distPath));

  app.get("/", (_req, res) => {
    res.redirect(`/year/${new Date().getFullYear()}`);
  });

  app.get(["/year/:year", "*"], (_req, res) => {
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.redirect(`${CLIENT_ORIGIN}/year/${new Date().getFullYear()}`);
  });
}

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Reading Challenge server listening on http://localhost:${PORT}`);
});
