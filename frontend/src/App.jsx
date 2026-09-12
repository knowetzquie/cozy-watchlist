import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import FilterTabs from "./components/FilterTabs.jsx";
import AddItemForm from "./components/AddItemForm.jsx";
import WatchlistItem from "./components/WatchlistItem.jsx";
import TopFive from "./components/Topfive.jsx";

export default function App() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    api
      .list()
      .then((data) => {
        if (!cancelled) setItems(data);
      })
      .catch((err) => {
        if (!cancelled) setError(err.message);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const counts = useMemo(() => {
    const c = {
      all: items.length,
      watching: 0,
      "plan to watch": 0,
      completed: 0,
    };
    for (const item of items) c[item.status] = (c[item.status] || 0) + 1;
    return c;
  }, [items]);

  const visibleItems = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((item) => item.status === filter);
  }, [items, filter]);

  async function handleAdd(form) {
    const created = await api.create(form);
    setItems((prev) => [created, ...prev]);
  }

  async function handleUpdate(id, changes) {
    const previous = items;
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, ...changes } : it)),
    );
    try {
      await api.update(id, changes);
      // Assigning a Top 5 rank can bump another item's rank on the server
      // (only one item may hold a given rank), so re-sync the full list.
      if ("favorite_rank" in changes) {
        const fresh = await api.list();
        setItems(fresh);
      }
    } catch (err) {
      setItems(previous);
      setError(err.message);
    }
  }

  async function handleDelete(id) {
    const previous = items;
    setItems((prev) => prev.filter((it) => it.id !== id));
    try {
      await api.remove(id);
    } catch (err) {
      setItems(previous);
      setError(err.message);
    }
  }

  return (
    <div className="page">
      <header className="masthead">
        <div className="masthead__title-group">
          <h1>The Watchlist</h1>
          <p>Everything you're watching, want to watch, or already loved.</p>
        </div>
        <button
          className="btn btn--primary"
          onClick={() => setShowForm((s) => !s)}
        >
          {showForm ? "Close" : "+ Add title"}
        </button>
      </header>

      <main className="content">
        <TopFive
          items={items}
          onAssign={(id, rank) => handleUpdate(id, { favorite_rank: rank })}
          onRemove={(id) => handleUpdate(id, { favorite_rank: null })}
        />
        {showForm && (
          <AddItemForm onAdd={handleAdd} onClose={() => setShowForm(false)} />
        )}
        <FilterTabs active={filter} onChange={setFilter} counts={counts} />

        {error && (
          <p className="banner banner--error">
            {error} — make sure the backend is running on port 5000.
          </p>
        )}

        {loading ? (
          <p className="empty-state">Loading your shelf…</p>
        ) : visibleItems.length === 0 ? (
          <div className="empty-state">
            <p>
              {filter === "all"
                ? "Nothing on the shelf yet. Add the first title."
                : `Nothing in "${filter}" yet.`}
            </p>
          </div>
        ) : (
          <ul className="ticket-list">
            {visibleItems.map((item) => (
              <WatchlistItem
                key={item.id}
                item={item}
                onUpdate={handleUpdate}
                onDelete={handleDelete}
              />
            ))}
          </ul>
        )}
      </main>
    </div>
  );
}
