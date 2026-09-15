"""
Watchlist Tracker — backend API

A small Flask app backed by SQLite. Stores movies/anime with a title,
genre, status, rating, and an optional poster image. Data is persisted
to watchlist.db in this same folder, so it survives restarts.

Title search/autocomplete (with posters) is powered by TMDB
(themoviedb.org). Put your API key in a `.env` file in this folder:
    TMDB_API_KEY=your_key_here
"""

from flask import Flask, jsonify, request, g
from flask_cors import CORS
from dotenv import load_dotenv
import sqlite3
import os
import requests
from datetime import datetime

load_dotenv()

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "watchlist.db")
VALID_STATUSES = {"watching", "plan to watch", "completed"}

TMDB_API_KEY = os.environ.get("TMDB_API_KEY", "")
TMDB_BASE = "https://api.themoviedb.org/3"
TMDB_IMAGE_BASE = "https://image.tmdb.org/t/p/w200"

app = Flask(__name__)
CORS(app)


def get_db():
    if "db" not in g:
        g.db = sqlite3.connect(DB_PATH)
        g.db.row_factory = sqlite3.Row
        g.db.execute("PRAGMA foreign_keys = ON")
    return g.db


@app.teardown_appcontext
def close_db(exception=None):
    db = g.pop("db", None)
    if db is not None:
        db.close()


