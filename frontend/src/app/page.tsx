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
  Settings as SettingsIcon, 
  BookOpen, 
  MessageSquare, 
  Shield, 
  ChevronRight, 
  Sliders, 
  CheckCircle2, 
  AlertCircle,
  Menu,
  X,
  PlusCircle,
  Clock,
  KeyRound,
  Zap,
  Layers,
  Database,
  Search
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

interface LoginLog {
  id: number;
  username: string;
  timestamp: string;
  ip_address: string;
  status: string;
}

interface UserProfile {
  id: number;
  username: string;
  email: string;
  full_name?: string;
}

export default function App() {
  // Auth state
  const [token, setToken] = useState<string | null>(null);
  const [currentUser, setCurrentUser] = useState<UserProfile | null>(null);
  const [authMode, setAuthMode] = useState<"login" | "signup">("login");
  const [authUsername, setAuthUsername] = useState("");
  const [authEmail, setAuthEmail] = useState("");
  const [authPassword, setAuthPassword] = useState("");
  const [authFullName, setAuthFullName] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Chat state
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      sender: "bot",
      text: "👋 Welcome! I am your AI FAQ Assistant with 1500-dimensional semantic search and verified knowledge grounding.\n\nAsk me anything about account setup, billing, orders, tracking, returns, security, or manage your custom questions in Settings!",
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

  // Layout & Modals
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [chatHistory, setChatHistory] = useState<ChatLog[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"faqs" | "history" | "config">("faqs");
  const [userFAQs, setUserFAQs] = useState<CustomFAQ[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginLog[]>([]);

  // Add FAQ form state
  const [newCategory, setNewCategory] = useState("General");
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [faqActionMsg, setFaqActionMsg] = useState("");
  const [faqSearchQuery, setFaqSearchQuery] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:8000";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Read saved session
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

  // Fetch user data when token changes
  useEffect(() => {
    if (token) {
      fetchHistory();
      fetchUserFAQs();
      fetchLoginHistory();
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

  const fetchLoginHistory = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/auth/login-history`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setLoginHistory(data);
      }
    } catch (e) {
      console.error("Failed to fetch login history:", e);
    }
  };

  const handleAuthSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError("");
    setAuthLoading(true);
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
      setAuthPassword("");
    } catch {
      setAuthError("Could not connect to backend server on port 8000. Please run start_all.bat.");
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    localStorage.removeItem("faq_auth_token");
    localStorage.removeItem("faq_auth_user");
    setChatHistory([]);
    setUserFAQs([]);
  };

  const handleNewChat = () => {
    setMessages([
      {
        id: "welcome-" + Date.now(),
        sender: "bot",
        text: `Hello ${currentUser ? currentUser.username : "there"}! What can I answer for you today?`,
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
          text: "I encountered an issue connecting to the backend API on port 8000. Please verify the backend is running.",
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

    setFaqActionMsg("Generating 1500-dim vector and indexing question...");
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
        setFaqActionMsg("✅ Question successfully added and indexed into 1500-dim vector database!");
        setNewQuestion("");
        setNewAnswer("");
        setNewKeywords("");
        fetchUserFAQs();
        setTimeout(() => setFaqActionMsg(""), 3500);
      } else {
        setFaqActionMsg("Failed to add question.");
      }
    } catch {
      setFaqActionMsg("Error communicating with backend.");
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
    if (!confirm("Are you sure you want to permanently clear all your chat history?")) return;
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

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. MANDATORY UPFRONT AUTHENTICATION GATE (Center of screen)
  // ═══════════════════════════════════════════════════════════════════════════
  if (!token || !currentUser) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#131417] p-4 font-sans text-gray-100">
        {/* Ambient background glow */}
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative w-full max-w-md rounded-3xl border border-[#2a2c33] bg-[#1a1c22]/95 p-8 shadow-2xl backdrop-blur-xl">
          {/* Logo & Header */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
              <Bot size={30} />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Enterprise FAQ Chatbot
            </h1>
            <p className="mt-1 text-xs text-gray-400">
              Grounded AI Assistant • 1500-Dim Semantic Search • JWT Authentication
            </p>
          </div>

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 gap-1 rounded-xl bg-[#23252d] p-1 mb-6 border border-[#2f323c]">
            <button
              onClick={() => {
                setAuthMode("login");
                setAuthError("");
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                authMode === "login" 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Sign In
            </button>
            <button
              onClick={() => {
                setAuthMode("signup");
                setAuthError("");
              }}
              className={`py-2 text-xs font-semibold rounded-lg transition-all ${
                authMode === "signup" 
                  ? "bg-emerald-600 text-white shadow-sm" 
                  : "text-gray-400 hover:text-white"
              }`}
            >
              Create Account
            </button>
          </div>

          {/* Error Banner */}
          {authError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-950/80 border border-rose-800/80 p-3 text-xs text-rose-300">
              <AlertCircle size={15} className="shrink-0 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleAuthSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Username
              </label>
              <input
                type="text"
                required
                value={authUsername}
                onChange={(e) => setAuthUsername(e.target.value)}
                placeholder="e.g. pavan"
                className="w-full rounded-xl bg-[#23252d] border border-[#343845] px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            {authMode === "signup" && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Email Address
                  </label>
                  <input
                    type="email"
                    required
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="pavan@example.com"
                    className="w-full rounded-xl bg-[#23252d] border border-[#343845] px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-300 mb-1">
                    Full Name (Optional)
                  </label>
                  <input
                    type="text"
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                    placeholder="Pavan Adithya"
                    className="w-full rounded-xl bg-[#23252d] border border-[#343845] px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
                  />
                </div>
              </>
            )}

            <div>
              <label className="block text-xs font-medium text-gray-300 mb-1">
                Password
              </label>
              <input
                type="password"
                required
                value={authPassword}
                onChange={(e) => setAuthPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full rounded-xl bg-[#23252d] border border-[#343845] px-4 py-2.5 text-sm text-white placeholder-gray-500 focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition"
              />
            </div>

            <button
              type="submit"
              disabled={authLoading}
              className="w-full mt-2 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-600/25 transition disabled:opacity-50"
            >
              {authLoading 
                ? "Verifying credentials..." 
                : (authMode === "login" ? "Sign In with JWT" : "Register Account")}
            </button>
          </form>

          {/* Footer credentials hint */}
          <div className="mt-6 border-t border-[#292c35] pt-4 text-center text-xs text-gray-400">
            <span className="flex items-center justify-center gap-1 text-[11px] text-emerald-400 font-medium">
              <Shield size={12} />
              Session verified locally via SHA-256 password hash & JWT
            </span>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  // 2. MAIN APPLICATION (Unique ChatGPT Style Interface)
  // ═══════════════════════════════════════════════════════════════════════════
  const filteredUserFAQs = userFAQs.filter(f => 
    f.question.toLowerCase().includes(faqSearchQuery.toLowerCase()) ||
    f.category.toLowerCase().includes(faqSearchQuery.toLowerCase()) ||
    f.answer.toLowerCase().includes(faqSearchQuery.toLowerCase())
  );

  return (
    <div className="flex h-screen w-full bg-[#1e1f24] text-gray-100 font-sans overflow-hidden">
      {/* ─── LEFT SIDEBAR ─────────────────────────────────────────────────── */}
      <aside 
        className={`${
          sidebarOpen ? "w-72" : "w-0 -translate-x-full"
        } transition-all duration-300 ease-in-out bg-[#141518] border-r border-[#26282f] flex flex-col justify-between z-30 shrink-0 select-none`}
      >
        <div className="p-3.5 flex flex-col h-full overflow-hidden">
          {/* Top: New Chat Button */}
          <div className="flex items-center gap-2 mb-3">
            <button
              onClick={handleNewChat}
              className="flex-1 flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-[#202228] hover:bg-[#282a32] border border-[#2d3039] text-xs font-semibold text-gray-200 transition shadow-sm group"
            >
              <div className="flex items-center gap-2">
                <Plus size={16} className="text-emerald-400 group-hover:rotate-90 transition-transform" />
                <span>New Conversation</span>
              </div>
              <Sparkles size={13} className="text-amber-400" />
            </button>
            <button 
              onClick={() => setSidebarOpen(false)}
              className="p-2 rounded-xl hover:bg-[#202228] text-gray-400 hover:text-white md:hidden"
            >
              <X size={18} />
            </button>
          </div>

          {/* Center: Chat History List */}
          <div className="flex-1 overflow-y-auto pr-1 space-y-1 my-2 scrollbar-thin">
            <div className="flex items-center justify-between px-2 py-1">
              <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">
                Recent Inquiries ({chatHistory.length})
              </span>
              {chatHistory.length > 0 && (
                <button
                  onClick={handleClearHistory}
                  title="Clear all chat history"
                  className="text-[10px] text-gray-500 hover:text-rose-400 flex items-center gap-1 transition"
                >
                  <Trash2 size={11} />
                  <span>Clear</span>
                </button>
              )}
            </div>

            {chatHistory.length === 0 ? (
              <div className="text-xs text-gray-500 px-3 py-6 text-center italic bg-[#18191d] rounded-xl border border-[#23252a] my-2">
                No past questions yet. Ask anything in the chat!
              </div>
            ) : (
              chatHistory.map(item => (
                <button
                  key={item.id}
                  onClick={() => handleSendMessage(item.user_query)}
                  className="w-full text-left px-3 py-2 rounded-xl hover:bg-[#202228] text-xs text-gray-300 truncate flex items-center gap-2.5 group transition border border-transparent hover:border-[#2d3039]"
                >
                  <MessageSquare size={13} className="shrink-0 text-emerald-500/70 group-hover:text-emerald-400" />
                  <span className="truncate flex-1">{item.user_query}</span>
                </button>
              ))
            )}
          </div>

          {/* Bottom Actions: Clear Settings Logo on the left */}
          <div className="pt-3 border-t border-[#23252a] space-y-1.5">
            {/* ⭐ VISIBLE SETTINGS BUTTON WITH PROMINENT LOGO ON LEFT */}
            <button
              onClick={() => {
                setSettingsTab("faqs");
                setShowSettingsModal(true);
              }}
              className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl bg-gradient-to-r from-[#202228] to-[#1c1e23] hover:from-[#262931] hover:to-[#22242b] border border-[#2d3039] text-xs font-semibold text-gray-100 transition shadow-sm group"
            >
              <div className="flex items-center gap-2.5">
                <div className="p-1 rounded-lg bg-emerald-950/80 border border-emerald-800/60 text-emerald-400 group-hover:rotate-45 transition-transform duration-300">
                  <SettingsIcon size={16} />
                </div>
                <span>Control Center & Settings</span>
              </div>
              <ChevronRight size={14} className="text-gray-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-transform" />
            </button>
          </div>

          {/* User Profile / Logout footer */}
          <div className="mt-3 pt-3 border-t border-[#23252a]">
            <div className="flex items-center justify-between p-2 rounded-xl bg-[#1c1d22] border border-[#272930]">
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center font-bold text-xs text-white shadow">
                  {currentUser.username.charAt(0).toUpperCase()}
                </div>
                <div className="truncate">
                  <div className="text-xs font-bold text-white truncate">{currentUser.username}</div>
                  <div className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
                    <Shield size={9} />
                    <span>JWT Verified</span>
                  </div>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                title="Log out"
                className="p-2 text-gray-400 hover:text-rose-400 rounded-lg hover:bg-[#25272e] transition"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </div>
      </aside>

      {/* ─── MAIN CHAT AREA (Unique ChatGPT Style Layout) ────────────────── */}
      <main className="flex-1 flex flex-col h-full relative bg-[#1e1f24] overflow-hidden">
        {/* Header Bar */}
        <header className="h-14 border-b border-[#292b33] flex items-center justify-between px-5 bg-[#1a1b20]/90 backdrop-blur-md z-20">
          <div className="flex items-center gap-3">
            {!sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(true)}
                className="p-2 rounded-xl hover:bg-[#25272e] text-gray-300 transition"
              >
                <Menu size={18} />
              </button>
            )}
            <div className="flex items-center gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                <Bot size={17} />
              </div>
              <div className="flex flex-col">
                <span className="text-sm font-bold text-gray-100 leading-tight">Enterprise FAQ Assistant</span>
                <span className="text-[10px] text-gray-400">1500-dim Pinecone Semantic Space</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setSettingsTab("faqs");
                setShowSettingsModal(true);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#262830] hover:bg-[#2e303a] border border-[#343743] text-xs font-medium text-gray-200 transition"
            >
              <SettingsIcon size={14} className="text-emerald-400" />
              <span>Settings</span>
            </button>
          </div>
        </header>

        {/* Message Stream */}
        <div className="flex-1 overflow-y-auto px-4 py-6 md:px-0 scrollbar-thin">
          <div className="max-w-3xl mx-auto space-y-6">
            {messages.map((msg) => (
              <div 
                key={msg.id}
                className={`flex gap-4 p-5 rounded-2xl transition shadow-sm ${
                  msg.sender === "bot" 
                    ? "bg-[#25272e] border border-[#31343e]" 
                    : "bg-transparent"
                }`}
              >
                {/* Avatar */}
                <div className="shrink-0 mt-0.5">
                  {msg.sender === "bot" ? (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-md shadow-emerald-900/30">
                      <Bot size={18} />
                    </div>
                  ) : (
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-900/30">
                      <User size={18} />
                    </div>
                  )}
                </div>

                {/* Body */}
                <div className="flex-1 space-y-2.5 overflow-hidden">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="font-bold text-gray-200">
                      {msg.sender === "bot" ? "AI FAQ Assistant" : currentUser.username}
                    </span>
                    <span className="text-[11px] text-gray-500 font-mono">{msg.timestamp}</span>
                  </div>

                  <div className="text-sm text-gray-100 whitespace-pre-line leading-relaxed">
                    {msg.text}
                  </div>

                  {/* Badges */}
                  {msg.sender === "bot" && (msg.matched_faq || msg.confidence_score !== undefined) && (
                    <div className="pt-2 flex flex-wrap items-center gap-2 text-xs">
                      {msg.confidence_score !== undefined && (
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono border ${
                          (msg.confidence_score >= 0.50 && !msg.is_fallback)
                            ? "bg-emerald-950/70 text-emerald-300 border-emerald-800/60"
                            : "bg-amber-950/70 text-amber-300 border-amber-800/60"
                        }`}>
                          <CheckCircle2 size={12} />
                          Score: {(msg.confidence_score * 100).toFixed(1)}% (Cutoff: {msg.threshold || 0.50})
                        </span>
                      )}

                      {msg.matched_faq && (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-blue-950/60 text-blue-300 border border-blue-800/40 text-[11px] font-medium">
                          Category: {msg.matched_faq.category}
                        </span>
                      )}
                    </div>
                  )}

                  {/* Suggested questions */}
                  {msg.suggested_questions && msg.suggested_questions.length > 0 && (
                    <div className="pt-3 space-y-2">
                      <div className="text-[10px] uppercase tracking-wider text-gray-400 font-bold">
                        Recommended Follow-Ups:
                      </div>
                      <div className="flex flex-wrap gap-2">
                        {msg.suggested_questions.map((q, idx) => (
                          <button
                            key={idx}
                            onClick={() => handleSendMessage(q)}
                            className="text-left text-xs bg-[#1a1b20] hover:bg-[#2e313a] text-emerald-300 hover:text-white px-3.5 py-2 rounded-xl border border-[#333642] transition shadow-sm"
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
              <div className="flex gap-4 p-5 rounded-2xl bg-[#25272e] border border-[#31343e] animate-pulse">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white">
                  <Bot size={18} />
                </div>
                <div className="space-y-2 flex-1">
                  <div className="text-xs text-gray-400">Searching 1500-dimensional vector space...</div>
                  <div className="h-4 bg-[#31343e] rounded w-3/4"></div>
                  <div className="h-4 bg-[#31343e] rounded w-1/2"></div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Chat Input */}
        <div className="p-4 bg-gradient-to-t from-[#1e1f24] via-[#1e1f24] to-transparent">
          <div className="max-w-3xl mx-auto">
            <form 
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="relative flex items-center bg-[#292b33] rounded-2xl border border-[#3a3d49] focus-within:border-emerald-500 shadow-2xl overflow-hidden transition"
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
                placeholder="Ask about orders, tracking, refunds, accounts, or custom FAQs..."
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
            <div className="text-center text-[10px] text-gray-500 mt-2">
              9-Stage Natural Semantic Pipeline • 1500 Vector Dimensions • Grounded Knowledge
            </div>
          </div>
        </div>
      </main>

      {/* ═══════════════════════════════════════════════════════════════════════
          3. SEPARATE SETTINGS & CONTROL CENTER MODAL
          Tabs: 1) FAQ Management (Upload/Delete), 2) Audit & History, 3) AI Config
         ═══════════════════════════════════════════════════════════════════════ */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1c22] border border-[#2f323c] rounded-3xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl relative overflow-hidden">
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2b2e37]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400">
                  <SettingsIcon size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight">Control Center & Settings</h2>
                  <p className="text-[11px] text-gray-400">Manage custom questions, audit history, and vector space calibration</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#25272e] transition"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs */}
            <div className="flex border-b border-[#2b2e37] bg-[#16171c] px-6">
              <button
                onClick={() => setSettingsTab("faqs")}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition ${
                  settingsTab === "faqs"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <BookOpen size={14} />
                <span>Upload & Delete Questions ({userFAQs.length})</span>
              </button>

              <button
                onClick={() => setSettingsTab("history")}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition ${
                  settingsTab === "history"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <Clock size={14} />
                <span>Login & Session Audit</span>
              </button>

              <button
                onClick={() => setSettingsTab("config")}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 transition ${
                  settingsTab === "config"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <Sliders size={14} />
                <span>System Calibration</span>
              </button>
            </div>

            {/* Tab Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {/* TAB 1: FAQ MANAGEMENT */}
              {settingsTab === "faqs" && (
                <div className="space-y-6">
                  {/* Upload new question card */}
                  <div className="rounded-2xl border border-[#30333e] bg-[#22242c] p-5 space-y-3.5 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      <PlusCircle size={15} />
                      <span>Upload / Add New Question to 1500-Dim Vector Base</span>
                    </div>

                    {faqActionMsg && (
                      <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                        <CheckCircle2 size={15} className="shrink-0 text-emerald-400" />
                        <span>{faqActionMsg}</span>
                      </div>
                    )}

                    <form onSubmit={handleAddCustomFAQ} className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                            Business Category
                          </label>
                          <input
                            type="text"
                            value={newCategory}
                            onChange={(e) => setNewCategory(e.target.value)}
                            placeholder="e.g. Products, Shipping, Support"
                            className="w-full rounded-xl bg-[#17181d] border border-[#383b47] px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                        <div>
                          <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                            Keywords (Comma separated)
                          </label>
                          <input
                            type="text"
                            value={newKeywords}
                            onChange={(e) => setNewKeywords(e.target.value)}
                            placeholder="e.g. delivery, express, urgent"
                            className="w-full rounded-xl bg-[#17181d] border border-[#383b47] px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                          Question Prompt
                        </label>
                        <input
                          type="text"
                          required
                          value={newQuestion}
                          onChange={(e) => setNewQuestion(e.target.value)}
                          placeholder="e.g. How do I request express physical courier delivery?"
                          className="w-full rounded-xl bg-[#17181d] border border-[#383b47] px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-[11px] font-semibold text-gray-300 block mb-1">
                          Verified Answer
                        </label>
                        <textarea
                          required
                          rows={2}
                          value={newAnswer}
                          onChange={(e) => setNewAnswer(e.target.value)}
                          placeholder="e.g. Express delivery can be toggled on during checkout under delivery preferences."
                          className="w-full rounded-xl bg-[#17181d] border border-[#383b47] px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
                        />
                      </div>

                      <button
                        type="submit"
                        className="py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-700/20 transition flex items-center gap-1.5"
                      >
                        <Zap size={14} />
                        <span>Save & Generate 1500-Dim Vector</span>
                      </button>
                    </form>
                  </div>

                  {/* List / Search custom questions */}
                  <div className="space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-300">
                        Active Custom Knowledge Base ({filteredUserFAQs.length})
                      </h3>
                      <div className="relative w-full sm:w-64">
                        <Search size={13} className="absolute left-3 top-2.5 text-gray-400" />
                        <input
                          type="text"
                          value={faqSearchQuery}
                          onChange={(e) => setFaqSearchQuery(e.target.value)}
                          placeholder="Filter questions..."
                          className="w-full bg-[#22242c] border border-[#30333e] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    {filteredUserFAQs.length === 0 ? (
                      <div className="p-4 rounded-xl bg-[#22242c] border border-[#30333e] text-xs text-gray-400 italic text-center">
                        No custom questions found. The chatbot is querying the default 50 enterprise FAQs.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredUserFAQs.map(faq => (
                          <div 
                            key={faq.id}
                            className="p-3.5 rounded-xl bg-[#22242c] border border-[#30333e] flex items-start justify-between gap-3 hover:border-[#3e4250] transition"
                          >
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950 text-emerald-400 border border-emerald-800/60">
                                  {faq.category}
                                </span>
                                <span className="text-[10px] text-gray-500 font-mono">ID: {faq.id}</span>
                              </div>
                              <div className="text-xs font-bold text-white">{faq.question}</div>
                              <div className="text-xs text-gray-300">{faq.answer}</div>
                            </div>
                            <button
                              onClick={() => handleDeleteCustomFAQ(faq.id)}
                              className="p-2 text-gray-400 hover:text-rose-400 hover:bg-[#2b2d38] rounded-lg transition shrink-0"
                              title="Delete this question"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: LOGIN AUDIT & SESSION HISTORY */}
              {settingsTab === "history" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">
                        Security Login Audit History
                      </h3>
                      <p className="text-[11px] text-gray-400">Recorded authentication events for user account</p>
                    </div>
                    <button
                      onClick={fetchLoginHistory}
                      className="text-xs text-emerald-400 hover:underline font-semibold"
                    >
                      Refresh
                    </button>
                  </div>

                  <div className="overflow-hidden rounded-2xl border border-[#30333e] bg-[#22242c]">
                    <table className="w-full text-left text-xs">
                      <thead className="border-b border-[#30333e] bg-[#1a1c22] text-[10px] uppercase font-bold text-gray-400">
                        <tr>
                          <th className="p-3">User</th>
                          <th className="p-3">Timestamp</th>
                          <th className="p-3">IP Address</th>
                          <th className="p-3">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#2a2c35]">
                        {loginHistory.length === 0 ? (
                          <tr>
                            <td colSpan={4} className="p-4 text-center text-gray-500 italic">
                              No login audit logs available.
                            </td>
                          </tr>
                        ) : (
                          loginHistory.map(log => (
                            <tr key={log.id} className="hover:bg-[#272932] transition">
                              <td className="p-3 font-semibold text-white">{log.username}</td>
                              <td className="p-3 text-gray-400 font-mono text-[11px]">{log.timestamp}</td>
                              <td className="p-3 text-gray-400 font-mono text-[11px]">{log.ip_address || "127.0.0.1"}</td>
                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                  log.status === "SUCCESS"
                                    ? "bg-emerald-950 text-emerald-400 border border-emerald-800"
                                    : "bg-rose-950 text-rose-400 border border-rose-800"
                                }`}>
                                  {log.status}
                                </span>
                              </td>
                            </tr>
                          ))
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: SYSTEM CALIBRATION & NEW UNIQUE SETTINGS */}
              {settingsTab === "config" && (
                <div className="space-y-5 text-xs">
                  {/* Confidence Slider */}
                  <div className="p-4 rounded-2xl bg-[#22242c] border border-[#30333e] space-y-2">
                    <div className="flex justify-between items-center">
                      <label className="font-bold text-gray-200">
                        Cosine Similarity Confidence Cutoff: <span className="text-emerald-400">{threshold.toFixed(2)}</span>
                      </label>
                      <span className="text-[10px] text-gray-400">Step 6: Answer Selector</span>
                    </div>
                    <input
                      type="range"
                      min="0.10"
                      max="0.95"
                      step="0.05"
                      value={threshold}
                      onChange={(e) => setThreshold(parseFloat(e.target.value))}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                      <span>0.10 (Permissive)</span>
                      <span>0.50 (Standard)</span>
                      <span>0.95 (Strict)</span>
                    </div>
                  </div>

                  {/* Architecture specs card */}
                  <div className="p-4 rounded-2xl bg-[#22242c] border border-[#30333e] space-y-2.5">
                    <div className="text-xs font-bold text-gray-200 uppercase tracking-wider flex items-center gap-1.5">
                      <Layers size={14} className="text-emerald-400" />
                      <span>Model Architecture & Spec Sheet</span>
                    </div>
                    <div className="grid grid-cols-2 gap-3 text-xs pt-1">
                      <div className="p-2.5 rounded-xl bg-[#1a1c22] border border-[#2e313b]">
                        <span className="text-gray-400 block text-[10px]">Vector Dimensions</span>
                        <span className="font-mono text-emerald-400 font-bold text-sm">1500 Dimensions</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#1a1c22] border border-[#2e313b]">
                        <span className="text-gray-400 block text-[10px]">Embedding Model</span>
                        <span className="font-mono text-blue-400 font-bold text-sm">text-embedding-3-small</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#1a1c22] border border-[#2e313b]">
                        <span className="text-gray-400 block text-[10px]">Vector Store</span>
                        <span className="font-mono text-purple-400 font-bold text-sm">Pinecone Cosine Index</span>
                      </div>
                      <div className="p-2.5 rounded-xl bg-[#1a1c22] border border-[#2e313b]">
                        <span className="text-gray-400 block text-[10px]">Authentication</span>
                        <span className="font-mono text-teal-400 font-bold text-sm">JWT (HS256)</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-6 py-3.5 border-t border-[#2b2e37] bg-[#16171c] flex justify-end">
              <button
                onClick={() => setShowSettingsModal(false)}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow transition"
              >
                Close Settings
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
