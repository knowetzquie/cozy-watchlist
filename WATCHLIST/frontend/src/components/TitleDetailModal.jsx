import { useEffect, useState } from "react";
import { api } from "../api.js";

export default function TitleDetailModal({ item, onClose, onBackfill }) {
  const [details, setDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [autoMatched, setAutoMatched] = useState(false);
  const [closing, setClosing] = useState(false);

  function requestClose() {
    if (closing) return;
    setClosing(true);
    window.setTimeout(onClose, 180);
  }

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setLoading(true);
      setError("");
      setAutoMatched(false);

      let tmdbId = item.tmdb_id;
      let mediaType = item.media_type;

      if (!tmdbId) {
        try {
          const matches = await api.searchTitles(item.title);
          const best = Array.isArray(matches) ? matches[0] : null;
          if (best?.tmdb_id) {
            tmdbId = best.tmdb_id;
            mediaType = best.media_type;
            if (!cancelled) setAutoMatched(true);
            if (onBackfill) onBackfill(item.id, tmdbId, mediaType);
          }
        } catch {
          // ignore — falls through to "not found" below
        }
      }

      if (!tmdbId) {
        if (!cancelled) {
          setError("Couldn't find extra details for this title.");
          setLoading(false);
        }
        return;
      }

      try {
        const data = await api.getTitleDetails(tmdbId, mediaType);
        if (!cancelled) setDetails(data);
      } catch (err) {
        if (!cancelled) setError(err.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [item.id, item.title, item.tmdb_id, item.media_type, onBackfill]);

  return (
    <div
      className={`modal-overlay ${closing ? "modal-overlay--closing" : ""}`}
      onClick={requestClose}
    >
      <div
        className={`modal ${closing ? "modal--closing" : ""}`}
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modal__close" onClick={requestClose} aria-label="Close">
          ✕
        </button>

        <div className="modal__body">
          <div className="modal__poster-col">
            {details?.poster_url || item.poster_url ? (
              <img
                src={details?.poster_url || item.poster_url}
                alt=""
                className="modal__poster"
              />
            ) : (
              <div className="modal__poster modal__poster--empty">🎬</div>
            )}
          </div>

          <div className="modal__info">
            <h2 className="modal__title">
              {item.title}
              {details?.year && (
                <span className="modal__year"> ({details.year})</span>
              )}
            </h2>

            {loading && <p className="modal__status">Loading details…</p>}

            {!loading && error && (
              <p className="modal__status modal__status--error">{error}</p>
            )}

            {!loading && autoMatched && details && (
              <p className="modal__meta modal__meta--muted">
                Matched automatically by title.
              </p>
            )}

            {!loading && details && (
              <>
                {details.genres?.length > 0 && (
                  <div className="modal__genres">
                    {details.genres.map((g) => (
                      <span className="modal__genre-tag" key={g}>
                        {g}
                      </span>
                    ))}
                  </div>
                )}

                {details.overview && (
                  <p className="modal__overview">{details.overview}</p>
                )}

                {details.directors?.length > 0 && (
                  <p className="modal__meta">
                    <strong>
                      Director{details.directors.length > 1 ? "s" : ""}:
                    </strong>{" "}
                    {details.directors.map((d) => d.name).join(", ")}
                  </p>
                )}

                {details.cast?.length > 0 && (
                  <p className="modal__meta">
                    <strong>Cast:</strong>{" "}
                    {details.cast.map((c) => c.name).join(", ")}
                  </p>
                )}

                {(details.runtime || details.vote_average) && (
                  <p className="modal__meta modal__meta--muted">
                    {details.runtime && `${details.runtime} min`}
                    {details.runtime && details.vote_average ? " · " : ""}
                    {details.vote_average &&
                      `TMDB ${details.vote_average.toFixed(1)}/10`}
                  </p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
