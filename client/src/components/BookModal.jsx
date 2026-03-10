import { useState, useEffect, useRef } from "react";
import StarInput from "./StarInput";

const getToday = () => new Date().toISOString().split("T")[0];

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
    genre: [],
    notes: "",
    cover_url: "",
    is_private: false,
    currently_reading: false,
    want_to_read: false,
    date_started: "",
    page_count: "",
    has_audiobook: false,
  });

  const [manualUrlOpen, setManualUrlOpen] = useState(false);
  const [coverOptions, setCoverOptions] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusClass, setStatusClass] = useState("");
  const [loadingCover, setLoadingCover] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [genreInput, setGenreInput] = useState("");
  const [genreOpen, setGenreOpen] = useState(false);
  const [genreIndex, setGenreIndex] = useState(-1);
  const [suggestedGenres, setSuggestedGenres] = useState([]);
  const titleRef = useRef(null);

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
    const today = getToday();
    setForm({
      year: book.year || initialYear,
      title: book.title || "",
      author: book.author || "",
      date_finished: book.date_finished || today,
      rating: book.rating || 0,
      genre: book.genre || [],
      notes: book.notes || "",
      cover_url: book.cover_url || "",
      is_private: Boolean(book.is_private),
      currently_reading: Boolean(book.currently_reading),
      want_to_read: Boolean(book.want_to_read),
      has_audiobook: Boolean(book.has_audiobook),
      date_started: book.date_started || today,
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
    setGenreInput("");
    if (!book) {
      const today = getToday();
      const currentYear = new Date().getFullYear();
      const defaultFinishDate =
        Number(initialYear) === currentYear ? today : `${initialYear}-12-31`;
      setCoverOptions([]);
      setSuggestedGenres([]);
      setForm({
        year: initialYear,
        title: "",
        author: "",
        date_finished: defaultFinishDate,
        rating: 0,
        genre: [],
        notes: "",
        cover_url: "",
        is_private: false,
        currently_reading: false,
        want_to_read: false,
        date_started: today,
        page_count: "",
        has_audiobook: false,
      });
    }
  }, [open, book, initialYear]);

  useEffect(() => {
    if (!open) return;
    titleRef.current?.focus();
  }, [open, readingStatus]);

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
      if (data.genres?.length) {
        setSuggestedGenres(data.genres);
      }

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
      genre:
        isReading || isWant ? null : form.genre.length > 0 ? form.genre : null,
      notes: isReading || isWant ? null : form.notes.trim() || null,
      cover_url: form.cover_url.trim() || null,
      is_private: Boolean(form.is_private),
      page_count: form.page_count ? Number(form.page_count) : null,
      has_audiobook: Boolean(form.has_audiobook),
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
        rating: 0,
        genre: [],
        notes: "",
      }));
      return;
    }

    if (status === "reading") {
      setForm((prev) => ({
        ...prev,
        want_to_read: false,
        currently_reading: true,
        rating: 0,
        genre: [],
        notes: "",
      }));
      return;
    }

    setForm((prev) => ({
      ...prev,
      want_to_read: false,
      currently_reading: false,
      // date_started: "",
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
                ref={titleRef}
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
                onBlur={() => {
                  if (
                    form.title.trim() &&
                    form.author.trim() &&
                    !coverOptions.length &&
                    !loadingCover
                  ) {
                    handleFetchCover();
                  }
                }}
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
                inputMode="numeric"
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
                  onChange={(e) => {
                    const val = e.target.value;
                    const yearFromDate = val?.split("-")[0];
                    setForm((prev) => ({
                      ...prev,
                      date_finished: val,
                      ...(yearFromDate?.length === 4 && {
                        year: Number(yearFromDate),
                      }),
                    }));
                  }}
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
                <label>Genre</label>
                {(() => {
                  const filtered = genres.filter(
                    (g) =>
                      g.toLowerCase().includes(genreInput.toLowerCase()) &&
                      !form.genre.includes(g)
                  );
                  function addTag(raw) {
                    const tag = raw.trim().replace(/,+$/, "").trim();
                    if (tag && !form.genre.includes(tag)) {
                      setForm((prev) => ({
                        ...prev,
                        genre: [...prev.genre, tag],
                      }));
                    }
                    setGenreInput("");
                    setGenreOpen(false);
                    setGenreIndex(-1);
                  }
                  return (
                    <>
                      <div className="genre-tag-input">
                        {form.genre.map((g) => (
                          <span key={g} className="genre-tag">
                            {g}
                            <button
                              type="button"
                              aria-label={`Remove ${g}`}
                              onClick={() =>
                                setForm((prev) => ({
                                  ...prev,
                                  genre: prev.genre.filter((x) => x !== g),
                                }))
                              }
                            >
                              ×
                            </button>
                          </span>
                        ))}
                        <input
                          type="text"
                          id="f-genre"
                          value={genreInput}
                          onChange={(e) => {
                            setGenreInput(e.target.value);
                            setGenreOpen(true);
                            setGenreIndex(-1);
                          }}
                          onFocus={() => setGenreOpen(true)}
                          onBlur={() =>
                            setTimeout(() => setGenreOpen(false), 150)
                          }
                          onKeyDown={(e) => {
                            if (
                              (e.key === "Enter" || e.key === ",") &&
                              genreIndex < 0
                            ) {
                              e.preventDefault();
                              if (genreInput.trim()) addTag(genreInput);
                              return;
                            }
                            if (e.key === "Backspace" && genreInput === "") {
                              setForm((prev) => ({
                                ...prev,
                                genre: prev.genre.slice(0, -1),
                              }));
                              return;
                            }
                            if (e.key === "ArrowDown") {
                              e.preventDefault();
                              setGenreIndex((i) =>
                                Math.min(i + 1, filtered.length - 1)
                              );
                            } else if (e.key === "ArrowUp") {
                              e.preventDefault();
                              setGenreIndex((i) => Math.max(i - 1, 0));
                            } else if (e.key === "Enter" && genreIndex >= 0) {
                              e.preventDefault();
                              addTag(filtered[genreIndex]);
                            } else if (e.key === "Escape") {
                              setGenreOpen(false);
                              setGenreIndex(-1);
                            }
                          }}
                          placeholder={
                            form.genre.length === 0 ? "e.g. Fantasy" : ""
                          }
                          autoComplete="off"
                        />
                      </div>
                      {genreOpen && filtered.length > 0 && (
                        <ul className="genre-suggestions">
                          {filtered.map((g, i) => (
                            <li
                              key={g}
                              className={i === genreIndex ? "active" : ""}
                              onMouseDown={() => addTag(g)}
                            >
                              {g}
                            </li>
                          ))}
                        </ul>
                      )}
                      {suggestedGenres.filter((g) => !form.genre.includes(g))
                        .length > 0 && (
                        <div className="genre-suggestions-row">
                          <span className="genre-suggestions-label">
                            Suggested:
                          </span>
                          {suggestedGenres
                            .filter((g) => !form.genre.includes(g))
                            .map((g) => (
                              <button
                                key={g}
                                type="button"
                                className="genre-suggestion-pill"
                                onMouseDown={() => addTag(g)}
                              >
                                {g}
                              </button>
                            ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>
            </div>
          )}

          <div className="form-group">
            <label htmlFor="f-page-count">Page Count</label>
            <input
              type="number"
              inputMode="numeric"
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
          <div className="form-row" id="checkbox-row">
            <div className="form-group form-group--checkbox">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  id="f-is-private"
                  className="checkbox-auto-width"
                  checked={form.is_private}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      is_private: e.target.checked,
                    }))
                  }
                />
                <span>Private</span>
                <span className="material-symbols-rounded" id="private-lock">
                  lock
                </span>
              </label>
            </div>

            <div className="form-group form-group--checkbox">
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  id="f-has-audiobook"
                  className="checkbox-auto-width"
                  checked={form.has_audiobook}
                  onChange={(e) =>
                    setForm((prev) => ({
                      ...prev,
                      has_audiobook: e.target.checked,
                    }))
                  }
                />
                <span style={{ marginRight: "8px" }}>Audiobook</span>
                <span className="material-symbols-rounded">headphones</span>
              </label>
            </div>
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

export default BookModal;
