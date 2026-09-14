# 📁 FAQ Chatbot — Complete Code Structure

## 🗂️ Level 1: Root Folder Structure

```
FAQCHATBOT/                         ← Root (project root)
│
├── backend/                        ← Python FastAPI Backend (Level 2)
├── frontend/                       ← Next.js React Frontend (Level 2)
│
├── .gitignore                      ← Files NOT pushed to GitHub
├── README.md                       ← Project documentation
├── CODE_STRUCTURE.md               ← This file — full code structure guide
├── render.yaml                     ← Cloud deployment config (Render.com)
└── start_all.bat                   ← 1-click local runner (starts both servers)
```

---

## 🗂️ Level 2A: Backend Folder Structure

```
backend/
│
├── .env.example                    ← ⭐ ENV TEMPLATE — copy this → rename to .env
├── config.py                       ← ⭐ ALL API KEYS are READ here
├── main.py                         ← ⭐ FastAPI server — all API endpoints
├── ingest.py                       ← Loads FAQ data → converts → stores in Pinecone
├── requirements.txt                ← All Python libraries needed
├── Dockerfile                      ← For Docker/cloud deployment
├── test_pipeline.py                ← Automated tests (9 tests)
│
├── data/
│   └── faq_data.json               ← ⭐ 50 FAQ questions & answers (source of truth)
│
├── services/                       ← ⭐ Core logic (9-step pipeline)
│   ├── __init__.py
│   ├── embeddings.py               ← Step 2: Converts text → 384-dim vector numbers
│   ├── query_router.py             ← Step 4: Decides if FAQ/Greeting/Out-of-scope
│   ├── query_rewriter.py           ← Step 7: Fixes vague words
│   ├── semantic_search.py          ← Step 5: Searches Pinecone vector database
│   ├── answer_selector.py          ← Step 6: Picks best answer above threshold
│   ├── response_writer.py          ← Step 8: Writes natural language response
│   ├── fallback.py                 ← Step 9: Polite fallback + suggestions
│   ├── pinecone_service.py         ← Pinecone DB connection handler
│   └── db_service.py               ← SQLite: saves every chat to local database
│
└── venv/                           ← Python virtual environment (NOT on GitHub)
```

---

## 🗂️ Level 2B: Frontend Folder Structure

```
frontend/
│
├── .env.local                      ← ⭐ Frontend ENV (create this locally)
├── vercel.json                     ← Vercel cloud deployment config
├── next.config.js                  ← Next.js configuration
├── package.json                    ← All Node.js libraries
├── tsconfig.json                   ← TypeScript configuration
├── .eslintrc.json                  ← Code quality rules
│
├── src/
│   ├── app/
│   │   ├── page.tsx                ← ⭐ Main Chat UI (the full chatbot screen)
│   │   ├── layout.tsx              ← HTML wrapper / page layout
│   │   ├── globals.css             ← Global styles
│   │   │
│   │   └── api/                   ← ⭐ Next.js Serverless API Routes
│   │       ├── chat/route.ts       ← POST /api/chat — full 9-step pipeline
│   │       ├── faqs/route.ts       ← GET  /api/faqs — returns all 50 FAQs
│   │       └── health/route.ts     ← GET  /api/health — health check
│   │
│   └── data/
│       └── faq_data.json           ← Copy of 50 FAQs (used by cloud)
│
└── node_modules/                   ← Installed packages (NOT on GitHub)
```

---

## 🔐 ENV Files — Where API Keys Live

### Backend ENV File
File: `backend/.env.example` → rename to `backend/.env`

`env
# ─── PINECONE (Vector Database) ───────────────────────────────
PINECONE_API_KEY=your-pinecone-api-key-here     # Get from: pinecone.io
PINECONE_ENVIRONMENT=us-east-1
PINECONE_INDEX_NAME=faq-chatbot

# ─── LLM / AI API Keys (All Optional) ────────────────────────
OPENAI_API_KEY=                                 # Get from: platform.openai.com
GROQ_API_KEY=                                   # Get from: console.groq.com
GEMINI_API_KEY=                                 # Get from: aistudio.google.com

# ─── App Settings ─────────────────────────────────────────────
SIMILARITY_THRESHOLD=0.50
EMBEDDING_MODEL=all-MiniLM-L6-v2
PORT=8000
HOST=0.0.0.0
`

> ⚠️ .env is in .gitignore — NEVER pushed to GitHub. Keys stay on your PC only.

### Where API Keys are READ in code
File: `backend/config.py`

