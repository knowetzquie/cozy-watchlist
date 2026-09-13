import { useState } from "react";

const RANKS = [1, 2, 3, 4, 5];

export default function TopFive({
  items,
  onAssign,
  onRemove,
  onUpdateNote,
  onOpenDetails,
}) {
  const [editing, setEditing] = useState(false);

  const byRank = {};
  for (const item of items) {
    if (item.favorite_rank) byRank[item.favorite_rank] = item;
  }

  const hasAny = RANKS.some((r) => byRank[r]);
  const unranked = items.filter((it) => !it.favorite_rank);

  async function moveRank(currentRank, delta) {
    const targetRank = currentRank + delta;
    if (targetRank < 1 || targetRank > 5) return;

    const current = byRank[currentRank];
    const target = byRank[targetRank];
    if (!current) return;

    if (target) {
      // Swap: move current into the target's spot, then move target into
      // current's now-vacated spot.
      await onAssign(current.id, targetRank);
      await onAssign(target.id, currentRank);
    } else {
      await onAssign(current.id, targetRank);
    }
  }

  return (
    <section className="top-five">
      <div className="top-five__header">
        <h2>Elite Five</h2>
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
                  <div className="top-five__poster-wrap">
                    {editing ? (
                      item.poster_url ? (
                        <img
                          src={item.poster_url}
                          alt=""
                          className="top-five__poster"
                        />
                      ) : (
                        <div className="top-five__poster top-five__poster--empty">
                          🎬
                        </div>
                      )
                    ) : (
                      <button
                        className="top-five__poster-btn"
                        onClick={() => onOpenDetails(item)}
                        aria-label={`View details for ${item.title}`}
                        title="View details"
                      >
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
                      </button>
                    )}
                  </div>
                  <p className="top-five__title">{item.title}</p>

                  {editing ? (
                    <input
                      className="top-five__note-input"
                      type="text"
                      placeholder="Add a short note…"
                      defaultValue={item.favorite_note || ""}
                      maxLength={80}
                      onBlur={(e) =>
                        onUpdateNote(item.id, e.target.value.trim())
                      }
                    />
                  ) : (
                    item.favorite_note && (
                      <p className="top-five__note">"{item.favorite_note}"</p>
                    )
                  )}

                  {editing && (
                    <div className="top-five__edit-row">
                      <button
                        className="top-five__move"
                        onClick={() => moveRank(rank, -1)}
                        disabled={rank === 1}
                        aria-label="Move left"
                        title="Move left"
                      >
                        ◀
                      </button>
                      <button
                        className="top-five__remove"
                        onClick={() => onRemove(item.id)}
                        aria-label={`Remove ${item.title} from Top 5`}
                        title="Remove from Top 5"
                      >
                        ✕
                      </button>
                      <button
                        className="top-five__move"
                        onClick={() => moveRank(rank, 1)}
                        disabled={rank === 5}
                        aria-label="Move right"
                        title="Move right"
                      >
                        ▶
                      </button>
                    </div>
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
