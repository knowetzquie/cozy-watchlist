export default function PosterGrid({ items, onOpenDetails }) {
  return (
    <div className="poster-grid">
      {items.map((item) => (
        <button
          key={item.id}
          className="poster-grid__item"
          onClick={() => onOpenDetails(item)}
          aria-label={`View details for ${item.title}`}
        >
          {item.poster_url ? (
            <img src={item.poster_url} alt="" className="poster-grid__img" />
          ) : (
            <div className="poster-grid__img poster-grid__img--empty">🎬</div>
          )}

          <span className="poster-grid__overlay">
            <span className="poster-grid__title">{item.title}</span>
            {item.rating > 0 && (
              <span className="poster-grid__rating">
                {"★".repeat(item.rating)}
              </span>
            )}
          </span>
        </button>
      ))}
    </div>
  );
}
