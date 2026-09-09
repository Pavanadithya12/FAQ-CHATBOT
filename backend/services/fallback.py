from typing import List, Dict, Any

class FallbackHandler:
    DEFAULT_SUGGESTIONS = [
        "How do I reset my account password?",
        "What is your refund policy?",
        "What payment methods do you accept?",
        "How can I track my shipment or order status?",
        "How do I contact customer support?"
    ]

    def get_fallback_response(self, reason: str = "NO_MATCH", top_candidates: List[Dict[str, Any]] = None) -> Dict[str, Any]:
        """
        Generates a structured fallback response with actionable suggestions.
        """
        if reason == "GREETING":
            message = (
                "Hello! 👋 I am your automated Customer Support FAQ Assistant. "
                "How can I help you today? Feel free to ask about passwords, billing, orders, or refunds!"
            )
        elif reason == "OUT_OF_SCOPE":
            message = (
                "I apologize, but that topic is outside our FAQ knowledge base. "
                "I can assist with account security, billing, orders, shipping, refunds, and technical API support."
            )
        elif reason == "EMPTY":
            message = "Please enter a valid question so I can assist you."
        else:
            # Low similarity / no match
            message = (
                "I'm sorry, I couldn't find a direct answer to your question in our FAQ database. "
                "You can rephrase your question or explore one of the common topics below, or reach out to support@example.com."
            )

        # Build suggestions from candidates if available, otherwise default
        suggestions = []
        if top_candidates:
            for item in top_candidates:
                q = item.get("metadata", {}).get("question")
                if q and q not in suggestions:
                    suggestions.append(q)

        if not suggestions:
            suggestions = self.DEFAULT_SUGGESTIONS[:3]
        else:
            suggestions = suggestions[:3]

        return {
            "answer": message,
            "is_fallback": True,
            "fallback_reason": reason,
            "suggested_questions": suggestions
        }

fallback_handler = FallbackHandler()
