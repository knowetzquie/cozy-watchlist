import { useState } from "react";
import StarRating from "./StarRating.jsx";

const EMPTY = { title: "", genre: "", status: "plan to watch", rating: 0 };

export default function AddItemForm({ onAdd, onClose }) {
  const [form, setForm] = useState(EMPTY);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

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
      onClose();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  }

  return (
    <form className="index-card" onSubmit={handleSubmit}>
      <div className="index-card__row">
        <label className="field field--grow">
          <span>Title</span>
          <input
            autoFocus
            type="text"
            placeholder="e.g. Spirited Away"
            value={form.title}
            onChange={(e) => setForm({ ...form, title: e.target.value })}
          />
        </label>
        <label className="field">
          <span>Genre</span>
          <input
            type="text"
            placeholder="e.g. Anime"
            value={form.genre}
            onChange={(e) => setForm({ ...form, genre: e.target.value })}
          />
        </label>
      </div>

      <div className="index-card__row index-card__row--align">
        <label className="field">
          <span>Status</span>
          <select
            value={form.status}
            onChange={(e) => setForm({ ...form, status: e.target.value })}
          >
            <option value="plan to watch">Plan to Watch</option>
            <option value="watching">Watching</option>
            <option value="completed">Completed</option>
          </select>
        </label>

        <label className="field">
          <span>Rating</span>
          <StarRating
            value={form.rating}
            onChange={(rating) => setForm({ ...form, rating })}
          />
        </label>

        <div className="index-card__actions">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
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
