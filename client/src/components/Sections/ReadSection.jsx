import { Lock } from "lucide-react";
import { formatDate, titleInitials } from "../../utils/apiFetch";
import { RatingStars } from "../UI/RatingStars";

export const ReadSection = ({
  books,
  isAuthenticated,
  currentlyReadingCount,
  wtrCount,
  year,
  onEdit,
  onDelete,
  onAddBook,
}) => {
  const hasAnyBooks =
    books.length > 0 || currentlyReadingCount > 0 || wtrCount > 0;

  return (
    <section className="read-section">
      <h2 className="read-title">Read</h2>
      <div className="bookshelf-grid">
        {books.map((book) => (
          <article className="book-card" data-book-id={book.id} key={book.id}>
            <div
              className={`cover-wrapper ${isAuthenticated ? "editable" : ""}`}
              onClick={() => isAuthenticated && onEdit(book.id)}
              role={isAuthenticated ? "button" : undefined}
              tabIndex={isAuthenticated ? 0 : undefined}
              onKeyDown={(e) => {
                if ((e.key === "Enter" || e.key === " ") && isAuthenticated) {
                  onEdit(book.id);
                }
              }}
            >
              {book.is_private && (
                <span className="lock-badge" title="Private">
                  <Lock size={14} />
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
                {book.genre && book.genre.length > 0 && (
                  <span className="overlay-genre">{book.genre.join(", ")}</span>
                )}
                {book.date_finished && (
                  <span className="overlay-date">
                    {formatDate(book.date_finished)}
                  </span>
                )}
                {isAuthenticated && (
                  <div className="card-actions">
                    <button
                      className="btn-edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(book.id);
                      }}
                    >
                      Edit
                    </button>
                    <button
                      className="btn-delete"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDelete(book.id);
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

      {!hasAnyBooks && (
        <div className="empty-state">
          <p>No books logged for {year} yet.</p>
          {isAuthenticated && (
            <button className="btn-link" onClick={onAddBook}>
              Add your first book →
            </button>
          )}
        </div>
      )}

      {!books.length && (currentlyReadingCount > 0 || wtrCount > 0) && (
        <div className="empty-state">
          <p>No finished books yet this year.</p>
        </div>
      )}
    </section>
  );
};
