import { useState } from "react";

function StarInput({ rating, setRating }) {
  const [hoverRating, setHoverRating] = useState(0);
  const active = hoverRating || rating;

  return (
    <div className="star-rating" role="radiogroup" aria-label="Book rating">
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = star <= active;
        const isHalf =
          !isFull && active % 1 !== 0 && star === Math.ceil(active);

        return (
          <button
            key={star}
            type="button"
            className={`star-btn ${isFull ? "filled" : ""} ${isHalf ? "half" : ""}`.trim()}
            onMouseLeave={() => setHoverRating(0)}
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const half = e.clientX - rect.left < rect.width / 2;
              setHoverRating(half ? star - 0.5 : star);
            }}
            onClick={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const half = e.clientX - rect.left < rect.width / 2;
              setRating(half ? star - 0.5 : star);
            }}
          >
            ★
          </button>
        );
      })}
    </div>
  );
}

export default StarInput;
