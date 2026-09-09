import logging
import hashlib
import numpy as np
from typing import List
from config import settings

logger = logging.getLogger(__name__)

class EmbeddingService:
    def __init__(self):
        self.model = None
        self.model_name = settings.EMBEDDING_MODEL
        self.dimension = settings.EMBEDDING_DIMENSION
        self._init_model()

    def _init_model(self):
        """Attempts to load sentence-transformers model; falls back to fast deterministic vectorizer."""
        try:
            from sentence_transformers import SentenceTransformer
            logger.info(f"Loading SentenceTransformer model '{self.model_name}'...")
            self.model = SentenceTransformer(self.model_name)
            logger.info("SentenceTransformer model loaded successfully.")
        except Exception as e:
            logger.warning(
                f"SentenceTransformer not available ({e}). Using built-in deterministic vectorizer fallback."
            )
            self.model = None

    def get_embedding(self, text: str) -> List[float]:
        """Generates a 384-dimensional normalized embedding vector for input text."""
        cleaned = text.strip()
        if not cleaned:
            return [0.0] * self.dimension

        if self.model is not None:
            try:
                emb = self.model.encode(cleaned, convert_to_numpy=True)
                # Normalize vector to unit length
                norm = np.linalg.norm(emb)
                if norm > 0:
                    emb = emb / norm
                return emb.tolist()
            except Exception as e:
                logger.error(f"Error generating embedding with model: {e}")

        # Fallback deterministic normalized vector based on character and word n-grams
        return self._generate_fallback_vector(cleaned)

    def _generate_fallback_vector(self, text: str) -> List[float]:
        """Generates a reproducible 384-dim unit vector for offline/lightweight execution."""
        vec = np.zeros(self.dimension, dtype=np.float32)
        tokens = text.lower().split()
        for token in tokens:
            h = int(hashlib.md5(token.encode('utf-8')).hexdigest(), 16)
            idx = h % self.dimension
            sign = 1.0 if (h // self.dimension) % 2 == 0 else -1.0
            vec[idx] += sign * (1.0 + len(token) * 0.1)

        norm = np.linalg.norm(vec)
        if norm > 0:
            vec = vec / norm
        else:
            vec[0] = 1.0
        return vec.tolist()

embedding_service = EmbeddingService()
