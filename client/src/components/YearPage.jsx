import { useState, useEffect, useMemo } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { BookModal } from "./Book/BookModal";
import LoginModal from "./Auth/LoginModal";
import StatsModal from "./Stats/StatsModal";
import { AppHeader } from "./Layout/AppHeader";
import { StatsBar } from "./Stats/StatsBar";
import { CurrentlyReadingSection } from "./Sections/CurrentlyReadingSection";
import { WantToReadSection } from "./Sections/WantToReadSection";
import { ReadSection } from "./Sections/ReadSection";
import { AppFooter } from "./Layout/AppFooter";
import { apiFetch } from "../utils/apiFetch";

const currentYear = new Date().getFullYear();

export default function YearPage() {
  const params = useParams();
  const navigate = useNavigate();
  const year = Number(params.year || currentYear);
  const publicUser = params.username || null;

  const [loading, setLoading] = useState(true);
  const [showLoading, setShowLoading] = useState(false);
  const [data, setData] = useState(null);
  const [pageError, setPageError] = useState("");
  const [bookModalOpen, setBookModalOpen] = useState(false);
  const [editingBook, setEditingBook] = useState(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [statsOpen, setStatsOpen] = useState(false);
  const [wtrBooks, setWtrBooks] = useState([]);

  const apiUrl = publicUser
    ? `/api/u/${publicUser}/year/${year}`
    : `/api/year/${year}`;

  function yearLink(yr) {
    return publicUser ? `/u/${publicUser}/year/${yr}` : `/year/${yr}`;
  }

  async function load() {
    setLoading(true);
    setPageError("");
    try {
      const result = await apiFetch(apiUrl);
      setData(result);
    } catch (error) {
      setPageError(error.message || "Failed to load page data.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [year, publicUser]);

  useEffect(() => {
    if (!loading) {
      setShowLoading(false);
      return;
    }
    const timer = setTimeout(() => setShowLoading(true), 1500);
    return () => clearTimeout(timer);
  }, [loading]);

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
        e.preventDefault();
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

  async function login(username, password) {
    await apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ username, password }),
    });
    if (publicUser) {
      navigate(`/year/${year}`);
    } else {
      await load();
    }
  }

  async function logout() {
    await apiFetch("/auth/logout", { method: "POST", body: "{}" });
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

  if (Number.isNaN(year)) {
    return <Navigate to={`/year/${currentYear}`} replace />;
  }

  if (loading || !data) {
    if (pageError) return <div className="app-loading">{pageError}</div>;
    if (!showLoading) return null;
    return <div className="app-loading">Loading...</div>;
  }

  return (
    <>
      <AppHeader
        title={headerTitle}
        isAuthenticated={data.is_authenticated}
        isAdmin={data.is_admin}
        appUser={data.app_user}
        isPublicUser={!!publicUser}
        onOpenLogin={() => setLoginOpen(true)}
        onOpenStats={() => setStatsOpen(true)}
        onLogout={logout}
      />

      <nav className="year-tabs" aria-label="Year navigation">
        {data.all_years.map((yr) => (
          <Link
            key={yr}
            to={yearLink(yr)}
            className={`tab ${yr === year ? "active" : ""}`}
          >
            {yr}
          </Link>
        ))}
      </nav>

      <StatsBar
        stats={data.stats}
        goal={data.goal}
        pace={data.pace}
        readingPace={data.reading_pace}
        year={year}
        isAuthenticated={data.is_authenticated}
        onAddBook={() => {
          setEditingBook(null);
          setBookModalOpen(true);
        }}
        onGoalSaved={load}
      />

      <CurrentlyReadingSection
        books={data.currently_reading}
        isAuthenticated={data.is_authenticated}
        onMarkAsFinished={markAsFinished}
        onEdit={openEditModal}
      />

      <WantToReadSection
        books={wtrBooks}
        setBooks={setWtrBooks}
        isAuthenticated={data.is_authenticated}
        onStartReading={markWantAsReading}
        onEdit={openEditModal}
      />

      <ReadSection
        books={data.books}
        isAuthenticated={data.is_authenticated}
        currentlyReadingCount={data.currently_reading.length}
        wtrCount={wtrBooks.length}
        year={year}
        onEdit={openEditModal}
        onDelete={deleteBook}
        onAddBook={() => setBookModalOpen(true)}
      />

      <AppFooter />

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

      <StatsModal open={statsOpen} onClose={() => setStatsOpen(false)} />
    </>
  );
}
