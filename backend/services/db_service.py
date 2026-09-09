import sqlite3
import os
import json
import logging
from datetime import datetime
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "chat_history.db")

class DatabaseService:
    """
    Persistent relational database service for storing conversation history,
    user queries, responses, confidence scores, and analytics.
    Compatible with PostgreSQL / SQLite schema.
    """
    def __init__(self):
        self._init_db()

    def _init_db(self):
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp TEXT NOT NULL,
                    user_query TEXT NOT NULL,
                    rewritten_query TEXT,
                    route TEXT NOT NULL,
                    bot_response TEXT NOT NULL,
                    confidence_score REAL,
                    threshold REAL,
                    is_fallback INTEGER NOT NULL,
                    matched_faq_id TEXT
                )
            """)
            conn.commit()
            logger.info("Database initialized with chat_logs schema.")

    def log_interaction(
        self,
        user_query: str,
        rewritten_query: str,
        route: str,
        bot_response: str,
        confidence_score: float,
        threshold: float,
        is_fallback: bool,
        matched_faq_id: str = None
    ):
        try:
            with sqlite3.connect(DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO chat_logs (
                        timestamp, user_query, rewritten_query, route,
                        bot_response, confidence_score, threshold, is_fallback, matched_faq_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    datetime.utcnow().isoformat(),
                    user_query,
                    rewritten_query,
                    route,
                    bot_response,
                    confidence_score,
                    threshold,
                    1 if is_fallback else 0,
                    matched_faq_id
                ))
                conn.commit()
        except Exception as e:
            logger.error(f"Failed to log interaction to database: {e}")

    def get_recent_logs(self, limit: int = 50) -> List[Dict[str, Any]]:
        try:
            with sqlite3.connect(DB_PATH) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM chat_logs ORDER BY id DESC LIMIT ?", (limit,))
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error fetching logs: {e}")
            return []

db_service = DatabaseService()
