const RANKS = [1, 2, 3, 4, 5];

export default function TopFive({ items, onOpenDetails }) {
  const byRank = {};
  for (const item of items) {
    if (item.favorite_rank) byRank[item.favorite_rank] = item;
  }

  return (
    <section className="top-five">
      <div className="top-five__header">
        <h2>5 Favorite Films</h2>
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
                  </div>
                  <p className="top-five__title">{item.title}</p>
                </>
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
