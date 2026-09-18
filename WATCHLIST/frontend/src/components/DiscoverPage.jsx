import { useEffect, useMemo, useState } from "react";
import { api } from "../api.js";

function Feed({ title, items, onAdd, watchlistKeys, headingExtra, compact = false, onLoadMore, loadingMore }) {
  if (!items.length)
    return <p className="empty-state">Nothing to show right now.</p>;
  return (
    <section className="feature-section">
      <div className="feature-section__heading">
        <div className="discovery-heading-title">
          <h2>{title}</h2>
          {headingExtra}
        </div>
        <span>{items.length} titles</span>
      </div>
      <div className="discovery-grid discovery-grid--scroll">
        {items.map((item) => (
          <article
            className={`discovery-card ${compact ? "discovery-card--compact" : ""}`}
            key={`${item.media_type}-${item.tmdb_id}`}
          >
            {item.poster_url ? (
              <img src={item.poster_url} alt="" />
            ) : (
              <div className="discovery-card__poster">🎬</div>
            )}
            <div className="discovery-card__body">
              <h3>{item.title}</h3>
              <p>
                {item.release_date
                  ? new Date(`${item.release_date}T12:00:00`).toLocaleDateString(undefined, {
                      month: "long",
                      day: "numeric",
                      year: "numeric",
                    })
                  : item.year || "Release date unknown"}
              </p>
              <div className="discovery-card__meta">
                {item.vote_average > 0 && (
                  <span title="TMDB community rating">★ {item.vote_average.toFixed(1)}</span>
                )}
                <span>{item.media_type === "tv" ? "TV show" : "Movie"}</span>
              </div>
              {item.reason && <small>{item.reason}</small>}
              <button
                type="button"
                className={watchlistKeys.has(`${item.media_type}-${item.tmdb_id}`) ? "is-added" : ""}
                disabled={watchlistKeys.has(`${item.media_type}-${item.tmdb_id}`)}
                onClick={() => onAdd(item)}
              >
                {watchlistKeys.has(`${item.media_type}-${item.tmdb_id}`)
                  ? "✓ In watchlist"
                  : "+ Add to watchlist"}
              </button>
            </div>
          </article>
        ))}
      </div>
      <button className="discovery-load-more" type="button" onClick={onLoadMore} disabled={loadingMore}>
        {loadingMore ? "Loading..." : "Load more"}
      </button>
    </section>
  );
}

