# 🚀 Enterprise FAQ Chatbot with Pinecone DB & Next.js

**Author:** Pavan Adithya Kalwa Sanjay  
**Role:** AI/ML Engineer Intern  
**Tech Stack:** Next.js (Frontend), Python FastAPI (Backend), Pinecone (Vector Database), LLM Grounded Generation  

---

## 🏛️ System Architecture

This project implements an enterprise-grade, retrieval-augmented FAQ chatbot based on the **7-Day Architecture & Timeline**:

```
                              [ User Query ]
                                    │
                         ┌──────────▼──────────┐
                         │   Next.js Chat UI   │
                         └──────────┬──────────┘
                                    │ HTTP POST /api/chat
                         ┌──────────▼──────────┐
                         │   FastAPI Backend   │
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │ 4. Query Router     │──[ Off-Topic / Greeting ]──> [ 9. Fallback Handler ]
                         └──────────┬──────────┘
                                    │ Valid Question
                         ┌──────────▼──────────┐
                         │ 7. Query Rewriter   │ (Vague/conversational expansion)
                         └──────────┬──────────┘
                                    │
                         ┌──────────▼──────────┐
                         │ 5. Semantic Search  │<──> [ Pinecone Vector DB ]
                         └──────────┬──────────┘     (52 Indexed FAQs)
                                    │ Top-K Matches
                         ┌──────────▼──────────┐
                         │ 6. Answer Selection │──[ Below Threshold < 0.65 ]──> [ 9. Fallback Handler ]
                         └──────────┬──────────┘
                                    │ Score >= Threshold
                         ┌──────────▼──────────┐
                         │ 8. Response Writer  │ (Grounded strictly on FAQ context)
                         └──────────┬──────────┘
                                    │
                         [ Final Verified Answer ]
```

---

## 📁 Project Structure

```
FAQCHATBOT/
├── README.md                            # 📖 Project documentation & running guide
├── start_all.bat                        # ⚡ One-click Windows runner
├── backend/
│   ├── data/
│   │   └── faq_data.json                # 50 Curated FAQs across business categories
│   ├── services/
│   │   ├── embeddings.py                # Vector embedding generator (SentenceTransformers / Local / OpenAI)
│   │   ├── pinecone_service.py          # Pinecone cloud vector DB client with local memory fallback
│   │   ├── query_router.py              # Step 4: Intent classification & routing
│   │   ├── query_rewriter.py            # Step 7: Vague query resolution
│   │   ├── semantic_search.py           # Step 5: Pinecone vector search
│   │   ├── answer_selector.py           # Step 6: Similarity score threshold check (0.65 cutoff)
│   │   ├── response_writer.py           # Step 8: Grounded natural language responder
│   │   └── fallback.py                  # Step 9: Polite fallback with suggested follow-up questions
│   ├── config.py                        # App configuration & environment settings
│   ├── ingest.py                        # Batch ingestion script to index FAQs into Pinecone
│   ├── main.py                          # FastAPI application & API endpoints
│   ├── requirements.txt                 # Backend Python dependencies
│   └── .env.example                     # Environment template
└── frontend/                            # Next.js 14 Responsive Chatbot Web Application
    ├── src/
    │   └── app/
    │       ├── globals.css              # Tailwind styling
    │       ├── layout.tsx               # Root layout
    │       └── page.tsx                 # Interactive chat interface
    ├── package.json
    ├── tailwind.config.js
    └── tsconfig.json
```

---

## ⚡ Quick Start Instructions

### 1. Backend Setup (FastAPI + Pinecone)

Open a terminal in the project directory:
```powershell
cd backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
```

*(Optional)* Configure Pinecone in `backend/.env`:
```env
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_INDEX_NAME=faq-chatbot
SIMILARITY_THRESHOLD=0.65
```
> **Note:** If `PINECONE_API_KEY` is omitted, the backend automatically runs in a local in-memory cosine vector store mode so you can demo and test immediately without any downtime!

Ingest the 52 FAQs into the vector database:
```powershell
python ingest.py
```

Start the FastAPI server:
```powershell
python main.py
```
Backend API will be running at `http://localhost:8000`.  
Swagger docs available at `http://localhost:8000/docs`.

---

### 2. Frontend Setup (Next.js)

Open a new terminal:
```powershell
cd frontend
npm install
npm run dev
```
Open your browser at `http://localhost:3000`.

---

## 🧪 Demo Test Queries for Your Manager

| Query Type | Input Query | Expected System Action |
| :--- | :--- | :--- |
| **Exact Match** | *"How do I reset my account password?"* | Returns exact verified reset procedure with 90%+ match confidence. |
| **Semantic Paraphrase** | *"I lost my login credentials, what do I do?"* | Semantic search correctly identifies password reset FAQ (ID: `faq-001`). |
| **Vague Query Rewriter** | *"I want my cash back"* | Query Rewriter expands to *"how to request a refund and refund policy"*, matching `faq-029`. |
| **Greeting Check** | *"Hello there!"* | Query Router detects greeting; returns friendly welcome without invoking vector DB. |
| **Out-of-Scope Fallback** | *"What is the recipe for chocolate cake?"* | Query Router routes to Fallback Handler with polite rejection and 3 suggested FAQ topics. |
| **Threshold Slider** | Slide threshold to 0.95 in UI | Demonstrates strict gating where low-confidence queries trigger fallback instead of hallucinating. |


