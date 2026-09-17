import { useState } from "react";

function toDateInputValue(dateLike) {
  const dt = dateLike ? new Date(dateLike) : new Date();
  const yyyy = dt.getFullYear();
  const mm = String(dt.getMonth() + 1).padStart(2, "0");
  const dd = String(dt.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function LogEntryModal({ item, onClose, onSave, onDelete }) {
  const [status, setStatus] = useState(item.status || "plan to watch");
  const [watchedOnEnabled, setWatchedOnEnabled] = useState(true);
  const [watchedOn, setWatchedOn] = useState(
    toDateInputValue(item.watched_at || item.created_at),
  );
  const [rewatch, setRewatch] = useState(!!item.is_rewatch);
  const [review, setReview] = useState(item.review || "");
  const [rating, setRating] = useState(item.rating || 0);
  const [hoverRating, setHoverRating] = useState(0);
  const [liked, setLiked] = useState(!!item.liked);
  const [saving, setSaving] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [closing, setClosing] = useState(false);

  function requestClose() {
    if (closing || saving) return;
    setClosing(true);
    window.setTimeout(onClose, 180);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await onSave({
        status,
        watched_at: watchedOnEnabled ? watchedOn : null,
        is_rewatch: rewatch,
        review: review.trim(),
        rating: status === "completed" ? rating : 0,
        liked,
      });
      requestClose();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (closing) return;
    setClosing(true);
    await onDelete();
    window.setTimeout(onClose, 180);
  }

  return (
    <div
      className={`modal-overlay ${closing ? "modal-overlay--closing" : ""}`}
      onClick={requestClose}
    >
      <div
        className={`modal modal--log ${closing ? "modal--closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="log-modal__header">
          <h2>Edit diary entry</h2>
          <button
            className="log-modal__close"
            onClick={requestClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="log-modal__body">
          <div className="log-modal__poster-col">
            {item.poster_url ? (
              <img src={item.poster_url} alt="" className="log-modal__poster" />
            ) : (
              <div className="log-modal__poster log-modal__poster--empty">
                🎬
              </div>
            )}
          </div>

          <div className="log-modal__main">
            <h3 className="log-modal__title">{item.title}</h3>

            <div className="log-modal__row">
              <label className="log-modal__field">
                <span className="log-modal__field-label">Status</span>
                <select
                  className="log-modal__status"
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                >
                  <option value="plan to watch">Plan to Watch</option>
                  <option value="watching">Watching</option>
                  <option value="completed">Completed</option>
                </select>
              </label>

              <label className="log-modal__checkbox">
                <input
                  type="checkbox"
                  checked={watchedOnEnabled}
                  onChange={(e) => setWatchedOnEnabled(e.target.checked)}
                />
                Watched on
              </label>
              <input
                type="date"
                className="log-modal__date"
                value={watchedOn}
                onChange={(e) => setWatchedOn(e.target.value)}
                disabled={!watchedOnEnabled}
                max={toDateInputValue()}
              />

              <label className="log-modal__checkbox">
                <input
                  type="checkbox"
                  checked={rewatch}
                  onChange={(e) => setRewatch(e.target.checked)}
                />
                I've watched this before
              </label>
            </div>

            <textarea
              className="log-modal__review"
              placeholder="Add a review…"
              value={review}
              onChange={(e) => setReview(e.target.value)}
              rows={7}
            />

            <div className="log-modal__footer-row">
              <div className="log-modal__rating">
                <span className="log-modal__rating-label">Rating</span>
                <span className="log-modal__rating-stars">
                  {[1, 2, 3, 4, 5].map((n) => (
                    <button
                      key={n}
                      type="button"
                      className="log-modal__star"
                      onMouseEnter={() => setHoverRating(n)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setRating(n === rating ? 0 : n)}
                      aria-label={`Rate ${n} star${n > 1 ? "s" : ""}`}
                    >
                      {(hoverRating || rating) >= n ? "★" : "☆"}
                    </button>
                  ))}
                </span>
              </div>

              <div className="log-modal__like">
                <span className="log-modal__rating-label">Like</span>
                <button
                  type="button"
                  className={`log-modal__heart ${
                    liked ? "log-modal__heart--active" : ""
                  }`}
                  onClick={() => setLiked((v) => !v)}
                  aria-label="Toggle like"
                >
                  {liked ? "❤️" : "🤍"}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="log-modal__actions">
          {confirmingDelete ? (
            <span className="log-modal__confirm-delete">
              Remove this title?
              <button className="btn btn--tiny btn--danger" onClick={handleDelete}>
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
              className="btn btn--ghost"
              onClick={() => setConfirmingDelete(true)}
            >
              Delete
            </button>
          )}
          <button
            className="btn btn--primary"
            onClick={handleSave}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
