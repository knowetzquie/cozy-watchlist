import { useEffect, useMemo, useState } from "react";
import { api } from "./api.js";
import FilterTabs from "./components/FilterTabs.jsx";
import AddItemForm from "./components/AddItemForm.jsx";
import WatchlistItem from "./components/WatchlistItem.jsx";
import TopFive from "./components/Topfive.jsx";
import TitleDetailModal from "./components/TitleDetailModal.jsx";
import PosterGrid from "./components/PosterGrid.jsx";
import ReviewsPage from "./components/ReviewsPage.jsx";
import StatsPage from "./components/StatsPage.jsx";
import ProfilePage from "./components/ProfilePage.jsx";

export default function App() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("all");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [detailItem, setDetailItem] = useState(null);
  const [page, setPage] = useState("watchlist");
  const [showBackToTop, setShowBackToTop] = useState(false);
  const [showMenu, setShowMenu] = useState(false);

  // Wraps a state update in the browser's View Transitions API when
  // available, so switching tabs/filters crossfades smoothly instead of
  // the page snapping instantly to its new height/content.
  function smoothly(update) {
    if (document.startViewTransition) {
      document.startViewTransition(update);
    } else {
      update();
    }
  }

  function changeFilter(next) {
    smoothly(() => setFilter(next));
  }

  function changePage(next) {
    smoothly(() => setPage(next));
    setShowMenu(false);
  }

  function scrollToSection(id) {
    document.getElementById(id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setShowMenu(false);
  }
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

  useEffect(() => {
    function updateScrollState() {
      setShowBackToTop(window.scrollY > 520);
    }

    updateScrollState();
    window.addEventListener("scroll", updateScrollState, { passive: true });
    return () => window.removeEventListener("scroll", updateScrollState);
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
    const normalizedTitle = form.title.trim().toLowerCase();
    const isDuplicate = items.some((it) => {
      if (
        form.tmdb_id &&
        it.tmdb_id &&
        it.tmdb_id === form.tmdb_id &&
        it.media_type === form.media_type
      ) {
        return true;
      }
      return it.title.trim().toLowerCase() === normalizedTitle;
    });
    if (isDuplicate) {
      throw new Error(`"${form.title.trim()}" is already on your list.`);
    }
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
          <h1>Watchlist</h1>
          <p>Everything you're watching, want to watch, or already loved.</p>
        </div>
      </header>

      <nav className="page-nav" aria-label="Main navigation">
        <div className="page-nav__links">
          {[
            { key: "watchlist", label: "Watchlist" },
            { key: "reviews", label: "Reviews" },
            { key: "stats", label: "Stats" },
            { key: "profile", label: "Profile" },
          ].map((p) => (
            <button
              key={p.key}
              className={`page-nav__btn ${page === p.key ? "page-nav__btn--active" : ""}`}
              onClick={() => changePage(p.key)}
            >
              {p.label}
            </button>
          ))}
        </div>

        <div className="page-nav__menu-wrap">
          <button
            className="page-nav__menu-btn"
            onClick={() => setShowMenu((open) => !open)}
            aria-label="Open more navigation"
            aria-expanded={showMenu}
            aria-haspopup="menu"
          >
            <span aria-hidden="true">☰</span>
          </button>
          {showMenu && (
            <div className="page-nav__menu" role="menu">
              <button
                role="menuitem"
                onClick={() => scrollToSection("top-five")}
              >
                Top 5 favorites
              </button>
              <button
                role="menuitem"
                onClick={() => scrollToSection("add-movie")}
              >
                Add a movie
              </button>
              <button
                role="menuitem"
                onClick={() => {
                  window.scrollTo({ top: 0, behavior: "smooth" });
                  setShowMenu(false);
                }}
              >
                Back to top
              </button>
            </div>
          )}
        </div>
      </nav>

      <main className="content">
        {error && (
          <p className="banner banner--error">
            {error} — make sure the backend is running on port 5000.
          </p>
        )}

        {page === "watchlist" && (
          <>
            <div id="top-five">
              <TopFive
                items={items}
                onAssign={(id, rank) =>
                  handleUpdate(id, { favorite_rank: rank })
                }
                onRemove={(id) => handleUpdate(id, { favorite_rank: null })}
                onUpdateNote={(id, note) =>
                  handleUpdate(id, { favorite_note: note })
                }
                onOpenDetails={setDetailItem}
              />
            </div>

            <div id="add-movie">
              <AddItemForm onAdd={handleAdd} />
            </div>

            <FilterTabs
              active={filter}
              onChange={changeFilter}
              counts={counts}
            />

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
            ) : filter === "all" ? (
              <ul className="ticket-list">
                {visibleItems.map((item) => (
                  <WatchlistItem
                    key={item.id}
                    item={item}
                    onUpdate={handleUpdate}
                    onDelete={handleDelete}
                    onOpenDetails={setDetailItem}
                  />
                ))}
              </ul>
            ) : (
              <PosterGrid items={visibleItems} onOpenDetails={setDetailItem} />
            )}
          </>
        )}

        {page === "reviews" && (
          <ReviewsPage
            items={items}
            onOpenDetails={setDetailItem}
            onUpdate={handleUpdate}
            onDelete={handleDelete}
          />
        )}

        {page === "stats" && (
          <StatsPage items={items} onOpenDetails={setDetailItem} />
        )}

        {page === "profile" && (
          <ProfilePage items={items} onOpenDetails={setDetailItem} />
        )}
      </main>

      {detailItem && (
        <TitleDetailModal
          item={detailItem}
          onClose={() => setDetailItem(null)}
          onBackfill={(id, tmdb_id, media_type) =>
            handleUpdate(id, { tmdb_id, media_type })
          }
        />
      )}

      {showBackToTop && (
        <button
          className="back-to-top"
          onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
          aria-label="Back to top"
          title="Back to top"
        >
          <span aria-hidden="true">↑</span>
          <span>Top</span>
        </button>
      )}
    </div>
  );
}
