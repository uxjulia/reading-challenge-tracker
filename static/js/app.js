"use strict";

// ── State ────────────────────────────────────────────────────────────────────
let editingBookId = null;
let fetchedCoverUrl = null;
let coverFetchController = null;
let selectedRating = 0;
let hoverRating = 0;
let currentReadingStatus = "finished"; // 'finished' | 'reading' | 'want'

// ── Modal ────────────────────────────────────────────────────────────────────
function openAddModal() {
  editingBookId = null;
  fetchedCoverUrl = null;
  resetForm();
  document.getElementById("modal-title").textContent = "Add Book";
  document.getElementById("submit-btn").textContent = "Add Book";

  // Default year to current year
  const currentYear = parseInt(document.body.dataset.currentYear, 10);
  document.getElementById("f-year").value = currentYear;

  setReadingStatus("finished");
  document.getElementById("modal-delete-btn").hidden = true;
  populateGenreDatalist();
  openModal();
}

async function openEditModal(bookId) {
  editingBookId = bookId;
  fetchedCoverUrl = null;
  resetForm();
  document.getElementById("modal-title").textContent = "Edit Book";
  document.getElementById("submit-btn").textContent = "Save Changes";

  try {
    const res = await fetch(`/api/books/${bookId}`);
    if (!res.ok) throw new Error("Failed to load book");
    const book = await res.json();

    document.getElementById("f-title").value = book.title || "";
    document.getElementById("f-author").value = book.author || "";
    document.getElementById("f-year").value = book.year || "";
    document.getElementById("f-genre").value = book.genre || "";
    document.getElementById("f-notes").value = book.notes || "";
    document.getElementById("f-page-count").value = book.page_count || "";
    document.getElementById("f-is-private").checked = !!book.is_private;

    if (book.want_to_read) {
      setReadingStatus("want");
    } else if (book.currently_reading) {
      setReadingStatus("reading");
      document.getElementById("f-date-started").value = book.date_started || "";
    } else {
      setReadingStatus("finished");
      document.getElementById("f-date-finished").value =
        book.date_finished || "";
    }

    if (book.cover_url) {
      fetchedCoverUrl = book.cover_url;
      showCoverOptions([{ url: book.cover_url, source: null }]);
    }

    if (book.rating) {
      setRating(book.rating);
    }
  } catch (e) {
    showFormError("Could not load book data.");
  }

  document.getElementById("modal-delete-btn").hidden = false;
  populateGenreDatalist();
  openModal();
}

async function markAsFinished(bookId) {
  await openEditModal(bookId);
  setReadingStatus("finished");
  const today = new Date().toISOString().split("T")[0];
  if (!document.getElementById("f-date-finished").value) {
    document.getElementById("f-date-finished").value = today;
  }
}

function openModal() {
  const modal = document.getElementById("add-book-modal");
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  // Focus first input after animation frame
  requestAnimationFrame(() => {
    document.getElementById("f-title").focus();
  });
}

function closeModal() {
  const modal = document.getElementById("add-book-modal");
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  if (coverFetchController) {
    coverFetchController.abort();
    coverFetchController = null;
  }
}

function resetForm() {
  document.getElementById("book-form").reset();
  document.getElementById("f-cover-url").value = "";
  document.getElementById("cover-preview-area").hidden = true;
  document.getElementById("cover-url-group").hidden = true;
  document.getElementById("cover-status-text").textContent = "";
  document.getElementById("cover-status-text").className = "cover-status-text";
  document.getElementById("form-error").hidden = true;
  document.getElementById("form-error").textContent = "";
  document.getElementById("f-is-private").checked = false;
  document.getElementById("f-date-started").value = "";
  setRating(0);
  currentReadingStatus = "finished";
}

// ── Reading Status Toggle ─────────────────────────────────────────────────────
function setReadingStatus(status) {
  currentReadingStatus = status;
  const isReading = status === "reading";
  const isWant = status === "want";
  const isFinished = status === "finished";

  document
    .getElementById("status-btn-finished")
    .classList.toggle("active", isFinished);
  document
    .getElementById("status-btn-finished")
    .setAttribute("aria-pressed", String(isFinished));
  document
    .getElementById("status-btn-reading")
    .classList.toggle("active", isReading);
  document
    .getElementById("status-btn-reading")
    .setAttribute("aria-pressed", String(isReading));
  document.getElementById("status-btn-want").classList.toggle("active", isWant);
  document
    .getElementById("status-btn-want")
    .setAttribute("aria-pressed", String(isWant));

  document.getElementById("date-finished-group").hidden = !isFinished;
  document.getElementById("date-started-group").hidden = !isReading;
  document.getElementById("rating-genre-row").hidden = !isFinished;
  document.getElementById("notes-group").hidden = !isFinished;
}

