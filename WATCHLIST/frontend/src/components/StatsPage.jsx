import { useEffect, useState } from "react";
import { api } from "../api.js";
import PosterGrid from "./PosterGrid.jsx";

const DONUT_COLORS = [
  "#ec4899",
  "#22d3ee",
  "#14b8a6",
  "#f59e0b",
  "#f97316",
  "#84cc16",
];

const TIMEFRAMES = [
  { key: "all", label: "All Time" },
  { key: "year", label: "2026" },
  { key: "30d", label: "Last 30 Days" },
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
  const [closingStat, setClosingStat] = useState(false);
  const [showOtherGenres, setShowOtherGenres] = useState(false);
  const [timeframe, setTimeframe] = useState("all");
  const [detailsById, setDetailsById] = useState({});

  const now = new Date();
  const currentYear = now.getFullYear();

  const watchedDate = (item) => item.watched_at || item.created_at;
  const statsItems = items.filter((item) => {
    if (timeframe === "all") return true;
    const date = new Date(watchedDate(item));
    if (timeframe === "year") return date.getFullYear() === currentYear;
    return date >= new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  });

  useEffect(() => {
    let cancelled = false;
    const withTmdb = statsItems.filter((item) => item.tmdb_id);
    Promise.allSettled(
      withTmdb.map((item) =>
        api.getTitleDetails(item.tmdb_id, item.media_type || "movie"),
      ),
    ).then((results) => {
      if (cancelled) return;
      setDetailsById((previous) => {
        const next = { ...previous };
        results.forEach((result, index) => {
          if (result.status === "fulfilled") {
            next[withTmdb[index].id] = result.value;
          }
        });
        return next;
      });
    });
    return () => {
      cancelled = true;
    };
  }, [items, timeframe]);

  const total = statsItems.length;
  const completedItems = statsItems.filter((i) => i.status === "completed");
  const watchingItems = statsItems.filter((i) => i.status === "watching");
  const plannedItems = statsItems.filter((i) => i.status === "plan to watch");
  const completionPct = total ? (completedItems.length / total) * 100 : 0;

  const ratingCounts = [1, 2, 3, 4, 5].map(
    (r) => statsItems.filter((i) => i.rating === r).length,
  );
  const maxRatingCount = Math.max(1, ...ratingCounts);

  const ratedItems = statsItems.filter((i) => i.rating > 0);
  const avgRating = ratedItems.length
    ? (
        ratedItems.reduce((sum, i) => sum + i.rating, 0) / ratedItems.length
      ).toFixed(1)
    : null;

  const genreCounts = {};
  statsItems.forEach((i) => {
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
  const otherGenres = sortedGenres.slice(5);
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

  const formatCounts = statsItems.reduce(
    (counts, item) => {
      const genre = (item.genre || "").toLowerCase();
      const format =
        genre.includes("anime") || genre.includes("animation")
          ? "Anime"
          : item.media_type === "tv"
            ? "TV Shows"
            : "Movies";
      counts[format] += 1;
      return counts;
    },
    { Movies: 0, "TV Shows": 0, Anime: 0 },
  );
  const maxFormatCount = Math.max(1, ...Object.values(formatCounts));

  const totalWatchMinutes = statsItems.reduce((totalMinutes, item) => {
    const details = detailsById[item.id];
    if (!details?.runtime) return totalMinutes;
    const episodes = item.media_type === "tv" ? details.episode_count || 1 : 1;
    return totalMinutes + Number(details.runtime) * Number(episodes);
  }, 0);
  const watchDays = Math.floor(totalWatchMinutes / (24 * 60));
  const watchHours = Math.floor((totalWatchMinutes % (24 * 60)) / 60);
  const watchTimeLabel = totalWatchMinutes
    ? `${watchDays}d ${String(watchHours).padStart(2, "0")}h`
    : "Loading";

  const ratingAverage = ratedItems.length
    ? ratedItems.reduce((sum, item) => sum + Number(item.rating), 0) /
      ratedItems.length
    : 0;
  const ratingVariance = ratedItems.length
    ? ratedItems.reduce(
        (sum, item) => sum + (Number(item.rating) - ratingAverage) ** 2,
        0,
      ) / ratedItems.length
    : 0;
  const ratingDeviation = Math.sqrt(ratingVariance);
  const ratingBias =
    !ratedItems.length || ratingDeviation < 0.7
      ? "Balanced Reviewer"
      : ratingAverage >= 3.7
        ? "Generous Grader"
        : "Tough Critic";

  const creatorCounts = {};
  const studioCounts = {};
  const eraCounts = {};
  statsItems.forEach((item) => {
    const details = detailsById[item.id];
    (details?.directors || []).forEach((director) => {
      creatorCounts[director.name] = (creatorCounts[director.name] || 0) + 1;
    });
    (details?.studios || []).forEach((studio) => {
      studioCounts[studio] = (studioCounts[studio] || 0) + 1;
    });
    const year = Number(details?.year);
    if (year) {
      const era = `${Math.floor(year / 10) * 10}s`;
      eraCounts[era] = (eraCounts[era] || 0) + 1;
    }
  });
  const topEntry = (counts) =>
    Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
  const topDirector = topEntry(creatorCounts);
  const topStudio = topEntry(studioCounts);
  const favoriteEra = topEntry(eraCounts);

  // Monthly activity (completed titles per month, this calendar year)
  const monthlyCounts = new Array(12).fill(0);
  completedItems.forEach((i) => {
    const d = new Date(watchedDate(i));
    if (d.getFullYear() === currentYear) {
      monthlyCounts[d.getMonth()] += 1;
    }
  });
  const maxMonthlyCount = Math.max(1, ...monthlyCounts);
  const hasMonthlyActivity = monthlyCounts.some((c) => c > 0);
  const monthlyTotal = monthlyCounts.reduce((sum, count) => sum + count, 0);

  // Use local calendar dates so the streak matches the day row below.
  const dayKey = (date) => {
    return Date.UTC(date.getFullYear(), date.getMonth(), date.getDate());
  };

  const activeDayKeys = new Set(
    completedItems.map((i) => dayKey(new Date(watchedDate(i)))),
  );
  const DAY_MS = 24 * 60 * 60 * 1000;
  let currentStreak = 0;
  let cursor = dayKey(now);
  if (!activeDayKeys.has(cursor)) cursor -= DAY_MS;
  while (activeDayKeys.has(cursor)) {
    currentStreak += 1;
    cursor -= DAY_MS;
  }
  let longestStreak = 0;
  {
    let run = 0;
    let prevKey = null;
    [...activeDayKeys]
      .sort((a, b) => a - b)
      .forEach((key) => {
        run = prevKey !== null && key === prevKey + DAY_MS ? run + 1 : 1;
        longestStreak = Math.max(longestStreak, run);
        prevKey = key;
      });
  }

  // This week's Mon–Sun activity, for the streak day row
  const DAY_LABELS = ["M", "T", "W", "T", "F", "S", "S"];
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
      active: completedItems.some((i) =>
        isSameDay(new Date(watchedDate(i)), d),
      ),
      isToday: isSameDay(d, now),
      isFuture: d > now,
    };
  });
  const weekComplete = weekDays.every((day) => day.active && !day.isFuture);

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

  function closeStatModal() {
    if (closingStat) return;
    setClosingStat(true);
    window.setTimeout(() => {
      setActiveStat(null);
      setClosingStat(false);
    }, 180);
  }

  return (
    <div className="stats-page">
      <div className="stats-toolbar">
        <span className="stats-toolbar__label">Viewing</span>
        <div
          className="stats-timeframe"
          role="group"
          aria-label="Stats timeframe"
          style={{
            "--timeframe-index": TIMEFRAMES.findIndex(
              (option) => option.key === timeframe,
            ),
          }}
        >
          {TIMEFRAMES.map((option) => (
            <button
              key={option.key}
              type="button"
              className={
                timeframe === option.key ? "stats-timeframe--active" : ""
              }
              onClick={() => setTimeframe(option.key)}
            >
              {option.key === "year" ? currentYear : option.label}
            </button>
          ))}
        </div>
      </div>

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
        <div className="stat-card stat-card--insight">
          <span className="stat-card__value">{watchTimeLabel}</span>
          <span className="stat-card__label">Total watch time</span>
        </div>
      </div>

      <div className="stats-charts-row stats-charts-row--genres">
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
                    <div className="rating-chart__bar-wrap">
                      <span className="rating-chart__count">{count}</span>
                      <div
                        className="rating-chart__bar"
                        style={{ "--bar-height": `${heightPct}%` }}
                      />
                    </div>
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
                  <li
                    className={`genre-legend__item ${
                      seg.name === "Other" ? "genre-legend__item--other" : ""
                    }`}
                    key={seg.name}
                  >
                    <span
                      className="genre-legend__dot"
                      style={{ background: seg.color }}
                    />
                    <span className="genre-legend__name">{seg.name}</span>
                    <span className="genre-legend__count">
                      {seg.count} title{seg.count !== 1 ? "s" : ""} · {seg.pct}%
                    </span>
                    {seg.name === "Other" && (
                      <button
                        type="button"
                        className="genre-legend__expand"
                        onClick={() => setShowOtherGenres((open) => !open)}
                        aria-expanded={showOtherGenres}
                        aria-label={`${showOtherGenres ? "Hide" : "Show"} other genres`}
                      >
                        {showOtherGenres ? "-" : "+"}
                      </button>
                    )}
                    {seg.name === "Other" && showOtherGenres && (
                      <div className="genre-legend__sublist genre-legend__sublist--open">
                        {otherGenres.map(([name, count], index) => (
                          <div className="genre-legend__subitem" key={name}>
                            <span
                              className="genre-legend__dot"
                              style={{
                                background:
                                  DONUT_COLORS[
                                    (index + topGenres.length) %
                                      DONUT_COLORS.length
                                  ],
                              }}
                            />
                            <span className="genre-legend__subname">
                              {name}
                            </span>
                            <span className="genre-legend__subcount">
                              {count} title{count !== 1 ? "s" : ""}
                            </span>
                            <span className="genre-legend__subpct">
                              {totalGenreTags
                                ? Math.round((count / totalGenreTags) * 100)
                                : 0}
                              %
                            </span>
                          </div>
                        ))}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="stats-charts-row stats-charts-row--details">
        <div className="stats-section">
          <h3>Format Breakdown</h3>
          <div className="format-breakdown">
            {Object.entries(formatCounts).map(([format, count]) => (
              <div className="format-breakdown__row" key={format}>
                <span>{format}</span>
                <div className="format-breakdown__track">
                  <div
                    className="format-breakdown__fill"
                    style={{ width: `${(count / maxFormatCount) * 100}%` }}
                  />
                </div>
                <strong>{count}</strong>
              </div>
            ))}
          </div>
        </div>

        <div className="stats-section">
          <h3>Rating Bias</h3>
          <div className="insight-badge">
            <strong>{ratingBias}</strong>
            <p>
              See whether you tend to rate generously or save high scores for
              only your favorites.
            </p>
            <span>
              {ratedItems.length
                ? `${ratingAverage.toFixed(1)} average · ±${ratingDeviation.toFixed(1)} spread`
                : "Rate titles to unlock this insight"}
            </span>
            <small>Based on your average rating and rating spread.</small>
          </div>
        </div>
      </div>

      <div className="stats-charts-row stats-charts-row--details">
        <div className="stats-section">
          <h3>Top Creator Badges</h3>
          <div className="creator-badges">
            <div className="creator-badge">
              <span>Director</span>
              <strong>{topDirector?.[0] || "Still discovering"}</strong>
              <small>{topDirector ? `${topDirector[1]} titles` : ""}</small>
            </div>
            <div className="creator-badge">
              <span>Studio</span>
              <strong>{topStudio?.[0] || "Still discovering"}</strong>
              <small>{topStudio ? `${topStudio[1]} titles` : ""}</small>
            </div>
            <div className="creator-badge">
              <span>Release era</span>
              <strong>{favoriteEra?.[0] || "Still discovering"}</strong>
              <small>{favoriteEra ? `${favoriteEra[1]} titles` : ""}</small>
            </div>
          </div>
        </div>

        <div className="stats-section">
          <h3>Watch Streak</h3>
          <div
            className={[
              "week-streak",
              weekComplete ? "week-streak--complete" : "",
            ]
              .filter(Boolean)
              .join(" ")}
          >
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
                  {day.isToday && (
                    <span className="week-streak__today-label">Today</span>
                  )}
                </div>
              ))}
            </div>
            <p className="week-streak__summary">
              {weekComplete && (
                <span className="week-streak__complete-label">
                  Week complete ·{" "}
                </span>
              )}
              <strong>{currentStreak}</strong>{" "}
              {currentStreak === 1 ? "day" : "days"} streak · Longest{" "}
              {longestStreak} {longestStreak === 1 ? "day" : "days"}
            </p>
          </div>
        </div>
      </div>

      <div className="stats-section">
        <h3>Activity Heatmap ({currentYear})</h3>
        <p className="monthly-chart__summary">
          {monthlyTotal} title{monthlyTotal !== 1 ? "s" : ""} logged in this
          view
        </p>
        {!hasMonthlyActivity ? (
          <p className="stats-empty">No completed titles yet this year.</p>
        ) : (
          <div
            className="activity-heatmap"
            aria-label="Completed titles by day"
          >
            {Array.from({ length: 365 }, (_, index) => {
              const date = new Date(currentYear, 0, index + 1);
              const count = completedItems.filter((item) =>
                isSameDay(new Date(watchedDate(item)), date),
              ).length;
              return (
                <span
                  key={date.toISOString()}
                  className={`activity-heatmap__cell activity-heatmap__cell--${Math.min(count, 4)}`}
                  title={`${date.toLocaleDateString()}: ${count} title${count !== 1 ? "s" : ""}`}
                />
              );
            })}
          </div>
        )}
      </div>

      {(activeStat || closingStat) && (
        <div
          className={`modal-overlay stat-modal-overlay ${
            closingStat ? "modal-overlay--closing" : ""
          }`}
          onClick={closeStatModal}
        >
          <div
            className={`modal stat-modal ${closingStat ? "modal--closing" : ""}`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal__close"
              onClick={closeStatModal}
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
                  closeStatModal();
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
