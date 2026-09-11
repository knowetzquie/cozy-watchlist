"""
Watchlist Tracker — backend API

A small Flask app backed by SQLite. Stores movies/anime with a title,
genre, status, and a 0-5 rating. Data is persisted to watchlist.db in
this same folder, so it survives restarts.
"""

from flask import Flask, jsonify, request, g
from flask_cors import CORS
import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "watchlist.db")
VALID_STATUSES = {"watching", "plan to watch", "completed"}

app = Flask(__name__)
CORS(app)  # allow the React dev server (different port) to call this API


def get_db():
    """Open (or reuse) a SQLite connection for the current request."""
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
    """Create the items table if it doesn't exist yet."""
    conn = sqlite3.connect(DB_PATH)
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS items (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            title TEXT NOT NULL,
            genre TEXT NOT NULL DEFAULT '',
            status TEXT NOT NULL DEFAULT 'plan to watch',
            rating INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL DEFAULT (datetime('now'))
        )
        """
    )
    conn.commit()
    conn.close()


def row_to_dict(row):
    return {
        "id": row["id"],
        "title": row["title"],
        "genre": row["genre"],
        "status": row["status"],
        "rating": row["rating"],
        "created_at": row["created_at"],
    }


def validate_payload(data, partial=False):
    """Returns (cleaned_dict, error_message). error_message is None if valid."""
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
        "INSERT INTO items (title, genre, status, rating) VALUES (?, ?, ?, ?)",
        (cleaned["title"], cleaned["genre"], cleaned["status"], cleaned["rating"]),
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

    db.execute(
        "UPDATE items SET title = ?, genre = ?, status = ?, rating = ? WHERE id = ?",
        (merged["title"], merged["genre"], merged["status"], merged["rating"], item_id),
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


if __name__ == "__main__":
    init_db()
    app.run(debug=True, port=5000)
