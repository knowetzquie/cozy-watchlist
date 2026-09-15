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
  const [draftName, setDraftName] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [draftAvatar, setDraftAvatar] = useState("🎬");
  const [saving, setSaving] = useState(false);
  const [uploadError, setUploadError] = useState("");
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
          };
          entry.count += 1;
          if (!entry.photo && d.photo) entry.photo = d.photo;
          directorMap.set(d.name, entry);
        });

        (data.cast || []).forEach((c) => {
          if (!c?.name) return;
          const entry = actorMap.get(c.name) || {
            name: c.name,
            photo: c.photo,
            count: 0,
          };
          entry.count += 1;
          if (!entry.photo && c.photo) entry.photo = c.photo;
          actorMap.set(c.name, entry);
        });
      });

      const topDirectors = [...directorMap.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
      const topActors = [...actorMap.values()]
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);

      if (!cancelled) {
        setPeopleStats({
          directors: topDirectors,
          actors: topActors,
          loading: false,
        });
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
      setEditing(false);
    } finally {
      setSaving(false);
    }
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

  const now = new Date();
  const isSameYear = (dateStr) =>
    new Date(dateStr).getFullYear() === now.getFullYear();
  const filmsThisYear = completed.filter((i) =>
    isSameYear(i.created_at),
  ).length;

  const topFive = items
    .filter((i) => i.favorite_rank)
    .sort((a, b) => a.favorite_rank - b.favorite_rank);

  const recentlyWatched = [...completed]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6);

  const diary = [...completed].sort(
    (a, b) => new Date(b.created_at) - new Date(a.created_at),
  );

  const diaryGroups = [];
  for (const item of diary) {
    const d = new Date(item.created_at);
    const key = `${d.getFullYear()}-${d.getMonth()}`;
    const label = d.toLocaleString("default", { month: "short" }).toUpperCase();
    let group = diaryGroups.find((g) => g.key === key);
    if (!group) {
      group = { key, label, entries: [] };
      diaryGroups.push(group);
    }
    group.entries.push({ ...item, day: d.getDate() });
  }

  if (loading) return <p className="empty-state">Loading profile…</p>;

  return (
    <div className="profile-page">
      <div className="profile-top">
        <button
          className="profile-avatar"
          onClick={() => editing && setDraftAvatar((a) => a)}
          title={editing ? "Pick an avatar below" : undefined}
        >
          {isImageAvatar(editing ? draftAvatar : profile.avatar) ? (
            <img
              src={editing ? draftAvatar : profile.avatar}
              alt=""
              className="profile-avatar__img"
            />
          ) : editing ? (
            draftAvatar
          ) : (
            profile.avatar
          )}
        </button>

        <div className="profile-top__main">
          {editing ? (
            <>
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
                rows={2}
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
            </>
          ) : (
            <>
              <div className="profile-top__name-row">
                <h2 className="profile-top__name">{profile.name}</h2>
                <button
                  className="btn btn--ghost btn--tiny"
                  onClick={() => setEditing(true)}
                >
                  Edit Profile
                </button>
              </div>
              {profile.bio && <p className="profile-top__bio">{profile.bio}</p>}
            </>
          )}

          {editing && (
            <div className="profile-edit__actions">
              <button
                className="btn btn--ghost btn--tiny"
                onClick={() => {
                  setDraftName(profile.name);
                  setDraftBio(profile.bio);
                  setDraftAvatar(profile.avatar);
                  setEditing(false);
                }}
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
          )}
        </div>

        <div className="profile-top__stats">
          <div className="profile-top__stat">
            <span>{completed.length}</span>
            <label>Films</label>
          </div>
          <div className="profile-top__stat">
            <span>{filmsThisYear}</span>
            <label>This Year</label>
          </div>
          <div className="profile-top__stat">
            <span>{topFive.length}</span>
            <label>Top 5</label>
          </div>
        </div>
      </div>

      <section className="profile-row-section">
        <h3 className="profile-row-section__label">Favorite Films</h3>
        {topFive.length === 0 ? (
          <p className="stats-empty">
            Pick your Top 5 favorites from the Watchlist tab.
          </p>
        ) : (
          <div className="profile-row">
            {topFive.map((item) => (
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
      {peopleStats.directors.map((d) => (
        <div className="people-row__person" key={d.name}>
          {d.photo ? (
            <img src={d.photo} alt="" className="people-row__photo" />
          ) : (
            <div className="people-row__photo people-row__photo--empty">🎬</div>
          )}
          <span className="people-row__name">{d.name}</span>
          <span className="people-row__count">{d.count} title{d.count !== 1 ? "s" : ""}</span>
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
      {peopleStats.actors.map((a) => (
        <div className="people-row__person" key={a.name}>
          {a.photo ? (
            <img src={a.photo} alt="" className="people-row__photo" />
          ) : (
            <div className="people-row__photo people-row__photo--empty">🎭</div>
          )}
          <span className="people-row__name">{a.name}</span>
          <span className="people-row__count">{a.count} title{a.count !== 1 ? "s" : ""}</span>
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
              </button>
            ))}
          </div>
        )}
      </section>

      <section className="profile-row-section">
        <h3 className="profile-row-section__label">Activity</h3>
        {diaryGroups.length === 0 ? (
          <p className="stats-empty">
            Mark titles Completed to build your diary.
          </p>
        ) : (
          <div className="diary">
            {diaryGroups.map((group) => (
              <div className="diary__group" key={group.key}>
                <div className="diary__month-tab">{group.label}</div>
                <ul className="diary__entries">
                  {group.entries.map((item) => (
                    <li key={item.id} className="diary__entry">
                      <span className="diary__day">{item.day}</span>
                      <button
                        className="diary__title"
                        onClick={() => onOpenDetails(item)}
                      >
                        {item.title}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
