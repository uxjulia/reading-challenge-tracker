import { useState, useEffect } from "react";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function StatBar({ label, count, maxCount, subLabel }) {
  const pct = maxCount > 0 ? Math.round((count / maxCount) * 100) : 0;
  return (
    <li className="stat-bar-item">
      <div className="stat-bar-name">
        <span className="stat-bar-label" title={label}>{label}</span>
        {subLabel && <span className="stat-bar-sublabel">{subLabel}</span>}
      </div>
      <div className="stat-bar-track">
        <div className="stat-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <span className="stat-bar-count">{count}</span>
    </li>
  );
}

function StatsModal({ open, onClose }) {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    setError(null);
    fetch("/api/stats", { credentials: "include" })
      .then((r) => {
        if (!r.ok) throw new Error("Failed to load");
        return r.json();
      })
      .then((data) => {
        setStats(data);
        setLoading(false);
      })
      .catch(() => {
        setError("Failed to load stats.");
        setLoading(false);
      });
  }, [open]);

  useEffect(() => {
    if (open) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  if (!open) return null;

  const maxAuthorCount = stats?.top_authors?.[0]?.count || 1;
  const maxGenreCount = stats?.top_genres?.[0]?.count || 1;
  const topMonth = stats?.top_month;
  const monthName = topMonth ? MONTHS[parseInt(topMonth.month, 10) - 1] : null;

  return (
    <div
      className="modal open"
      role="dialog"
      aria-modal="true"
      aria-labelledby="stats-modal-title"
    >
      <div className="modal-overlay" onClick={onClose} aria-hidden="true" />
      <div className="modal-content modal-content--stats">
        <button
          className="modal-close"
          onClick={onClose}
          aria-label="Close"
          type="button"
        >
          ×
        </button>
        <h2 id="stats-modal-title">Reading Stats</h2>

        {loading && <p className="stats-loading">Loading…</p>}
        {error && <p className="form-error">{error}</p>}

        {stats && (
          <>
            <section className="stats-section">
              <h3>All Time</h3>
              <div className="stats-overview">
                <div className="stat-card">
                  <span className="stat-value">
                    {stats.totals.books.toLocaleString()}
                  </span>
                  <span className="stat-label">Books Read</span>
                </div>
                {stats.totals.pages > 0 && (
                  <div className="stat-card">
                    <span className="stat-value">
                      {stats.totals.pages.toLocaleString()}
                    </span>
                    <span className="stat-label">Pages Read</span>
                  </div>
                )}
                {stats.totals.avg_rating != null && (
                  <div className="stat-card">
                    <span className="stat-value">
                      {stats.totals.avg_rating.toFixed(1)}
                    </span>
                    <span className="stat-label">Avg Rating</span>
                  </div>
                )}
                <div className="stat-card">
                  <span className="stat-value">
                    {stats.totals.authors.toLocaleString()}
                  </span>
                  <span className="stat-label">Authors Read</span>
                </div>
              </div>
            </section>

            {stats.top_authors.length > 0 && (
              <section className="stats-section">
                <h3>Top Authors</h3>
                <ul className="stat-bar-list">
                  {stats.top_authors.map((a) => (
                    <StatBar
                      key={a.author}
                      label={a.author}
                      count={a.count}
                      maxCount={maxAuthorCount}
                      subLabel={
                        a.avg_rating ? `★ ${a.avg_rating.toFixed(1)}` : null
                      }
                    />
                  ))}
                </ul>
              </section>
            )}

            {stats.top_genres.length > 0 && (
              <section className="stats-section">
                <h3>Top Genres</h3>
                <ul className="stat-bar-list">
                  {stats.top_genres.map((g) => (
                    <StatBar
                      key={g.genre}
                      label={g.genre}
                      count={g.count}
                      maxCount={maxGenreCount}
                    />
                  ))}
                </ul>
              </section>
            )}

            {(monthName || stats.books_by_year.length > 0 || stats.longest_book) && (
              <section className="stats-section">
                <h3>Fun Facts</h3>
                <ul className="stats-fun-list">
                  {monthName && (
                    <li className="stats-fun-item">
                      <span
                        className="material-symbols-outlined"
                        aria-hidden="true"
                      >
                        calendar_month
                      </span>
                      <div className="stats-fun-text">
                        <span className="stats-fun-label">
                          Favorite Reading Month
                        </span>
                        <span className="stats-fun-value">
                          {monthName}{" "}
                          <span className="stats-fun-sub">
                            ({topMonth.count} books)
                          </span>
                        </span>
                      </div>
                    </li>
                  )}
                  {stats.books_by_year.length > 0 && (
                    <li className="stats-fun-item">
                      <span
                        className="material-symbols-outlined"
                        aria-hidden="true"
                      >
                        trophy
                      </span>
                      <div className="stats-fun-text">
                        <span className="stats-fun-label">Best Reading Year</span>
                        <span className="stats-fun-value">
                          {stats.books_by_year[0].year}{" "}
                          <span className="stats-fun-sub">
                            ({stats.books_by_year[0].count} books)
                          </span>
                        </span>
                      </div>
                    </li>
                  )}
                  {stats.longest_book && (
                    <li className="stats-fun-item">
                      <span
                        className="material-symbols-outlined"
                        aria-hidden="true"
                      >
                        menu_book
                      </span>
                      <div className="stats-fun-text">
                        <span className="stats-fun-label">Longest Book</span>
                        <span className="stats-fun-value">
                          {stats.longest_book.title}{" "}
                          <span className="stats-fun-sub">
                            ({stats.longest_book.page_count.toLocaleString()}{" "}
                            pages)
                          </span>
                        </span>
                      </div>
                    </li>
                  )}
                </ul>
              </section>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default StatsModal;
