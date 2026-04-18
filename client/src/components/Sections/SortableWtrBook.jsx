import { GripVertical, Headphones, SquarePen } from "lucide-react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { titleInitials } from "../../utils/apiFetch";

export const SortableWtrBook = ({
  book,
  isAuthenticated,
  onStartReading,
  onEdit,
}) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: book.id,
    disabled: !isAuthenticated,
  });

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
        <div>
          {book.genre && book.genre.length > 0 && (
            <span className="overlay-genre">{book.genre[0]}</span>
          )}
        </div>
        <strong className="wtr-title">
          {book.title}
          {book.has_audiobook && (
            <Headphones
              size={14}
              className="wtr-audiobook-icon"
              title="Audiobook available"
            />
          )}
        </strong>
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
              <SquarePen size={16} />
            </button>
          </div>
        )}
      </div>
      {isAuthenticated && (
        <div className="wtr-drag-handle" {...attributes} {...listeners}>
          <GripVertical size={20} />
        </div>
      )}
    </div>
  );
};
