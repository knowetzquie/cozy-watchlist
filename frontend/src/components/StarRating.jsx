import { useState } from "react";

export default function StarRating({ value, onChange, readOnly = false }) {
  const [hovered, setHovered] = useState(0);
  const display = hovered || value;

  return (
    <div
      className="star-rating"
      onMouseLeave={() => setHovered(0)}
      role={readOnly ? undefined : "radiogroup"}
      aria-label="Rating out of 5"
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          className={`star ${n <= display ? "star--filled" : ""}`}
          disabled={readOnly}
          onMouseEnter={() => !readOnly && setHovered(n)}
          onClick={() => !readOnly && onChange(n === value ? 0 : n)}
          aria-label={`${n} star${n > 1 ? "s" : ""}`}
          aria-pressed={n <= value}
        >
          ★
        </button>
      ))}
    </div>
  );
}
