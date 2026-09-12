import { useState } from "react";

const RANKS = [1, 2, 3, 4, 5];

export default function TopFive({ items, onAssign, onRemove }) {
  const [editing, setEditing] = useState(false);

  const byRank = {};
  for (const item of items) {
    if (item.favorite_rank) byRank[item.favorite_rank] = item;
  }

  const hasAny = RANKS.some((r) => byRank[r]);
  const unranked = items.filter((it) => !it.favorite_rank);

  return (
    <section className="top-five">
      <div className="top-five__header">
        <h2>Top 5 of All Time</h2>
        {!hasAny && !editing && (
          <p className="top-five__hint">
            Click "Edit" to pick your all-time favorites.
          </p>
        )}
        <button
          className="btn btn--ghost btn--tiny top-five__edit-btn"
          onClick={() => setEditing((e) => !e)}
        >
          {editing ? "Done" : "Edit"}
        </button>
      </div>

      <div className="top-five__shelf">
        {RANKS.map((rank) => {
          const item = byRank[rank];
          return (
            <div className="top-five__slot" key={rank}>
              <span className="top-five__rank">{rank}</span>

              {item ? (
                <>
                  {item.poster_url ? (
                    <img
                      src={item.poster_url}
                      alt=""
                      className="top-five__poster"
                    />
                  ) : (
                    <div className="top-five__poster top-five__poster--empty">
                      🎬
                    </div>
                  )}
                  <p className="top-five__title">{item.title}</p>
                  {editing && (
                    <button
                      className="top-five__remove"
                      onClick={() => onRemove(item.id)}
                      aria-label={`Remove ${item.title} from Top 5`}
                      title="Remove from Top 5"
                    >
                      ✕
                    </button>
                  )}
                </>
              ) : editing ? (
                <select
                  className="top-five__picker"
                  value=""
                  onChange={(e) => {
                    if (e.target.value) onAssign(Number(e.target.value), rank);
                  }}
                >
                  <option value="">+ Choose title</option>
                  {unranked.map((it) => (
                    <option key={it.id} value={it.id}>
                      {it.title}
                    </option>
                  ))}
                </select>
              ) : (
                <div className="top-five__poster top-five__poster--placeholder">
                  +
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
