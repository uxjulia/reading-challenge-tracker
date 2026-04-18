import { useState, useEffect, useRef } from "react";
import { X, Lock, Headphones } from "lucide-react";
import { StarInput } from "../UI/StarInput";
import { ReadingStatusToggle } from "../UI/ReadingStatusToggle";
import { GenreAutocomplete } from "../UI/GenreAutocomplete";
import { CoverPicker } from "./CoverPicker";

const getToday = () => new Date().toISOString().split("T")[0];

export function BookModal({ open, onClose, initialYear, genres, book, onSave, onDelete, onFetchCover }) {
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
  const [coverOptions, setCoverOptions] = useState([]);
  const [statusMessage, setStatusMessage] = useState("");
  const [statusClass, setStatusClass] = useState("");
  const [loadingCover, setLoadingCover] = useState(false);
  const [manualUrlOpen, setManualUrlOpen] = useState(false);
  const [suggestedGenres, setSuggestedGenres] = useState([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const titleRef = useRef(null);

  const mode = book ? "edit" : "add";
  const readingStatus = form.want_to_read ? "want" : form.currently_reading ? "reading" : "finished";

  const setField = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  useEffect(() => {
    if (!open) return;
    if (!book) {
      setField("year", initialYear);
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
      setCoverOptions([{ url: book.cover_url, source: null, page_count: book.page_count || null }]);
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
      const googleCovers = (data.google_covers || []).map((c) => ({ ...c, source: "Google Books" }));
      const olCovers = (data.openlibrary_covers || []).map((c) => ({ ...c, source: "Open Library" }));
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
      if (data.genres?.length) setSuggestedGenres(data.genres);

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

  function setStatus(status) {
    if (status === "want") {
      setForm((prev) => ({ ...prev, want_to_read: true, currently_reading: false, rating: 0, notes: "" }));
    } else if (status === "reading") {
      setForm((prev) => ({ ...prev, want_to_read: false, currently_reading: true, rating: 0, notes: "" }));
    } else {
      setForm((prev) => ({ ...prev, want_to_read: false, currently_reading: false }));
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
      genre: form.genre.length > 0 ? form.genre : null,
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

  return (
    <div id="add-book-modal" className="modal open" role="dialog" aria-modal="true">
      <div className="modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="modal-content">
        <div className="modal-header">
          <h2 id="modal-title">{mode === "edit" ? "Edit Book" : "Add Book"}</h2>
          <button className="modal-close" onClick={onClose} aria-label="Close modal" type="button">
            <X size={18} />
          </button>
        </div>
        <div className="modal-body">
          <form id="book-form" noValidate onSubmit={submit}>
            <div className="form-group">
              <label>Status</label>
              <ReadingStatusToggle status={readingStatus} onChange={setStatus} />
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor="f-title">Title *</label>
                <input
                  ref={titleRef}
                  type="text"
                  id="f-title"
                  value={form.title}
                  onChange={(e) => setField("title", e.target.value)}
                  required
                />
              </div>
              <div className="form-group">
                <label htmlFor="f-author">Author *</label>
                <input
                  type="text"
                  id="f-author"
                  value={form.author}
                  onChange={(e) => setField("author", e.target.value)}
                  onBlur={() => {
                    if (form.title.trim() && form.author.trim() && !coverOptions.length && !loadingCover) {
                      handleFetchCover();
                    }
                  }}
                  required
                />
              </div>
            </div>

            <CoverPicker
              coverOptions={coverOptions}
              coverUrl={form.cover_url}
              pageCount={form.page_count}
              statusMessage={statusMessage}
              statusClass={statusClass}
              loadingCover={loadingCover}
              manualUrlOpen={manualUrlOpen}
              onFetch={handleFetchCover}
              onSelectCover={(url, pageCount) =>
                setForm((prev) => ({ ...prev, cover_url: url, page_count: pageCount || prev.page_count }))
              }
              onToggleManual={() => setManualUrlOpen((v) => !v)}
              onManualUrlChange={(url) => setField("cover_url", url)}
            />

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
                  onChange={(e) => setField("year", e.target.value)}
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
                        ...(yearFromDate?.length === 4 && { year: Number(yearFromDate) }),
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
                    onChange={(e) => setField("date_started", e.target.value)}
                  />
                </div>
              )}
            </div>

            {readingStatus === "finished" && (
              <div className="form-group">
                <label>Rating</label>
                <StarInput
                  rating={form.rating || 0}
                  setRating={(value) => setField("rating", value)}
                />
              </div>
            )}

            <GenreAutocomplete
              genres={genres}
              selected={form.genre}
              suggested={suggestedGenres}
              onChange={(genre) => setField("genre", genre)}
            />

            <div className="form-group">
              <label htmlFor="f-page-count">Page Count</label>
              <input
                type="number"
                inputMode="numeric"
                id="f-page-count"
                min="1"
                max="99999"
                value={form.page_count}
                onChange={(e) => setField("page_count", e.target.value)}
              />
            </div>

            {readingStatus === "finished" && (
              <div className="form-group" id="notes-group">
                <label htmlFor="f-notes">Notes</label>
                <textarea
                  id="f-notes"
                  rows="3"
                  value={form.notes}
                  onChange={(e) => setField("notes", e.target.value)}
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
                    onChange={(e) => setField("is_private", e.target.checked)}
                  />
                  <span>Private</span>
                  <Lock size={16} id="private-lock" />
                </label>
              </div>
              <div className="form-group form-group--checkbox">
                <label className="checkbox-label">
                  <input
                    type="checkbox"
                    id="f-has-audiobook"
                    className="checkbox-auto-width"
                    checked={form.has_audiobook}
                    onChange={(e) => setField("has_audiobook", e.target.checked)}
                  />
                  <span style={{ marginRight: "8px" }}>Audiobook</span>
                  <Headphones size={16} />
                </label>
              </div>
            </div>

            {error && <div id="form-error" className="form-error">{error}</div>}

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
              <button type="submit" className="btn-primary" id="submit-btn" disabled={saving}>
                {saving ? "Saving..." : mode === "edit" ? "Save Changes" : "Add Book"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
