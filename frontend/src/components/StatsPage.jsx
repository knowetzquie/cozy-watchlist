import { useEffect, useState } from "react";
import PosterGrid from "./PosterGrid.jsx";

const DONUT_COLORS = [
  "#ec4899",
  "#a855f7",
  "#8b5cf6",
  "#6366f1",
  "#c084fc",
  "#7c3aed",
];

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

function CompletionRing({ pct }) {
  const [animatedPct, setAnimatedPct] = useState(0);

  useEffect(() => {
    setAnimatedPct(0);
    const t = setTimeout(() => setAnimatedPct(pct), 50);
    return () => clearTimeout(t);
  }, [pct]);

  const radius = 52;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (animatedPct / 100) * circumference;

  return (
    <div className="completion-ring">
      <svg viewBox="0 0 120 120" className="completion-ring__svg">
        <circle className="completion-ring__bg" cx="60" cy="60" r={radius} />
        <circle
          className="completion-ring__value"
          cx="60"
          cy="60"
          r={radius}
          style={{
            strokeDasharray: circumference,
            strokeDashoffset: offset,
          }}
        />
      </svg>
      <div className="completion-ring__label">
        <span>{pct.toFixed(1)}%</span>
        <small>completed</small>
      </div>
    </div>
  );
}

export default function StatsPage({ items, onOpenDetails }) {
  const [activeStat, setActiveStat] = useState(null); // { title, items } | null

  const now = new Date();
  const currentYear = now.getFullYear();

  const total = items.length;
  const completedItems = items.filter((i) => i.status === "completed");
  const watchingItems = items.filter((i) => i.status === "watching");
  const plannedItems = items.filter((i) => i.status === "plan to watch");
  const completionPct = total ? (completedItems.length / total) * 100 : 0;

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

  const sortedGenres = Object.entries(genreCounts).sort((a, b) => b[1] - a[1]);
  const totalGenreTags = sortedGenres.reduce((sum, [, c]) => sum + c, 0);
  const topGenres = sortedGenres.slice(0, 5);
  const otherCount = sortedGenres.slice(5).reduce((sum, [, c]) => sum + c, 0);

  const donutSlices = topGenres.map(([name, count]) => ({ name, count }));
  if (otherCount > 0) donutSlices.push({ name: "Other", count: otherCount });

  let cumulative = 0;
  const donutSegments = donutSlices.map((slice, i) => {
    const fraction = totalGenreTags ? (slice.count / totalGenreTags) * 100 : 0;
    const start = cumulative;
    cumulative += fraction;
    return {
      ...slice,
      color: DONUT_COLORS[i % DONUT_COLORS.length],
      start,
      end: cumulative,
      pct: totalGenreTags
        ? Math.round((slice.count / totalGenreTags) * 100)
        : 0,
    };
  });
  const donutGradient = donutSegments.length
    ? `conic-gradient(${donutSegments
        .map((s) => `${s.color} ${s.start}% ${s.end}%`)
        .join(", ")})`
    : null;

  // Monthly activity (completed titles per month, this calendar year)
  const monthlyCounts = new Array(12).fill(0);
  completedItems.forEach((i) => {
    const d = new Date(i.created_at);
    if (d.getFullYear() === currentYear) {
      monthlyCounts[d.getMonth()] += 1;
    }
  });
  const maxMonthlyCount = Math.max(1, ...monthlyCounts);
  const hasMonthlyActivity = monthlyCounts.some((c) => c > 0);

  // Watch streak: consecutive weeks with at least one completed title
  const WEEK_MS = 7 * 24 * 60 * 60 * 1000;
  const weekKey = (date) => Math.floor(date.getTime() / WEEK_MS);

  const activeWeekKeys = new Set(
    completedItems.map((i) => weekKey(new Date(i.created_at))),
  );
  let currentStreak = 0;
  let cursor = weekKey(now);
  while (activeWeekKeys.has(cursor)) {
    currentStreak += 1;
    cursor -= 1;
  }
  let longestStreak = 0;
  {
    let run = 0;
    let prevKey = null;
    [...activeWeekKeys]
      .sort((a, b) => a - b)
      .forEach((key) => {
        run = prevKey !== null && key === prevKey + 1 ? run + 1 : 1;
        longestStreak = Math.max(longestStreak, run);
        prevKey = key;
      });
  }

  // This week's Mon–Sun activity, for the streak day row
  const DAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const isSameDay = (a, b) =>
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();

  const mondayOffset = (now.getDay() + 6) % 7; // days since Monday (Sun=0 -> 6)
  const monday = new Date(now);
  monday.setHours(0, 0, 0, 0);
  monday.setDate(monday.getDate() - mondayOffset);

  const weekDays = DAY_LABELS.map((label, idx) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + idx);
    return {
      key: idx,
      label,
      active: completedItems.some((i) => isSameDay(new Date(i.created_at), d)),
      isToday: isSameDay(d, now),
      isFuture: d > now,
    };
  });

  const statCards = [
    {
      key: "total",
      value: total,
      label: "Total titles",
      items,
      modalTitle: "All titles",
    },
    {
      key: "completed",
      value: completedItems.length,
      label: "Completed",
      items: completedItems,
      modalTitle: "Completed",
    },
    {
      key: "watching",
      value: watchingItems.length,
      label: "Watching",
      items: watchingItems,
      modalTitle: "Watching",
    },
    {
      key: "planned",
      value: plannedItems.length,
      label: "Plan to Watch",
      items: plannedItems,
      modalTitle: "Plan to Watch",
    },
  ];
  if (avgRating) {
    statCards.push({
      key: "rating",
      value: `${avgRating}★`,
      label: "Average rating",
      items: ratedItems,
      modalTitle: "Rated titles",
    });
  }

  return (
    <div className="stats-page">
      <div className="stats-grid">
        {statCards.map((card) => (
          <button
            key={card.key}
            type="button"
            className="stat-card stat-card--clickable"
            onClick={() =>
              setActiveStat({ title: card.modalTitle, items: card.items })
            }
          >
            <span className="stat-card__value">{card.value}</span>
            <span className="stat-card__label">{card.label}</span>
          </button>
        ))}
      </div>

      <div className="stats-charts-row">
        <div className="stats-section">
          <h3>Ratings</h3>
          {ratedItems.length === 0 ? (
            <p className="stats-empty">
              Rate a few titles to see this fill in.
            </p>
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

        {donutSegments.length > 0 && (
          <div className="stats-section">
            <h3>Genres</h3>
            <div className="genre-donut-wrap">
              <div className="genre-donut">
                <div
                  className="genre-donut__ring"
                  style={{ background: donutGradient }}
                />
                <div className="genre-donut__hole">
                  <span>{sortedGenres.length}</span>
                  <small>genres</small>
                </div>
              </div>
              <ul className="genre-legend">
                {donutSegments.map((seg) => (
                  <li key={seg.name}>
                    <span
                      className="genre-legend__dot"
                      style={{ background: seg.color }}
                    />
                    <span className="genre-legend__name">{seg.name}</span>
                    <span className="genre-legend__pct">{seg.pct}%</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="stats-charts-row">
        <div className="stats-section">
          <h3>Completion Rate</h3>
          <div className="completion-wrap">
            <CompletionRing pct={completionPct} />
            <ul className="completion-breakdown">
              <li>
                <span
                  className="completion-breakdown__dot"
                  style={{ background: "var(--status-completed)" }}
                />
                <span className="completion-breakdown__name">Completed</span>
                <span className="completion-breakdown__value">
                  {completedItems.length}
                </span>
              </li>
              <li>
                <span
                  className="completion-breakdown__dot"
                  style={{ background: "var(--status-watching)" }}
                />
                <span className="completion-breakdown__name">Watching</span>
                <span className="completion-breakdown__value">
                  {watchingItems.length}
                </span>
              </li>
              <li>
                <span
                  className="completion-breakdown__dot"
                  style={{ background: "var(--status-plan)" }}
                />
                <span className="completion-breakdown__name">
                  Plan to Watch
                </span>
                <span className="completion-breakdown__value">
                  {plannedItems.length}
                </span>
              </li>
            </ul>
          </div>
        </div>

        <div className="stats-section">
          <h3>Watch Streak</h3>
          <div className="week-streak">
            <div className="week-streak__row">
              {weekDays.map((day) => (
                <div
                  key={day.key}
                  className={[
                    "week-streak__day",
                    day.active ? "week-streak__day--active" : "",
                    day.isToday ? "week-streak__day--today" : "",
                    day.isFuture ? "week-streak__day--future" : "",
                  ]
                    .filter(Boolean)
                    .join(" ")}
                >
                  <span className="week-streak__day-circle">
                    {day.active ? "🔥" : ""}
                  </span>
                  <span className="week-streak__day-label">{day.label}</span>
                </div>
              ))}
            </div>
            <p className="week-streak__summary">
              <strong>{currentStreak}</strong>{" "}
              {currentStreak === 1 ? "week" : "weeks"} streak · Longest{" "}
              {longestStreak} {longestStreak === 1 ? "week" : "weeks"}
            </p>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h3>Monthly Activity ({currentYear})</h3>
        {!hasMonthlyActivity ? (
          <p className="stats-empty">No completed titles yet this year.</p>
        ) : (
          <div className="monthly-chart">
            {MONTH_LABELS.map((label, idx) => {
              const count = monthlyCounts[idx];
              const heightPct = (count / maxMonthlyCount) * 100;
              return (
                <div className="monthly-chart__col" key={label}>
                  <div className="monthly-chart__tooltip">
                    {count} title{count !== 1 ? "s" : ""}
                  </div>
                  <div
                    className="monthly-chart__bar"
                    style={{ "--bar-height": `${heightPct}%` }}
                  />
                  <span className="monthly-chart__label">{label}</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {activeStat && (
        <div
          className="modal-overlay stat-modal-overlay"
          onClick={() => setActiveStat(null)}
        >
          <div
            className="modal stat-modal"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal__close"
              onClick={() => setActiveStat(null)}
              aria-label="Close"
            >
              ✕
            </button>
            <h2 className="stat-modal__title">
              {activeStat.title}{" "}
              <span className="stat-modal__count">
                ({activeStat.items.length})
              </span>
            </h2>
            {activeStat.items.length === 0 ? (
              <p className="stats-empty">Nothing here yet.</p>
            ) : (
              <PosterGrid
                items={activeStat.items}
                onOpenDetails={(item) => {
                  setActiveStat(null);
                  onOpenDetails?.(item);
                }}
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
