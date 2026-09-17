import { useMemo, useState } from "react";
import LogEntryModal from "./LogEntryModal.jsx";

function relativeTime(dateStr) {
  if (!dateStr) return "";
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return "";
  const diffSec = Math.floor((Date.now() - then) / 1000);
  if (diffSec < 60) return "just now";
  const min = Math.floor(diffSec / 60);
  if (min < 60) return `${min} minute${min !== 1 ? "s" : ""} ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr} hour${hr !== 1 ? "s" : ""} ago`;
  const day = Math.floor(hr / 24);
  if (day < 7) return `${day} day${day !== 1 ? "s" : ""} ago`;
  const week = Math.floor(day / 7);
  if (week < 5) return `${week} week${week !== 1 ? "s" : ""} ago`;
  const month = Math.floor(day / 30);
  if (month < 12) return `${month} month${month !== 1 ? "s" : ""} ago`;
  const year = Math.floor(day / 365);
  return `${year} year${year !== 1 ? "s" : ""} ago`;
}

function ReviewCard({ item, onOpenDetails, onUpdate, onDelete }) {
  const [expanded, setExpanded] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [imgError, setImgError] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [showLogModal, setShowLogModal] = useState(false);

  const reviewDate = item.watched_at || item.created_at;
  const isLong = item.review.length > 220;

  return (
    <article className="review-card">
      <button
        className="review-card__poster-btn"
        onClick={() => onOpenDetails(item)}
        aria-label={`View details for ${item.title}`}
      >
        {item.poster_url && !imgError ? (
          <>
            {!imgLoaded && (
              <div className="review-card__poster review-card__poster--skeleton" />
            )}
            <img
              src={item.poster_url}
              alt=""
              className="review-card__poster"
              style={{ display: imgLoaded ? "block" : "none" }}
              onLoad={() => setImgLoaded(true)}
              onError={() => setImgError(true)}
            />
          </>
        ) : (
          <div className="review-card__poster review-card__poster--empty">
            🎬
          </div>
        )}
      </button>

      <div className="review-card__body">
        <div className="review-card__header">
          <h3 className="review-card__title">{item.title}</h3>
          {reviewDate && (
            <span className="review-card__time">
              {item.liked && <span className="review-card__liked">❤️</span>}
              Reviewed {relativeTime(reviewDate)}
            </span>
          )}
        </div>

        <div className="review-card__rating">
          {"★".repeat(item.rating)}
          <span className="review-card__rating-empty">
            {"★".repeat(5 - item.rating)}
          </span>
        </div>

        {item.genre && <p className="review-card__genre">{item.genre}</p>}

        <blockquote
          className={`review-card__text ${
            expanded ? "" : "review-card__text--clamped"
          }`}
        >
          “{item.review}”
        </blockquote>
        {isLong && (
          <button
            type="button"
            className="review-card__toggle"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? "Show less" : "Read more"}
          </button>
        )}

        <div className="review-card__actions">
          <button
            type="button"
            className="review-card__action"
            title="Edit review"
            onClick={() => setShowLogModal(true)}
          >
            ✏️
          </button>
          <button
            type="button"
            className={`review-card__action ${
              item.liked ? "review-card__action--active" : ""
            }`}
            title="Like"
            onClick={() => onUpdate(item.id, { liked: !item.liked })}
          >
            {item.liked ? "❤️" : "🤍"}
          </button>
          {confirmingDelete ? (
            <span className="review-card__confirm">
              Delete?
              <button
                type="button"
                className="btn btn--tiny btn--danger"
                onClick={() => onDelete(item.id)}
              >
                Yes
              </button>
              <button
                type="button"
                className="btn btn--tiny btn--ghost"
                onClick={() => setConfirmingDelete(false)}
              >
                No
              </button>
            </span>
          ) : (
            <button
              type="button"
              className="review-card__action"
              title="Delete"
              onClick={() => setConfirmingDelete(true)}
            >
              🗑️
            </button>
          )}
        </div>
      </div>

      {showLogModal && (
        <LogEntryModal
          item={item}
          onClose={() => setShowLogModal(false)}
          onSave={async (changes) => {
            await onUpdate(item.id, changes);
          }}
          onDelete={() => {
            onDelete(item.id);
          }}
        />
      )}
    </article>
  );
}

export default function ReviewsPage({
  items,
  onOpenDetails,
  onUpdate,
  onDelete,
}) {
  const [sortBy, setSortBy] = useState("recent");
  const [genreFilter, setGenreFilter] = useState("all");

  const reviewed = items.filter((it) => it.status === "completed" && it.review);

  const genres = useMemo(() => {
    const set = new Set();
    reviewed.forEach((it) => {
      (it.genre || "")
        .split(",")
        .map((g) => g.trim())
        .filter(Boolean)
        .forEach((g) => set.add(g));
    });
    return [...set].sort();
  }, [reviewed]);

  const visible = reviewed
    .filter(
      (it) =>
        genreFilter === "all" ||
        (it.genre || "")
          .split(",")
          .map((g) => g.trim().toLowerCase())
          .includes(genreFilter.toLowerCase()),
    )
    .sort((a, b) => {
      if (sortBy === "rating") return b.rating - a.rating;
      if (sortBy === "title") return a.title.localeCompare(b.title);
      const aDate = new Date(a.watched_at || a.created_at);
      const bDate = new Date(b.watched_at || b.created_at);
      return bDate - aDate;
    });

  if (reviewed.length === 0) {
    return (
      <div className="empty-state">
        <p>No reviews yet. Write one from any completed title.</p>
      </div>
    );
  }

  return (
    <div className="reviews-page">
      <div className="reviews-toolbar">
        <label className="reviews-toolbar__field">
          <span>Sort by</span>
          <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}>
            <option value="recent">Recently watched</option>
            <option value="rating">Rating (high to low)</option>
            <option value="title">Title (A–Z)</option>
          </select>
        </label>

        {genres.length > 0 && (
          <label className="reviews-toolbar__field">
            <span>Genre</span>
            <select
              value={genreFilter}
              onChange={(e) => setGenreFilter(e.target.value)}
            >
              <option value="all">All genres</option>
              {genres.map((g) => (
                <option key={g} value={g}>
                  {g}
                </option>
              ))}
            </select>
          </label>
        )}

        <span className="reviews-toolbar__count">
          {visible.length} review{visible.length !== 1 ? "s" : ""}
        </span>
      </div>

      {visible.map((item) => (
        <ReviewCard
          key={item.id}
          item={item}
          onOpenDetails={onOpenDetails}
          onUpdate={onUpdate}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
