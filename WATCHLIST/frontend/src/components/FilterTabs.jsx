const TABS = [
  { key: "all", label: "All" },
  { key: "watching", label: "Watching" },
  { key: "plan to watch", label: "WatchList" },
  { key: "completed", label: "Completed" },
];

export default function FilterTabs({ active, onChange, counts }) {
  return (
    <div className="tabs-wrap">
      <div className="tabs">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            className={`tab ${active === tab.key ? "tab--active" : ""}`}
            onClick={() => onChange(tab.key)}
          >
            {tab.label}
            <span className="tab__count">{counts[tab.key] ?? 0}</span>
          </button>
        ))}
      </div>
      <div className="status-legend" aria-label="Status colors">
        <span>
          <i className="status-legend__swatch status-legend__swatch--plan" />{" "}
          Plan to Watch
        </span>
        <span>
          <i className="status-legend__swatch status-legend__swatch--watching" />{" "}
          Watching
        </span>
        <span>
          <i className="status-legend__swatch status-legend__swatch--completed" />{" "}
          Completed
        </span>
      </div>
    </div>
  );
}
