"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  Send, 
  Bot, 
  User, 
  Sparkles, 
  Plus, 
  Trash2, 
  LogOut, 
  Settings, 
  BookOpen, 
  MessageSquare, 
  Shield, 
  ChevronRight, 
  Sliders, 
  CheckCircle2, 
  AlertCircle,
  Menu,
  X,
  PlusCircle
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

interface ChatLog {
  id: number;
  user_query: string;
  bot_response: string;
  timestamp: string;
  confidence_score?: number;
}

interface CustomFAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords?: string[];
  created_at: string;
}

interface UserProfile {
  id: number;
  username: string;
  email: string;
  full_name?: string;
}

export default function ChatGPTFAQApp() {
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [authError, setAuthError] = useState("");

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "Hello! I am your AI FAQ Assistant with 1500-dimensional semantic search and verified knowledge grounding.\n\nAsk me anything about account setup, billing, orders, tracking, returns, security, or upload your own custom questions in Settings!",
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      suggested_questions: [
        "How do I register a new account on the platform?",
        "How can I reset my forgotten password?",
        "What is the standard refund policy?",
        "How can I track the live delivery status of my physical shipment?"
      ]
    }
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [threshold, setThreshold] = useState(0.50);

  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatLog[]>([]);
  const [showFAQModal, setShowFAQModal] = useState(false);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [userFAQs, setUserFAQs] = useState<CustomFAQ[]>([]);

  const [newCategory, setNewCategory] = useState("General");
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [faqActionMsg, setFaqActionMsg] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:8000";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  useEffect(() => {
    const savedToken = localStorage.getItem("faq_auth_token");
    const savedUser = localStorage.getItem("faq_auth_user");
    if (savedToken && savedUser) {
      try {
        setToken(savedToken);
        setCurrentUser(JSON.parse(savedUser));
      } catch {
        localStorage.removeItem("faq_auth_token");
        localStorage.removeItem("faq_auth_user");
      }
    }
  }, []);

  useEffect(() => {
    if (token) {
      fetchHistory();
      fetchUserFAQs();
    }
  }, [token]);

  const fetchHistory = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/history`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setChatHistory(data);
      }
    } catch (e) {
      console.error("Failed to fetch history:", e);
    }
  };

  const fetchUserFAQs = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/user/faqs`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setUserFAQs(data);
      }
    } catch (e) {
      console.error("Failed to fetch user FAQs:", e);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    const endpoint = authMode === "login" ? "/api/auth/login" : "/api/auth/signup";
    const payload = authMode === "login" 
      ? { username: authUsername, password: authPassword }
      : { username: authUsername, email: authEmail, password: authPassword, full_name: authFullName };

    try {
      const res = await fetch(`${backendUrl}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (!res.ok) {
        setAuthError(data.detail || "Authentication failed.");
        return;
      }

      setToken(data.access_token);
      setCurrentUser(data.user);
      localStorage.setItem("faq_auth_token", data.access_token);
      localStorage.setItem("faq_auth_user", JSON.stringify(data.user));
      setShowAuthModal(false);
      setAuthPassword("");
    } catch {
      setAuthError("Could not reach backend server. Make sure it is running on port 8000.");
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem("faq_auth_token");
    localStorage.removeItem("faq_auth_user");
    setChatHistory([]);
  };

  const handleNewChat = () => {
    setMessages([
      {
        id: "welcome-" + Date.now(),
        sender: "bot",
        text: `Hello ${currentUser ? currentUser.username : "there"}! How can I assist you with your questions today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        suggested_questions: [
          "How can I reset my forgotten password?",
          "What is the standard refund policy?",
          "How can I track the live delivery status of my physical shipment?"
        ]
      }
    ]);
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
      const headers: Record<string, string> = { "Content-Type": "application/json" };
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
      }

      const response = await fetch(`${backendUrl}/api/chat`, {
        method: "POST",
        headers,
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
      if (token) {
        fetchHistory();
      }
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: "I encountered an issue reaching the backend on port 8000. Please ensure `start_all.bat` is running.",
          is_fallback: true,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleAddCustomFAQ = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuestion.trim() || !newAnswer.trim()) return;

    setFaqActionMsg("Adding and vector indexing question...");
    try {
      const kw = newKeywords.split(",").map(k => k.trim()).filter(Boolean);
      const res = await fetch(`${backendUrl}/api/user/faqs`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { "Authorization": `Bearer ${token}` } : {})
        },
        body: JSON.stringify({
          category: newCategory,
          question: newQuestion,
          answer: newAnswer,
          keywords: kw
        })
      });

      if (res.ok) {
        setFaqActionMsg("Question successfully added and indexed!");
        setNewQuestion("");
        setNewAnswer("");
        setNewKeywords("");
        fetchUserFAQs();
        setTimeout(() => setFaqActionMsg(""), 3000);
      } else {
        setFaqActionMsg("Failed to add question.");
      }
    } catch {
      setFaqActionMsg("Network error adding question.");
    }
  };

  const handleDeleteCustomFAQ = async (faqId: string) => {
    if (!confirm("Are you sure you want to delete this custom question?")) return;
    try {
      const res = await fetch(`${backendUrl}/api/user/faqs/${faqId}`, {
        method: "DELETE",
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (res.ok) {
        fetchUserFAQs();
      }
    } catch (e) {
      console.error("Failed to delete FAQ:", e);
    }
  };

  const handleClearHistory = async () => {
    if (!confirm("Clear all your conversation history?")) return;
    try {
      const res = await fetch(`${backendUrl}/api/history`, {
        method: "DELETE",
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (res.ok) {
        setChatHistory([]);
        handleNewChat();
      }
    } catch (e) {
      console.error("Failed to clear history:", e);
    }
  };

  return (
    <div className="flex h-screen w-full bg-[#202123] text-gray-100 font-sans overflow-hidden">
      {/* ─── LEFT SIDEBAR (ChatGPT Style) ─────────────────────────────────── */}
      <aside 
        className={`${
          sidebarOpen ? "w-64" : "w-0 -translate-x-full"
        } transition-all duration-300 ease-in-out bg-[#171717] border-r border-[#2d2d2d] flex flex-col justify-between z-30 shrink-0 select-none`}
      >
        <div className="p-3 flex flex-col h-full overflow-hidden">
          {/* Top Bar: New Chat */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={handleNewChat}
              className="flex-1 flex items-center justify-between px-3 py-2.5 rounded-lg border border-[#3e3f4b] hover:bg-[#202123] text-sm font-medium transition"
            >
              <div className="flex items-center gap-2">
                <Plus size={16} />
                <span>New chat</span>
              </div>
              <Sparkles size={14} className="text-amber-400" />
            </button>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-lg hover:bg-[#202123] text-gray-400 hover:text-white md:hidden"
            >
              <X size={18} />
            </button>
          </div>

          {/* Chat History List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-1 my-2">
            <div className="text-[11px] font-semibold text-gray-400 px-2 py-1 uppercase tracking-wider">
              Recent Conversations
            </div>
            {chatHistory.length === 0 ? (
              <div className="text-xs text-gray-500 px-2 py-4 italic">
                {currentUser ? "No past queries yet" : "Log in to view saved history"}
              </div>
            ) : (
              chatHistory.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSendMessage(item.user_query)}
                  className="w-full text-left px-2.5 py-2 rounded-md hover:bg-[#202123] text-xs text-gray-300 truncate flex items-center gap-2 group transition"
                >
                  <MessageSquare size={13} className="shrink-0 text-gray-400 group-hover:text-white" />
                  <span className="truncate">{item.user_query}</span>
                </button>
              ))
            )}
          </div>

          {/* Quick Action Navigation */}
          <div className="pt-2 border-t border-[#2d2d2d] space-y-1">
            <button
              onClick={() => setShowFAQModal(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#202123] text-xs text-gray-200 transition"
            >
              <div className="flex items-center gap-2">
                <BookOpen size={15} className="text-emerald-400" />
                <span>FAQ Manager</span>
              </div>
              <ChevronRight size={14} className="text-gray-500" />
            </button>

            <button
              onClick={() => setShowSettingsModal(true)}
              className="w-full flex items-center justify-between px-3 py-2 rounded-lg hover:bg-[#202123] text-xs text-gray-200 transition"
            >
              <div className="flex items-center gap-2">
                <Sliders size={15} className="text-blue-400" />
                <span>Settings & Model Info</span>
              </div>
              <span className="text-[10px] text-gray-400 font-mono">1500 dim</span>
            </button>

            {chatHistory.length > 0 && (
              <button
                onClick={handleClearHistory}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-rose-900/30 text-rose-400 text-xs transition"
              >
                <Trash2 size={14} />
                <span>Clear Chat History</span>
              </button>
            )}
          </div>

          {/* User Account / Login Bar at bottom */}
          <div className="mt-3 pt-3 border-t border-[#2d2d2d]">
            {currentUser ? (
              <div className="flex items-center justify-between px-2 py-1.5 rounded-lg bg-[#202123]">
                <div className="flex items-center gap-2 truncate">
                  <div className="w-7 h-7 rounded-full bg-emerald-600 flex items-center justify-center font-bold text-xs">
                    {currentUser.username.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate">
                    <div className="text-xs font-medium text-white truncate">{currentUser.username}</div>
                    <div className="text-[10px] text-emerald-400 flex items-center gap-1">
                      <Shield size={10} />
                      <span>JWT Authenticated</span>
                    </div>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  title="Log out"
                  className="p-1.5 text-gray-400 hover:text-rose-400 rounded hover:bg-[#2a2b32] transition"
                >
                  <LogOut size={14} />
                </button>
              </div>
            ) : (
              <button
                onClick={() => {
                  setAuthMode("login");
                  setShowAuthModal(true);
                }}
                className="w-full py-2 px-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs flex items-center justify-center gap-2 shadow-sm transition"
              >
                <User size={14} />
                <span>Sign in / Sign up</span>
              </button>
            )}
          </div>
        </div>
      </aside>

      {/* ─── MAIN CHAT AREA (ChatGPT Layout) ─────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full relative bg-[#202123] overflow-hidden">
        {/* Mobile / Toggle Header */}
        <header className="h-12 border-b border-[#2d2d2d] flex items-center justify-between px-4 bg-[#202123]/90 backdrop-blur z-20">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-1.5 rounded-md hover:bg-[#2d2d2d] text-gray-300 transition"
              >
                <Menu size={18} />
              </button>
            )}
            <div className="flex items-center gap-2 font-semibold text-sm text-gray-200">
              <Bot size={18} className="text-emerald-400" />
              <span>Enterprise FAQ Chatbot</span>
              <span className="text-[10px] bg-emerald-950 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-800">
                1500-dim Pinecone
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {!currentUser && (
              <button
                onClick={() => {
                  setAuthMode("login");
                  setShowAuthModal(true);
                }}
                className="text-xs px-2.5 py-1 rounded bg-[#2d2d2d] hover:bg-[#3d3d3d] text-gray-200 transition"
              >
                Log In
              </button>
            )}
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-0">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex gap-4 p-4 rounded-xl transition ${
                  msg.sender === "bot" ? "bg-[#27282b] border border-[#343541]" : "bg-transparent"
                }`}
              >
                {/* Avatar */}
                <div className="shrink-0 mt-0.5">
                  {msg.sender === "bot" ? (
                    <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white shadow">
                      <Bot size={18} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-lg bg-[#5437db] flex items-center justify-center text-white shadow">
                      <User size={18} />
                    </div>
                  )}
                </div>

                {/* Message Body */}
                <div className="flex-1 space-y-2 overflow-hidden">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="font-semibold text-gray-200">
                      {msg.sender === "bot" ? "AI FAQ Assistant" : (currentUser?.username || "You")}
                    </span>
                    <span>{msg.timestamp}</span>
                  </div>

                  <div className="text-sm text-gray-100 whitespace-pre-line leading-relaxed">
                    {msg.text}
                  </div>

                  {/* Grounded Source & Metrics Badge */}
                  {msg.sender === "bot" && (msg.matched_faq || msg.confidence_score !== undefined) && (
                    <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                      {msg.confidence_score !== undefined && (
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-mono ${
                          (msg.confidence_score >= 0.50 && !msg.is_fallback)
                            ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/60"
                            : "bg-amber-950/80 text-amber-400 border border-amber-800/60"
                        }`}>
                          <CheckCircle2 size={11} />
                          Score: {(msg.confidence_score * 100).toFixed(1)}% (Cutoff: {msg.threshold || 0.50})
                        </span>
                      )}

                      {msg.matched_faq && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-blue-950/70 text-blue-300 border border-blue-800/50 text-[11px]">
                          Category: {msg.matched_faq.category}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Clickable Suggested Questions */}
                  {msg.suggested_questions && msg.suggested_questions.length > 0 && (
                    <div className="pt-3 space-y-1.5">
                      <div className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">
                        Suggested Inquiries:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {msg.suggested_questions.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(q)}
                            className="text-left text-xs bg-[#1e1f23] hover:bg-[#343541] text-emerald-300 hover:text-white px-3 py-1.5 rounded-lg border border-[#343541] transition"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-4 p-4 rounded-xl bg-[#27282b] border border-[#343541] animate-pulse">
                <div className="w-8 h-8 rounded-lg bg-emerald-600 flex items-center justify-center text-white">
                  <Bot size={18} />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="text-xs text-gray-400">AI FAQ Assistant searching 1500-dim vector space...</div>
                  <div className="h-4 bg-[#343541] rounded w-3/4"></div>
                  <div className="h-4 bg-[#343541] rounded w-1/2"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* ─── CHAT INPUT (Centered ChatGPT Style) ─────────────────────────── */}
        <div className="p-4 bg-gradient-to-t from-[#202123] via-[#202123] to-transparent">
          <div className="max-w-3xl mx-auto">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-center bg-[#2f2f2f] rounded-2xl border border-[#424242] focus-within:border-emerald-500 shadow-xl overflow-hidden transition"
            >
              <textarea
                value={inputQuery}
                onChange={(e) => setInputQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendMessage();
                  }
                }}
                placeholder="Ask any question about our services, orders, accounts..."
                rows={1}
                className="w-full bg-transparent px-4 py-3.5 text-sm text-gray-100 placeholder-gray-400 focus:outline-none resize-none max-h-32"
              />
              <button
                type="submit"
                disabled={!inputQuery.trim() || loading}
                className="mr-2 p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 text-white transition shrink-0"
              >
                <Send size={16} />
              </button>
            </form>
            <div className="text-center text-[11px] text-gray-500 mt-2">
              FAQ Chatbot with 9-step semantic verification pipeline | 1500 Vector Dimensions
            </div>
          </div>
        </div>
      </main>

      {/* ─── AUTH MODAL (Login / Signup) ──────────────────────────────────── */}
      {showAuthModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1f2023] border border-[#343541] rounded-2xl p-6 w-full max-w-md shadow-2xl relative">
            <button
              onClick={() => setShowAuthModal(false)}
              className="absolute top-4 right-4 text-gray-400 hover:text-white"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-2 mb-4">
              <Shield className="text-emerald-400" size={24} />
              <h2 className="text-lg font-bold text-white">
                {authMode === "login" ? "User Login" : "Create an Account"}
              </h2>
            </div>

            {authError && (
              <div className="mb-4 p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                <AlertCircle size={14} className="shrink-0" />
                <span>{authError}</span>
              </div>
            )}

            <form onSubmit={handleAuthSubmit} className="space-y-3">
              <div>
                <label className="text-xs text-gray-300 font-medium">Username</label>
                <input
                  type="text"
                  required
                  value={authUsername}
                  onChange={(e) => setAuthUsername(e.target.value)}
                  placeholder="e.g. pavan"
                  className="w-full mt-1 bg-[#2b2c2f] border border-[#424242] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              {authMode === "signup" && (
                <>
                  <div>
                    <label className="text-xs text-gray-300 font-medium">Email Address</label>
                    <input
                      type="email"
                      required
                      value={authEmail}
                      onChange={(e) => setAuthEmail(e.target.value)}
                      placeholder="pavan@example.com"
                      className="w-full mt-1 bg-[#2b2c2f] border border-[#424242] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="text-xs text-gray-300 font-medium">Full Name (Optional)</label>
                    <input
                      type="text"
                      value={authFullName}
                      onChange={(e) => setAuthFullName(e.target.value)}
                      placeholder="Pavan Adithya"
                      className="w-full mt-1 bg-[#2b2c2f] border border-[#424242] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="text-xs text-gray-300 font-medium">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full mt-1 bg-[#2b2c2f] border border-[#424242] rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-emerald-500"
                />
              </div>

              <button
                type="submit"
                className="w-full mt-2 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition shadow"
              >
                {authMode === "login" ? "Sign In" : "Register Account"}
              </button>
            </form>

            <div className="mt-4 text-center text-xs text-gray-400">
              {authMode === "login" ? (
                <>
                  Don&apos;t have an account?{" "}
                  <button
                    onClick={() => {
                      setAuthMode("signup");
                      setAuthError("");
                    }}
                    className="text-emerald-400 hover:underline font-medium"
                  >
                    Sign up
                  </button>
                </>
              ) : (

                <>
                  Already registered?{" "}
                  <button
                    onClick={() => {
                      setAuthMode("login");
                      setAuthError("");
                    }}
                    className="text-emerald-400 hover:underline font-medium"
                  >
                    Log in
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── FAQ MANAGER MODAL (Upload / Delete Custom Questions) ────────── */}
      {showFAQModal && (
        <div className="fixed inset-0 bg-black/75 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1f2023] border border-[#343541] rounded-2xl p-6 w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl relative">
            <div className="flex items-center justify-between pb-4 border-b border-[#2d2d2d]">
              <div className="flex items-center gap-2">
                <BookOpen className="text-emerald-400" size={20} />
                <h2 className="text-lg font-bold text-white">FAQ Knowledge Base Manager</h2>
              </div>
              <button
                onClick={() => setShowFAQModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={20} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto py-4 space-y-6">
              {/* Add FAQ Form */}
              <div className="bg-[#27282b] p-4 rounded-xl border border-[#343541] space-y-3">
                <div className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                  <PlusCircle size={14} />
                  <span>Upload / Add New Question</span>
                </div>

                {faqActionMsg && (
                  <div className="p-2 rounded bg-emerald-950 border border-emerald-800 text-emerald-300 text-xs">
                    {faqActionMsg}
                  </div>
                )}

                <form onSubmit={handleAddCustomFAQ} className="space-y-2.5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="text-[11px] text-gray-300">Category</label>
                      <input
                        type="text"
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value)}
                        placeholder="e.g. Products, Shipping, Support"
                        className="w-full bg-[#1e1f23] border border-[#424242] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="text-[11px] text-gray-300">Keywords (Comma separated)</label>
                      <input
                        type="text"
                        value={newKeywords}
                        onChange={(e) => setNewKeywords(e.target.value)}
                        placeholder="e.g. refund, return, policy"
                        className="w-full bg-[#1e1f23] border border-[#424242] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-300">Question</label>
                    <input
                      type="text"
                      required
                      value={newQuestion}
                      onChange={(e) => setNewQuestion(e.target.value)}
                      placeholder="e.g. How do I request an expedited delivery?"
                      className="w-full bg-[#1e1f23] border border-[#424242] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] text-gray-300">Answer</label>
                    <textarea
                      required
                      rows={2}
                      value={newAnswer}
                      onChange={(e) => setNewAnswer(e.target.value)}
                      placeholder="e.g. Expedited delivery can be selected during checkout for an additional $5 fee."
                      className="w-full bg-[#1e1f23] border border-[#424242] rounded px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                    />
                  </div>

                  <button
                    type="submit"
                    className="py-2 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow transition"
                  >
                    Save & Index Question (1500-dim)
                  </button>
                </form>
              </div>

              {/* User Added Questions List */}
              <div className="space-y-2">
                <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider">
                  Your Custom Questions ({userFAQs.length})
                </div>
                {userFAQs.length === 0 ? (
                  <div className="text-xs text-gray-500 italic p-3 bg-[#27282b] rounded-lg">
                    No custom questions uploaded yet. The chatbot is currently searching the 50 base enterprise FAQs.
                  </div>
                ) : (
                  userFAQs.map(faq => (
                    <div 
                      key={faq.id}
                      className="p-3 bg-[#27282b] rounded-lg border border-[#343541] flex items-start justify-between gap-3"
                    >
                      <div className="space-y-1">
                        <div className="text-[11px] text-emerald-400 font-medium">[{faq.category}]</div>
                        <div className="text-xs font-semibold text-white">{faq.question}</div>
                        <div className="text-xs text-gray-300">{faq.answer}</div>
                      </div>
                      <button
                        onClick={() => handleDeleteCustomFAQ(faq.id)}
                        className="p-1.5 text-gray-400 hover:text-rose-400 rounded hover:bg-[#343541] transition shrink-0"
                        title="Delete question"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── SETTINGS MODAL ──────────────────────────────────────────────── */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-[#1f2023] border border-[#343541] rounded-2xl p-6 w-full max-w-md shadow-2xl relative space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#2d2d2d]">
              <div className="flex items-center gap-2">
                <Settings className="text-blue-400" size={20} />
                <h2 className="text-base font-bold text-white">System Settings</h2>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="text-gray-400 hover:text-white"
              >
                <X size={18} />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div>
                <label className="text-gray-300 font-semibold block mb-1">
                  Similarity Threshold Cutoff: {threshold.toFixed(2)}
                </label>
                <input
                  type="range"
                  min="0.10"
                  max="0.95"
                  step="0.05"
                  value={threshold}
                  onChange={(e) => setThreshold(parseFloat(e.target.value))}
                  className="w-full accent-emerald-500"
                />
                <div className="flex justify-between text-[10px] text-gray-500 mt-1">
                  <span>0.10 (Lenient)</span>
                  <span>0.50 (Standard)</span>
                  <span>0.95 (Strict)</span>
                </div>
              </div>

              <div className="bg-[#27282b] p-3 rounded-lg border border-[#343541] space-y-1.5">
                <div className="font-semibold text-gray-200">Architecture Specs</div>
                <div className="text-gray-400 flex justify-between">
                  <span>Vector Dimensions:</span>
                  <span className="font-mono text-emerald-400">1500</span>
                </div>
                <div className="text-gray-400 flex justify-between">
                  <span>Vector Database:</span>
                  <span className="font-mono text-blue-400">Pinecone</span>
                </div>
                <div className="text-gray-400 flex justify-between">
                  <span>Authentication:</span>
                  <span className="font-mono text-purple-400">JWT (HS256)</span>
                </div>
                <div className="text-gray-400 flex justify-between">
                  <span>Database:</span>
                  <span className="font-mono text-gray-300">SQLite (Multi-user)</span>
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowSettingsModal(false)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-medium text-xs transition"
            >
              Done
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
