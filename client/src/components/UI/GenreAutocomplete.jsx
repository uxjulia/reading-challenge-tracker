import { useState } from "react";
import { X } from "lucide-react";

export const GenreAutocomplete = ({ genres, selected, suggested, onChange }) => {
  const [input, setInput] = useState("");
  const [open, setOpen] = useState(false);
  const [index, setIndex] = useState(-1);

  const filtered = genres.filter(
    (g) => g.toLowerCase().includes(input.toLowerCase()) && !selected.includes(g)
  );

  function addTag(raw) {
    const tag = raw.trim().replace(/,+$/, "").trim();
    if (tag && !selected.includes(tag)) onChange([...selected, tag]);
    setInput("");
    setOpen(false);
    setIndex(-1);
  }

  return (
    <div className="form-group genre-autocomplete">
      <label>Genre</label>
      <div className="genre-tag-input">
        {selected.map((g) => (
          <span key={g} className="genre-tag">
            {g}
            <button
              type="button"
              aria-label={`Remove ${g}`}
              onClick={() => onChange(selected.filter((x) => x !== g))}
            >
              <X size={12} />
            </button>
          </span>
        ))}
        <input
          type="text"
          id="f-genre"
          value={input}
          onChange={(e) => {
            setInput(e.target.value);
            setOpen(true);
            setIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onBlur={() => setTimeout(() => setOpen(false), 150)}
          onKeyDown={(e) => {
            if ((e.key === "Enter" || e.key === ",") && index < 0) {
              e.preventDefault();
              if (input.trim()) addTag(input);
              return;
            }
            if (e.key === "Backspace" && input === "") {
              onChange(selected.slice(0, -1));
              return;
            }
            if (e.key === "ArrowDown") {
              e.preventDefault();
              setIndex((i) => Math.min(i + 1, filtered.length - 1));
            } else if (e.key === "ArrowUp") {
              e.preventDefault();
              setIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Enter" && index >= 0) {
              e.preventDefault();
              addTag(filtered[index]);
            } else if (e.key === "Escape") {
              setOpen(false);
              setIndex(-1);
            }
          }}
          placeholder={selected.length === 0 ? "e.g. Fantasy" : ""}
          autoComplete="off"
        />
      </div>

      {open && filtered.length > 0 && (
        <ul className="genre-suggestions">
          {filtered.map((g, i) => (
            <li key={g} className={i === index ? "active" : ""} onMouseDown={() => addTag(g)}>
              {g}
            </li>
          ))}
        </ul>
      )}

      {suggested.filter((g) => !selected.includes(g)).length > 0 && (
        <div className="genre-suggestions-row">
          <span className="genre-suggestions-label">Suggested:</span>
          {suggested
            .filter((g) => !selected.includes(g))
            .map((g) => (
              <button
                key={g}
                type="button"
                className="genre-suggestion-pill"
                onMouseDown={() => addTag(g)}
              >
                {g}
              </button>
            ))}
        </div>
      )}
    </div>
  );
};