export default function DiscoverPage({ items, onAdd }) {
  const [feeds, setFeeds] = useState({
    recommendations: [],
    trending: [],
    upcoming: [],
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [mediaType, setMediaType] = useState("all");
  const [releaseYear, setReleaseYear] = useState("all");
  const [trendingWindow, setTrendingWindow] = useState("week");
  const [pages, setPages] = useState({ recommendations: 1, trending: 1, upcoming: 1 });
  const [loadingMore, setLoadingMore] = useState("");
  const watchlistKeys = useMemo(
    () => new Set(items.filter((item) => item.tmdb_id).map((item) => `${item.media_type || "movie"}-${item.tmdb_id}`)),
    [items],
  );
  const topGenres = useMemo(() => {
    const counts = {};
    items.forEach((item) =>
      (item.genre || "").split(",").forEach((genre) => {
        const key = genre.trim();
        if (key) counts[key] = (counts[key] || 0) + (item.rating || 1);
      }),
    );
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([genre]) => genre)
      .join(",");
  }, [items]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    Promise.all([
      api.discover("recommendations", topGenres),
      api.discover("trending", "", trendingWindow),
      api.discover("upcoming"),
    ])
      .then(([recommendations, trending, upcoming]) => {
        if (!cancelled) {
          setFeeds({ recommendations, trending, upcoming });
          setPages({ recommendations: 1, trending: 1, upcoming: 1 });
        }
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [topGenres, trendingWindow]);

  const years = useMemo(
    () => [...new Set(Object.values(feeds).flat().map((item) => item.year).filter(Boolean))].sort((a, b) => b - a),
    [feeds],
  );
  const filterItems = (feed) =>
    feed.filter(
      (item) =>
        (mediaType === "all" || item.media_type === mediaType) &&
        (releaseYear === "all" || item.year === releaseYear),
    );
  async function loadMore(section) {
    setLoadingMore(section);
    const nextPage = pages[section] + 1;
    try {
      const more = await api.discover(
        section,
        section === "recommendations" ? topGenres : "",
        trendingWindow,
        nextPage,
      );
      setFeeds((current) => ({ ...current, [section]: [...current[section], ...more] }));
      setPages((current) => ({ ...current, [section]: nextPage }));
    } finally {
      setLoadingMore("");
    }

    function LoadingRail({ title }) {
      return (
        <section className="feature-section discovery-loading-rail" aria-label={`Loading ${title}`}>
          <div className="feature-section__heading">
            <h2>{title}</h2>
            <span className="discovery-loading-label">Loading</span>
          </div>
          <div className="discovery-grid discovery-grid--scroll">
            {[1, 2, 3, 4, 5, 6].map((placeholder) => (
              <div className="discovery-skeleton" key={placeholder} />
            ))}
          </div>
        </section>
      );
    }
  }
  return (
    <div className="feature-page">
      <header className="feature-page__intro">
        <p className="eyebrow">Discover</p>
        <h1>Your next great watch</h1>
        <p>
          Personalized picks shaped by your favorites and genre habits,
          alongside what is moving now.
        </p>
      </header>
      <div className="discovery-filters" aria-label="Recommendation filters">
        <span className="discovery-filters__label">Show</span>
        {[['all', 'Everything'], ['movie', 'Movies'], ['tv', 'TV shows']].map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={mediaType === value ? "active" : ""}
            onClick={() => setMediaType(value)}
          >
            {label}
          </button>
        ))}
        <label>
          <span className="sr-only">Release year</span>
          <select value={releaseYear} onChange={(event) => setReleaseYear(event.target.value)}>
            <option value="all">Any year</option>
            {years.map((year) => <option key={year} value={year}>{year}</option>)}
          </select>
        </label>
      </div>
      {error && <p className="banner banner--error">{error}</p>}
      {loading && (
        <div className="discovery-loading-state" aria-live="polite">
          <LoadingRail title="Trending" />
          <LoadingRail title="Picked for you" />
        </div>
      )}
      {!loading && !error && (
        <>
          <Feed
            title="Trending"
            compact
            headingExtra={
              <div className="trending-toggle" role="group" aria-label="Trending period">
                <button className={trendingWindow === "day" ? "active" : ""} onClick={() => setTrendingWindow("day")} type="button">Today</button>
                <button className={trendingWindow === "week" ? "active" : ""} onClick={() => setTrendingWindow("week")} type="button">This Week</button>
              </div>
            }
            items={filterItems(feeds.trending)}
            onAdd={onAdd}
            watchlistKeys={watchlistKeys}
            onLoadMore={() => loadMore("trending")}
            loadingMore={loadingMore === "trending"}
          />
          <Feed
            title="Picked for you"
            compact
            items={filterItems(feeds.recommendations)}
            onAdd={onAdd}
            watchlistKeys={watchlistKeys}
            onLoadMore={() => loadMore("recommendations")}
            loadingMore={loadingMore === "recommendations"}
          />
          <Feed
            title="Top Sci-Fi"
            items={filterItems(feeds.trending.filter((item) => (item.genre || "").toLowerCase().includes("sci-fi")))}
            onAdd={onAdd}
            watchlistKeys={watchlistKeys}
            onLoadMore={() => loadMore("trending")}
            loadingMore={loadingMore === "trending"}
          />
          <Feed
            title="Upcoming releases"
            items={filterItems(feeds.upcoming)}
            onAdd={onAdd}
            watchlistKeys={watchlistKeys}
            onLoadMore={() => loadMore("upcoming")}
            loadingMore={loadingMore === "upcoming"}
          />
        </>
      )}
    </div>
  );
}
