export function RatingStars({ value }) {
  if (!value) return null;
  return (
    <span className="overlay-stars">
      {[1, 2, 3, 4, 5].map((i) => {
        if (i <= value) return <span key={i}>★</span>;
        if (i - 1 < value)
          return (
            <span key={i} className="overlay-half-star">
              ★
            </span>
          );
        return <span key={i}>☆</span>;
      })}
    </span>
  );
}
