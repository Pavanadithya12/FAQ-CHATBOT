import logging
from typing import List, Dict, Any
from services.embeddings import embedding_service
from services.pinecone_service import pinecone_service

logger = logging.getLogger(__name__)

class SemanticSearch:
    def search(self, query: str, top_k: int = 3) -> List[Dict[str, Any]]:
        """
        Generates vector embedding for the query and retrieves top_k
        closest FAQ items with similarity scores.
        """
        query_vector = embedding_service.get_embedding(query)
        matches = pinecone_service.query(query_vector=query_vector, top_k=top_k)
        
        logger.info(f"Semantic search for '{query}' returned {len(matches)} matches.")
        return matches

semantic_search = SemanticSearch()
