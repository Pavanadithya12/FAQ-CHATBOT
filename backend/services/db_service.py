import sqlite3
import os
import json
import logging
from datetime import datetime
from typing import List, Dict, Any, Optional

logger = logging.getLogger(__name__)

DB_PATH = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), "data", "chat_history.db")

class DatabaseService:
    def __init__(self):
        self._init_db()

    def _init_db(self):
        os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
        with sqlite3.connect(DB_PATH) as conn:
            cursor = conn.cursor()
            
            # Users table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS users (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    username TEXT UNIQUE NOT NULL,
                    email TEXT UNIQUE NOT NULL,
                    hashed_password TEXT NOT NULL,
                    full_name TEXT,
                    created_at TEXT NOT NULL
                )
            """)

            # Chat logs table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS chat_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    timestamp TEXT NOT NULL,
                    user_query TEXT NOT NULL,
                    rewritten_query TEXT,
                    route TEXT NOT NULL,
                    bot_response TEXT NOT NULL,
                    confidence_score REAL,
                    threshold REAL,
                    is_fallback INTEGER NOT NULL,
                    matched_faq_id TEXT,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
            """)

            # User-managed custom FAQs
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS user_faqs (
                    id TEXT PRIMARY KEY,
                    user_id INTEGER,
                    category TEXT NOT NULL,
                    question TEXT NOT NULL,
                    answer TEXT NOT NULL,
                    keywords TEXT,
                    created_at TEXT NOT NULL,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
            """)

            # Login Audit / History table
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS login_history (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    user_id INTEGER,
                    username TEXT NOT NULL,
                    timestamp TEXT NOT NULL,
                    ip_address TEXT,
                    status TEXT NOT NULL,
                    FOREIGN KEY(user_id) REFERENCES users(id)
                )
            """)

            conn.commit()

    # ── User Account Operations ───────────────────────────────────────────────
    def create_user(self, username: str, email: str, hashed_password: str, full_name: str = "") -> Optional[Dict[str, Any]]:
        try:
            with sqlite3.connect(DB_PATH) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO users (username, email, hashed_password, full_name, created_at)
                    VALUES (?, ?, ?, ?, ?)
                """, (username.strip().lower(), email.strip().lower(), hashed_password, full_name.strip(), datetime.utcnow().isoformat()))
                conn.commit()
                user_id = cursor.lastrowid
                return self.get_user_by_id(user_id)
        except sqlite3.IntegrityError:
            return None
        except Exception as e:
            logger.error(f"Error creating user: {e}")
            return None

    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        try:
            with sqlite3.connect(DB_PATH) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT * FROM users WHERE username = ? OR email = ?", (username.strip().lower(), username.strip().lower()))
                row = cursor.fetchone()
                return dict(row) if row else None
        except Exception as e:
            logger.error(f"Error fetching user: {e}")
            return None

    def get_user_by_id(self, user_id: int) -> Optional[Dict[str, Any]]:
        try:
            with sqlite3.connect(DB_PATH) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                cursor.execute("SELECT id, username, email, full_name, created_at FROM users WHERE id = ?", (user_id,))
                row = cursor.fetchone()
                return dict(row) if row else None
        except Exception as e:
            logger.error(f"Error fetching user by id: {e}")
            return None

    # ── Login History Audit ───────────────────────────────────────────────────
    def record_login(self, username: str, user_id: Optional[int] = None, ip_address: str = "127.0.0.1", status: str = "SUCCESS"):
        try:
            with sqlite3.connect(DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO login_history (user_id, username, timestamp, ip_address, status)
                    VALUES (?, ?, ?, ?, ?)
                """, (user_id, username, datetime.utcnow().isoformat(), ip_address, status))
                conn.commit()
        except Exception as e:
            logger.error(f"Error recording login: {e}")

    def get_login_history(self, user_id: Optional[int] = None, limit: int = 20) -> List[Dict[str, Any]]:
        try:
            with sqlite3.connect(DB_PATH) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                if user_id:
                    cursor.execute("SELECT * FROM login_history WHERE user_id = ? ORDER BY id DESC LIMIT ?", (user_id, limit))
                else:
                    cursor.execute("SELECT * FROM login_history ORDER BY id DESC LIMIT ?", (limit,))
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error fetching login history: {e}")
            return []

    # ── User FAQ Management (Upload / Delete Questions) ───────────────────────
    def add_user_faq(self, faq_id: str, user_id: Optional[int], category: str, question: str, answer: str, keywords: List[str] = []) -> bool:
        try:
            with sqlite3.connect(DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT OR REPLACE INTO user_faqs (id, user_id, category, question, answer, keywords, created_at)
                    VALUES (?, ?, ?, ?, ?, ?, ?)
                """, (
                    faq_id,
                    user_id,
                    category.strip(),
                    question.strip(),
                    answer.strip(),
                    json.dumps(keywords),
                    datetime.utcnow().isoformat()
                ))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error saving user FAQ: {e}")
            return False

    def delete_user_faq(self, faq_id: str, user_id: Optional[int] = None) -> bool:
        try:
            with sqlite3.connect(DB_PATH) as conn:
                cursor = conn.cursor()
                if user_id is not None:
                    cursor.execute("DELETE FROM user_faqs WHERE id = ? AND user_id = ?", (faq_id, user_id))
                else:
                    cursor.execute("DELETE FROM user_faqs WHERE id = ?", (faq_id,))
                conn.commit()
                return cursor.rowcount > 0
        except Exception as e:
            logger.error(f"Error deleting user FAQ: {e}")
            return False

    def get_user_faqs(self, user_id: Optional[int] = None) -> List[Dict[str, Any]]:
        try:
            with sqlite3.connect(DB_PATH) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                if user_id is not None:
                    cursor.execute("SELECT * FROM user_faqs WHERE user_id = ? OR user_id IS NULL ORDER BY created_at DESC", (user_id,))
                else:
                    cursor.execute("SELECT * FROM user_faqs ORDER BY created_at DESC")
                rows = cursor.fetchall()
                results = []
                for row in rows:
                    item = dict(row)
                    item["keywords"] = json.loads(item.get("keywords") or "[]")
                    results.append(item)
                return results
        except Exception as e:
            logger.error(f"Error loading user FAQs: {e}")
            return []

    # ── Per-User Chat History Operations ──────────────────────────────────────
    def log_interaction(
        self,
        user_query: str,
        rewritten_query: Optional[str],
        route: str,
        bot_response: str,
        confidence_score: float,
        threshold: float,
        is_fallback: bool,
        matched_faq_id: Optional[str] = None,
        user_id: Optional[int] = None
    ):
        try:
            with sqlite3.connect(DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("""
                    INSERT INTO chat_logs (
                        user_id, timestamp, user_query, rewritten_query, route,
                        bot_response, confidence_score, threshold, is_fallback, matched_faq_id
                    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    user_id,
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
            logger.error(f"Failed to log interaction: {e}")

    def get_recent_logs(self, user_id: Optional[int] = None, limit: int = 50) -> List[Dict[str, Any]]:
        try:
            with sqlite3.connect(DB_PATH) as conn:
                conn.row_factory = sqlite3.Row
                cursor = conn.cursor()
                if user_id is not None:
                    cursor.execute("SELECT * FROM chat_logs WHERE user_id = ? ORDER BY id DESC LIMIT ?", (user_id, limit))
                else:
                    cursor.execute("SELECT * FROM chat_logs ORDER BY id DESC LIMIT ?", (limit,))
                rows = cursor.fetchall()
                return [dict(row) for row in rows]
        except Exception as e:
            logger.error(f"Error fetching logs: {e}")
            return []

    def clear_user_history(self, user_id: int) -> bool:
        try:
            with sqlite3.connect(DB_PATH) as conn:
                cursor = conn.cursor()
                cursor.execute("DELETE FROM chat_logs WHERE user_id = ?", (user_id,))
                conn.commit()
                return True
        except Exception as e:
            logger.error(f"Error clearing history: {e}")
            return False

    def get_user_analytics(self, user_id: Optional[int] = None) -> Dict[str, Any]:
        try:
            with sqlite3.connect(DB_PATH) as conn:
                cursor = conn.cursor()
                # Total queries
                if user_id:
                    cursor.execute("SELECT COUNT(*), AVG(confidence_score), SUM(is_fallback) FROM chat_logs WHERE user_id = ?", (user_id,))
                else:
                    cursor.execute("SELECT COUNT(*), AVG(confidence_score), SUM(is_fallback) FROM chat_logs")
                row = cursor.fetchone()
                total = row[0] or 0
                avg_conf = round(float(row[1] or 0.0) * 100, 1)
                fallbacks = row[2] or 0
                success_rate = round(((total - fallbacks) / total * 100), 1) if total > 0 else 100.0

                # Custom FAQs count
                if user_id:
                    cursor.execute("SELECT COUNT(*) FROM user_faqs WHERE user_id = ?", (user_id,))
                else:
                    cursor.execute("SELECT COUNT(*) FROM user_faqs")
                custom_count = cursor.fetchone()[0] or 0

                return {
                    "total_queries": total,
                    "avg_confidence": avg_conf,
                    "success_rate": success_rate,
                    "custom_faqs": custom_count,
                    "base_faqs": 50,
                    "total_knowledge_base": 50 + custom_count
                }
        except Exception as e:
            logger.error(f"Error computing analytics: {e}")
            return {
                "total_queries": 0,
                "avg_confidence": 0.0,
                "success_rate": 100.0,
                "custom_faqs": 0,
                "base_faqs": 50,
                "total_knowledge_base": 50
            }

db_service = DatabaseService()

