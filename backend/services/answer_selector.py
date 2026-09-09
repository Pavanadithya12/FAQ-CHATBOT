import logging
from typing import List, Dict, Any, Optional
from config import settings

logger = logging.getLogger(__name__)

class AnswerSelector:
    def __init__(self):
        self.threshold = settings.SIMILARITY_THRESHOLD

    def select(self, search_results: List[Dict[str, Any]], custom_threshold: Optional[float] = None) -> Dict[str, Any]:
        """
        Evaluates top match against the confidence threshold.
        Returns:
            {
                "is_confident": bool,
                "selected_faq": Optional[Dict[str, Any]],
                "confidence_score": float,
                "threshold": float,
                "top_candidates": List[Dict[str, Any]]
            }
        """
        threshold = custom_threshold if custom_threshold is not None else self.threshold

        if not search_results:
            return {
                "is_confident": False,
                "selected_faq": None,
                "confidence_score": 0.0,
                "threshold": threshold,
                "top_candidates": []
            }

        top_match = search_results[0]
        score = float(top_match.get("score", 0.0))

        if score >= threshold:
            logger.info(f"Answer selected: ID={top_match['id']} (Score: {score:.3f} >= Threshold: {threshold})")
            return {
                "is_confident": True,
                "selected_faq": top_match,
                "confidence_score": score,
                "threshold": threshold,
                "top_candidates": search_results
            }
        else:
            logger.warning(
                f"Answer rejected: ID={top_match['id']} (Score: {score:.3f} < Threshold: {threshold})"
            )
            return {
                "is_confident": False,
                "selected_faq": None,
                "confidence_score": score,
                "threshold": threshold,
                "top_candidates": search_results
            }

answer_selector = AnswerSelector()
