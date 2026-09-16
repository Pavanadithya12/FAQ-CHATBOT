import os
import json
import logging
from typing import Optional, List, Dict, Any
from fastapi import FastAPI, HTTPException, Header, Depends
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
from services.auth_service import auth_service
from services.embeddings import embedding_service
import ingest

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
logger = logging.getLogger("faq-chatbot")

app = FastAPI(
    title="FAQ Chatbot Enterprise API",
    description="Enterprise FAQ Chatbot API with Pinecone 1500-dim Search, JWT Auth, and User FAQ Management",
    version="2.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def get_current_user(authorization: Optional[str] = Header(None)) -> Optional[Dict[str, Any]]:
    if not authorization:
        return None
    try:
        parts = authorization.split()
        if len(parts) == 2 and parts[0].lower() == "bearer":
            token = parts[1]
            payload = auth_service.verify_token(token)
            if payload and "sub" in payload:
                user = db_service.get_user_by_id(int(payload["sub"]))
                return user
    except Exception as e:
        logger.warning(f"Failed to authenticate token: {e}")
    return None

def require_current_user(authorization: Optional[str] = Header(None)) -> Dict[str, Any]:
    user = get_current_user(authorization)
    if not user:
        raise HTTPException(status_code=401, detail="Authentication required. Please log in.")
    return user

class SignupRequest(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: str = Field(...)
    password: str = Field(..., min_length=4)
    full_name: Optional[str] = ""

class LoginRequest(BaseModel):
    username: str = Field(...)
    password: str = Field(...)

class AuthResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: Dict[str, Any]

class ChatRequest(BaseModel):
    question: str = Field(..., min_length=1)
    threshold: Optional[float] = None

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

class CustomFAQRequest(BaseModel):
    category: str = Field("General", min_length=2)
    question: str = Field(..., min_length=5)
    answer: str = Field(..., min_length=5)
    keywords: Optional[List[str]] = []

@app.on_event("startup")
async def startup_event():
    logger.info("Initializing FAQ Vector Knowledge Base (1500 dimensions)...")
    ingest.run_ingestion()

@app.get("/api/health")
def health_check():
    return {
        "status": "online",
        "service": "FAQ Chatbot Backend",
        "pinecone_connected": pinecone_service.is_connected,
        "embedding_dimension": settings.EMBEDDING_DIMENSION,
        "embedding_model": settings.EMBEDDING_MODEL,
        "default_threshold": settings.SIMILARITY_THRESHOLD,
        "auth_enabled": True
    }

@app.post("/api/auth/signup", response_model=AuthResponse)
def signup(req: SignupRequest):
    existing = db_service.get_user_by_username(req.username)
    if existing:
        raise HTTPException(status_code=400, detail="Username or email is already registered.")
    
    hashed = auth_service.hash_password(req.password)
    user = db_service.create_user(req.username, req.email, hashed, req.full_name or "")
    if not user:
        raise HTTPException(status_code=400, detail="Could not create user account.")

    token = auth_service.create_access_token({"sub": str(user["id"]), "username": user["username"]})
    return AuthResponse(access_token=token, user=user)

@app.post("/api/auth/login", response_model=AuthResponse)
def login(req: LoginRequest):
    user = db_service.get_user_by_username(req.username)
    if not user or not auth_service.verify_password(req.password, user["hashed_password"]):
        db_service.record_login(username=req.username, status="FAILED")
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    safe_user = {k: v for k, v in user.items() if k != "hashed_password"}
    token = auth_service.create_access_token({"sub": str(user["id"]), "username": user["username"]})
    db_service.record_login(username=user["username"], user_id=user["id"], status="SUCCESS")
    return AuthResponse(access_token=token, user=safe_user)

@app.get("/api/auth/me")
def get_profile(user: Dict[str, Any] = Depends(require_current_user)):
    return user

@app.get("/api/auth/login-history")
def get_user_login_history(user: Dict[str, Any] = Depends(require_current_user)):
    return db_service.get_login_history(user_id=user["id"], limit=15)


@app.get("/api/user/faqs")
def get_user_faqs(user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    user_id = user["id"] if (user and isinstance(user, dict) and "id" in user) else None
    return db_service.get_user_faqs(user_id)

@app.post("/api/user/faqs")
def add_user_faq(req: CustomFAQRequest, user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    user_id = user["id"] if (user and isinstance(user, dict) and "id" in user) else None
    import uuid
    faq_id = f"custom-{uuid.uuid4().hex[:8]}"

    success = db_service.add_user_faq(
        faq_id=faq_id,
        user_id=user_id,
        category=req.category,
        question=req.question,
        answer=req.answer,
        keywords=req.keywords or []
    )

    if not success:
        raise HTTPException(status_code=500, detail="Failed to save custom question.")

    # Refresh active vector index with both base and all user FAQs
    ingest.run_ingestion()

    return {"status": "success", "faq_id": faq_id, "message": "Custom question added and indexed into vector database."}


@app.delete("/api/user/faqs/{faq_id}")
def delete_user_faq(faq_id: str, user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    user_id = user["id"] if (user and isinstance(user, dict) and "id" in user) else None
    deleted = db_service.delete_user_faq(faq_id, user_id)
    if not deleted:
        raise HTTPException(status_code=404, detail="Question not found or you do not have permission to delete it.")

    ingest.run_ingestion()
    return {"status": "success", "message": f"FAQ {faq_id} successfully deleted."}

@app.get("/api/history")
def get_chat_history(limit: int = 50, user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    user_id = user["id"] if (user and isinstance(user, dict) and "id" in user) else None
    return db_service.get_recent_logs(user_id=user_id, limit=limit)

@app.delete("/api/history")
def clear_history(user: Dict[str, Any] = Depends(require_current_user)):
    db_service.clear_user_history(user["id"])
    return {"status": "success", "message": "Chat history cleared."}

@app.get("/api/analytics")
def get_analytics(user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    user_id = user["id"] if (user and isinstance(user, dict) and "id" in user) else None
    return db_service.get_user_analytics(user_id)


@app.get("/api/faqs")
def get_all_faqs():
    faq_file = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data", "faq_data.json")
    all_faqs = []
    if os.path.exists(faq_file):
        with open(faq_file, "r", encoding="utf-8") as f:
            all_faqs = json.load(f)
    
    user_faqs = db_service.get_user_faqs()
    for uf in user_faqs:
        all_faqs.append({
            "id": uf["id"],
            "category": uf["category"],
            "question": uf["question"],
            "answer": uf["answer"],
            "keywords": uf.get("keywords", [])
        })
    return all_faqs

@app.post("/api/ingest")
def trigger_ingest():
    success = ingest.run_ingestion()
    if success:
        return {"status": "success", "message": "All base and user FAQs re-indexed into 1500-dim vector store."}
    raise HTTPException(status_code=500, detail="Ingestion failed.")

@app.post("/api/chat", response_model=ChatResponse)
def chat_endpoint(request: ChatRequest, user: Optional[Dict[str, Any]] = Depends(get_current_user)):
    user_query = request.question.strip()
    user_id = user["id"] if (user and isinstance(user, dict) and "id" in user) else None

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

    rewritten_query = query_rewriter.rewrite(user_query)
    matches = semantic_search.search(rewritten_query, top_k=3)
    selection = answer_selector.select(matches, custom_threshold=request.threshold)

    if not selection["is_confident"] or selection["selected_faq"] is None:
        fb = fallback_handler.get_fallback_response(reason="LOW_CONFIDENCE", top_candidates=matches)
        db_service.log_interaction(
            user_query=user_query,
            rewritten_query=rewritten_query if rewritten_query != user_query else None,
            route=route,
            bot_response=fb["answer"],
            confidence_score=selection["confidence_score"],
            threshold=selection["threshold"],
            is_fallback=True,
            user_id=user_id
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
        matched_faq_id=faq_id,
        user_id=user_id
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
