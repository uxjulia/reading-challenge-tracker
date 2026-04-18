import { useState, useRef, useEffect } from "react";

export function StarInput({ rating, setRating }) {
  const [hoverRating, setHoverRating] = useState(0);
  const containerRef = useRef(null);
  const active = hoverRating || rating;

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    function ratingFromX(clientX) {
      const rect = el.getBoundingClientRect();
      const x = clientX - rect.left;
      const fraction = Math.max(0, Math.min(x, rect.width)) / rect.width;
      return Math.max(0.5, Math.min(5, Math.round(fraction * 10) / 2));
    }

    function onTouchStart(e) {
      e.preventDefault();
      setHoverRating(ratingFromX(e.touches[0].clientX));
    }

    function onTouchMove(e) {
      e.preventDefault();
      setHoverRating(ratingFromX(e.touches[0].clientX));
    }

    function onTouchEnd(e) {
      e.preventDefault();
      setRating(ratingFromX(e.changedTouches[0].clientX));
      setHoverRating(0);
    }

    el.addEventListener("touchstart", onTouchStart, { passive: false });
    el.addEventListener("touchmove", onTouchMove, { passive: false });
    el.addEventListener("touchend", onTouchEnd, { passive: false });

    return () => {
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("touchend", onTouchEnd);
    };
  }, [setRating]);

  function handleKeyDown(e) {
    if (e.key === "ArrowRight" || e.key === "ArrowUp") {
      e.preventDefault();
      setRating(Math.min(5, rating + 0.5));
    } else if (e.key === "ArrowLeft" || e.key === "ArrowDown") {
      e.preventDefault();
      setRating(Math.max(0, rating - 0.5));
    }
  }

  return (
    <div
      ref={containerRef}
      className="star-rating"
      role="slider"
      aria-label="Book rating"
      aria-valuemin={0}
      aria-valuemax={5}
      aria-valuenow={rating}
      aria-valuetext={`${rating} out of 5 stars`}
      tabIndex={0}
      onKeyDown={handleKeyDown}
    >
      {[1, 2, 3, 4, 5].map((star) => {
        const isFull = star <= active;
        const isHalf =
          !isFull && active % 1 !== 0 && star === Math.ceil(active);

        return (
          <button
            key={star}
            type="button"
            tabIndex={-1}
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
