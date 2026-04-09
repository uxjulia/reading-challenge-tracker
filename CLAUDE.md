# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Project Context

This is a javascript project using express.
It is a monorepo with workspaces: reading-challenge-client (client).

The API has 20 routes. See .codesight/routes.md for the full route map with methods, paths, and tags.
The UI has 8 components. See .codesight/components.md for the full list with props.
Middleware includes: auth, cors.

High-impact files (most imported, changes here affect many other files):
- server/db.js (imported by 2 files)
- server/utils.js (imported by 2 files)
- client/src/components/YearPage.jsx (imported by 1 files)
- client/src/components/AdminPage.jsx (imported by 1 files)
- client/src/components/LoginPage.jsx (imported by 1 files)
- client/src/components/StarInput.jsx (imported by 1 files)
- client/src/components/BookModal.jsx (imported by 1 files)
- client/src/components/LoginModal.jsx (imported by 1 files)

Required environment variables (no defaults):
- DEV (client/src/components/YearPage.jsx)
- NODE_ENV (server/index.js)

Read .codesight/wiki/index.md for orientation (WHERE things live). Then read actual source files before implementing. Wiki articles are navigation aids, not implementation guides.
Read .codesight/CODESIGHT.md for the complete AI context map including all routes, schema, components, libraries, config, middleware, and dependency graph.


## Commands

```bash
npm run dev          # Start both server (port 8000) and client (port 5173) concurrently
npm run dev:server   # Server only (nodemon, auto-restarts on changes)
npm run dev:client   # Client only (Vite)
npm run build        # Build the React client to client/dist/
npm start            # Production: serves built client from Express
npm run format       # Format all files with Prettier
npm run format:check # Check formatting without writing
```

There are no tests in this project.

## Architecture

**Monorepo** with two workspaces:
- `server/` — Node.js/Express API, CommonJS
- `client/` — React 18 + Vite SPA, ESM/JSX

In production, Express serves the built client from `client/dist/` and handles all routing. In development, Vite runs on 5173 and proxies API calls to Express on 8000 via CORS.

### Server (`server/`)

| File | Purpose |
|---|---|
| `index.js` | Express app, all route handlers, auth middleware |
| `db.js` | All SQLite queries via better-sqlite3; `initDb()` runs migrations on startup |
| `validation.js` | Input validation helpers (`validateCreate`, `validateUpdate`, `validateGoal`) |
| `utils.js` | `titleCase`, `normalizeBookState`, `computePace`, `computeReadingPace` |
| `scraper.js` | Cover art lookup from Google Books and Open Library APIs; also extracts genre suggestions from Open Library subjects |

**Database** is stored at `data/books.db` (relative to `process.cwd()`). WAL mode enabled. Schema migrations are applied in `initDb()` via a `MIGRATIONS` array — add new `ALTER TABLE` statements there; errors are silently swallowed (idempotent).

**Book state** is mutually exclusive: a book is either `want_to_read`, `currently_reading`, or finished. `normalizeBookState()` in `utils.js` enforces this by clearing conflicting fields before writes.

**Auth** uses `express-session` with session data: `{ userId, username, isAdmin }`. Two middleware guards: `requireAuth` (401 if not logged in) and `requireAdmin` (403 if not admin).

**Public vs. private**: `GET /api/u/:username/year/:year` serves public data (no auth required, `is_private` books filtered out). `GET /api/year/:year` serves the authenticated user's own data including private books.

### Cover & Genre Fetching (`GET /api/cover`)

No auth required. Queries both Google Books and Open Library in parallel and returns:
```json
{
  "google_covers": [{ "url": "...", "page_count": 123 }],
  "openlibrary_covers": [{ "url": "...", "page_count": 123 }],
  "genres": ["Fantasy", "Fiction"]
}
```
- **Covers** come from both sources; Google Books results are listed first in the UI.
- **Genres** come from Open Library subjects only (not Google Books), cleaned and capped at 5.
- In `BookModal`, genre suggestions are auto-fetched on author field blur (if title+author are filled and no covers are loaded yet) and also on manual "Fetch Cover" click. This applies to all reading statuses — there is no status gate on genre fetching or display.
- Caveat: if the cover fetch returns no covers, there is an early return in `handleFetchCover` that skips setting suggested genres even if the API returned them.

### Client (`client/src/`)

| File | Purpose |
|---|---|
| `App.jsx` | React Router v6 routes |
| `components/YearPage.jsx` | Main bookshelf view; all book list rendering, drag-and-drop WTR reordering (`@dnd-kit`) |
| `components/BookModal.jsx` | Add/edit book form with cover art picker |
| `components/LoginPage.jsx` | Login screen |
| `components/AdminPage.jsx` | User management (admin only) |
| `components/StatsModal.jsx` | All-time stats overlay |
| `components/StarInput.jsx` | Half-star rating input |
| `styles.css` | ~1500 lines, dark theme, all styles |

`apiFetch()` in `YearPage.jsx` is the shared API client — always sends `credentials: "include"` and throws on non-2xx with the `detail` field from the response body.

All API routes follow the pattern `/api/...` for book data and `/auth/...` for authentication. Title and author strings are normalized to title case on the server before saving.

## Environment Setup

Copy `.env.example` to `.env`. Required:
- `SECRET_KEY` — session signing key (`openssl rand -hex 32`)
- `APP_PASSWORD` + `USERNAME` — used only once to seed the initial admin user if no users exist

Optional:
- `GOOGLE_BOOKS_API_KEY` — avoids rate limiting on cover art lookup
- `PORT` — defaults to 8000
- `CLIENT_ORIGIN` — defaults to `http://localhost:5173`
