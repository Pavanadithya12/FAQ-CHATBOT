import logging
import numpy as np
from typing import List, Dict, Any, Optional
from config import settings

logger = logging.getLogger(__name__)

class PineconeService:
    def __init__(self):
        self.api_key = settings.PINECONE_API_KEY
        self.index_name = settings.PINECONE_INDEX_NAME
        self.dimension = settings.EMBEDDING_DIMENSION
        self.pc = None
        self.index = None
        self.is_connected = False
        
        # In-memory vector store fallback for local testing without active Pinecone credentials
        self._local_vectors: List[Dict[str, Any]] = []

        self._init_pinecone()

    def _init_pinecone(self):
        """Initializes Pinecone client and connects to the index."""
        if not self.api_key or self.api_key == "your-pinecone-api-key-here":
            logger.warning("Pinecone API Key is not set. Operating in local in-memory vector store mode.")
            return

        try:
            from pinecone import Pinecone, ServerlessSpec
            self.pc = Pinecone(api_key=self.api_key)
            
            # Check existing indexes
            existing_indexes = [idx["name"] for idx in self.pc.list_indexes()]
            
            if self.index_name not in existing_indexes:
                logger.info(f"Creating Pinecone index '{self.index_name}'...")
                self.pc.create_index(
                    name=self.index_name,
                    dimension=self.dimension,
                    metric="cosine",
                    spec=ServerlessSpec(cloud="aws", region="us-east-1")
                )
                logger.info(f"Pinecone index '{self.index_name}' created successfully.")

            self.index = self.pc.Index(self.index_name)
            self.is_connected = True
            logger.info(f"Connected to Pinecone index '{self.index_name}'.")
        except Exception as e:
            logger.warning(f"Unable to connect to Pinecone ({e}). Falling back to local in-memory vector store.")
            self.is_connected = False

    def upsert_vectors(self, vectors: List[Dict[str, Any]]) -> bool:
        """
        Upserts vectors into Pinecone or local fallback store.
        Each vector item is expected to have:
        {'id': str, 'values': List[float], 'metadata': dict}
        """
        if self.is_connected and self.index is not None:
            try:
                # Upsert in batches of 100
                batch_size = 100
                for i in range(0, len(vectors), batch_size):
                    batch = vectors[i:i + batch_size]
                    self.index.upsert(vectors=batch)
                logger.info(f"Successfully upserted {len(vectors)} vectors to Pinecone.")
                return True
            except Exception as e:
                logger.error(f"Failed to upsert to Pinecone: {e}. Storing locally.")

        # Local fallback store
        self._local_vectors = [v for v in vectors]
        logger.info(f"Stored {len(vectors)} vectors in local memory store.")
        return True

    def query(self, query_vector: List[float], top_k: int = 3) -> List[Dict[str, Any]]:
        """Queries Pinecone or local store for top_k nearest matches."""
        if self.is_connected and self.index is not None:
            try:
                results = self.index.query(
                    vector=query_vector,
                    top_k=top_k,
                    include_metadata=True
                )
                formatted = []
                for match in results.get("matches", []):
                    formatted.append({
                        "id": match.get("id"),
                        "score": float(match.get("score", 0.0)),
                        "metadata": match.get("metadata", {})
                    })
                return formatted
            except Exception as e:
                logger.error(f"Pinecone query error: {e}. Querying local store.")

        # Local cosine similarity fallback
        return self._local_query(query_vector, top_k)

    def _local_query(self, query_vector: List[float], top_k: int) -> List[Dict[str, Any]]:
        if not self._local_vectors:
            return []

        q_vec = np.array(query_vector, dtype=np.float32)
        q_norm = np.linalg.norm(q_vec)
        if q_norm == 0:
            return []

        scored = []
        for item in self._local_vectors:
            doc_vec = np.array(item["values"], dtype=np.float32)
            doc_norm = np.linalg.norm(doc_vec)
            if doc_norm > 0:
                sim = float(np.dot(q_vec, doc_vec) / (q_norm * doc_norm))
            else:
                sim = 0.0
            scored.append({
                "id": item["id"],
                "score": sim,
                "metadata": item["metadata"]
            })

        scored.sort(key=lambda x: x["score"], reverse=True)
        return scored[:top_k]

pinecone_service = PineconeService()
