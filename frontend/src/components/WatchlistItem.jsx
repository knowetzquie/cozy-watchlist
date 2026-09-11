import { useState } from "react";
import StarRating from "./StarRating.jsx";

export default function WatchlistItem({ item, onUpdate, onDelete }) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  return (
    <li className={`ticket ticket--${item.status.replace(/\s+/g, "-")}`}>
      <div className="ticket__stub" aria-hidden="true" />

      <div className="ticket__body">
        <div className="ticket__main">
          {item.poster_url ? (
            <img src={item.poster_url} alt="" className="ticket__poster" />
          ) : (
            <div className="ticket__poster ticket__poster--empty">🎬</div>
          )}
          <div>
            <p className="ticket__title">{item.title}</p>
            {item.genre && <p className="ticket__genre">{item.genre}</p>}
          </div>
        </div>

        <div className="ticket__controls">
          <select
            className="status-select"
            value={item.status}
            onChange={(e) => onUpdate(item.id, { status: e.target.value })}
          >
            <option value="plan to watch">Plan to Watch</option>
            <option value="watching">Watching</option>
            <option value="completed">Completed</option>
          </select>

          <StarRating
            value={item.rating}
            onChange={(rating) => onUpdate(item.id, { rating })}
          />

          {confirmingDelete ? (
            <span className="confirm-delete">
              Remove?
              <button
                className="btn btn--tiny btn--danger"
                onClick={() => onDelete(item.id)}
              >
                Yes
              </button>
              <button
                className="btn btn--tiny btn--ghost"
                onClick={() => setConfirmingDelete(false)}
              >
                No
              </button>
            </span>
          ) : (
            <button
              className="icon-btn"
              title="Remove from list"
              aria-label="Remove from list"
              onClick={() => setConfirmingDelete(true)}
            >
              ✕
            </button>
          )}
        </div>
      </div>
    </li>
  );
}