// ── Star Rating ───────────────────────────────────────────────────────────────
function initStarRating() {
  const container = document.getElementById("star-rating");
  container.innerHTML = "";
  for (let i = 1; i <= 5; i++) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "star-btn";
    btn.textContent = "★";
    btn.dataset.value = i;
    btn.setAttribute("aria-label", `${i} star${i > 1 ? "s" : ""}`);

    const getHoverValue = (e) =>
      e.offsetX < btn.offsetWidth / 2 ? i - 0.5 : i;
    btn.addEventListener("click", (e) => setRating(getHoverValue(e)));
    btn.addEventListener("mouseenter", (e) => highlightStars(getHoverValue(e)));
    btn.addEventListener("mousemove", (e) => highlightStars(getHoverValue(e)));
    btn.addEventListener("mouseleave", () => highlightStars(selectedRating));
    container.appendChild(btn);
  }
  highlightStars(0);
}

function setRating(value) {
  selectedRating = value;
  document.getElementById("f-rating").value = value || "";
  highlightStars(value);
}

function highlightStars(upTo) {
  document.querySelectorAll(".star-btn").forEach((btn, i) => {
    const starNum = i + 1;
    const isFull = starNum <= upTo;
    const isHalf = !isFull && upTo % 1 !== 0 && starNum === Math.ceil(upTo);
    btn.classList.toggle("filled", isFull);
    btn.classList.toggle("half", isHalf);
  });
}

// ── Cover Fetch UX ────────────────────────────────────────────────────────────
function triggerCoverFetch() {
  const title = document.getElementById("f-title").value.trim();
  const author = document.getElementById("f-author").value.trim();
  if (!title || !author) {
    setStatusText("Enter a title and author first.", "error");
    return;
  }
  fetchCover(title, author);
}

async function fetchCover(title, author) {
  if (coverFetchController) coverFetchController.abort();
  coverFetchController = new AbortController();

  // Show spinner
  const statusEl = document.getElementById("cover-status-text");
  statusEl.innerHTML = '<span class="spinner"></span>Fetching cover…';
  statusEl.className = "cover-status-text";
  document.getElementById("cover-preview-area").hidden = true;

  try {
    const params = new URLSearchParams({ title, author });
    const res = await fetch(`/api/cover?${params}`, {
      signal: coverFetchController.signal,
    });
    const data = await res.json();

    const googleCovers = (data.google_covers || []).map((c) => ({
      url: c.url,
      source: "Google Books",
      page_count: c.page_count,
    }));
    const olCovers = (data.openlibrary_covers || []).map((c) => ({
      url: c.url,
      source: "Open Library",
      page_count: c.page_count,
    }));
    const allCovers = [...googleCovers, ...olCovers];

    if (allCovers.length > 0) {
      fetchedCoverUrl = allCovers[0].url;
      showCoverOptions(allCovers);
      const sources = [];
      if (googleCovers.length) sources.push("Google Books");
      if (olCovers.length) sources.push("Open Library");
      setStatusText(`Covers found via ${sources.join(" & ")}`, "success");
      // Set page count from the first cover if field is empty
      const firstPageCount = allCovers[0].page_count;
      if (firstPageCount) {
        const pageCountInput = document.getElementById("f-page-count");
        if (!pageCountInput.value) pageCountInput.value = firstPageCount;
      }
    } else {
      fetchedCoverUrl = null;
      setStatusText("Cover not found — enter a URL manually.", "error");
      showManualUrl();
    }
  } catch (err) {
    if (err.name === "AbortError") return;
    fetchedCoverUrl = null;
    setStatusText("Could not fetch cover — enter a URL manually.", "error");
    showManualUrl();
  }
}

