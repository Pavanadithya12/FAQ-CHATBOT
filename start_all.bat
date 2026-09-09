@echo off
echo =======================================================
echo   Starting Enterprise FAQ Chatbot (Backend + Frontend)
echo =======================================================
echo.

echo [1/2] Starting Python FastAPI Backend on http://localhost:8000 ...
start "FAQ Chatbot Backend (FastAPI)" cmd /k "cd backend && python main.py"

timeout /t 3 /nobreak >nul

echo [2/2] Starting Next.js Chat Frontend on http://localhost:3000 ...
start "FAQ Chatbot Frontend (Next.js)" cmd /k "cd frontend && npm run dev"

echo.
echo =======================================================
echo   Both services are starting!
echo   Frontend: http://localhost:3000
echo   Backend:  http://localhost:8000
echo   Swagger:  http://localhost:8000/docs
echo =======================================================
