import { useMemo, useState } from "react";

function watchedDate(item) {
  return item.watched_at || item.created_at;
}

export default function DiaryPage({ items, onOpenDetails }) {
  const [year, setYear] = useState(String(new Date().getFullYear()));
  const completed = useMemo(
    () =>
      items
        .filter((item) => item.status === "completed")
        .sort((a, b) => new Date(watchedDate(b)) - new Date(watchedDate(a))),
    [items],
  );
  const years = [
    ...new Set(
      completed.map((item) => new Date(watchedDate(item)).getFullYear()),
    ),
  ];
  const entries = completed.filter(
    (item) => new Date(watchedDate(item)).getFullYear() === Number(year),
  );
  const rewatchCount = completed.filter((item) => item.is_rewatch).length;
  return (
    <div className="feature-page">
      <header className="feature-page__intro">
        <p className="eyebrow">Diary</p>
        <h1>Your watch log</h1>
        <p>
          A chronological record of what you watched, with rewatches kept
          visible without changing completion totals.
        </p>
      </header>
      <div className="diary-summary">
        <div>
          <strong>{completed.length}</strong>
          <span>logged titles</span>
        </div>
        <div>
          <strong>{rewatchCount}</strong>
          <span>rewatches</span>
        </div>
        <label>
          Year{" "}
          <select
            value={year}
            onChange={(event) => setYear(event.target.value)}
          >
            {years.length ? (
              years.map((value) => <option key={value}>{value}</option>)
            ) : (
              <option>{new Date().getFullYear()}</option>
            )}
          </select>
        </label>
      </div>
      {entries.length === 0 ? (
        <p className="empty-state">No completed titles logged for this year.</p>
      ) : (
        <div className="diary-timeline">
          {entries.map((item) => {
            const date = new Date(watchedDate(item));
            return (
              <button
                className="diary-entry"
                type="button"
                key={`${item.id}-${watchedDate(item)}`}
                onClick={() => onOpenDetails(item)}
              >
                <time>
                  <strong>{date.getDate()}</strong>
                  <span>
                    {date.toLocaleString("default", { month: "short" })}
                  </span>
                </time>
                <span className="diary-entry__line" />
                <span className="diary-entry__content">
                  <strong>{item.title}</strong>
                  <small>
                    {item.genre || "Uncategorized"}
                    {item.is_rewatch ? " · Rewatch" : ""}
                  </small>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
