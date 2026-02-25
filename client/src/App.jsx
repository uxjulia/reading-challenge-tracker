import { useEffect, useMemo, useState } from "react";
import {
  Link,
  Navigate,
  Route,
  Routes,
  useNavigate,
  useParams,
} from "react-router-dom";

const currentYear = new Date().getFullYear();

async function apiFetch(url, options = {}) {
  const res = await fetch(url, {
    credentials: "include",
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!res.ok) {
    let message = "Request failed";
    try {
      const body = await res.json();
      message = body.detail || message;
    } catch {
      // Ignore body parse failures.
    }
    throw new Error(message);
  }

  if (res.status === 204) {
    return null;
  }

  return res.json();
}

function formatDate(dateText) {
  if (!dateText) return null;
  const [year, month, day] = dateText.split("-");
  return `${month}/${day}/${year}`;
}

function titleInitials(title = "") {
  return title.slice(0, 2).toUpperCase();
}

function RatingStars({ value }) {
  if (!value) return null;
  return (
    <span className="overlay-stars">
      {[1, 2, 3, 4, 5].map((i) => {
        if (i <= value) return <span key={i}>★</span>;
        if (i - 1 < value)
          return (
            <span key={i} className="overlay-half-star">
              ★
            </span>
          );
        return <span key={i}>☆</span>;
      })}
    </span>
  );
}

function StarInput({ rating, setRating }) {
  const [hoverRating, setHoverRating] = useState(0);
  const active = hoverRating || rating;

  return (
    <div className="star-rating" role="radiogroup" aria-label="Book rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = star <= active;
        const isHalf =
          !isFull && active % 1 !== 0 && star === Math.ceil(active);

        return (
          <button
            key={star}
            type="button"
            className={`star-btn ${isFull ? "filled" : ""} ${isHalf ? "half" : ""}`.trim()}
            onMouseLeave={() => setHoverRating(0)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const half = e.clientX - rect.left < rect.width / 2;
              setHoverRating(half ? star - 0.5 : star);
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const half = e.clientX - rect.left < rect.width / 2;
              setRating(half ? star - 0.5 : star);
            }}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

function BookModal({
  open,
  onClose,
  initialYear,
  genres,
  book,
  onSave,
  onDelete,
  onFetchCover,
}) {
  const [form, setForm] = useState({
    year: initialYear,
    title: "",
    author: "",
    date_finished: "",
    rating: 0,
    genre: "",
    notes: "",
    cover_url: "",
    is_private: false,
    currently_reading: false,
    want_to_read: false,
    date_started: "",
    page_count: "",
  });

  const [manualUrlOpen, setManualUrlOpen] = useState(false);
  const [coverOptions, setCoverOptions] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusClass, setStatusClass] = useState("");
  const [loadingCover, setLoadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const mode = book ? "edit" : "add";
  const readingStatus = form.want_to_read
    ? "want"
    : form.currently_reading
      ? "reading"
      : "finished";

  useEffect(() => {
    if (!open) return;
    if (!book) {
      setForm((prev) => ({
        ...prev,
        year: initialYear,
      }));
      return;
    }

    setForm({
      year: book.year || initialYear,
      title: book.title || "",
      author: book.author || "",
      date_finished: book.date_finished || "",
      rating: book.rating || 0,
      genre: book.genre || "",
      notes: book.notes || "",
      cover_url: book.cover_url || "",
      is_private: Boolean(book.is_private),
      currently_reading: Boolean(book.currently_reading),
      want_to_read: Boolean(book.want_to_read),
      date_started: book.date_started || "",
      page_count: book.page_count || "",
    });

    if (book.cover_url) {
      setCoverOptions([
        {
          url: book.cover_url,
          source: null,
          page_count: book.page_count || null,
        },
      ]);
    }
  }, [book, initialYear, open]);

  useEffect(() => {
    if (!open) return;
    setManualUrlOpen(false);
    setStatusMessage("");
    setStatusClass("");
    setError("");
    setSaving(false);
    if (!book) {
      setCoverOptions([]);
      setForm({
        year: initialYear,
        title: "",
        author: "",
        date_finished: "",
        rating: 0,
        genre: "",
        notes: "",
        cover_url: "",
        is_private: false,
        currently_reading: false,
        want_to_read: false,
        date_started: "",
        page_count: "",
      });
    }
  }, [open, book, initialYear]);

  if (!open) return null;

  async function handleFetchCover() {
    if (!form.title.trim() || !form.author.trim()) {
      setStatusMessage("Enter a title and author first.");
      setStatusClass("error");
      return;
    }

    setLoadingCover(true);
    setStatusMessage("Fetching cover...");
    setStatusClass("");

    try {
      const data = await onFetchCover(form.title.trim(), form.author.trim());
      const googleCovers = (data.google_covers || []).map((c) => ({
        ...c,
        source: "Google Books",
      }));
      const olCovers = (data.openlibrary_covers || []).map((c) => ({
        ...c,
        source: "Open Library",
      }));
      const allCovers = [...googleCovers, ...olCovers];

      if (!allCovers.length) {
        setStatusMessage("Cover not found - enter a URL manually.");
        setStatusClass("error");
        setManualUrlOpen(true);
        return;
      }

      setCoverOptions(allCovers);
      setForm((prev) => ({
        ...prev,
        cover_url: allCovers[0].url,
        page_count: prev.page_count || allCovers[0].page_count || "",
      }));

      const sources = [];
      if (googleCovers.length) sources.push("Google Books");
      if (olCovers.length) sources.push("Open Library");
      setStatusMessage(`Covers found via ${sources.join(" & ")}`);
      setStatusClass("success");
    } catch {
      setStatusMessage("Could not fetch cover - enter a URL manually.");
      setStatusClass("error");
      setManualUrlOpen(true);
    } finally {
      setLoadingCover(false);
    }
  }

  async function submit(event) {
    event.preventDefault();
    setError("");

    if (!form.title.trim() || !form.author.trim() || !form.year) {
      setError("Title, author, and year are required.");
      return;
    }

    const isReading = readingStatus === "reading";
    const isWant = readingStatus === "want";

    const payload = {
      year: Number(form.year),
      title: form.title.trim(),
      author: form.author.trim(),
      currently_reading: isReading,
      want_to_read: isWant,
      date_finished: isReading || isWant ? null : form.date_finished || null,
      date_started: isReading ? form.date_started || null : null,
      rating: isReading || isWant ? null : form.rating || null,
      genre: isReading || isWant ? null : form.genre.trim() || null,
      notes: isReading || isWant ? null : form.notes.trim() || null,
      cover_url: form.cover_url.trim() || null,
      is_private: Boolean(form.is_private),
      page_count: form.page_count ? Number(form.page_count) : null,
    };

    setSaving(true);
    try {
      await onSave(book?.id, payload);
      onClose();
    } catch (e) {
      setError(e.message || "Failed to save book.");
    } finally {
      setSaving(false);
    }
  }

  function setStatus(status) {
    if (status === "want") {
      setForm((prev) => ({
        ...prev,
        want_to_read: true,
        currently_reading: false,
        date_finished: "",
        date_started: "",
        rating: 0,
        genre: "",
        notes: "",
      }));
      return;
    }

    if (status === "reading") {
      setForm((prev) => ({
        ...prev,
        want_to_read: false,
        currently_reading: true,
        date_finished: "",
        rating: 0,
        genre: "",
        notes: "",
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      want_to_read: false,
      currently_reading: false,
      date_started: "",
    }));
  }

  return (
    <div
      id="add-book-modal"
      className="modal open"
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="modal-content">
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close modal"
          type="button"
        >
          ×
        </button>
        <h2 id="modal-title">{mode === "edit" ? "Edit Book" : "Add Book"}</h2>

        <form id="book-form" noValidate onSubmit={submit}>
          <div className="form-group">
            <label>Status</label>
            <div
              className="status-toggle"
              role="radiogroup"
              aria-label="Reading status"
            >
              <button
                type="button"
                id="status-btn-finished"
                className={`status-btn ${readingStatus === "finished" ? "active" : ""}`}
                onClick={() => setStatus("finished")}
              >
                Finished
              </button>
              <button
                type="button"
                id="status-btn-reading"
                className={`status-btn ${readingStatus === "reading" ? "active" : ""}`}
                onClick={() => setStatus("reading")}
              >
                Currently Reading
              </button>
              <button
                type="button"
                id="status-btn-want"
                className={`status-btn ${readingStatus === "want" ? "active" : ""}`}
                onClick={() => setStatus("want")}
              >
                Want to Read
              </button>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="f-title">Title *</label>
              <input
                type="text"
                id="f-title"
                value={form.title}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, title: e.target.value }))
                }
                required
              />
            </div>
            <div className="form-group">
              <label htmlFor="f-author">Author *</label>
              <input
                type="text"
                id="f-author"
                value={form.author}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, author: e.target.value }))
                }
                required
              />
            </div>
          </div>

          <div className="form-group cover-section">
            <label>Book Cover</label>
            <div className="cover-fetch-row">
              <button
                type="button"
                className="btn-secondary btn-sm"
                onClick={handleFetchCover}
                disabled={loadingCover}
              >
                {loadingCover ? "Fetching..." : "Fetch Cover"}
              </button>
              <span className={`cover-status-text ${statusClass}`}>
                {statusMessage}
              </span>
            </div>

            {coverOptions.length > 0 && (
              <div className="cover-preview-area">
                <div className="cover-options" id="cover-options-container">
                  {coverOptions.map((cover) => (
                    <button
                      type="button"
                      key={cover.url}
                      className={`cover-option ${form.cover_url === cover.url ? "selected" : ""}`}
                      onClick={() =>
                        setForm((prev) => ({
                          ...prev,
                          cover_url: cover.url,
                          page_count: cover.page_count || prev.page_count,
                        }))
                      }
                    >
                      <div className="cover-option-img">
                        <img src={cover.url} alt="Cover option" />
                      </div>
                      {cover.source && (
                        <span className="cover-source-badge">
                          {cover.source}
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="cover-manual-row">
              <button
                type="button"
                className="btn-link btn-sm"
                onClick={() => setManualUrlOpen((v) => !v)}
              >
                Enter image URL manually
              </button>
            </div>

            {manualUrlOpen && (
              <div id="cover-url-group" className="form-group">
                <label htmlFor="f-cover-url">Cover URL</label>
                <input
                  type="url"
                  id="f-cover-url"
                  value={form.cover_url}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, cover_url: e.target.value }))
                  }
                  placeholder="https://..."
                />
              </div>
            )}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="f-year">Challenge Year *</label>
              <input
                type="number"
                id="f-year"
                min="2000"
                max="2100"
                value={form.year}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, year: e.target.value }))
                }
                required
              />
            </div>

            {readingStatus === "finished" && (
              <div className="form-group" id="date-finished-group">
                <label htmlFor="f-date-finished">Date Finished</label>
                <input
                  type="date"
                  id="f-date-finished"
                  value={form.date_finished}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      date_finished: e.target.value,
                    }))
                  }
                />
              </div>
            )}

            {readingStatus === "reading" && (
              <div className="form-group" id="date-started-group">
                <label htmlFor="f-date-started">Date Started</label>
                <input
                  type="date"
                  id="f-date-started"
                  value={form.date_started}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      date_started: e.target.value,
                    }))
                  }
                />
              </div>
            )}
          </div>

          {readingStatus === "finished" && (
            <div className="form-row" id="rating-genre-row">
              <div className="form-group">
                <label>Rating</label>
                <StarInput
                  rating={form.rating || 0}
                  setRating={(value) =>
                    setForm((prev) => ({ ...prev, rating: value }))
                  }
                />
              </div>

              <div className="form-group genre-autocomplete">
                <label htmlFor="f-genre">Genre</label>
                <input
                  type="text"
                  id="f-genre"
                  list="genre-list"
                  value={form.genre}
                  onChange={(e) =>
                    setForm((prev) => ({ ...prev, genre: e.target.value }))
                  }
                  placeholder="e.g. Fantasy"
                />
                <datalist id="genre-list">
                  {genres.map((genre) => (
                    <option key={genre} value={genre} />
                  ))}
                </datalist>
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="f-page-count">Page Count</label>
            <input
              type="number"
              id="f-page-count"
              min="1"
              max="99999"
              value={form.page_count}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, page_count: e.target.value }))
              }
            />
          </div>

          {readingStatus === "finished" && (
            <div className="form-group" id="notes-group">
              <label htmlFor="f-notes">Notes</label>
              <textarea
                id="f-notes"
                rows="3"
                value={form.notes}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, notes: e.target.value }))
                }
              />
            </div>
          )}

          <div className="form-group form-group--checkbox">
            <label className="checkbox-label">
              <input
                type="checkbox"
                id="f-is-private"
                checked={form.is_private}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, is_private: e.target.checked }))
                }
              />
              <span>Private</span>
              <span className="material-symbols-rounded" id="private-lock">
                lock
              </span>
            </label>
          </div>

          {error && (
            <div id="form-error" className="form-error">
              {error}
            </div>
          )}

          <div className="form-actions">
            {book && (
              <button
                type="button"
                id="modal-delete-btn"
                className="btn-danger"
                onClick={() => onDelete(book.id)}
                disabled={saving}
              >
                Delete
              </button>
            )}
            <button type="button" className="btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              id="submit-btn"
              disabled={saving}
            >
              {saving
                ? "Saving..."
                : mode === "edit"
                  ? "Save Changes"
                  : "Add Book"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function LoginModal({ open, onClose, onLogin }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) {
      setPassword("");
      setError("");
      setLoading(false);
    }
  }, [open]);

  if (!open) return null;

  return (
    <div
      id="login-modal"
      className="modal open"
      role="dialog"
      aria-modal="true"
    >
      <div className="modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="modal-content modal-content--narrow">
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          ×
        </button>
        <h2 id="login-modal-title">Login</h2>
        <p className="login-subtitle">Enter your password to make changes.</p>

        <form
          id="login-form"
          noValidate
          onSubmit={async (event) => {
            event.preventDefault();
            setError("");
            setLoading(true);
            try {
              await onLogin(password);
              onClose();
            } catch {
              setError("Incorrect password.");
            } finally {
              setLoading(false);
            }
          }}
        >
          <div className="form-group">
            <label htmlFor="login-password">Password</label>
            <input
              type="password"
              id="login-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoComplete="current-password"
              placeholder="Enter password"
            />
          </div>

          {error && <div className="form-error">{error}</div>}

          <div className="form-actions">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button
              type="submit"
              id="login-submit-btn"
              className="btn-primary"
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function YearPage() {
  const params = useParams();
  const navigate = useNavigate();
  const year = Number(params.year || currentYear);

  const [loading, setLoading] = useState(true);
  const [data, setData] = useState(null);
  const [pageError, setPageError] = useState("");
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [goalEditing, setGoalEditing] = useState(false);
  const [goalDraft, setGoalDraft] = useState("");

  async function load() {
    setLoading(true);
    setPageError("");
    try {
      const result = await apiFetch(`/api/year/${year}`);
      setData(result);
      setGoalDraft(result.goal ?? "");
    } catch (error) {
      setPageError(error.message || "Failed to load page data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year]);

  useEffect(() => {
    const modalOpen = bookModalOpen || loginOpen;
    document.body.style.overflow = modalOpen ? "hidden" : "";

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        if (loginOpen) {
          setLoginOpen(false);
          return;
        }
        if (bookModalOpen) {
          setBookModalOpen(false);
          setEditingBook(null);
        }
      }

      if (
        e.key === "n" &&
        data?.is_authenticated &&
        e.target.tagName !== "INPUT" &&
        e.target.tagName !== "TEXTAREA"
      ) {
        setEditingBook(null);
        setBookModalOpen(true);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => {
      window.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [bookModalOpen, loginOpen, data]);

  const headerTitle = useMemo(() => {
    const appUser = data?.app_user || "My";
    return appUser !== "My"
      ? `${appUser}'s Reading Challenge`
      : "My Reading Challenge";
  }, [data]);

  async function openEditModal(bookId) {
    const book = await apiFetch(`/api/books/${bookId}`);
    setEditingBook(book);
    setBookModalOpen(true);
  }

  async function saveBook(bookId, payload) {
    if (bookId) {
      await apiFetch(`/api/books/${bookId}`, {
        method: "PATCH",
        body: JSON.stringify(payload),
      });
    } else {
      await apiFetch("/api/books", {
        method: "POST",
        body: JSON.stringify(payload),
      });
    }
    await load();
  }

  async function deleteBook(bookId) {
    if (!window.confirm("Delete this book? This cannot be undone.")) return;
    await apiFetch(`/api/books/${bookId}`, { method: "DELETE" });
    setBookModalOpen(false);
    setEditingBook(null);
    await load();
  }

  async function login(password) {
    await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    await load();
  }

  async function logout() {
    await apiFetch("/auth/logout", {
      method: "POST",
      body: "{}",
    });
    await load();
  }

  async function markAsFinished(bookId) {
    const today = new Date().toISOString().split("T")[0];
    const book = await apiFetch(`/api/books/${bookId}`);
    setEditingBook({
      ...book,
      currently_reading: false,
      want_to_read: false,
      date_finished: book.date_finished || today,
    });
    setBookModalOpen(true);
  }

  async function markWantAsReading(bookId) {
    const today = new Date().toISOString().split("T")[0];
    await apiFetch(`/api/books/${bookId}`, {
      method: "PATCH",
      body: JSON.stringify({
        currently_reading: true,
        want_to_read: false,
        date_started: today,
      }),
    });
    await load();
  }

  async function saveGoal() {
    const parsed = goalDraft === "" ? 0 : Number(goalDraft);
    if (!Number.isInteger(parsed) || parsed < 0) {
      setGoalDraft(data.goal ?? "");
      setGoalEditing(false);
      return;
    }

    await apiFetch(`/api/goal/${year}`, {
      method: "PUT",
      body: JSON.stringify({ goal: parsed }),
    });
    setGoalEditing(false);
    await load();
  }

  if (Number.isNaN(year)) {
    return <Navigate to={`/year/${currentYear}`} replace />;
  }

  if (loading || !data) {
    if (pageError) {
      return <div className="app-loading">{pageError}</div>;
    }
    return <div className="app-loading">Loading...</div>;
  }

  return (
    <>
      <header className="app-header">
        <h1>{headerTitle}</h1>
        <div className="header-auth">
          {data.is_authenticated ? (
            <button className="btn-auth" onClick={logout}>
              Logout
            </button>
          ) : (
            <button className="btn-auth" onClick={() => setLoginOpen(true)}>
              Login
            </button>
          )}
        </div>
      </header>

      <nav className="year-tabs" aria-label="Year navigation">
        {data.all_years.map((yr) => (
          <Link
            key={yr}
            to={`/year/${yr}`}
            className={`tab ${yr === year ? "active" : ""}`}
          >
            {yr}
          </Link>
        ))}
      </nav>

      <div className="top-bar">
        <div className="add-book-bar">
          {data.is_authenticated && (
            <button
              className="btn-primary"
              id="add-book-btn"
              onClick={() => {
                setEditingBook(null);
                setBookModalOpen(true);
              }}
            >
              + Add Book
            </button>
          )}
        </div>

        <div className="stats-bar gap">
          <div className="stats-left gap">
            <span className="stat">
              {data.stats.count}
              {goalEditing || data.goal !== null ? (
                <>
                  {" "}
                  /{" "}
                  {goalEditing ? (
                    <input
                      type="number"
                      className="goal-input"
                      min="0"
                      max="9999"
                      value={goalDraft}
                      onChange={(e) => setGoalDraft(e.target.value)}
                      onBlur={saveGoal}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault();
                          e.currentTarget.blur();
                        }
                        if (e.key === "Escape") {
                          setGoalDraft(data.goal ?? "");
                          setGoalEditing(false);
                        }
                      }}
                      autoFocus
                    />
                  ) : (
                    <span id="goal-display">{data.goal}</span>
                  )}
                </>
              ) : null}{" "}
              book{data.stats.count === 1 ? "" : "s"} read
              {data.is_authenticated && !goalEditing && (
                <button
                  className="btn-goal-edit btn-icon"
                  onClick={() => setGoalEditing(true)}
                >
                  <span className="material-symbols-outlined">edit</span>
                </button>
              )}
            </span>

            {data.stats.avg_rating && (
              <>
                <span className="stat-bullet-point">•</span>
                <span className="stat">
                  {Number(data.stats.avg_rating).toFixed(1)} avg rating
                </span>
              </>
            )}
          </div>

          <div className="stats-right gap">
            {data.stats.total_pages > 0 && (
              <>
                <span className="stat-bullet-point">•</span>
                <span className="stat">
                  {data.stats.total_pages.toLocaleString()} pages read
                </span>
              </>
            )}
            {data.reading_pace && (
              <>
                <span className="stat-bullet-point">•</span>
                <span className="stat">{data.reading_pace}</span>
              </>
            )}
          </div>
        </div>
      </div>

      {data.pace && (
        <>
          <div
            className="goal-progress-bar"
            role="progressbar"
            aria-valuenow={data.stats.count}
            aria-valuemin={0}
            aria-valuemax={data.goal}
          >
            <div
              className="goal-progress-fill"
              style={{ width: `${data.pace.pct}%` }}
            />
          </div>
          <div className="goal-pace-info">
            <span className="pace-pct">{data.pace.pct}% complete</span>
            {data.pace.message && (
              <span className={`pace-message pace-${data.pace.sentiment}`}>
                {data.pace.message}
              </span>
            )}
            {data.pace.books_remaining > 0 && (
              <span className="pace-remaining">
                {data.pace.books_remaining} to go
              </span>
            )}
          </div>
        </>
      )}

      {data.currently_reading.length > 0 && (
        <section className="currently-reading-section">
          <h2 className="currently-reading-title">Currently Reading</h2>
          <div className="currently-reading-list">
            {data.currently_reading.map((book) => (
              <div className="cr-book" key={book.id}>
                <div className="cr-cover">
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={`${book.title} cover`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="cr-cover-placeholder">
                      <span>{titleInitials(book.title)}</span>
                    </div>
                  )}
                </div>
                <div className="cr-info">
                  <strong className="cr-title">{book.title}</strong>
                  <span className="cr-author">{book.author}</span>
                  {book.date_started && (
                    <span className="cr-started">
                      Started on {formatDate(book.date_started)}
                      {book.days_reading !== undefined
                        ? ` (${book.days_reading} day${book.days_reading === 1 ? "" : "s"} ago)`
                        : ""}
                    </span>
                  )}
                  {data.is_authenticated && (
                    <div className="cr-actions">
                      <button
                        className="btn-primary btn-sm"
                        onClick={() => markAsFinished(book.id)}
                      >
                        Mark as Finished
                      </button>
                      <button
                        className="btn-secondary btn-sm btn-icon"
                        onClick={() => openEditModal(book.id)}
                      >
                        <span className="material-symbols-outlined">
                          edit_square
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {data.want_to_read.length > 0 && (
        <section className="want-to-read-section">
          <h2 className="want-to-read-title">Want to Read</h2>
          <div className="want-to-read-list">
            {data.want_to_read.map((book) => (
              <div className="wtr-book" key={book.id}>
                <div className="wtr-cover">
                  {book.cover_url ? (
                    <img
                      src={book.cover_url}
                      alt={`${book.title} cover`}
                      loading="lazy"
                    />
                  ) : (
                    <div className="wtr-cover-placeholder">
                      <span>{titleInitials(book.title)}</span>
                    </div>
                  )}
                </div>
                <div className="wtr-info">
                  <strong className="wtr-title">{book.title}</strong>
                  <span className="wtr-author">{book.author}</span>
                  {data.is_authenticated && (
                    <div className="wtr-actions">
                      <button
                        className="btn-primary btn-sm want-to-read-button"
                        onClick={() => markWantAsReading(book.id)}
                      >
                        Start Reading
                      </button>
                      <button
                        className="btn-secondary btn-sm btn-icon"
                        onClick={() => openEditModal(book.id)}
                      >
                        <span className="material-symbols-outlined">
                          edit_square
                        </span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="read-section">
        <h2 className="read-title">Read</h2>
        <div className="bookshelf-grid">
          {data.books.map((book) => (
            <article className="book-card" data-book-id={book.id} key={book.id}>
              <div
                className={`cover-wrapper ${data.is_authenticated ? "editable" : ""}`}
                onClick={() => data.is_authenticated && openEditModal(book.id)}
                role={data.is_authenticated ? "button" : undefined}
                tabIndex={data.is_authenticated ? 0 : undefined}
                onKeyDown={(e) => {
                  if (
                    (e.key === "Enter" || e.key === " ") &&
                    data.is_authenticated
                  ) {
                    openEditModal(book.id);
                  }
                }}
              >
                {book.is_private && (
                  <span className="lock-badge" title="Private">
                    <span className="material-symbols-rounded">lock</span>
                  </span>
                )}

                {book.cover_url ? (
                  <img
                    src={book.cover_url}
                    alt={`${book.title} cover`}
                    loading="lazy"
                  />
                ) : (
                  <div className="cover-placeholder">
                    <span>{titleInitials(book.title)}</span>
                  </div>
                )}

                <div className="book-hover-overlay">
                  <strong className="overlay-title">{book.title}</strong>
                  <span className="overlay-author">{book.author}</span>
                  <RatingStars value={book.rating} />
                  {book.genre && (
                    <span className="overlay-genre">{book.genre}</span>
                  )}
                  {book.date_finished && (
                    <span className="overlay-date">{book.date_finished}</span>
                  )}
                  {data.is_authenticated && (
                    <div className="card-actions">
                      <button
                        className="btn-edit"
                        onClick={(e) => {
                          e.stopPropagation();
                          openEditModal(book.id);
                        }}
                      >
                        Edit
                      </button>
                      <button
                        className="btn-delete"
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteBook(book.id);
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
              </div>
              <p className="card-title-label">{book.title}</p>
            </article>
          ))}
        </div>

        {!data.books.length &&
          !data.currently_reading.length &&
          !data.want_to_read.length && (
            <div className="empty-state">
              <p>No books logged for {year} yet.</p>
              {data.is_authenticated && (
                <button
                  className="btn-link"
                  onClick={() => setBookModalOpen(true)}
                >
                  Add your first book →
                </button>
              )}
            </div>
          )}

        {!data.books.length &&
          (data.currently_reading.length > 0 ||
            data.want_to_read.length > 0) && (
            <div className="empty-state">
              <p>No finished books yet this year.</p>
            </div>
          )}
      </section>

      <footer className="app-footer">
        <a
          href="https://github.com/uxjulia/reading-challenge-tracker"
          className="footer-github-link"
          target="_blank"
          rel="noopener noreferrer"
        >
          <svg
            className="github-icon"
            viewBox="0 0 24 24"
            aria-hidden="true"
            fill="currentColor"
          >
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.3 3.44 9.8 8.21 11.39.6.11.82-.26.82-.58v-2.03c-3.34.72-4.04-1.61-4.04-1.61-.55-1.39-1.34-1.76-1.34-1.76-1.09-.74.08-.73.08-.73 1.2.08 1.84 1.24 1.84 1.24 1.07 1.83 2.81 1.3 3.49 1 .11-.78.42-1.3.76-1.6-2.67-.3-5.47-1.33-5.47-5.93 0-1.31.47-2.38 1.24-3.22-.12-.3-.54-1.52.12-3.18 0 0 1.01-.32 3.3 1.23a11.5 11.5 0 0 1 3-.4c1.02 0 2.04.13 3 .4 2.28-1.55 3.29-1.23 3.29-1.23.66 1.66.24 2.88.12 3.18.77.84 1.24 1.91 1.24 3.22 0 4.61-2.81 5.63-5.48 5.92.43.37.81 1.1.81 2.22v3.29c0 .32.21.7.82.58C20.56 21.8 24 17.3 24 12c0-6.63-5.37-12-12-12z" />
          </svg>
          View on GitHub
        </a>
      </footer>

      <BookModal
        open={bookModalOpen}
        onClose={() => {
          setBookModalOpen(false);
          setEditingBook(null);
        }}
        initialYear={year}
        genres={data.genres || []}
        book={editingBook}
        onSave={saveBook}
        onDelete={deleteBook}
        onFetchCover={(title, author) =>
          apiFetch(
            `/api/cover?title=${encodeURIComponent(title)}&author=${encodeURIComponent(author)}`
          )
        }
      />

      <LoginModal
        open={loginOpen}
        onClose={() => setLoginOpen(false)}
        onLogin={login}
      />
    </>
  );
}

export default function App() {
  return (
    <Routes>
      <Route
        path="/"
        element={<Navigate to={`/year/${currentYear}`} replace />}
      />
      <Route path="/year/:year" element={<YearPage />} />
      <Route
        path="*"
        element={<Navigate to={`/year/${currentYear}`} replace />}
      />
    </Routes>
  );
}
