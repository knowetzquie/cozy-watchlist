import { useEffect, useState } from "react";
import { api } from "../api.js";

const AVATAR_OPTIONS = [
  "🎬",
  "🎥",
  "🍿",
  "📽️",
  "🎞️",
  "🧑‍🎤",
  "👾",
  "🐉",
  "🌙",
  "⭐",
];
const MAX_PHOTO_BYTES = 1.5 * 1024 * 1024; // 1.5MB, generous for a small profile photo

function isImageAvatar(value) {
  return typeof value === "string" && value.startsWith("data:image");
}

export default function ProfilePage({ items, onOpenDetails }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [showAvatarOverview, setShowAvatarOverview] = useState(false);
  const [closingModal, setClosingModal] = useState("");
  const [draftName, setDraftName] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [draftAvatar, setDraftAvatar] = useState("🎬");
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState("");
  const [selectedYear, setSelectedYear] = useState(() =>
    String(new Date().getFullYear()),
  );
  const [selectedMonth, setSelectedMonth] = useState(() =>
    String(new Date().getMonth()),
  );
  const [peopleStats, setPeopleStats] = useState({
    directors: [],
    actors: [],
    loading: true,
  });

  useEffect(() => {
    let cancelled = false;
    api
      .getProfile()
      .then((data) => {
        if (cancelled) return;
        setProfile(data);
        setDraftName(data.name);
        setDraftBio(data.bio);
        setDraftAvatar(data.avatar);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadPeople() {
      try {
        const talent = await api.getProfileTalent();
        if (!cancelled) {
          setPeopleStats({
            directors: talent.directors || [],
            actors: talent.actors || [],
            loading: false,
          });
        }
      } catch {
        const withTmdb = items.filter((i) => i.tmdb_id);
        if (withTmdb.length === 0) {
          if (!cancelled)
            setPeopleStats({ directors: [], actors: [], loading: false });
          return;
        }

        const results = await Promise.allSettled(
          withTmdb.map((i) =>
            api.getTitleDetails(i.tmdb_id, i.media_type || "movie"),
          ),
        );
        if (cancelled) return;

        const directorMap = new Map();
        const actorMap = new Map();

        results.forEach((r) => {
          if (r.status !== "fulfilled") return;
          const data = r.value;

          (data.directors || []).forEach((d) => {
            if (!d?.name) return;
            const entry = directorMap.get(d.name) || {
              name: d.name,
              photo: d.photo,
              count: 0,
              titles: [],
            };
            entry.count += 1;
            entry.titles = Array.from(
              new Set([...(entry.titles || []), data.title]),
            );
            if (!entry.photo && d.photo) entry.photo = d.photo;
            directorMap.set(d.name, entry);
          });

          (data.cast || []).forEach((c) => {
            if (!c?.name) return;
            const entry = actorMap.get(c.name) || {
              name: c.name,
              photo: c.photo,
              count: 0,
              titles: [],
            };
            entry.count += 1;
            entry.titles = Array.from(
              new Set([...(entry.titles || []), data.title]),
            );
            if (!entry.photo && c.photo) entry.photo = c.photo;
            actorMap.set(c.name, entry);
          });
        });

        const topDirectors = [...directorMap.values()]
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
          .slice(0, 5);
        const topActors = [...actorMap.values()]
          .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
          .slice(0, 5);

        if (!cancelled) {
          setPeopleStats({
            directors: topDirectors,
            actors: topActors,
            loading: false,
          });
        }
      }
    }

    setPeopleStats((s) => ({ ...s, loading: true }));
    loadPeople();
    return () => {
      cancelled = true;
    };
  }, [items]);

  async function saveProfile() {
    setSaving(true);
    try {
      const updated = await api.updateProfile({
        name: draftName,
        bio: draftBio,
        avatar: draftAvatar,
      });
      setProfile(updated);
      closeProfileEditor();
    } finally {
      setSaving(false);
    }
  }

  function openProfileEditor() {
    setDraftName(profile.name);
    setDraftBio(profile.bio);
    setDraftAvatar(profile.avatar);
    setUploadError("");
    setEditing(true);
  }

  function closeProfileEditor() {
    setDraftName(profile.name);
    setDraftBio(profile.bio);
    setDraftAvatar(profile.avatar);
    closeModal("edit");
  }

  function closeAvatarOverview() {
    closeModal("overview");
  }

  function closeModal(name) {
    setClosingModal(name);
    window.setTimeout(() => {
      if (name === "edit") setEditing(false);
      if (name === "overview") setShowAvatarOverview(false);
      setClosingModal("");
    }, 180);
  }

  function handlePhotoSelect(e) {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setUploadError("");

    if (!file.type.startsWith("image/")) {
      setUploadError("Please choose an image file.");
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      setUploadError("That image is too large — please pick one under 1.5MB.");
      return;
    }

    const reader = new FileReader();
    reader.onload = () => setDraftAvatar(reader.result);
    reader.onerror = () =>
      setUploadError("Couldn't read that file — try another image.");
    reader.readAsDataURL(file);
  }

  const completed = items.filter((i) => i.status === "completed");
  const likedItems = items.filter((i) => i.liked);
  const topFive = items
    .filter((i) => i.favorite_rank)
    .sort((a, b) => a.favorite_rank - b.favorite_rank)
    .slice(0, 5);
  const displayFavorites =
    topFive.length > 0 ? topFive : likedItems.slice(0, 5);
  const favoriteDisplayItems = displayFavorites.slice(0, 5);
  const watchedDate = (item) => item.watched_at || item.created_at;

  const now = new Date();
  const isSameYear = (dateStr) =>
    new Date(dateStr).getFullYear() === now.getFullYear();
  const filmsThisYear = completed.filter((i) =>
    isSameYear(watchedDate(i)),
  ).length;

  const ratedCompleted = completed.filter((item) => item.rating > 0);
  const averageRating = ratedCompleted.length
    ? (
        ratedCompleted.reduce((sum, item) => sum + Number(item.rating), 0) /
        ratedCompleted.length
      ).toFixed(1)
    : "0.0";

  const genreCounts = items.reduce((acc, item) => {
    for (const genre of (item.genre || "").split(",")) {
      const cleaned = genre.trim();
      if (!cleaned) continue;
      acc[cleaned] = (acc[cleaned] || 0) + 1;
    }
    return acc;
  }, {});
  const topGenre =
    Object.entries(genreCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  const recentlyWatched = [...completed]
    .sort((a, b) => new Date(watchedDate(b)) - new Date(watchedDate(a)))
    .slice(0, 6);

  const activityItems = [...items].sort(
    (a, b) => new Date(watchedDate(b)) - new Date(watchedDate(a)),
  );

  const statusLabelMap = {
    "plan to watch": "Add to watchlist",
    watching: "Watching",
    completed: "Completed",
  };

  const diaryGroups = [];
  for (const item of activityItems) {
    const d = new Date(watchedDate(item));
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d.toLocaleString("default", { month: "short" }).toUpperCase();
    let group = diaryGroups.find((g) => g.key === key);
    if (!group) {
      group = { key, label, entries: [] };
      diaryGroups.push(group);
    }
    group.entries.push({ ...item, day: d.getDate() });
  }

  const activityYears = activityItems.map((item) =>
    new Date(watchedDate(item)).getFullYear(),
  );
  const firstActivityYear = activityYears.length
    ? Math.min(...activityYears)
    : new Date().getFullYear();
  const availableYears = Array.from(
    { length: new Date().getFullYear() - firstActivityYear + 1 },
    (_, index) => new Date().getFullYear() - index,
  );
  const defaultYear = availableYears[0] ?? new Date().getFullYear();
  const yearValue = selectedYear || String(defaultYear);
  const monthNames = [
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
  const monthOptions = Array.from({ length: 12 }, (_, index) => index);
  const monthValue = selectedMonth || String(new Date().getMonth());

  useEffect(() => {
    if (!availableYears.length) return;
    const yearNum = Number(yearValue);
    if (!availableYears.includes(yearNum)) {
      setSelectedYear(String(availableYears[0]));
      return;
    }
  }, [availableYears, activityItems, monthValue, yearValue]);

  const selectedMonthEntries = activityItems
    .filter((item) => {
      const d = new Date(watchedDate(item));
      return (
        d.getFullYear() === Number(yearValue) &&
        d.getMonth() === Number(monthValue)
      );
    })
    .sort((a, b) => new Date(watchedDate(b)) - new Date(watchedDate(a)));

  if (loading) return <p className="empty-state">Loading profile…</p>;

  return (
    <div className="profile-page">
      <div className="profile-top">
        <button
          className="profile-avatar"
          onClick={() => setShowAvatarOverview(true)}
          aria-label="View profile overview"
          title="View profile overview"
        >
          {isImageAvatar(profile.avatar) ? (
            <img
              src={profile.avatar}
              alt=""
              className="profile-avatar__img"
            />
          ) : (
            profile.avatar
          )}
        </button>

        <div className="profile-top__main">
          <div className="profile-top__name-row">
            <h2 className="profile-top__name">{profile.name}</h2>
            <button
              className="btn btn--ghost btn--tiny"
              onClick={openProfileEditor}
            >
              Edit Profile
            </button>
          </div>
          {profile.bio && <p className="profile-top__bio">{profile.bio}</p>}
        </div>

        <div className="profile-top__stats">
          <div className="profile-top__stat">
            <span>{averageRating}</span>
            <label>Avg Rating</label>
          </div>
          <div className="profile-top__stat">
            <span>{likedItems.length}</span>
            <label>Likes</label>
          </div>
          <div className="profile-top__stat">
            <span>{topGenre}</span>
            <label>Top Genre</label>
          </div>
        </div>
      </div>

      {(showAvatarOverview || closingModal === "overview") && (
        <div
          className={`modal-overlay ${
            closingModal === "overview" ? "modal-overlay--closing" : ""
          }`}
          onClick={closeAvatarOverview}
        >
          <div
            className={`modal profile-overview-modal ${
              closingModal === "overview" ? "modal--closing" : ""
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal__close"
              onClick={closeAvatarOverview}
              aria-label="Close profile overview"
            >
              ✕
            </button>
            <div className="profile-overview-modal__avatar">
              {isImageAvatar(profile.avatar) ? (
                <img
                  src={profile.avatar}
                  alt=""
                  className="profile-avatar__img"
                />
              ) : (
                profile.avatar
              )}
            </div>
            <h2>{profile.name}</h2>
            {profile.bio && (
              <p className="profile-overview-modal__bio">{profile.bio}</p>
            )}
            <div className="profile-overview-modal__stats">
              <div>
                <strong>{averageRating}</strong>
                <span>Avg rating</span>
              </div>
              <div>
                <strong>{likedItems.length}</strong>
                <span>Likes</span>
              </div>
              <div>
                <strong>{topGenre}</strong>
                <span>Top genre</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {(editing || closingModal === "edit") && (
        <div
          className={`modal-overlay ${
            closingModal === "edit" ? "modal-overlay--closing" : ""
          }`}
          onClick={closeProfileEditor}
        >
          <div
            className={`modal profile-edit-modal ${
              closingModal === "edit" ? "modal--closing" : ""
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="modal__close"
              onClick={closeProfileEditor}
              aria-label="Close profile editor"
            >
              ✕
            </button>
            <h2>Edit Profile</h2>
            <div className="profile-edit-modal__form">
              <input
                className="profile-edit__name"
                value={draftName}
                onChange={(e) => setDraftName(e.target.value)}
                placeholder="Your name"
                maxLength={60}
              />
              <textarea
                className="profile-edit__bio"
                value={draftBio}
                onChange={(e) => setDraftBio(e.target.value)}
                placeholder="A short bio…"
                rows={3}
                maxLength={200}
              />
              <label className="btn btn--ghost btn--tiny profile-edit__upload-btn">
                Upload photo
                <input
                  type="file"
                  accept="image/*"
                  onChange={handlePhotoSelect}
                  hidden
                />
              </label>
              {uploadError && (
                <p className="profile-edit__upload-error">{uploadError}</p>
              )}
              <div className="profile-edit__avatars">
                {AVATAR_OPTIONS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={`profile-edit__avatar-choice ${
                      draftAvatar === a
                        ? "profile-edit__avatar-choice--active"
                        : ""
                    }`}
                    onClick={() => setDraftAvatar(a)}
                  >
                    {a}
                  </button>
                ))}
              </div>
              <div className="profile-edit__actions">
                <button
                  className="btn btn--ghost btn--tiny"
                  onClick={closeProfileEditor}
                >
                  Cancel
                </button>
                <button
                  className="btn btn--primary btn--tiny"
                  onClick={saveProfile}
                  disabled={saving}
                >
                  {saving ? "Saving…" : "Save"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <section className="profile-row-section">
        <h3 className="profile-row-section__label">Favorite Films</h3>
        {displayFavorites.length === 0 ? (
          <p className="stats-empty">
            Tap the heart on a completed title to pin your favorites here.
          </p>
        ) : (
          <div className="profile-row">
            {favoriteDisplayItems.map((item) => (
              <button
                key={item.id}
                className="profile-row__poster-btn"
                onClick={() => onOpenDetails(item)}
              >
                {item.poster_url ? (
                  <img
                    src={item.poster_url}
                    alt=""
                    className="profile-row__poster"
                  />
                ) : (
                  <div className="profile-row__poster profile-row__poster--empty">
                    🎬
                  </div>
                )}
                {item.rating > 0 && (
                  <span className="profile-row__rating-badge">
                    ★ {item.rating}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="profile-row-section">
        <h3 className="profile-row-section__label">Top Directors</h3>
        {peopleStats.loading ? (
          <p className="stats-empty">Crunching your favorite directors…</p>
        ) : peopleStats.directors.length === 0 ? (
          <p className="stats-empty">Add titles matched to TMDB to see this.</p>
        ) : (
          <div className="people-row">
            {peopleStats.directors.slice(0, 5).map((d) => (
              <div
                className="people-row__person"
                key={d.name}
                data-titles={d.titles ? d.titles.join(", ") : ""}
                title={
                  d.titles
                    ? d.titles.join(", ")
                    : `${d.name} — ${d.count} titles`
                }
              >
                {d.photo ? (
                  <img src={d.photo} alt="" className="people-row__photo" />
                ) : (
                  <div className="people-row__photo people-row__photo--empty">
                    🎬
                  </div>
                )}
                <span className="people-row__name">{d.name}</span>
                <span className="people-row__count">
                  {d.count} title{d.count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="profile-row-section">
        <h3 className="profile-row-section__label">Top Cast</h3>
        {peopleStats.loading ? (
          <p className="stats-empty">Crunching your favorite actors…</p>
        ) : peopleStats.actors.length === 0 ? (
          <p className="stats-empty">Add titles matched to TMDB to see this.</p>
        ) : (
          <div className="people-row">
            {peopleStats.actors.slice(0, 5).map((a) => (
              <div
                className="people-row__person"
                key={a.name}
                title={
                  a.titles
                    ? a.titles.join(", ")
                    : `${a.name} — ${a.count} titles`
                }
              >
                {a.photo ? (
                  <img src={a.photo} alt="" className="people-row__photo" />
                ) : (
                  <div className="people-row__photo people-row__photo--empty">
                    🎭
                  </div>
                )}
                <span className="people-row__name">{a.name}</span>
                <span className="people-row__count">
                  {a.count} title{a.count !== 1 ? "s" : ""}
                </span>
              </div>
            ))}
          </div>
        )}
      </section>

      <section className="profile-row-section">
        <h3 className="profile-row-section__label">Recently Watched</h3>
        {recentlyWatched.length === 0 ? (
          <p className="stats-empty">Nothing marked Completed yet.</p>
        ) : (
          <div className="profile-row">
            {recentlyWatched.map((item) => (
              <button
                key={item.id}
                className="profile-row__poster-btn"
                onClick={() => onOpenDetails(item)}
              >
                {item.poster_url ? (
                  <img
                    src={item.poster_url}
                    alt=""
                    className="profile-row__poster"
                  />
                ) : (
                  <div className="profile-row__poster profile-row__poster--empty">
                    🎬
                  </div>
                )}
                {item.rating > 0 && (
                  <span className="profile-row__rating-badge">
                    ★ {item.rating}
                  </span>
                )}
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="profile-row-section">
        <h3 className="profile-row-section__label">Activity</h3>
        {activityItems.length === 0 ? (
          <p className="stats-empty">
            Add titles to your watchlist to build your activity.
          </p>
        ) : (
          <div className="diary">
            <div className="diary__filters">
              <label className="diary__filter">
                <span className="diary__filter-label">Year</span>
                <select
                  className="diary__select"
                  value={yearValue}
                  aria-label="Select year for activity"
                  onChange={(e) => {
                    setSelectedYear(e.target.value);
                  }}
                >
                  {availableYears.map((year) => (
                    <option key={year} value={String(year)}>
                      {year}
                    </option>
                  ))}
                </select>
              </label>

              <label className="diary__filter">
                <span className="diary__filter-label">Month</span>
                <select
                  className="diary__select"
                  value={monthValue}
                  aria-label="Select month for activity"
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {monthOptions.map((monthIndex) => (
                    <option key={monthIndex} value={String(monthIndex)}>
                      {monthNames[monthIndex]}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div
              key={`${yearValue}-${monthValue}`}
              className="diary__group diary__group--single"
            >
              <ul className="diary__entries">
                {selectedMonthEntries.length === 0 ? (
                  <li className="stats-empty stats-empty--inline">
                    No activity for this month.
                  </li>
                ) : (
                  selectedMonthEntries.map((item) => (
                    <li key={item.id} className="diary__entry">
                      <span className="diary__day">
                        {new Date(watchedDate(item)).getDate()}
                      </span>
                      <div className="diary__meta">
                        <div className="diary__title-row">
                          <button
                            className="diary__title"
                            onClick={() => onOpenDetails(item)}
                          >
                            {item.title}
                          </button>
                          <span
                            className="diary__action-star"
                            aria-label="star"
                          >
                            ★
                          </span>
                          <span className="diary__status">
                            {statusLabelMap[item.status] || "Completed"}
                          </span>
                        </div>
                      </div>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
