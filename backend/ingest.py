import json
import os
import sys
import logging

# Ensure backend root is in sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.embeddings import embedding_service
from services.pinecone_service import pinecone_service

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)

def run_ingestion():
    faq_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "faq_data.json")
    if not os.path.exists(faq_file):
        logger.error(f"FAQ file not found at {faq_file}")
        return False

    with open(faq_file, "r", encoding="utf-8") as f:
        faqs = json.load(f)

    logger.info(f"Loaded {len(faqs)} FAQ records from {faq_file}.")
    logger.info("Generating embeddings and preparing Pinecone records...")

    vectors = []
    for faq in faqs:
        # Combine question with keywords for stronger semantic density
        text_to_embed = faq["question"]
        if faq.get("keywords"):
            text_to_embed += " " + " ".join(faq["keywords"])

        emb = embedding_service.get_embedding(text_to_embed)
        vectors.append({
            "id": faq["id"],
            "values": emb,
            "metadata": {
                "id": faq["id"],
                "category": faq["category"],
                "question": faq["question"],
                "answer": faq["answer"],
                "keywords": faq.get("keywords", [])
            }
        })

    logger.info(f"Generated embeddings for {len(vectors)} FAQs.")
    logger.info("Upserting vectors to Pinecone / Vector Store...")
    success = pinecone_service.upsert_vectors(vectors)

    if success:
        logger.info("✅ Ingestion successfully completed! All 50+ FAQs are indexed and ready for search.")
    else:
        logger.error("❌ Ingestion encountered an error.")

    return success

if __name__ == "__main__":
    run_ingestion()
