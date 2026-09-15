import { useState } from "react";
import StarRating from "./StarRating.jsx";
import LogEntryModal from "./LogEntryModal.jsx";

export default function WatchlistItem({
  item,
  onUpdate,
  onDelete,
  onOpenDetails,
}) {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);

  const isCompleted = item.status === "completed";

  return (
    <li className={`ticket ticket--${item.status.replace(/\s+/g, "-")}`}>
      <div className="ticket__clip">
        <div className="ticket__stub" aria-hidden="true" />

        <div className="ticket__inner">
          <div className="ticket__body">
            <div className="ticket__main">
              <button
                className="ticket__poster-btn"
                onClick={() => onOpenDetails(item)}
                aria-label={`View details for ${item.title}`}
                title="View details"
              >
                {item.poster_url ? (
                  <img
                    src={item.poster_url}
                    alt=""
                    className="ticket__poster"
                  />
                ) : (
                  <div className="ticket__poster ticket__poster--empty">🎬</div>
                )}
              </button>
              <div className="ticket__text">
                <p className="ticket__title">{item.title}</p>
                {item.genre && <p className="ticket__genre">{item.genre}</p>}
              </div>
            </div>

            <div className="ticket__controls">
              <select
                className="favorite-select"
                value={item.favorite_rank || ""}
                onChange={(e) =>
                  onUpdate(item.id, {
                    favorite_rank:
                      e.target.value === "" ? null : Number(e.target.value),
                  })
                }
                title="Top 5 of All Time"
              >
                <option value="">☆ Top 5</option>
                <option value="1">★ #1</option>
                <option value="2">★ #2</option>
                <option value="3">★ #3</option>
                <option value="4">★ #4</option>
                <option value="5">★ #5</option>
              </select>

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

          {isCompleted && (
            <div className="review">
              {item.review ? (
                <button
                  className="review__existing"
                  onClick={() => setShowLogModal(true)}
                >
                  <span className="review__label">Your review</span>
                  <span className="review__text">{item.review}</span>
                </button>
              ) : (
                <button
                  className="review__prompt"
                  onClick={() => setShowLogModal(true)}
                >
                  + Write a review
                </button>
              )}
            </div>
          )}
        </div>
      </div>

      {showLogModal && (
        <LogEntryModal
          item={item}
          onClose={() => setShowLogModal(false)}
          onSave={async (changes) => {
            await onUpdate(item.id, changes);
            setShowLogModal(false);
          }}
          onDelete={() => {
            setShowLogModal(false);
            onDelete(item.id);
          }}
        />
      )}
    </li>
  );
}
