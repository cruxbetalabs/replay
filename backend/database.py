import os
import sqlite3
from datetime import datetime, timezone

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
UPLOAD_ROOT = os.path.join(BASE_DIR, "uploads")
DB_PATH = os.path.join(BASE_DIR, "uploads.db")


def init_db() -> None:
    os.makedirs(UPLOAD_ROOT, exist_ok=True)
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS uploads (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                upload_uuid TEXT NOT NULL,
                filename TEXT NOT NULL,
                path TEXT NOT NULL,
                url TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.commit()


def insert_upload(upload_uuid: str, filename: str, path: str, url: str) -> None:
    created_at = datetime.now(timezone.utc).isoformat()
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute(
            "INSERT INTO uploads (upload_uuid, filename, path, url, created_at) VALUES (?, ?, ?, ?, ?)",
            (upload_uuid, filename, path, url, created_at),
        )
        conn.commit()
