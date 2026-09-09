import unittest
import json
import os
import sys

# Add backend directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import ingest
from main import app, chat_endpoint, ChatRequest, health_check
from services.query_router import query_router
from services.query_rewriter import query_rewriter
from services.answer_selector import answer_selector
from services.fallback import fallback_handler

class TestFAQChatbotPipeline(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        # Run ingestion to index all FAQs
        ingest.run_ingestion()

    def test_01_health_check(self):
        status = health_check()
        self.assertEqual(status["status"], "online")
        self.assertIn("default_threshold", status)

    def test_02_query_router_greeting(self):
        res = query_router.route("Hello there!")
        self.assertEqual(res["route"], "GREETING")
        self.assertFalse(res["is_faq_candidate"])

    def test_03_query_router_out_of_scope(self):
        res = query_router.route("tell me a chocolate cake recipe")
        self.assertEqual(res["route"], "OUT_OF_SCOPE")
        self.assertFalse(res["is_faq_candidate"])

    def test_04_query_router_faq(self):
        res = query_router.route("How do I reset my password?")
        self.assertEqual(res["route"], "FAQ_SEARCH")
        self.assertTrue(res["is_faq_candidate"])

    def test_05_query_rewriter(self):
        rewritten = query_rewriter.rewrite("I want my cash back")
        self.assertIn("refund", rewritten.lower())

    def test_06_exact_faq_match(self):
        req = ChatRequest(question="How can I reset my forgotten password?")
        res = chat_endpoint(req)
        self.assertFalse(res.is_fallback)
        self.assertGreaterEqual(res.confidence_score, 0.50)
        self.assertEqual(res.matched_faq.id, "faq-002")
        self.assertIn("password", res.answer.lower())

    def test_07_paraphrased_faq_match(self):
        req = ChatRequest(question="I forgot my credentials to log in")
        res = chat_endpoint(req)
        self.assertFalse(res.is_fallback)
        self.assertIn("password", res.answer.lower())

    def test_08_out_of_scope_query(self):
        req = ChatRequest(question="Who is the president of France?")
        res = chat_endpoint(req)
        self.assertTrue(res.is_fallback)
        self.assertIn("outside our FAQ", res.answer)
        self.assertGreater(len(res.suggested_questions), 0)

    def test_09_threshold_cutoff(self):
        # With threshold 0.999, standard questions should fail threshold and trigger fallback
        req = ChatRequest(question="How do I reset my password?", threshold=0.999)
        res = chat_endpoint(req)
        self.assertTrue(res.is_fallback)

if __name__ == "__main__":
    unittest.main()