// covers: array of { url, source } objects, or plain URL strings (for edit modal backfill)
function showCoverOptions(covers) {
  const area = document.getElementById("cover-preview-area");
  const container = document.getElementById("cover-options-container");
  container.innerHTML = "";

  if (!covers || covers.length === 0) {
    area.hidden = true;
    return;
  }

  covers.forEach((cover, idx) => {
    const url = typeof cover === "string" ? cover : cover.url;
    const source = typeof cover === "string" ? null : cover.source;
    const pageCount = typeof cover === "string" ? null : cover.page_count;

    const opt = document.createElement("div");
    opt.className = "cover-option";
    if (idx === 0) opt.classList.add("selected");

    const imgWrap = document.createElement("div");
    imgWrap.className = "cover-option-img";

    const img = document.createElement("img");
    img.src = url;
    img.alt = "Cover option " + (idx + 1);
    imgWrap.appendChild(img);
    opt.appendChild(imgWrap);

    if (source) {
      const badge = document.createElement("span");
      badge.className = "cover-source-badge";
      badge.textContent = source;
      opt.appendChild(badge);
    }

    opt.addEventListener("click", () => {
      document
        .querySelectorAll(".cover-option")
        .forEach((el) => el.classList.remove("selected"));
      opt.classList.add("selected");
      fetchedCoverUrl = url;
      // Update page count to match the selected edition
      if (pageCount) {
        document.getElementById("f-page-count").value = pageCount;
      }
    });

    container.appendChild(opt);
  });

  area.hidden = false;
}

function setStatusText(msg, type) {
  const el = document.getElementById("cover-status-text");
  el.innerHTML = msg;
  el.className = `cover-status-text ${type || ""}`;
}

function showManualUrl() {
  document.getElementById("cover-url-group").hidden = false;
}

function toggleManualUrl() {
  const group = document.getElementById("cover-url-group");
  group.hidden = !group.hidden;
  if (!group.hidden) {
    document.getElementById("f-cover-url").focus();
  }
}

// Auto-fetch after author field loses focus (if title is also filled)
document.addEventListener("DOMContentLoaded", () => {
  initStarRating();

  document.getElementById("f-author").addEventListener("blur", () => {
    const title = document.getElementById("f-title").value.trim();
    const author = document.getElementById("f-author").value.trim();
    // Only auto-fetch if no cover yet and both fields are filled
    if (title && author && !fetchedCoverUrl) {
      fetchCover(title, author);
    }
  });

  // ── Genre Autocomplete ──────────────────────────────────────────────────────
  const genreInput = document.getElementById("f-genre");
  const genreSuggestions = document.getElementById("genre-suggestions");

  function getGenres() {
    return typeof EXISTING_GENRES !== "undefined" ? EXISTING_GENRES : [];
  }

  function showGenreSuggestions(items) {
    genreSuggestions.innerHTML = "";
    if (!items.length) {
      genreSuggestions.hidden = true;
      return;
    }
    items.forEach((g) => {
      const li = document.createElement("li");
      li.textContent = g;
      li.addEventListener("mousedown", (e) => {
        e.preventDefault();
        genreInput.value = g;
        genreSuggestions.hidden = true;
      });
      genreSuggestions.appendChild(li);
    });
    genreSuggestions.hidden = false;
  }

  genreInput.addEventListener("input", () => {
    const val = genreInput.value.toLowerCase();
    const genres = getGenres();
    showGenreSuggestions(
      val ? genres.filter((g) => g.toLowerCase().includes(val)) : genres
    );
  });

  genreInput.addEventListener("focus", () => {
    const val = genreInput.value.toLowerCase();
    const genres = getGenres();
    showGenreSuggestions(
      val ? genres.filter((g) => g.toLowerCase().includes(val)) : genres
    );
  });

  genreInput.addEventListener("blur", () => {
    setTimeout(() => {
      genreSuggestions.hidden = true;
    }, 150);
  });
});

// ── Genre Autocomplete ────────────────────────────────────────────────────────
function populateGenreDatalist() {
  // Suggestions are driven by the DOMContentLoaded autocomplete setup.
  // Hide the dropdown when the modal is reset/reopened.
  const suggestions = document.getElementById("genre-suggestions");
  if (suggestions) suggestions.hidden = true;
}

