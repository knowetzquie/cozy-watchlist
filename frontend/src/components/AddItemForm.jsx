import { useEffect, useRef, useState } from "react";
import StarRating from "./StarRating.jsx";
import { api } from "../api.js";

const EMPTY = {
  title: "",
  genre: "",
  status: "plan to watch",
  rating: 0,
  poster_url: "",
  tmdb_id: null,
  media_type: null,
  year: null,
};

const QUICK_GENRES = [
  "Action",
  "Sci-Fi",
  "Animation",
  "Drama",
  "Comedy",
  "Thriller",
  "Horror",
  "Romance",
];

export default function AddItemForm({ onAdd }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const [suggestions, setSuggestions] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [searchError, setSearchError] = useState("");
  const debounceRef = useRef(null);
  const skipNextSearch = useRef(false);

  async function runSearch(query) {
    setSearching(true);
    setSearchError("");
    try {
      const results = await api.searchTitles(query);
      if (results.error) {
        setSearchError(results.error);
        setSuggestions([]);
      } else {
        setSuggestions(results);
      }
    } catch (err) {
      setSearchError(err.message);
      setSuggestions([]);
    } finally {
      setSearching(false);
    }
  }

  useEffect(() => {
    if (skipNextSearch.current) {
      skipNextSearch.current = false;
      return;
    }

    clearTimeout(debounceRef.current);

    const query = form.title.trim();
    if (query.length < 2) {
      setSuggestions([]);
      setSearchError("");
      return;
    }

    debounceRef.current = setTimeout(() => runSearch(query), 400);
    return () => clearTimeout(debounceRef.current);
  }, [form.title]);

  function selectSuggestion(suggestion) {
    skipNextSearch.current = true;
    setForm((f) => ({
      ...f,
      title: suggestion.title,
      genre: suggestion.genre || f.genre,
      poster_url: suggestion.poster_url || "",
      tmdb_id: suggestion.tmdb_id || null,
      media_type: suggestion.media_type || null,
      year: suggestion.year || null,
    }));
    setSuggestions([]);
    setShowSuggestions(false);
  }

  function changePoster() {
    setForm((f) => ({
      ...f,
      poster_url: "",
      tmdb_id: null,
      media_type: null,
      year: null,
    }));
    setShowSuggestions(true);
    const query = form.title.trim();
    if (query.length >= 2) runSearch(query);
  }

  function toggleGenre(g) {
    setForm((f) => {
      const current = f.genre
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      const exists = current.some((c) => c.toLowerCase() === g.toLowerCase());
      const next = exists
        ? current.filter((c) => c.toLowerCase() !== g.toLowerCase())
        : [...current, g];
      return { ...f, genre: next.join(", ") };
    });
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Give it a title before adding it to the shelf.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await onAdd(form);
      setForm(EMPTY);
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function handleKeyDown(e) {
    if (e.key === "Escape") {
      e.preventDefault();
      setForm(EMPTY);
      setShowSuggestions(false);
    } else if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
      e.preventDefault();
      handleSubmit(e);
    }
  }

  const activeGenres = form.genre
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);

  return (
    <form
      className="index-card"
      onSubmit={handleSubmit}
      onKeyDown={handleKeyDown}
    >
      <div className="index-card__row index-card__row--fields">
        <label className="field field--grow">
          <span>Title</span>
          <div className="title-search">
            <input
              autoFocus
              type="text"
              placeholder="Start typing a title…"
              value={form.title}
              onChange={(e) => {
                setForm((f) => ({
                  ...f,
                  title: e.target.value,
                  poster_url: "",
                  tmdb_id: null,
                  media_type: null,
                  year: null,
                }));
                setShowSuggestions(true);
              }}
              onFocus={() => setShowSuggestions(true)}
              onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
              autoComplete="off"
            />

            {showSuggestions && form.title.trim().length >= 2 && (
              <div className="suggestions">
                {searching && (
                  <div className="suggestions__status">Searching…</div>
                )}

                {!searching && searchError && (
                  <div className="suggestions__status suggestions__status--error">
                    {searchError}
                  </div>
                )}

                {!searching && !searchError && suggestions.length === 0 && (
                  <div className="suggestions__status">No matches found.</div>
                )}

                {!searching &&
                  suggestions.map((s, i) => (
                    <button
                      type="button"
                      key={`${s.title}-${i}`}
                      className="suggestion"
                      onMouseDown={() => selectSuggestion(s)}
                    >
                      {s.poster_url ? (
                        <img
                          src={s.poster_url}
                          alt=""
                          className="suggestion__poster"
                        />
                      ) : (
                        <div className="suggestion__poster suggestion__poster--empty">
                          🎬
                        </div>
                      )}
                      <span className="suggestion__text">
                        <span className="suggestion__title">{s.title}</span>
                        <span className="suggestion__meta">
                          {[s.kind, s.year, s.genre]
                            .filter(Boolean)
                            .join(" · ")}
                        </span>
                      </span>
                    </button>
                  ))}
              </div>
            )}
          </div>
        </label>

        <label className="field field--grow">
          <span>Genre</span>
          <input
            type="text"
            placeholder="e.g. Anime"
            value={form.genre}
            onChange={(e) => setForm({ ...form, genre: e.target.value })}
          />
        </label>
      </div>

      <div className="genre-chips">
        {QUICK_GENRES.map((g) => (
          <button
            type="button"
            key={g}
            className={`genre-chip ${
              activeGenres.includes(g.toLowerCase()) ? "genre-chip--active" : ""
            }`}
            onClick={() => toggleGenre(g)}
          >
            {g}
          </button>
        ))}
      </div>

      {form.poster_url && (
        <div className="poster-card">
          <img src={form.poster_url} alt="" className="poster-card__img" />
          <div className="poster-card__meta">
            <span className="poster-card__title">{form.title}</span>
            <span className="poster-card__sub">
              {[form.media_type === "tv" ? "TV Series" : "Movie", form.year]
                .filter(Boolean)
                .join(" • ")}
            </span>
          </div>
          <div className="poster-card__actions">
            <button
              type="button"
              className="btn btn--tiny btn--ghost"
              onClick={changePoster}
            >
              Change
            </button>
            <button
              type="button"
              className="btn btn--tiny btn--ghost"
              onClick={() =>
                setForm((f) => ({
                  ...f,
                  poster_url: "",
                  tmdb_id: null,
                  media_type: null,
                  year: null,
                }))
              }
            >
              Remove
            </button>
          </div>
        </div>
      )}

      <div className="index-card__row index-card__row--meta">
        <label className="field">
          <span>Status</span>
          <select
            value={form.status}
            onChange={(e) =>
              setForm({
                ...form,
                status: e.target.value,
                rating: e.target.value === "completed" ? form.rating : 0,
              })
            }
          >
            <option value="plan to watch">Plan to Watch</option>
            <option value="watching">Watching</option>
            <option value="completed">Completed</option>
          </select>
        </label>

        <div className="field">
          <span>Rating</span>
          <StarRating
            value={form.rating}
            readOnly={form.status !== "completed"}
            onChange={(rating) =>
              form.status === "completed" && setForm({ ...form, rating })
            }
            showLabel
          />
        </div>

        <div className="index-card__actions">
          <button
            type="button"
            className="btn btn--ghost"
            onClick={() => setForm(EMPTY)}
          >
            Cancel
          </button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? "Adding…" : "Add to list"}
          </button>
        </div>
      </div>

      {error && <p className="form-error">{error}</p>}
    </form>
  );
}
