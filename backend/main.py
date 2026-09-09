import os
import json
import logging
from typing import Optional, List
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from config import settings
from services.query_router import query_router
from services.query_rewriter import query_rewriter
from services.semantic_search import semantic_search
from services.answer_selector import answer_selector
from services.response_writer import response_writer
from services.fallback import fallback_handler
from services.pinecone_service import pinecone_service
from services.db_service import db_service
import ingest

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("faq-chatbot")

app = FastAPI(
    title="FAQ Chatbot API",
    description="Enterprise FAQ Chatbot API with Pinecone Semantic Search and Grounded LLM Response Writer",
    version="1.0.0"
)

# Enable CORS for Next.js frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Request & Response Models
class ChatRequest(BaseModel):
    question: str = Field(..., description="The user question to be answered by the FAQ chatbot", min_length=1)
    threshold: Optional[float] = Field(None, description="Optional custom similarity threshold override (0.0 to 1.0)")

class MatchedFAQ(BaseModel):
    id: str
    question: str
    category: str
    answer: str

class ChatResponse(BaseModel):
    answer: str
    confidence_score: float
    threshold: float
    is_fallback: bool
    route: str
    rewritten_query: Optional[str] = None
    matched_faq: Optional[MatchedFAQ] = None
    suggested_questions: List[str] = []

# Startup Event: Automatically ingest FAQs into Pinecone/Vector store
@app.on_event("startup")
async def startup_event():
    logger.info("Initializing FAQ Vector Knowledge Base on server startup...")
    ingest.run_ingestion()

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "FAQ Chatbot Backend",
        "pinecone_connected": pinecone_service.is_connected,
        "default_threshold": settings.SIMILARITY_THRESHOLD,
        "embedding_model": settings.EMBEDDING_MODEL
    }

@app.get("/api/faqs")
def get_all_faqs():
    faq_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "faq_data.json")
    if os.path.exists(faq_file):
        with open(faq_file, "r", encoding="utf-8") as f:
            return json.load(f)
    return []

@app.post("/api/ingest")
def trigger_ingest():
    success = ingest.run_ingestion()
    if success:
        return {"status": "success", "message": "All FAQs successfully re-indexed into vector database."}
    raise HTTPException(status_code=500, detail="Ingestion failed.")

@app.get("/api/history")
def get_chat_history(limit: int = 50):
    return db_service.get_recent_logs(limit=limit)

@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest):
    """
    Executes the complete 9-step request flow:
    1. FAQ Collection & Ingestion (pre-indexed)
    2. Embedding Generation
    3. User Question Validation
    4. Query Router (Answerable vs Greeting vs Out of Scope)
    5. Semantic Search (Pinecone Vector DB)
    6. Answer Selection (Similarity Threshold Filter)
    7. Query Rewriter (Resolves vague phrasing)
    8. Response Writer (Grounded natural response)
    9. Fallback Handler (Polite apology with suggested FAQs)
    """
    user_query = request.question.strip()

    # Step 3 & 4: Validation & Query Router
    route_result = query_router.route(user_query)
    route = route_result["route"]

    if route == "EMPTY":
        fb = fallback_handler.get_fallback_response(reason="EMPTY")
        return ChatResponse(
            answer=fb["answer"],
            confidence_score=0.0,
            threshold=settings.SIMILARITY_THRESHOLD,
            is_fallback=True,
            route=route,
            suggested_questions=fb["suggested_questions"]
        )

    if route == "GREETING":
        fb = fallback_handler.get_fallback_response(reason="GREETING")
        return ChatResponse(
            answer=fb["answer"],
            confidence_score=1.0,
            threshold=settings.SIMILARITY_THRESHOLD,
            is_fallback=False,
            route=route,
            suggested_questions=fb["suggested_questions"]
        )

    if route == "OUT_OF_SCOPE":
        fb = fallback_handler.get_fallback_response(reason="OUT_OF_SCOPE")
        return ChatResponse(
            answer=fb["answer"],
            confidence_score=0.0,
            threshold=settings.SIMILARITY_THRESHOLD,
            is_fallback=True,
            route=route,
            suggested_questions=fb["suggested_questions"]
        )

    # Step 7: Query Rewriter
    rewritten_query = query_rewriter.rewrite(user_query)

    # Step 5: Semantic Search (Retrieve top 3 from Pinecone)
    matches = semantic_search.search(rewritten_query, top_k=3)

    # Step 6: Answer Selection (Similarity threshold check)
    selection = answer_selector.select(matches, custom_threshold=request.threshold)

    if not selection["is_confident"] or selection["selected_faq"] is None:
        # Step 9: Fallback Handler
        fb = fallback_handler.get_fallback_response(reason="LOW_CONFIDENCE", top_candidates=matches)
        db_service.log_interaction(
            user_query=user_query,
            rewritten_query=rewritten_query if rewritten_query != user_query else None,
            route=route,
            bot_response=fb["answer"],
            confidence_score=selection["confidence_score"],
            threshold=selection["threshold"],
            is_fallback=True
        )
        return ChatResponse(
            answer=fb["answer"],
            confidence_score=selection["confidence_score"],
            threshold=selection["threshold"],
            is_fallback=True,
            route=route,
            rewritten_query=rewritten_query if rewritten_query != user_query else None,
            suggested_questions=fb["suggested_questions"]
        )

    # Step 8: Response Writer (Grounded synthesis)
    selected_faq = selection["selected_faq"]
    metadata = selected_faq["metadata"]
    final_answer = response_writer.write_response(user_query, selected_faq)

    faq_id = metadata.get("id", selected_faq.get("id", ""))
    db_service.log_interaction(
        user_query=user_query,
        rewritten_query=rewritten_query if rewritten_query != user_query else None,
        route=route,
        bot_response=final_answer,
        confidence_score=selection["confidence_score"],
        threshold=selection["threshold"],
        is_fallback=False,
        matched_faq_id=faq_id
    )

    return ChatResponse(
        answer=final_answer,
        confidence_score=selection["confidence_score"],
        threshold=selection["threshold"],
        is_fallback=False,
        route=route,
        rewritten_query=rewritten_query if rewritten_query != user_query else None,
        matched_faq=MatchedFAQ(
            id=faq_id,
            question=metadata.get("question", ""),
            category=metadata.get("category", "General"),
            answer=metadata.get("answer", "")
        ),
        suggested_questions=[m.get("metadata", {}).get("question") for m in matches[1:] if m.get("metadata", {}).get("question")]
    )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host=settings.HOST, port=settings.PORT, reload=True)