// ── Form Submission ───────────────────────────────────────────────────────────
async function submitBookForm(event) {
  event.preventDefault();
  hideFormError();

  const title = document.getElementById("f-title").value.trim();
  const author = document.getElementById("f-author").value.trim();
  const yearVal = document.getElementById("f-year").value;

  if (!title) {
    showFormError("Title is required.");
    return;
  }
  if (!author) {
    showFormError("Author is required.");
    return;
  }
  if (!yearVal) {
    showFormError("Year is required.");
    return;
  }

  // Resolve cover URL: manual input takes priority over auto-fetched
  const manualUrl = document.getElementById("f-cover-url").value.trim();
  const cover_url = manualUrl || fetchedCoverUrl || null;

  const isReading = currentReadingStatus === "reading";
  const isWant = currentReadingStatus === "want";
  const ratingVal = document.getElementById("f-rating").value;
  const dateVal = document.getElementById("f-date-finished").value;
  const dateStartedVal = document.getElementById("f-date-started").value;
  const genre = document.getElementById("f-genre").value.trim();
  const notes = document.getElementById("f-notes").value.trim();
  const pageCountVal = document.getElementById("f-page-count").value;

  const body = {
    year: parseInt(yearVal, 10),
    title,
    author,
    currently_reading: isReading,
    want_to_read: isWant,
    date_finished: isReading || isWant ? null : dateVal || null,
    date_started: isReading ? dateStartedVal || null : null,
    rating:
      isReading || isWant ? null : ratingVal ? parseFloat(ratingVal) : null,
    genre: isReading || isWant ? null : genre || null,
    notes: isReading || isWant ? null : notes || null,
    cover_url,
    is_private: document.getElementById("f-is-private").checked,
    page_count: pageCountVal ? parseInt(pageCountVal, 10) : null,
  };

  // Remove null values for cleaner request (API handles absence = no change for PATCH)
  const method = editingBookId ? "PATCH" : "POST";
  const url = editingBookId ? `/api/books/${editingBookId}` : "/api/books";

  const submitBtn = document.getElementById("submit-btn");
  submitBtn.disabled = true;
  submitBtn.textContent = "Saving…";

  try {
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      closeModal();
      window.location.reload();
    } else {
      const err = await res.json().catch(() => ({}));
      showFormError(err.detail || "Failed to save book. Please try again.");
    }
  } catch (e) {
    showFormError("Network error. Please try again.");
  } finally {
    submitBtn.disabled = false;
    submitBtn.textContent = editingBookId ? "Save Changes" : "Add Book";
  }
}

function showFormError(msg) {
  const el = document.getElementById("form-error");
  el.textContent = msg;
  el.hidden = false;
  el.scrollIntoView({ behavior: "smooth", block: "nearest" });
}
function hideFormError() {
  document.getElementById("form-error").hidden = true;
}

// ── Delete ────────────────────────────────────────────────────────────────────
async function deleteBook(bookId, btnEl) {
  if (!confirm("Delete this book? This cannot be undone.")) return;

  btnEl.disabled = true;
  btnEl.textContent = "…";

  try {
    const res = await fetch(`/api/books/${bookId}`, { method: "DELETE" });
    if (res.ok) {
      window.location.reload();
    } else {
      alert("Failed to delete book.");
      btnEl.disabled = false;
      btnEl.textContent = "Delete";
    }
  } catch (e) {
    alert("Network error.");
    btnEl.disabled = false;
    btnEl.textContent = "Delete";
  }
}

async function deleteBookFromModal() {
  if (!editingBookId) return;
  if (!confirm("Delete this book? This cannot be undone.")) return;

  const btn = document.getElementById("modal-delete-btn");
  btn.disabled = true;
  btn.textContent = "…";

  try {
    const res = await fetch(`/api/books/${editingBookId}`, {
      method: "DELETE",
    });
    if (res.ok) {
      closeModal();
      window.location.reload();
    } else {
      alert("Failed to delete book.");
      btn.disabled = false;
      btn.textContent = "Delete";
    }
  } catch (e) {
    alert("Network error.");
    btn.disabled = false;
    btn.textContent = "Delete";
  }
}

async function markWantAsReading(bookId) {
  const today = new Date().toISOString().split("T")[0];

  try {
    const res = await fetch(`/api/books/${bookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currently_reading: true,
        want_to_read: false,
        date_started: today,
      }),
    });
    if (res.ok) {
      window.location.reload();
    } else {
      alert("Failed to start book.");
    }
  } catch (e) {
    alert("Network error.");
  }
}

async function markWantAsReading(bookId) {
  const today = new Date().toISOString().split("T")[0];

  try {
    const res = await fetch(`/api/books/${bookId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        currently_reading: true,
        want_to_read: false,
        date_started: today,
      }),
    });
    if (res.ok) {
      window.location.reload();
    } else {
      alert("Failed to start book.");
    }
  } catch (e) {
    alert("Network error.");
  }
}

