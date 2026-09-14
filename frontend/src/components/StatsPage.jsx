export default function StatsPage({ items }) {
  const total = items.length;
  const completed = items.filter((i) => i.status === "completed").length;
  const watching = items.filter((i) => i.status === "watching").length;
  const planned = items.filter((i) => i.status === "plan to watch").length;

  const ratingCounts = [1, 2, 3, 4, 5].map(
    (r) => items.filter((i) => i.rating === r).length,
  );
  const maxRatingCount = Math.max(1, ...ratingCounts);

  const ratedItems = items.filter((i) => i.rating > 0);
  const avgRating = ratedItems.length
    ? (
        ratedItems.reduce((sum, i) => sum + i.rating, 0) / ratedItems.length
      ).toFixed(1)
    : null;

  const genreCounts = {};
  items.forEach((i) => {
    (i.genre || "")
      .split(",")
      .map((g) => g.trim())
      .filter(Boolean)
      .forEach((g) => {
        genreCounts[g] = (genreCounts[g] || 0) + 1;
      });
  });
  const topGenres = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="stats-page">
      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-card__value">{total}</span>
          <span className="stat-card__label">Total titles</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{completed}</span>
          <span className="stat-card__label">Completed</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{watching}</span>
          <span className="stat-card__label">Watching</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{planned}</span>
          <span className="stat-card__label">Plan to Watch</span>
        </div>
        {avgRating && (
          <div className="stat-card">
            <span className="stat-card__value">{avgRating}★</span>
            <span className="stat-card__label">Average rating</span>
          </div>
        )}
      </div>

      <div className="stats-section">
        <h3>Ratings</h3>
        {ratedItems.length === 0 ? (
          <p className="stats-empty">Rate a few titles to see this fill in.</p>
        ) : (
          <div className="rating-chart">
            {[1, 2, 3, 4, 5].map((r) => {
              const count = ratingCounts[r - 1];
              const pct = ratedItems.length
                ? Math.round((count / ratedItems.length) * 100)
                : 0;
              const heightPct = (count / maxRatingCount) * 100;
              return (
                <div className="rating-chart__col" key={r}>
                  <div className="rating-chart__tooltip">
                    {count} film{count !== 1 ? "s" : ""} · {pct}%
                  </div>
                  <div
                    className="rating-chart__bar"
                    style={{ "--bar-height": `${heightPct}%` }}
                  />
                  <span className="rating-chart__label">{"★".repeat(r)}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {topGenres.length > 0 && (
        <div className="stats-section">
          <h3>Top genres</h3>
          <ul className="genre-list">
            {topGenres.map(([g, count]) => (
              <li key={g}>
                <span>{g}</span>
                <span>{count}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
