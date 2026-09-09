"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  HelpCircle, 
  RotateCcw, 
  Sliders, 
  CheckCircle2, 
  AlertCircle,
  Database,
  ExternalLink,
  ChevronDown,
  ChevronUp
} from "lucide-react";

interface MatchedFAQ {
  id: string;
  question: string;
  category: string;
  answer: string;
}

interface Message {
  id: string;
  sender: "user" | "bot";
  text: string;
  confidence_score?: number;
  threshold?: number;
  is_fallback?: boolean;
  route?: string;
  rewritten_query?: string;
  matched_faq?: MatchedFAQ;
  suggested_questions?: string[];
  timestamp: string;
}

export default function FAQChatbot() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "👋 Hello! I am your AI-powered FAQ Assistant. I search through verified documentation using Pinecone vector semantic search to give you accurate, grounded answers.\n\nAsk me anything about account security, billing, shipping, or refunds!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggested_questions: [
        "How do I reset my account password?",
        "What is your refund policy?",
        "What payment methods do you accept?",
        "How can I track my shipment or order status?"
      ]
    }
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [threshold, setThreshold] = useState(0.50);
  const [apiUrl, setApiUrl] = useState("");
  const [showSettings, setShowSettings] = useState(false);
  const [backendStatus, setBackendStatus] = useState<"connected" | "disconnected" | "checking">("checking");
  const [expandedSources, setExpandedSources] = useState<Record<string, boolean>>({});

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Check backend health on mount
  useEffect(() => {
    const checkHealth = async () => {
      try {
        const res = await fetch(`${apiUrl}/api/health`, { method: "GET" });
        if (res.ok) {
          setBackendStatus("connected");
        } else {
          setBackendStatus("disconnected");
        }
      } catch {
        setBackendStatus("disconnected");
      }
    };
    checkHealth();
  }, [apiUrl]);

  const toggleSource = (msgId: string) => {
    setExpandedSources(prev => ({
      ...prev,
      [msgId]: !prev[msgId]
    }));
  };

  const handleSendMessage = async (textToSend?: string) => {
    const query = (textToSend || inputQuery).trim();
    if (!query || loading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      sender: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMessage]);
    setInputQuery("");
    setLoading(true);

    try {
      const response = await fetch(`${apiUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: query,
          threshold: threshold
        })
      });

      if (!response.ok) {
        throw new Error(`Server returned ${response.status}`);
      }

      const data = await response.json();

      const botMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: data.answer,
        confidence_score: data.confidence_score,
        threshold: data.threshold,
        is_fallback: data.is_fallback,
        route: data.route,
        rewritten_query: data.rewritten_query,
        matched_faq: data.matched_faq,
        suggested_questions: data.suggested_questions,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      setMessages(prev => [...prev, botMessage]);
    } catch (err) {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        sender: "bot",
        text: "⚠️ Could not connect to the Backend API server at " + apiUrl + ". Please ensure your FastAPI backend is running via `python main.py` on port 8000.",
        is_fallback: true,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([
      {
        id: "welcome-reset",
        sender: "bot",
        text: "Conversation cleared. How can I help you with our product and services today?",
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggested_questions: [
          "How do I reset my account password?",
          "What is your refund policy?",
          "Can I change my registered email address?",
          "How do I contact customer support?"
        ]
      }
    ]);
  };

  return (
    <div className="flex flex-col h-screen max-w-5xl mx-auto px-4 py-4 sm:py-6">
      {/* Top Navbar */}
      <header className="flex items-center justify-between bg-white border border-slate-200 rounded-2xl px-5 py-3.5 shadow-sm mb-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
            <Bot className="w-5 h-5" />
          </div>
          <div>
            <h1 className="font-semibold text-slate-800 text-base leading-tight">
              Enterprise FAQ Assistant
            </h1>
            <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <Database className="w-3 h-3 text-sky-600" />
                Pinecone DB Semantic Search
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 rounded-full ${backendStatus === 'connected' ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                {backendStatus === 'connected' ? 'FastAPI Online' : 'Backend Offline'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className={`p-2 rounded-lg border transition ${
              showSettings 
                ? 'bg-sky-50 border-sky-300 text-sky-700' 
                : 'border-slate-200 text-slate-600 hover:bg-slate-50'
            }`}
            title="Adjust Threshold & Endpoint"
          >
            <Sliders className="w-4 h-4" />
          </button>
          <button
            onClick={clearChat}
            className="p-2 rounded-lg border border-slate-200 text-slate-600 hover:bg-slate-50 transition"
            title="Reset Chat"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Settings Drawer / Panel */}
      {showSettings && (
        <div className="bg-white border border-sky-100 rounded-2xl p-4 shadow-sm mb-4 transition-all">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex-1">
              <div className="flex justify-between items-center mb-1">
                <label className="text-xs font-semibold text-slate-700">
                  Similarity Confidence Threshold: <span className="text-sky-600 font-bold">{Math.round(threshold * 100)}% ({threshold})</span>
                </label>
                <span className="text-xs text-slate-400">Step 6: Answer Selection Cutoff</span>
              </div>
              <input
                type="range"
                min="0.30"
                max="0.95"
                step="0.05"
                value={threshold}
                onChange={(e) => setThreshold(parseFloat(e.target.value))}
                className="w-full accent-sky-600 cursor-pointer"
              />
              <div className="flex justify-between text-[10px] text-slate-400 mt-1">
                <span>0.30 (Permissive)</span>
                <span>0.65 (Recommended)</span>
                <span>0.95 (Strict)</span>
              </div>
            </div>

            <div className="sm:w-72">
              <label className="text-xs font-semibold text-slate-700 block mb-1">
                Backend API Endpoint
              </label>
              <input
                type="text"
                value={apiUrl}
                onChange={(e) => setApiUrl(e.target.value)}
                className="w-full text-xs px-3 py-1.5 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-sky-500"
                placeholder="http://localhost:8000"
              />
            </div>
          </div>
        </div>
      )}

      {/* Chat Messages Container */}
      <div className="flex-1 overflow-y-auto space-y-4 px-2 py-2 pr-3 scrollbar-thin">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex gap-3 ${msg.sender === "user" ? "justify-end" : "justify-start"}`}
          >
            {msg.sender === "bot" && (
              <div className="w-8 h-8 rounded-lg bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0 mt-0.5">
                <Bot className="w-4 h-4" />
              </div>
            )}

            <div className={`flex flex-col max-w-[85%] sm:max-w-[75%] ${msg.sender === "user" ? "items-end" : "items-start"}`}>
              {/* Message Bubble */}
              <div
                className={`rounded-2xl px-4 py-3 text-sm leading-relaxed whitespace-pre-line shadow-sm ${
                  msg.sender === "user"
                    ? "bg-sky-600 text-white rounded-tr-none"
                    : "bg-white border border-slate-200 text-slate-800 rounded-tl-none"
                }`}
              >
                {msg.text}

                {/* Rewritten Query Notice */}
                {msg.rewritten_query && (
                  <div className="mt-2.5 pt-2 border-t border-slate-100 text-xs text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                    <span>Query Rewritten (Step 7): <strong className="text-slate-700">{msg.rewritten_query}</strong></span>
                  </div>
                )}
              </div>

              {/* Badges & Source Accordion for Bot Replies */}
              {msg.sender === "bot" && msg.id !== "welcome" && msg.id !== "welcome-reset" && (
                <div className="mt-1.5 flex flex-wrap items-center gap-2">
                  {/* Confidence Score Pill */}
                  {msg.confidence_score !== undefined && (
                    <span
                      className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border ${
                        msg.confidence_score >= (msg.threshold || 0.65)
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-amber-50 text-amber-700 border-amber-200"
                      }`}
                    >
                      {msg.confidence_score >= (msg.threshold || 0.65) ? (
                        <CheckCircle2 className="w-3 h-3" />
                      ) : (
                        <AlertCircle className="w-3 h-3" />
                      )}
                      Match Confidence: {Math.round(msg.confidence_score * 100)}%
                    </span>
                  )}

                  {/* Route Badge */}
                  {msg.route && (
                    <span className="text-[10px] font-semibold tracking-wide uppercase px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                      Route: {msg.route}
                    </span>
                  )}

                  {/* Toggle Matched FAQ Details */}
                  {msg.matched_faq && (
                    <button
                      onClick={() => toggleSource(msg.id)}
                      className="inline-flex items-center gap-1 text-[11px] text-sky-600 hover:text-sky-800 transition font-medium"
                    >
                      {expandedSources[msg.id] ? (
                        <>
                          Hide Source <ChevronUp className="w-3 h-3" />
                        </>
                      ) : (
                        <>
                          View Verified FAQ Source <ChevronDown className="w-3 h-3" />
                        </>
                      )}
                    </button>
                  )}
                </div>
              )}

              {/* Expanded Source Details Card */}
              {msg.matched_faq && expandedSources[msg.id] && (
                <div className="mt-2 w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs text-slate-700 space-y-1">
                  <div className="flex items-center justify-between text-slate-500 font-mono text-[10px]">
                    <span>FAQ ID: {msg.matched_faq.id}</span>
                    <span className="bg-white px-2 py-0.5 rounded border border-slate-200">{msg.matched_faq.category}</span>
                  </div>
                  <div className="font-semibold text-slate-900">
                    Source Question: {msg.matched_faq.question}
                  </div>
                  <div className="text-slate-600 italic">
                    Answer Excerpt: {msg.matched_faq.answer}
                  </div>
                </div>
              )}

              {/* Clickable Suggested Questions Chips */}
              {msg.suggested_questions && msg.suggested_questions.length > 0 && (
                <div className="mt-3 w-full">
                  <span className="text-[11px] font-medium text-slate-400 block mb-1.5">
                    Suggested Questions:
                  </span>
                  <div className="flex flex-wrap gap-1.5">
                    {msg.suggested_questions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSendMessage(suggestion)}
                        className="text-xs bg-white hover:bg-sky-50 hover:text-sky-700 hover:border-sky-300 transition text-slate-700 border border-slate-200 px-3 py-1.5 rounded-full text-left shadow-2xs"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <span className="text-[10px] text-slate-400 mt-1 px-1">
                {msg.timestamp}
              </span>
            </div>

            {msg.sender === "user" && (
              <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                <User className="w-4 h-4" />
              </div>
            )}
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 justify-start items-center">
            <div className="w-8 h-8 rounded-lg bg-sky-100 border border-sky-200 flex items-center justify-center text-sky-700 shrink-0">
              <Bot className="w-4 h-4" />
            </div>
            <div className="bg-white border border-slate-200 rounded-2xl px-4 py-3 text-xs text-slate-500 flex items-center gap-2 shadow-xs">
              <div className="flex gap-1">
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-bounce" style={{ animationDelay: '0ms' }}></span>
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-bounce" style={{ animationDelay: '150ms' }}></span>
                <span className="w-2 h-2 rounded-full bg-sky-500 animate-bounce" style={{ animationDelay: '300ms' }}></span>
              </div>
              <span>Searching Pinecone vector space & generating response...</span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Box Footer */}
      <footer className="mt-2 bg-white border border-slate-200 rounded-2xl p-2 shadow-sm">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSendMessage();
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={inputQuery}
            onChange={(e) => setInputQuery(e.target.value)}
            placeholder="Ask a question (e.g. 'How do I reset my password?')..."
            className="flex-1 bg-transparent px-3 py-2 text-sm text-slate-800 placeholder-slate-400 focus:outline-none"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={!inputQuery.trim() || loading}
            className="bg-sky-600 hover:bg-sky-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white p-2.5 rounded-xl transition shadow-sm flex items-center justify-center"
          >
            <Send className="w-4 h-4" />
          </button>
        </form>
      </footer>
    </div>
  );
}