`python
class Settings(BaseSettings):
    PINECONE_API_KEY: str = os.getenv("PINECONE_API_KEY", "")   # Line 8
    OPENAI_API_KEY:  str = os.getenv("OPENAI_API_KEY",  "")     # Line 12
    GROQ_API_KEY:    str = os.getenv("GROQ_API_KEY",    "")     # Line 13
    GEMINI_API_KEY:  str = os.getenv("GEMINI_API_KEY",  "")     # Line 14
    SIMILARITY_THRESHOLD: float = 0.50                           # Line 16
    EMBEDDING_MODEL: str = "all-MiniLM-L6-v2"                   # Line 18
`

---

## 🌐 APIs Used in This Project

| API | Purpose | Key Location | Required? |
|-----|---------|-------------|-----------|
| Pinecone | Vector database — stores & searches FAQ embeddings | backend/.env → PINECONE_API_KEY | ✅ Yes (free tier) |
| Sentence Transformers all-MiniLM-L6-v2 | Converts text → 384-dim vectors locally | No key — runs on your PC | ✅ Yes (no key needed) |
| OpenAI | Optional LLM for richer answers | backend/.env → OPENAI_API_KEY | ❌ Optional |
| Groq | Optional fast free LLM | backend/.env → GROQ_API_KEY | ❌ Optional |
| Google Gemini | Optional Google AI model | backend/.env → GEMINI_API_KEY | ❌ Optional |

---

## 🔄 The 9-Step Pipeline

`
User types question
        ↓
Step 1  │ FAQ Data loaded into Pinecone at startup      [ingest.py]
Step 2  │ Question → 384-number vector                  [embeddings.py]
Step 3  │ Validate: is question empty?                  [main.py]
Step 4  │ Route: FAQ / Greeting / Out-of-scope          [query_router.py]
Step 5  │ Search Pinecone → top 3 matches               [semantic_search.py]
Step 6  │ Score ≥ 0.50? → pick best answer              [answer_selector.py]
Step 7  │ Rewrite vague words ("my order" → topic)      [query_rewriter.py]
Step 8  │ Write clean natural language answer            [response_writer.py]
Step 9  │ If no match → polite fallback + suggestions   [fallback.py]
        ↓
   Answer shown to user in chat UI
`

---

## 🌍 API Endpoints

| Method | URL | What it does | Code Location |
|--------|-----|--------------|---------------|
| POST | /api/chat | Send question → get answer | backend/main.py line 94 |
| GET | /api/faqs | Get all 50 FAQs | backend/main.py line 75 |
| GET | /api/health | Check if backend is running | backend/main.py line 65 |
| POST | /api/ingest | Re-load FAQs into Pinecone | backend/main.py line 83 |
| GET | /api/history | Get recent chat logs | backend/main.py line 90 |

---

## 🛠️ Technologies & Versions

| Technology | Version | Purpose |
|------------|---------|---------|
| Python | 3.10+ | Backend language |
| FastAPI | ≥ 0.110.0 | REST API framework |
| Uvicorn | ≥ 0.28.0 | Python web server |
| Pydantic | ≥ 2.6.0 | Data validation |
| python-dotenv | ≥ 1.0.1 | Reads .env file |
| Pinecone | ≥ 3.1.0 | Vector database client |
| Sentence-Transformers | ≥ 2.5.1 | Local AI embedding model |
| PyTorch | ≥ 2.0.0 | AI framework (powers embeddings) |
| NumPy | ≥ 1.24.0 | Math/vector operations |
| SQLite | Built-in | Chat history database |
| Node.js | 18+ | Frontend runtime |
| Next.js | 14 | React full-stack framework |
| React | 18 | UI component library |
| TypeScript | 5 | Type-safe JavaScript |
| Tailwind CSS | 3 | Utility-first CSS styling |

---

## 📌 Quick Reference

| Looking for | File |
|-------------|------|
| All API keys (template) | backend/.env.example |
| Where keys are loaded in code | backend/config.py |
| Pinecone DB connection | backend/services/pinecone_service.py |
| OpenAI / Groq / Gemini usage | backend/services/response_writer.py |
| Embedding model (all-MiniLM-L6-v2) | backend/services/embeddings.py |
| 50 FAQ data | backend/data/faq_data.json |
| All API endpoints | backend/main.py |
| Chat UI | frontend/src/app/page.tsx |
| Serverless API (cloud) | frontend/src/app/api/chat/route.ts |
| Python dependencies | backend/requirements.txt |
| Node.js dependencies | frontend/package.json |
| 1-click local runner | start_all.bat |
| Cloud deployment config | render.yaml + frontend/vercel.json |
