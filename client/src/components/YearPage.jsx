import { useState, useEffect, useMemo } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  verticalListSortingStrategy,
  useSortable,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import BookModal from "./BookModal";
import LoginModal from "./LoginModal";
import StarInput from "./StarInput";

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

function SortableWtrBook({ book, isAuthenticated, onStartReading, onEdit }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: book.id, disabled: !isAuthenticated });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div className="wtr-book" ref={setNodeRef} style={style}>
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
        {isAuthenticated && (
          <div className="wtr-actions">
            <button
              className="btn-primary btn-sm want-to-read-button"
              onClick={onStartReading}
            >
              Start Reading
            </button>
            <button className="btn-secondary btn-sm btn-icon" onClick={onEdit}>
              <span className="material-symbols-outlined">edit_square</span>
            </button>
          </div>
        )}
      </div>
      {isAuthenticated && (
        <div className="wtr-drag-handle" {...attributes} {...listeners}>
          <span className="material-symbols-outlined">drag_indicator</span>
        </div>
      )}
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
  const [wtrBooks, setWtrBooks] = useState([]);

  const sensors = useSensors(useSensor(PointerSensor));

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
    if (data) setWtrBooks(data.want_to_read);
  }, [data]);

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

  async function handleWtrDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = wtrBooks.findIndex((b) => b.id === active.id);
    const newIndex = wtrBooks.findIndex((b) => b.id === over.id);
    const reordered = arrayMove(wtrBooks, oldIndex, newIndex);

    setWtrBooks(reordered);
    try {
      await apiFetch("/api/want-to-read/reorder", {
        method: "PUT",
        body: JSON.stringify({ ids: reordered.map((b) => b.id) }),
      });
    } catch {
      setWtrBooks(wtrBooks);
    }
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

      {wtrBooks.length > 0 && (
        <section className="want-to-read-section">
          <h2 className="want-to-read-title">Want to Read</h2>
          <DndContext
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={handleWtrDragEnd}
          >
            <SortableContext
              items={wtrBooks.map((b) => b.id)}
              strategy={verticalListSortingStrategy}
            >
              <div className="want-to-read-list">
                {wtrBooks.map((book) => (
                  <SortableWtrBook
                    key={book.id}
                    book={book}
                    isAuthenticated={data.is_authenticated}
                    onStartReading={() => markWantAsReading(book.id)}
                    onEdit={() => openEditModal(book.id)}
                  />
                ))}
              </div>
            </SortableContext>
          </DndContext>
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
          !wtrBooks.length && (
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
          (data.currently_reading.length > 0 || wtrBooks.length > 0) && (
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

export default YearPage;

// Note: The LoginModal and BookModal components are imported and used in this file, but their implementations are in separate files (LoginModal.jsx and BookModal.jsx respectively).
