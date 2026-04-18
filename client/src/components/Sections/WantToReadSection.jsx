import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  horizontalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { apiFetch } from "../../utils/apiFetch";
import { SortableWtrBook } from "./SortableWtrBook";

export const WantToReadSection = ({
  books,
  setBooks,
  isAuthenticated,
  onStartReading,
  onEdit,
}) => {
  const sensors = useSensors(useSensor(PointerSensor));

  async function handleDragEnd(event) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = books.findIndex((b) => b.id === active.id);
    const newIndex = books.findIndex((b) => b.id === over.id);
    const reordered = arrayMove(books, oldIndex, newIndex);

    setBooks(reordered);
    try {
      await apiFetch("/api/want-to-read/reorder", {
        method: "PUT",
        body: JSON.stringify({ ids: reordered.map((b) => b.id) }),
      });
    } catch {
      setBooks(books);
    }
  }

  if (books.length === 0) return null;

  return (
    <section className="want-to-read-section">
      <h2 className="want-to-read-title">Want to Read</h2>
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={books.map((b) => b.id)} strategy={horizontalListSortingStrategy}>
          <div className="want-to-read-list">
            {books.map((book) => (
              <SortableWtrBook
                key={book.id}
                book={book}
                isAuthenticated={isAuthenticated}
                onStartReading={() => onStartReading(book.id)}
                onEdit={() => onEdit(book.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </section>
  );
};
