import { useEffect, useState } from "react";
import { api } from "../api.js";

const AVATAR_OPTIONS = ["🎬", "🎥", "🍿", "📽️", "🎞️", "🧑‍🎤", "👾", "🐉", "🌙", "⭐"];

export default function ProfilePage({ items, onOpenDetails }) {
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [draftName, setDraftName] = useState("");
  const [draftBio, setDraftBio] = useState("");
  const [draftAvatar, setDraftAvatar] = useState("🎬");
  const [saving, setSaving] = useState(false);

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

  const completed = items.filter((i) => i.status === "completed");

  const now = new Date();
  const isSameMonth = (dateStr) => {
    const d = new Date(dateStr);
    return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
  };
  const isSameYear = (dateStr) => new Date(dateStr).getFullYear() === now.getFullYear();

  const filmsThisMonth = completed.filter((i) => isSameMonth(i.created_at)).length;
  const filmsThisYear = completed.filter((i) => isSameYear(i.created_at)).length;

  const topFive = items
    .filter((i) => i.favorite_rank)
    .sort((a, b) => a.favorite_rank - b.favorite_rank);

  const recentlyWatched = [...completed]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 6);

  const activity = [...items]
    .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
    .slice(0, 8);

  if (loading) return <p className="empty-state">Loading profile…</p>;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <button
          className="profile-avatar"
          onClick={() => setEditing((e) => !e)}
          title="Edit profile"
        >
          {editing ? draftAvatar : profile.avatar}
        </button>

        <div className="profile-header__info">
          {editing ? (
            <div className="profile-edit">
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
              <div className="profile-edit__avatars">
                {AVATAR_OPTIONS.map((a) => (
                  <button
                    key={a}
                    type="button"
                    className={`profile-edit__avatar-choice ${
                      draftAvatar === a ? "profile-edit__avatar-choice--active" : ""
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
            </div>
          ) : (
            <>
              <h2 className="profile-header__name">{profile.name}</h2>
              {profile.bio && <p className="profile-header__bio">{profile.bio}</p>}
              <button className="profile-header__edit-link" onClick={() => setEditing(true)}>
                Edit profile
              </button>
            </>
          )}
        </div>
      </div>

      <div className="stats-grid">
        <div className="stat-card">
          <span className="stat-card__value">{completed.length}</span>
          <span className="stat-card__label">Films</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{filmsThisMonth}</span>
          <span className="stat-card__label">This month</span>
        </div>
        <div className="stat-card">
          <span className="stat-card__value">{filmsThisYear}</span>
          <span className="stat-card__label">This year</span>
        </div>
      </div>

      <div className="stats-section">
        <h3>Top 5</h3>
        {topFive.length === 0 ? (
          <p className="stats-empty">Pick your Top 5 favorites from the Watchlist tab.</p>
        ) : (
          <div className="profile-mini-grid">
            {topFive.map((item) => (
              <button
                key={item.id}
                className="profile-mini-poster-btn"
                onClick={() => onOpenDetails(item)}
              >
                {item.poster_url ? (
                  <img src={item.poster_url} alt="" className="profile-mini-poster" />
                ) : (
                  <div className="profile-mini-poster profile-mini-poster--empty">🎬</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="stats-section">
        <h3>Recently watched</h3>
        {recentlyWatched.length === 0 ? (
          <p className="stats-empty">Nothing marked Completed yet.</p>
        ) : (
          <div className="profile-mini-grid">
            {recentlyWatched.map((item) => (
              <button
                key={item.id}
                className="profile-mini-poster-btn"
                onClick={() => onOpenDetails(item)}
              >
                {item.poster_url ? (
                  <img src={item.poster_url} alt="" className="profile-mini-poster" />
                ) : (
                  <div className="profile-mini-poster profile-mini-poster--empty">🎬</div>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="stats-section">
        <h3>Activity</h3>
        <ul className="activity-list">
          {activity.map((item) => (
            <li key={item.id} className="activity-item">
              <span className="activity-item__dot" />
              <span>
                {item.status === "completed"
                  ? "Completed "
                  : item.status === "watching"
                  ? "Started watching "
                  : "Added "}
                <strong>{item.title}</strong>
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}