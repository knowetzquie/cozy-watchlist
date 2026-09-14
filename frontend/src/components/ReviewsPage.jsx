export default function ReviewsPage({ items, onOpenDetails }) {
  const reviewed = items.filter((it) => it.status === "completed" && it.review);

  if (reviewed.length === 0) {
    return (
      <div className="empty-state">
        <p>No reviews yet. Write one from any completed title.</p>
      </div>
    );
  }

  return (
    <div className="reviews-page">
      {reviewed.map((item) => (
        <article className="review-card" key={item.id}>
          <button
            className="review-card__poster-btn"
            onClick={() => onOpenDetails(item)}
            aria-label={`View details for ${item.title}`}
          >
            {item.poster_url ? (
              <img
                src={item.poster_url}
                alt=""
                className="review-card__poster"
              />
            ) : (
              <div className="review-card__poster review-card__poster--empty">
                🎬
              </div>
            )}
          </button>

          <div className="review-card__body">
            <h3 className="review-card__title">{item.title}</h3>
            <div className="review-card__rating">
              {"★".repeat(item.rating)}
              <span className="review-card__rating-empty">
                {"★".repeat(5 - item.rating)}
              </span>
            </div>
            {item.genre && <p className="review-card__genre">{item.genre}</p>}
            <p className="review-card__text">{item.review}</p>
          </div>
        </article>
      ))}
    </div>
  );
}
