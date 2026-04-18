import { SquarePen } from "lucide-react";
import { formatDate, titleInitials } from "../../utils/apiFetch";

export const CurrentlyReadingSection = ({ books, isAuthenticated, onMarkAsFinished, onEdit }) => {
  if (books.length === 0) return null;

  return (
    <section className="currently-reading-section">
      <h2 className="currently-reading-title">Currently Reading</h2>
      <div className="currently-reading-list">
        {books.map((book) => (
          <div className="cr-book" key={book.id}>
            <div className="cr-cover">
              {book.cover_url ? (
                <img src={book.cover_url} alt={`${book.title} cover`} loading="lazy" />
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
              {isAuthenticated && (
                <div className="cr-actions">
                  <button
                    className="btn-primary btn-sm"
                    onClick={() => onMarkAsFinished(book.id)}
                  >
                    Mark as Finished
                  </button>
                  <button
                    className="btn-secondary btn-sm btn-icon"
                    onClick={() => onEdit(book.id)}
                  >
                    <SquarePen size={16} />
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
};
