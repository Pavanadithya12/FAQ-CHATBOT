# 📁 FAQ Chatbot — Complete Code Structure

## 🗂️ Level 1: Root Folder Structure

`
FAQCHATBOT/                         ← Root (project root)
│
├── backend/                        ← Python FastAPI Backend (Level 2)
├── frontend/                       ← Next.js React Frontend (ChatGPT UI - Level 2)
│
├── .gitignore                      ← Files NOT pushed to GitHub (keeps secrets safe)
├── README.md                       ← Project documentation
├── CODE_STRUCTURE.md               ← Full code architecture & technology guide
├── render.yaml                     ← Cloud native deployment config (Native Python, No Docker)
└── start_all.bat                   ← 1-click local runner (starts both servers)
`

---

## 🗂️ Level 2A: Backend Folder Structure

`
backend/
│
├── .env.example                    ← ⭐ ENV TEMPLATE (All keys & 1500 dims documented)
├── .env                            ← Local secret keys (ignored by git)
├── config.py                       ← ⭐ Central config: reads all API keys & settings
├── main.py                         ← ⭐ FastAPI Server (Auth, Chat, User FAQ endpoints)
├── ingest.py                       ← Loads 50 FAQs + User FAQs into Pinecone (1500 dims)
├── requirements.txt                ← Python packages (fastapi, pinecone, pyjwt, bcrypt)
├── test_pipeline.py                ← 10 Automated unit tests (Pipeline + Auth)
│
├── data/
│   ├── faq_data.json               ← 50 verified enterprise FAQs (source of truth)
│   └── chat_history.db             ← SQLite DB (Users, User FAQs, Chat history)
│
└── services/                       ← ⭐ 9-step pipeline & core logic
    ├── auth_service.py             ← JWT authentication & password hashing
    ├── db_service.py               ← Multi-user SQLite CRUD (users, faqs, logs)
    ├── embeddings.py               ← Step 2: Converts text → 1500-dim normalized vectors
    ├── query_router.py             ← Step 4: Routes FAQ vs Greeting vs Out-of-scope
    ├── query_rewriter.py           ← Step 7: Clarifies vague phrases
    ├── semantic_search.py          ← Step 5: Searches Pinecone 1500-dim vector store
    ├── answer_selector.py          ← Step 6: 0.50 threshold confidence validation
    ├── response_writer.py          ← Step 8: Natural language grounded answer
    ├── fallback.py                 ← Step 9: Polite fallback with suggested FAQs
    └── pinecone_service.py         ← Pinecone connection & local memory fallback
`

---

## 🗂️ Level 2B: Frontend Folder Structure (ChatGPT Interface)

`
frontend/
│
├── .env.example                    ← Frontend env template
├── .env.local                      ← NEXT_PUBLIC_BACKEND_API_URL=http://localhost:8000
├── vercel.json                     ← Vercel deployment configuration
├── next.config.js                  ← Next.js configuration
├── package.json                    ← Node.js dependencies
│
└── src/
    ├── app/
    │   ├── page.tsx                ← ⭐ ChatGPT-Style UI (Sidebar, History, Auth, FAQ Manager)
    │   ├── layout.tsx              ← Root application wrapper
    │   └── globals.css             ← Dark theme & Tailwind styles
    │
    └── data/
        └── faq_data.json           ← Local fallback dataset
`

---

## 🔐 Environment Variables & API Keys (ackend/.env.example)

`env
# ─── PINECONE (Vector Database) ───────────────────────────────────────────────
PINECONE_API_KEY=your-pinecone-api-key-here     # Free from pinecone.io
PINECONE_ENVIRONMENT=us-east-1                  # Pinecone region
PINECONE_INDEX_NAME=faq-chatbot                 # Index name

# ─── VECTOR EMBEDDINGS (Dimension: 1500) ──────────────────────────────────────
# Configured for 1500 dimensions (OpenAI text-embedding-3-small or Pinecone 1500-dim)
EMBEDDING_DIMENSION=1500
EMBEDDING_MODEL=text-embedding-3-small

# ─── JWT AUTHENTICATION (User Login / Signup / Session) ────────────────────────
JWT_SECRET_KEY=enterprise-faq-chatbot-secret-key-change-in-production-2026
JWT_ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=1440

# ─── LLM / AI PROVIDERS (Optional: OpenAI, Groq, Gemini) ─────────────────────
OPENAI_API_KEY=                                 # platform.openai.com
GROQ_API_KEY=                                   # console.groq.com
GEMINI_API_KEY=                                 # aistudio.google.com

# ─── PIPELINE & RUNTIME SETTINGS ──────────────────────────────────────────────
SIMILARITY_THRESHOLD=0.50                       # Minimum confidence score
PORT=8000
HOST=0.0.0.0
`

---

## 🌐 Complete API Endpoint Reference

| Method | Endpoint | Description | Auth Required? |
|---|---|---|---|
| POST | /api/auth/signup | Register new user account | No |
| POST | /api/auth/login | Log in and receive JWT token | No |
| GET | /api/auth/me | Fetch logged-in user profile | **Yes (JWT)** |
| POST | /api/chat | 9-step conversational FAQ pipeline | Optional / User-linked |
| GET | /api/user/faqs | View custom user FAQs | Optional |
| POST | /api/user/faqs | Upload & 1500-dim index new FAQ | Optional / User-linked |
| DELETE | /api/user/faqs/{id} | Delete custom user question | Optional / User-linked |
| GET | /api/history | View user's past chat history | Optional / User-linked |
| DELETE | /api/history | Clear user's chat history | **Yes (JWT)** |
| GET | /api/health | Health & dimension status | No |
