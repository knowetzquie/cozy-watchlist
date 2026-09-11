# The Watchlist — Movie/Anime Tracker

A cozy, brown-themed watchlist tracker.

- **Frontend:** React (Vite)
- **Backend:** Python (Flask) + SQLite — your data is saved to a real database file, so it persists between restarts.

Fields per item: title, genre, status (`watching` / `plan to watch` / `completed`), rating (0–5 stars).

## Project layout

```
watchlist-tracker/
  backend/
    app.py              Flask API + SQLite setup
    requirements.txt
  frontend/
    index.html
    package.json
    vite.config.js
    src/
      main.jsx
      App.jsx
      index.css
      api.js
      components/
        AddItemForm.jsx
        FilterTabs.jsx
        StarRating.jsx
        WatchlistItem.jsx
```

## 1. Run the backend

Requires Python 3.9+.

```bash
cd backend
pip install -r requirements.txt
python app.py
```

This starts the API at `http://localhost:5000`. On first run it creates `watchlist.db`
in the `backend/` folder — that file is your database, and it'll keep growing with
your data across restarts. Delete it any time to start fresh.

Quick check it's alive: open `http://localhost:5000/api/health` in a browser — you
should see `{"status": "ok"}`.

## 2. Run the frontend

Requires Node.js 18+.

```bash
cd frontend
npm install
npm run dev
```

This starts the app at `http://localhost:5173`. Open that URL in your browser.

## Running both together

You need **two terminals open at the same time**:

```bash
# Terminal 1
cd backend
python app.py

# Terminal 2
cd frontend
npm run dev
```

The frontend is hardcoded to call the API at `http://localhost:5000/api` (see
`frontend/src/api.js`) — as long as the backend is running on port 5000, everything
connects automatically. No extra config needed.

## Using the app

- Click **+ Add title** to add a movie or anime, with genre, status, and star rating.
- Click stars on any card to update its rating instantly.
- Use the status dropdown on a card to move it between Watching / Plan to Watch / Completed.
- Use the tabs to filter the list.
- Click the ✕ on a card to remove it (with a confirm step).

## Notes on the database

`watchlist.db` is a plain SQLite file — you can open it with any SQLite browser
(e.g. [DB Browser for SQLite](https://sqlitebrowser.org/)) if you ever want to look
at or edit your data directly. To back up your watchlist, just copy that file.

## Deploying / using on a different machine

If you ever run the backend somewhere other than `localhost:5000`, update the
`BASE_URL` constant at the top of `frontend/src/api.js` to match.
