import re
from typing import Dict, Any

class QueryRouter:
    GREETINGS = {
        "hi", "hello", "hey", "good morning", "good afternoon", "good evening", 
        "greetings", "howdy", "what's up", "sup", "hi there", "hello there"
    }

    OUT_OF_SCOPE_KEYWORDS = [
        "recipe", "chocolate cake", "who is the president", "write code for",
        "tell me a joke", "play music", "weather in", "stock price", "sports score",
        "write a poem", "solve math", "translate to french"
    ]

    def route(self, user_question: str) -> Dict[str, Any]:
        """
        Analyzes the user's query and returns a routing decision.
        Returns:
            {
                "route": "GREETING" | "FAQ_SEARCH" | "OUT_OF_SCOPE" | "EMPTY",
                "is_faq_candidate": bool,
                "reason": str
            }
        """
        clean_text = user_question.strip().lower()

        # 1. Validation check
        if not clean_text or len(clean_text) < 2:
            return {
                "route": "EMPTY",
                "is_faq_candidate": False,
                "reason": "Query is empty or too short to process."
            }

        # 2. Greeting check
        # Remove trailing punctuation like ! or .
        normalized_punct = re.sub(r'[^\w\s]', '', clean_text)
        if normalized_punct in self.GREETINGS:
            return {
                "route": "GREETING",
                "is_faq_candidate": False,
                "reason": "User provided a conversational greeting."
            }

        # 3. Out-of-scope check
        for pattern in self.OUT_OF_SCOPE_KEYWORDS:
            if pattern in clean_text:
                return {
                    "route": "OUT_OF_SCOPE",
                    "is_faq_candidate": False,
                    "reason": f"Query flagged as out-of-domain topic: '{pattern}'."
                }

        # 4. Standard FAQ query
        return {
            "route": "FAQ_SEARCH",
            "is_faq_candidate": True,
            "reason": "Query routed to Semantic Search against FAQ Vector Knowledge Base."
        }

query_router = QueryRouter()