def init_db():
    """Create the items table if it doesn't exist yet, and add new columns
    to older databases that were created before poster_url existed."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            genre TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'plan to watch',
            rating INTEGER NOT NULL DEFAULT 0,
            poster_url TEXT NOT NULL DEFAULT '',
            review TEXT NOT NULL DEFAULT '',
            favorite_rank INTEGER DEFAULT NULL,
            favorite_note TEXT NOT NULL DEFAULT '',
            tmdb_id INTEGER DEFAULT NULL,
            media_type TEXT DEFAULT NULL,
            watched_at TEXT DEFAULT NULL,
            is_rewatch INTEGER NOT NULL DEFAULT 0,
            liked INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """
    )
    # Migration for databases created before poster_url/review/favorite_rank existed.
    existing_columns = {row[1] for row in conn.execute("PRAGMA table_info(items)")}
    if "poster_url" not in existing_columns:
        conn.execute("ALTER TABLE items ADD COLUMN poster_url TEXT NOT NULL DEFAULT ''")
    if "review" not in existing_columns:
        conn.execute("ALTER TABLE items ADD COLUMN review TEXT NOT NULL DEFAULT ''")
    if "favorite_rank" not in existing_columns:
        conn.execute("ALTER TABLE items ADD COLUMN favorite_rank INTEGER DEFAULT NULL")
    if "favorite_note" not in existing_columns:
        conn.execute("ALTER TABLE items ADD COLUMN favorite_note TEXT NOT NULL DEFAULT ''")
    if "tmdb_id" not in existing_columns:
        conn.execute("ALTER TABLE items ADD COLUMN tmdb_id INTEGER DEFAULT NULL")
    if "media_type" not in existing_columns:
        conn.execute("ALTER TABLE items ADD COLUMN media_type TEXT DEFAULT NULL")
    if "watched_at" not in existing_columns:
        conn.execute("ALTER TABLE items ADD COLUMN watched_at TEXT DEFAULT NULL")
    if "is_rewatch" not in existing_columns:
        conn.execute("ALTER TABLE items ADD COLUMN is_rewatch INTEGER NOT NULL DEFAULT 0")
    if "liked" not in existing_columns:
        conn.execute("ALTER TABLE items ADD COLUMN liked INTEGER NOT NULL DEFAULT 0")

    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS profile (
            id INTEGER PRIMARY KEY CHECK (id = 1),
            name TEXT NOT NULL DEFAULT 'Movie Lover',
            bio TEXT NOT NULL DEFAULT '',
            avatar TEXT NOT NULL DEFAULT '🎬'
        )
        """
    )
    conn.execute(
        "INSERT OR IGNORE INTO profile (id, name, bio, avatar) VALUES (1, 'Movie Lover', '', '🎬')"
    )
    conn.commit()

def row_to_dict(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "genre": row["genre"],
        "status": row["status"],
        "rating": row["rating"],
        "poster_url": row["poster_url"] if "poster_url" in row.keys() else "",
        "review": row["review"] if "review" in row.keys() else "",
        "favorite_rank": row["favorite_rank"] if "favorite_rank" in row.keys() else None,
        "favorite_note": row["favorite_note"] if "favorite_note" in row.keys() else "",
        "tmdb_id": row["tmdb_id"] if "tmdb_id" in row.keys() else None,
        "media_type": row["media_type"] if "media_type" in row.keys() else None,
        "watched_at": row["watched_at"] if "watched_at" in row.keys() else None,
        "is_rewatch": bool(row["is_rewatch"]) if "is_rewatch" in row.keys() else False,
        "liked": bool(row["liked"]) if "liked" in row.keys() else False,
        "created_at": row["created_at"],
    }

def validate_payload(data, partial=False):
    cleaned = {}

    if "title" in data or not partial:
        title = (data.get("title") or "").strip()
        if not title:
            return None, "Title is required."
        cleaned["title"] = title

    if "genre" in data or not partial:
        cleaned["genre"] = (data.get("genre") or "").strip()

    if "status" in data or not partial:
        status = (data.get("status") or "plan to watch").strip().lower()
        if status not in VALID_STATUSES:
            return None, f"Status must be one of: {', '.join(sorted(VALID_STATUSES))}."
        cleaned["status"] = status

    if "rating" in data or not partial:
        try:
            rating = int(data.get("rating", 0))
        except (TypeError, ValueError):
            return None, "Rating must be a whole number between 0 and 5."
        if rating < 0 or rating > 5:
            return None, "Rating must be between 0 and 5."
        cleaned["rating"] = rating

    if "poster_url" in data:
        cleaned["poster_url"] = (data.get("poster_url") or "").strip()
    elif not partial:
        cleaned["poster_url"] = ""

    if "review" in data:
        cleaned["review"] = (data.get("review") or "").strip()
    elif not partial:
        cleaned["review"] = ""

    if "favorite_rank" in data:
        raw = data.get("favorite_rank")
        if raw in (None, "", 0):
            cleaned["favorite_rank"] = None
        else:
            try:
                rank = int(raw)
            except (TypeError, ValueError):
                return None, "favorite_rank must be a whole number between 1 and 5."
            if rank < 1 or rank > 5:
                return None, "favorite_rank must be between 1 and 5."
            cleaned["favorite_rank"] = rank

    if "favorite_note" in data:
        cleaned["favorite_note"] = (data.get("favorite_note") or "").strip()[:120]

    if "tmdb_id" in data:
        raw_id = data.get("tmdb_id")
        cleaned["tmdb_id"] = int(raw_id) if raw_id not in (None, "") else None

    if "media_type" in data:
        mt = (data.get("media_type") or "").strip().lower()
        cleaned["media_type"] = mt if mt in ("movie", "tv") else None

    if "watched_at" in data:
        raw_date = (data.get("watched_at") or "").strip()
        if not raw_date:
            cleaned["watched_at"] = None
        else:
            try:
                datetime.strptime(raw_date, "%Y-%m-%d")
            except ValueError:
                return None, "watched_at must be a date in YYYY-MM-DD format."
            cleaned["watched_at"] = raw_date

    if "is_rewatch" in data:
        cleaned["is_rewatch"] = 1 if data.get("is_rewatch") else 0

    if "liked" in data:
        cleaned["liked"] = 1 if data.get("liked") else 0

    return cleaned, None


@app.route("/api/health", methods=["GET"])
def health():
    return jsonify({"status": "ok"})


@app.route("/api/items", methods=["GET"])
def list_items():
    db = get_db()
    status_filter = request.args.get("status")
    if status_filter and status_filter.lower() != "all":
        rows = db.execute(
            "SELECT * FROM items WHERE status = ? ORDER BY created_at DESC, id DESC",
            (status_filter.lower(),),
        ).fetchall()
    else:
        rows = db.execute(
            "SELECT * FROM items ORDER BY created_at DESC, id DESC"
        ).fetchall()
    return jsonify([row_to_dict(r) for r in rows])


@app.route("/api/items", methods=["POST"])
def create_item():
    data = request.get_json(silent=True) or {}
    cleaned, error = validate_payload(data, partial=False)
    if error:
        return jsonify({"error": error}), 400

    db = get_db()
    cursor = db.execute(
        "INSERT INTO items (title, genre, status, rating, poster_url, review, favorite_rank, favorite_note, tmdb_id, media_type, watched_at, is_rewatch, liked) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        (
            cleaned["title"],
            cleaned["genre"],
            cleaned["status"],
            cleaned["rating"],
            cleaned["poster_url"],
            cleaned["review"],
            cleaned.get("favorite_rank"),
            cleaned.get("favorite_note", ""),
            cleaned.get("tmdb_id"),
            cleaned.get("media_type"),
            cleaned.get("watched_at"),
            cleaned.get("is_rewatch", 0),
            cleaned.get("liked", 0),
        ),
    )
    db.commit()
    new_row = db.execute("SELECT * FROM items WHERE id = ?", (cursor.lastrowid,)).fetchone()
    return jsonify(row_to_dict(new_row)), 201


@app.route("/api/items/<int:item_id>", methods=["PUT", "PATCH"])
def update_item(item_id):
    db = get_db()
    existing = db.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    if existing is None:
        return jsonify({"error": "Item not found."}), 404

    data = request.get_json(silent=True) or {}
    cleaned, error = validate_payload(data, partial=True)
    if error:
        return jsonify({"error": error}), 400

    merged = row_to_dict(existing)
    merged.update(cleaned)

    # If this item is being assigned a rank (1-5), that rank can only belong
    # to one item at a time — bump whoever currently holds it back to unranked.
    if "favorite_rank" in cleaned and cleaned["favorite_rank"] is not None:
        db.execute(
            "UPDATE items SET favorite_rank = NULL WHERE favorite_rank = ? AND id != ?",
            (cleaned["favorite_rank"], item_id),
        )

    db.execute(
        """UPDATE items SET
            title = ?, genre = ?, status = ?, rating = ?, poster_url = ?,
            review = ?, favorite_rank = ?, favorite_note = ?, tmdb_id = ?,
            media_type = ?, watched_at = ?, is_rewatch = ?, liked = ?
        WHERE id = ?""",
        (
            merged["title"],
            merged["genre"],
            merged["status"],
            merged["rating"],
            merged["poster_url"],
            merged["review"],
            merged["favorite_rank"],
            merged["favorite_note"],
            merged["tmdb_id"],
            merged["media_type"],
            merged["watched_at"],
            1 if merged["is_rewatch"] else 0,
            1 if merged["liked"] else 0,
            item_id,
        ),
    )
    db.commit()
    updated_row = db.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    return jsonify(row_to_dict(updated_row))


@app.route("/api/items/<int:item_id>", methods=["DELETE"])
def delete_item(item_id):
    db = get_db()
    existing = db.execute("SELECT * FROM items WHERE id = ?", (item_id,)).fetchone()
    if existing is None:
        return jsonify({"error": "Item not found."}), 404

    db.execute("DELETE FROM items WHERE id = ?", (item_id,))
    db.commit()
    return jsonify({"deleted": item_id})


_genre_cache = {}
_details_cache = {}

def get_genre_map():
    if _genre_cache:
        return _genre_cache
    if not TMDB_API_KEY:
        return {}
    try:
        for kind in ("movie", "tv"):
            resp = requests.get(
                f"{TMDB_BASE}/genre/{kind}/list",
                params={"api_key": TMDB_API_KEY},
                timeout=5,
            )
            resp.raise_for_status()
            for genre in resp.json().get("genres", []):
                _genre_cache[genre["id"]] = genre["name"]
    except requests.RequestException:
        pass
    return _genre_cache


@app.route("/api/search-titles", methods=["GET"])
def search_titles():
    query = (request.args.get("q") or "").strip()
    if not query:
        return jsonify([])

    if not TMDB_API_KEY:
        return jsonify({"error": "TMDB_API_KEY is not set on the server."}), 500

    try:
        resp = requests.get(
            f"{TMDB_BASE}/search/multi",
            params={"api_key": TMDB_API_KEY, "query": query, "include_adult": "false"},
            timeout=5,
        )
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException:
        return jsonify({"error": "Could not reach the movie database."}), 502

    genre_map = get_genre_map()
    results = []
    for item in data.get("results", [])[:8]:
        media_type = item.get("media_type")
        if media_type not in ("movie", "tv"):
            continue

        title = item.get("title") or item.get("name") or ""
        if not title:
            continue

        date = item.get("release_date") or item.get("first_air_date") or ""
        year = date[:4] if date else None

        genre_ids = item.get("genre_ids", [])
        genre_names = [genre_map[gid] for gid in genre_ids if gid in genre_map]
        is_animation = "Animation" in genre_names
        is_japanese = item.get("original_language") == "ja"

        if media_type == "tv" and is_animation and is_japanese:
            kind_label = "Anime"
        elif media_type == "tv":
            kind_label = "TV Series"
        else:
            kind_label = "Movie"

        poster_path = item.get("poster_path")

        results.append(
            {
                "tmdb_id": item.get("id"),
                "media_type": media_type,
                "title": title,
                "year": year,
                "kind": kind_label,
                "genre": ", ".join(genre_names[:2]),
                "poster_url": f"{TMDB_IMAGE_BASE}{poster_path}" if poster_path else "",
            }
        )

    return jsonify(results)

@app.route("/api/title-details/<int:tmdb_id>", methods=["GET"])
def title_details(tmdb_id):
    media_type = (request.args.get("media_type") or "movie").strip().lower()
    if media_type not in ("movie", "tv"):
        media_type = "movie"

    cache_key = f"{media_type}:{tmdb_id}"
    if cache_key in _details_cache:
        return jsonify(_details_cache[cache_key])

    if not TMDB_API_KEY:
        return jsonify({"error": "TMDB_API_KEY is not set on the server."}), 500

    try:
        resp = requests.get(
            f"{TMDB_BASE}/{media_type}/{tmdb_id}",
            params={"api_key": TMDB_API_KEY, "append_to_response": "credits"},
            timeout=5,
        )
        if resp.status_code == 404:
            return jsonify({"error": "Title not found."}), 404
        resp.raise_for_status()
        data = resp.json()
    except requests.RequestException:
        return jsonify({"error": "Could not reach the movie database."}), 502

    title = data.get("title") or data.get("name") or ""
    date = data.get("release_date") or data.get("first_air_date") or ""
    year = date[:4] if date else None
    genres = [g["name"] for g in data.get("genres", [])]
    poster_path = data.get("poster_path")

    credits = data.get("credits", {})

    def person_photo(person):
        path = person.get("profile_path")
        return f"{TMDB_IMAGE_BASE}{path}" if path else None

    cast = [
        {"name": c["name"], "photo": person_photo(c)}
        for c in credits.get("cast", [])[:6]
    ]

    if media_type == "movie":
        directors = [
            {"name": c["name"], "photo": person_photo(c)}
            for c in credits.get("crew", [])
            if c.get("job") == "Director"
        ]
    else:
        directors = [
            {"name": c.get("name"), "photo": person_photo(c)}
            for c in data.get("created_by", [])
        ]

    result = {
        "title": title,
        "year": year,
        "genres": genres,
        "overview": data.get("overview") or "",
        "poster_url": f"{TMDB_IMAGE_BASE}{poster_path}" if poster_path else "",
        "directors": directors,
        "cast": cast,
        "runtime": data.get("runtime"),
        "vote_average": data.get("vote_average"),
    }
    _details_cache[cache_key] = result
    return jsonify(result)

@app.route("/api/profile", methods=["GET"])
def get_profile():
    db = get_db()
    row = db.execute("SELECT * FROM profile WHERE id = 1").fetchone()
    return jsonify({"name": row["name"], "bio": row["bio"], "avatar": row["avatar"]})


@app.route("/api/profile", methods=["PATCH"])
def update_profile():
    data = request.get_json(silent=True) or {}
    db = get_db()
    row = db.execute("SELECT * FROM profile WHERE id = 1").fetchone()

    name = (data.get("name") if "name" in data else row["name"]) or "Movie Lover"
    bio = (data.get("bio") if "bio" in data else row["bio"]) or ""
    avatar = (data.get("avatar") if "avatar" in data else row["avatar"]) or "🎬"

    db.execute(
        "UPDATE profile SET name = ?, bio = ?, avatar = ? WHERE id = 1",
        (name.strip()[:60], bio.strip()[:200], avatar.strip()[:3_000_000]),
    )
    db.commit()
    return jsonify(
        {"name": name.strip()[:60], "bio": bio.strip()[:200], "avatar": avatar.strip()[:3_000_000]}
    )

if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)