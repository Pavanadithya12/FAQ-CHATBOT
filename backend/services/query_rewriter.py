import re
import logging
from config import settings

logger = logging.getLogger(__name__)

class QueryRewriter:
    VAGUE_MAPPINGS = {
        # Account Setup & Security
        r"\b(create account|sign up|new registration|how to join|register)\b": "How do I register a new account on the platform?",
        r"\b(forgot pass|lost password|cant login|change pass|forgot.*credentials|lost.*credentials|login credentials|reset.*password)\b": "How can I reset my forgotten password?",
        r"\b(2fa|two factor|two-factor|authenticator|mfa)\b": "How do I configure Two-Factor Authentication (2FA)?",
        r"\b(account locked|unlock account|locked out)\b": "Why is my account locked and how do I unlock it?",
        
        # Billing & Subscriptions
        r"\b(pricing plans|subscription cost|tiers|pricing)\b": "What subscription plans are available?",
        r"\b(upgrade plan|downgrade plan|change plan|switch tier)\b": "How do I upgrade or downgrade my existing plan?",
        r"\b(download invoice|tax invoice|vat receipt|receipts)\b": "Where can I download my monthly tax invoices and receipts?",
        r"\b(stop plan|stop subscription|cancel membership|cancel plan|cancel subscription)\b": "How do I cancel my active subscription?",
        
        # Payment Gateways
        r"\b(pay methods|how to pay|cards accepted|payment options|payment methods|currencies)\b": "What payment methods and currencies do you support?",
        r"\b(update card|change card|expired card|payment method)\b": "How do I update or replace my credit card details?",
        
        # Returns & Refunds
        r"\b(money back|cash back|want my money|give refund|refund policy|refund eligibility)\b": "What is the standard refund policy?",
        r"\b(how long.*refund|refund time|refund processing)\b": "How long does it take for a refund to process?",
        
        # Category 7: Orders, Shipping & Parcel Tracking
        r"\b(track.*shipment|track.*parcel|track.*package|track.*order|where is my stuff|where is my package|package status|delivery status)\b": "How can I track the live delivery status of my physical shipment?",
        r"\b(shipping time|delivery time|delivery estimate|delivery estimates|express delivery|overnight shipping|standard shipping|how long.*shipping|shipping.*take)\b": "What are your standard and expedited shipping delivery estimates?",
        r"\b(change.*address|update.*address|wrong address|edit.*address|modify.*destination|change.*destination)\b": "Can I edit the destination address after placing an order?",
        r"\b(international.*delivery|international.*shipping|deliver.*international|worldwide shipping|ship.*global|deliver.*countries)\b": "Do you deliver internationally to all global countries?",
        r"\b(damaged.*shipment|damaged.*package|broken.*goods|defective.*product|missing.*items|package.*broken|arrived.*damaged|arrived.*broken)\b": "What steps should I take if my shipment arrives damaged or missing items?",
        
        # Collaboration, Support & Features
        r"\b(dark mode|night theme|black background)\b": "How do I enable Dark Mode theme in the web application?",
        r"\b(talk to person|human support|reach agent|customer care|call support|contact support)\b": "How do I contact human customer support?",
        r"\b(shortcuts|keyboard shortcuts|hotkeys|cmd k)\b": "What keyboard shortcuts are available to speed up navigation?"
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

        # Step 2: Check domain idioms and expand them
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