// ── Auth ──────────────────────────────────────────────────────────────────────
function openLoginModal() {
  const modal = document.getElementById("login-modal");
  modal.classList.add("open");
  modal.setAttribute("aria-hidden", "false");
  document.body.style.overflow = "hidden";
  requestAnimationFrame(() =>
    document.getElementById("login-password").focus()
  );
}

function closeLoginModal() {
  const modal = document.getElementById("login-modal");
  modal.classList.remove("open");
  modal.setAttribute("aria-hidden", "true");
  document.body.style.overflow = "";
  document.getElementById("login-password").value = "";
  document.getElementById("login-error").hidden = true;
}

async function submitLogin(event) {
  event.preventDefault();
  const password = document.getElementById("login-password").value;
  const btn = document.getElementById("login-submit-btn");
  const errorEl = document.getElementById("login-error");

  errorEl.hidden = true;
  btn.disabled = true;
  btn.textContent = "Logging in…";

  try {
    const res = await fetch("/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      window.location.reload();
    } else {
      errorEl.textContent = "Incorrect password.";
      errorEl.hidden = false;
      document.getElementById("login-password").select();
    }
  } catch (e) {
    errorEl.textContent = "Network error. Please try again.";
    errorEl.hidden = false;
  } finally {
    btn.disabled = false;
    btn.textContent = "Login";
  }
}

async function logout() {
  await fetch("/auth/logout", { method: "POST" });
  window.location.reload();
}

// ── Reading Goal ──────────────────────────────────────────────────────────────
function startGoalEdit() {
  const input = document.getElementById("goal-input");
  const display = document.getElementById("goal-display");
  const editBtn = document.querySelector(".btn-goal-edit");

  if (display) display.hidden = true;
  if (editBtn) editBtn.hidden = true;
  input.hidden = false;
  input.focus();
  input.select();
}

async function saveGoal() {
  const input = document.getElementById("goal-input");
  let newGoal = parseInt(input.value, 10);
  if (isNaN(newGoal)) {
    newGoal = 0; // Empty input means remove goal
  }

  if (newGoal >= 0 && newGoal === CURRENT_GOAL) {
    cancelGoalEdit();
    return;
  }

  if (newGoal < 0) {
    cancelGoalEdit();
    return;
  }

  // Optimistically update the display before the request returns
  const year =
    typeof CURRENT_YEAR !== "undefined"
      ? CURRENT_YEAR
      : parseInt(document.body.dataset.currentYear, 10);

  try {
    const res = await fetch(`/api/goal/${year}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ goal: newGoal }),
    });
    if (res.ok) {
      // Reload so the progress bar and stats rerender server-side
      window.location.reload();
    } else {
      cancelGoalEdit();
    }
  } catch (e) {
    cancelGoalEdit();
  }
}

function cancelGoalEdit() {
  const input = document.getElementById("goal-input");
  const display = document.getElementById("goal-display");
  const editBtn = document.querySelector(".btn-goal-edit");

  input.hidden = true;
  if (display) display.hidden = false;
  if (editBtn) editBtn.hidden = false;

  // Restore original value
  if (typeof CURRENT_GOAL !== "undefined" && CURRENT_GOAL !== null) {
    input.value = CURRENT_GOAL;
  } else {
    input.value = "";
  }
}

function handleGoalKey(event) {
  if (event.key === "Enter") {
    event.preventDefault();
    document.getElementById("goal-input").blur(); // triggers saveGoal via onblur
  }
  if (event.key === "Escape") {
    // Prevent blur from firing saveGoal
    document.getElementById("goal-input").removeEventListener("blur", saveGoal);
    cancelGoalEdit();
    // Re-attach after a tick so future edits still work
    setTimeout(() => {
      const input = document.getElementById("goal-input");
      if (input) input.onblur = saveGoal;
    }, 0);
  }
}

// ── Keyboard Shortcuts ────────────────────────────────────────────────────────
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    const loginModal = document.getElementById("login-modal");
    if (loginModal && loginModal.classList.contains("open")) {
      closeLoginModal();
      return;
    }
    const modal = document.getElementById("add-book-modal");
    if (modal.classList.contains("open")) closeModal();
  }
  // 'n' key opens add modal (when not typing in an input)
  if (
    e.key === "n" &&
    e.target.tagName !== "INPUT" &&
    e.target.tagName !== "TEXTAREA"
  ) {
    const modal = document.getElementById("add-book-modal");
    if (!modal.classList.contains("open")) openAddModal();
  }
});
