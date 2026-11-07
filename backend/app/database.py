import os
import sqlite3
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
STORAGE_DIR = Path(os.environ.get("INTELLIBI_STORAGE_DIR", str(BASE_DIR / "storage"))).expanduser().resolve()
STORAGE_DIR.mkdir(parents=True, exist_ok=True)
DB_PATH = STORAGE_DIR / "intellibi.db"


def get_conn():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    with get_conn() as c:
        c.execute(
            """CREATE TABLE IF NOT EXISTS datasets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                filename TEXT NOT NULL,
                path TEXT NOT NULL,
                rows INTEGER,
                columns INTEGER,
                is_demo INTEGER DEFAULT 0,
                sheet_name TEXT,
                created_at TEXT DEFAULT CURRENT_TIMESTAMP
            )"""
        )
        existing = {row[1] for row in c.execute("PRAGMA table_info(datasets)").fetchall()}
        if "sheet_name" not in existing:
            c.execute("ALTER TABLE datasets ADD COLUMN sheet_name TEXT")


def add_dataset(name, filename, path, rows, columns, is_demo=False, sheet_name=None) -> int:
    with get_conn() as c:
        cur = c.execute(
            "INSERT INTO datasets (name, filename, path, rows, columns, is_demo, sheet_name) VALUES (?,?,?,?,?,?,?)",
            (name, filename, str(path), rows, columns, int(is_demo), sheet_name),
        )
        return cur.lastrowid


def list_datasets():
    with get_conn() as c:
        rows = c.execute("SELECT * FROM datasets ORDER BY id DESC").fetchall()
    return [dict(r) for r in rows]


def get_dataset(ds_id: int):
    with get_conn() as c:
        r = c.execute("SELECT * FROM datasets WHERE id=?", (ds_id,)).fetchone()
    return dict(r) if r else None
