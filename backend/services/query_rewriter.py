import re
import logging
from config import settings

logger = logging.getLogger(__name__)

class QueryRewriter:
    VAGUE_MAPPINGS = {
        r"\b(money back|cash back|want my money|give refund)\b": "how to request a refund and refund policy",
        r"\b(forgot pass|lost password|cant login|change pass|forgot.*credentials|lost.*credentials|login credentials)\b": "how do I reset my account password",
        r"\b(where is my stuff|package status|track parcel|delivery status)\b": "how to track my shipment or order status",
        r"\b(pay methods|how to pay|cards accepted)\b": "what payment methods do you accept",
        r"\b(stop plan|stop subscription|cancel membership)\b": "how to cancel my subscription",
        r"\b(broken item|damaged package|broken goods)\b": "what should I do if I received damaged items",
        r"\b(dark mode|night theme|black background)\b": "is dark mode available in the application",
        r"\b(talk to person|human support|reach agent|customer care)\b": "how do I contact customer support"
    }

    CONVERSATIONAL_PREFIXES = [
        r"^(can you please tell me|please tell me|could you tell me|can you explain)\s+",
        r"^(i want to know|i would like to know|i need to know)\s+",
        r"^(tell me about|how do i go about|do you know)\s+",
        r"^(hey bot|hello chatbot|hi there|assist me with)\s+"
    ]

    def rewrite(self, query: str) -> str:
        """
        Rewrites conversational, vague, or incomplete queries into clean,
        keyword-rich semantic search targets.
        """
        original = query.strip()
        cleaned = original.lower()

        # Step 1: Strip conversational leading boilerplate
        for pattern in self.CONVERSATIONAL_PREFIXES:
            cleaned = re.sub(pattern, "", cleaned).strip()

        # Step 2: Check vague domain idioms and expand them
        for pattern, replacement in self.VAGUE_MAPPINGS.items():
            if re.search(pattern, cleaned):
                logger.info(f"QueryRewriter expanded '{original}' -> '{replacement}'")
                return replacement

        # If substantial cleaning occurred, return cleaned version
        if len(cleaned) > 3 and cleaned != original.lower():
            logger.info(f"QueryRewriter cleaned '{original}' -> '{cleaned}'")
            return cleaned

        return original

query_rewriter = QueryRewriter()
