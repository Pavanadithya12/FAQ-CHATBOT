import logging
import requests
from typing import Dict, Any, Optional
from config import settings

logger = logging.getLogger(__name__)

class ResponseWriter:
    def write_response(self, user_question: str, selected_faq: Dict[str, Any]) -> str:
        """
        Converts the retrieved FAQ information into a grounded, natural response.
        Constrained strictly to the retrieved context to avoid hallucinations.
        """
        metadata = selected_faq.get("metadata", {})
        faq_q = metadata.get("question", "")
        faq_a = metadata.get("answer", "")
        category = metadata.get("category", "General")

        # Try LLM grounding if API key is present
        if settings.OPENAI_API_KEY:
            llm_reply = self._call_openai(user_question, faq_q, faq_a, category)
            if llm_reply:
                return llm_reply

        if settings.GROQ_API_KEY:
            llm_reply = self._call_groq(user_question, faq_q, faq_a, category)
            if llm_reply:
                return llm_reply

        # High quality grounded synthesis template without requiring third-party API keys
        return self._format_grounded_response(user_question, faq_q, faq_a, category)

    def _format_grounded_response(self, user_q: str, faq_q: str, faq_a: str, category: str) -> str:
        """Deterministic, grounded response formatter."""
        return f"{faq_a}\n\n📌 *Related Topic: {category}*\n*(Matched Question: \"{faq_q}\")*"

    def _call_openai(self, user_q: str, faq_q: str, faq_a: str, category: str) -> Optional[str]:
        try:
            headers = {
                "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
                "Content-Type": "application/json"
            }
            prompt = f"""You are a helpful customer support assistant. Answer the user's question using ONLY the retrieved FAQ context below. Do NOT add unsupported information or make up facts.

Retrieved FAQ Question: {faq_q}
Category: {category}
Retrieved FAQ Answer: {faq_a}

User's Question: {user_q}

Provide a polite, natural, and accurate answer based strictly on the retrieved information:"""

            payload = {
                "model": "gpt-3.5-turbo",
                "messages": [
                    {"role": "system", "content": "You are a grounded FAQ assistant. Answer strictly based on retrieved context."},
                    {"role": "user", "content": prompt}
                ],
                "temperature": 0.2,
                "max_tokens": 300
            }
            resp = requests.post("https://api.openai.com/v1/chat/completions", json=payload, headers=headers, timeout=10)
            if resp.status_code == 200:
                data = resp.json()
                return data["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.error(f"OpenAI response generation failed: {e}")
        return None

    def _call_groq(self, user_q: str, faq_q: str, faq_a: str, category: str) -> Optional[str]:
        try:
            headers = {
                "Authorization": f"Bearer {settings.GROQ_API_KEY}",
                "Content-Type": "application/json"
            }
            payload = {
                "model": "llama3-8b-8192",
                "messages": [
                    {"role": "system", "content": "You are a grounded FAQ assistant. Answer strictly based on the provided FAQ answer."},
                    {"role": "user", "content": f"FAQ Context: {faq_a}\n\nQuestion: {user_q}"}
                ],
                "temperature": 0.2,
                "max_tokens": 250
            }
            resp = requests.post("https://api.groq.com/openai/v1/chat/completions", json=payload, headers=headers, timeout=10)
            if resp.status_code == 200:
                return resp.json()["choices"][0]["message"]["content"].strip()
        except Exception as e:
            logger.error(f"Groq generation failed: {e}")
        return None

response_writer = ResponseWriter()
