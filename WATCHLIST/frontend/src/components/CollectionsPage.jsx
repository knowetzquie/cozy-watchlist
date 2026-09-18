import { useEffect, useMemo, useState } from "react";

const STORAGE_KEY = "watchlist-collections-v1";
const CHALLENGE_KEY = "watchlist-challenges-v1";

function read(key, fallback) {
  try {
    return JSON.parse(localStorage.getItem(key)) || fallback;
  } catch {
    return fallback;
  }
}

export default function CollectionsPage({ items }) {
  const [collections, setCollections] = useState(() => read(STORAGE_KEY, []));
  const [challenges, setChallenges] = useState(() => read(CHALLENGE_KEY, []));
  const [name, setName] = useState("");
  const [challengeName, setChallengeName] = useState("");
  const [challengeGoal, setChallengeGoal] = useState(10);
  const completed = useMemo(
    () => items.filter((item) => item.status === "completed"),
    [items],
  );

  useEffect(
    () => localStorage.setItem(STORAGE_KEY, JSON.stringify(collections)),
    [collections],
  );
  useEffect(
    () => localStorage.setItem(CHALLENGE_KEY, JSON.stringify(challenges)),
    [challenges],
  );

  function createCollection(event) {
    event.preventDefault();
    const title = name.trim();
    if (!title) return;
    setCollections((current) => [
      ...current,
      { id: crypto.randomUUID(), name: title, itemIds: [] },
    ]);
    setName("");
  }
  function toggleItem(collectionId, itemId) {
    setCollections((current) =>
      current.map((collection) =>
        collection.id !== collectionId
          ? collection
          : {
              ...collection,
              itemIds: collection.itemIds.includes(itemId)
                ? collection.itemIds.filter((id) => id !== itemId)
                : [...collection.itemIds, itemId],
            },
      ),
    );
  }
  function createChallenge(event) {
    event.preventDefault();
    const title = challengeName.trim();
    if (!title || Number(challengeGoal) < 1) return;
    setChallenges((current) => [
      ...current,
      { id: crypto.randomUUID(), name: title, goal: Number(challengeGoal) },
    ]);
    setChallengeName("");
    setChallengeGoal(10);
  }

  return (
    <div className="feature-page">
      <header className="feature-page__intro">
        <p className="eyebrow">Collections</p>
        <h1>Build your own shelves</h1>
        <p>
          Group titles by mood, theme, director, or the challenge you are
          chasing.
        </p>
      </header>
      <div className="feature-columns">
        <section className="feature-section">
          <div className="feature-section__heading">
            <h2>Themed playlists</h2>
            <span>{collections.length}</span>
          </div>
          <form className="inline-create" onSubmit={createCollection}>
            <input
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Mind-bending thrillers"
              aria-label="Collection name"
            />
            <button type="submit">Create list</button>
          </form>
          {collections.length === 0 ? (
            <p className="empty-state">Create your first collection.</p>
          ) : (
            collections.map((collection) => (
              <article className="collection-card" key={collection.id}>
                <div>
                  <h3>{collection.name}</h3>
                  <span>{collection.itemIds.length} titles</span>
                </div>
                <div className="collection-card__items">
                  {items.map((item) => (
                    <label key={item.id}>
                      <input
                        type="checkbox"
                        checked={collection.itemIds.includes(item.id)}
                        onChange={() => toggleItem(collection.id, item.id)}
                      />{" "}
                      {item.title}
                    </label>
                  ))}
                </div>
              </article>
            ))
          )}
        </section>
        <section className="feature-section">
          <div className="feature-section__heading">
            <h2>Watch challenges</h2>
            <span>{completed.length} completed</span>
          </div>
          <form className="inline-create" onSubmit={createChallenge}>
            <input
              value={challengeName}
              onChange={(event) => setChallengeName(event.target.value)}
              placeholder="50 films in 2026"
              aria-label="Challenge name"
            />
            <input
              type="number"
              min="1"
              value={challengeGoal}
              onChange={(event) => setChallengeGoal(event.target.value)}
              aria-label="Challenge goal"
            />
            <button type="submit">Add goal</button>
          </form>
          {challenges.length === 0 ? (
            <p className="empty-state">Set a goal and make it yours.</p>
          ) : (
            challenges.map((challenge) => {
              const progress = Math.min(completed.length, challenge.goal);
              return (
                <article className="challenge-card" key={challenge.id}>
                  <div>
                    <h3>{challenge.name}</h3>
                    <strong>
                      {progress} / {challenge.goal}
                    </strong>
                  </div>
                  <div className="challenge-card__track">
                    <span
                      style={{ width: `${(progress / challenge.goal) * 100}%` }}
                    />
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </div>
  );
}
