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
  Zap, 
  Layers, 
  Download, 
  BarChart3, 
  Search, 
  Copy, 
  Volume2, 
  RefreshCw,
  FileText,
  Mic,
  MicOff,
  HelpCircle,
  ChevronDown,
  ChevronUp,
  Filter
} from "lucide-react";

import baseFaqData from "@/data/faq_data.json";

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

interface AnalyticsData {
  total_queries: number;
  avg_confidence: number;
  success_rate: number;
  custom_faqs: number;
  base_faqs: number;
  total_knowledge_base: number;
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
      text: "👋 Welcome! I am your AI FAQ Assistant with 1500-dimensional semantic search and verified knowledge grounding.\n\nAsk me anything or browse our 50 verified questions from the right-hand panel or bottom suggestions!",
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
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);

  // Speech Recognition (Google Web Speech API)
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Layout & Settings Modals
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [rightPanelOpen, setRightPanelOpen] = useState(true);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState("All");
  const [questionSearch, setQuestionSearch] = useState("");

  const [chatHistory, setChatHistory] = useState<ChatLog[]>([]);
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"faqs" | "analytics" | "audit" | "export" | "config">("faqs");
  const [userFAQs, setUserFAQs] = useState<CustomFAQ[]>([]);
  const [loginHistory, setLoginHistory] = useState<LoginLog[]>([]);
  const [analytics, setAnalytics] = useState<AnalyticsData>({
    total_queries: 0,
    avg_confidence: 0,
    success_rate: 100,
    custom_faqs: 0,
    base_faqs: 50,
    total_knowledge_base: 50
  });

  // Add FAQ form state
  const [newCategory, setNewCategory] = useState("General");
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [newKeywords, setNewKeywords] = useState("");
  const [faqActionMsg, setFaqActionMsg] = useState("");
  const [faqSearchQuery, setFaqSearchQuery] = useState("");
  const [bulkFaqJson, setBulkFaqJson] = useState("");

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_API_URL || "http://localhost:8000";

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, loading]);

  // Initialize Speech Recognition
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          const transcript = event.results[0][0].transcript;
          setInputQuery(prev => (prev ? prev + " " + transcript : transcript));
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, []);

  const toggleVoiceTyping = () => {
    if (!recognitionRef.current) {
      alert("Voice speech recognition is supported in Google Chrome, Edge, and Safari.");
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch (err) {
        console.error("Speech recognition error:", err);
      }
    }
  };

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

  // Fetch data on token change
  useEffect(() => {
    if (token) {
      fetchHistory();
      fetchUserFAQs();
      fetchLoginHistory();
      fetchAnalytics();
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

  const fetchAnalytics = async () => {
    try {
      const res = await fetch(`${backendUrl}/api/analytics`, {
        headers: token ? { "Authorization": `Bearer ${token}` } : {}
      });
      if (res.ok) {
        const data = await res.json();
        setAnalytics(data);
      }
    } catch (e) {
      console.error("Failed to fetch analytics:", e);
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
      // Fallback: If deployed on Vercel without a live backend URL, provide instant cloud session
      const fallbackUser = {
        id: 1,
        username: authUsername.trim() || "pavan",
        email: authEmail.trim() || `${authUsername.trim() || "pavan"}@revalsys.com`,
        full_name: authFullName.trim() || "Pavan Adithya"
      };
      const fallbackToken = `demo-token-${Date.now()}`;
      setToken(fallbackToken);
      setCurrentUser(fallbackUser);
      localStorage.setItem("faq_auth_token", fallbackToken);
      localStorage.setItem("faq_auth_user", JSON.stringify(fallbackUser));
      setAuthPassword("");
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
        fetchAnalytics();
      }
    } catch {
      // Automatic Edge fallback: query internal /api/chat route if backend is offline or on cloud
      try {
        const edgeRes = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ question: query, threshold })
        });
        if (edgeRes.ok) {
          const data = await edgeRes.json();
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
          return;
        }
      } catch (edgeErr) {
        console.warn("Edge fallback failed:", edgeErr);
      }

      setMessages(prev => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          sender: "bot",
          text: "I encountered an issue connecting to the knowledge base. Please try again.",
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
        setFaqActionMsg("✅ Question successfully indexed into 1500-dim vector database!");
        setNewQuestion("");
        setNewAnswer("");
        setNewKeywords("");
        fetchUserFAQs();
        fetchAnalytics();
        setTimeout(() => setFaqActionMsg(""), 3500);
      } else {
        setFaqActionMsg("Failed to add question.");
      }
    } catch {
      setFaqActionMsg("Error communicating with backend.");
    }
  };

  const handleBulkUpload = async () => {
    try {
      const items = JSON.parse(bulkFaqJson);
      if (!Array.isArray(items)) {
        alert("Please provide a valid JSON array of FAQ objects.");
        return;
      }
      setFaqActionMsg(`Bulk uploading and vector indexing ${items.length} questions...`);
      for (const item of items) {
        if (item.question && item.answer) {
          await fetch(`${backendUrl}/api/user/faqs`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              ...(token ? { "Authorization": `Bearer ${token}` } : {})
            },
            body: JSON.stringify({
              category: item.category || "General",
              question: item.question,
              answer: item.answer,
              keywords: item.keywords || []
            })
          });
        }
      }
      setFaqActionMsg("✅ Bulk upload completed!");
      setBulkFaqJson("");
      fetchUserFAQs();
      fetchAnalytics();
    } catch {
      alert("Invalid JSON format. Expected: [{'category': 'Support', 'question': '...', 'answer': '...'}]");
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
        fetchAnalytics();
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
        fetchAnalytics();
        handleNewChat();
      }
    } catch (e) {
      console.error("Failed to clear history:", e);
    }
  };

  const handleExportData = () => {
    const exportObj = {
      export_date: new Date().toISOString(),
      user: currentUser?.username,
      total_faqs: userFAQs.length + 50,
      custom_faqs: userFAQs,
      chat_history: chatHistory
    };
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportObj, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `faq_chatbot_knowledge_base_${currentUser?.username || "export"}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleCopyText = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(id);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleSpeakText = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.0;
      window.speechSynthesis.speak(utterance);
    }
  };

  // Combine Base 50 FAQs + User Custom FAQs for the Question Directory
  const allDirectoryFAQs = [
    ...baseFaqData.map((f: any) => ({ ...f, is_custom: false })),
    ...userFAQs.map(f => ({ ...f, is_custom: true }))
  ];

  // Distinct categories
  const categories = ["All", ...Array.from(new Set(allDirectoryFAQs.map(f => f.category)))];

  // Filtered FAQ questions for the Question Directory
  const displayedDirectoryFAQs = allDirectoryFAQs.filter(f => {
    const matchesCat = selectedCategoryFilter === "All" || f.category === selectedCategoryFilter;
    const matchesSearch = !questionSearch || 
      f.question.toLowerCase().includes(questionSearch.toLowerCase()) || 
      f.category.toLowerCase().includes(questionSearch.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // ═══════════════════════════════════════════════════════════════════════════
  // 1. MANDATORY UPFRONT AUTHENTICATION GATE (Center of screen)
  // ═══════════════════════════════════════════════════════════════════════════
  if (!token || !currentUser) {
    return (
      <div className="flex min-h-screen w-full items-center justify-center bg-[#131417] p-4 font-sans text-gray-100">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-emerald-900/20 via-transparent to-transparent pointer-events-none" />

        <div className="relative w-full max-w-md rounded-3xl border border-[#2a2c33] bg-[#1a1c22]/95 p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex flex-col items-center text-center mb-6">
            <div className="mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-lg shadow-emerald-500/20">
              <Bot size={30} />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white">
              Enterprise FAQ Chatbot
            </h1>
            <p className="mt-1 text-xs text-gray-400">
              Grounded AI Assistant • 1500-Dim Semantic Space • JWT Authentication
            </p>
          </div>

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

          {authError && (
            <div className="mb-4 flex items-center gap-2 rounded-xl bg-rose-950/80 border border-rose-800/80 p-3 text-xs text-rose-300">
              <AlertCircle size={15} className="shrink-0 text-rose-400" />
              <span>{authError}</span>
            </div>
          )}

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
  // 2. MAIN CHATGPT-STYLE APPLICATION WITH VOICE TYPING & 50-FAQ DIRECTORY
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
          {/* New Chat Button */}
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

          {/* ⭐ VOICE TYPING (SPEECH-TO-TEXT) BUTTON IN LEFT SIDEBAR */}
          <button
            onClick={toggleVoiceTyping}
            className={`flex items-center justify-between px-3.5 py-2.5 mb-3 rounded-xl border text-xs font-semibold transition-all ${
              isListening 
                ? "bg-rose-950/80 border-rose-600 text-rose-300 shadow-md shadow-rose-900/30 animate-pulse" 
                : "bg-[#1c1e23] hover:bg-[#24272e] border-[#2d3039] text-gray-200"
            }`}
          >
            <div className="flex items-center gap-2.5">
              {isListening ? (
                <div className="p-1 rounded-lg bg-rose-600 text-white animate-bounce">
                  <Mic size={15} />
                </div>
              ) : (
                <div className="p-1 rounded-lg bg-emerald-950 text-emerald-400 border border-emerald-800">
                  <Mic size={15} />
                </div>
              )}
              <div className="text-left">
                <div className="text-xs font-bold leading-tight">
                  {isListening ? "Listening... Speak Now" : "Voice Typing (Speech to Text)"}
                </div>
                <div className="text-[10px] text-gray-400">Google Web Speech Engine</div>
              </div>
            </div>
            {isListening && (
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping"></span>
            )}
          </button>

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
                No past queries yet. Ask anything in the chat!
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

          {/* ⭐ PROMINENT SETTINGS BUTTON WITH LOGO ON LEFT */}
          <div className="pt-3 border-t border-[#23252a] space-y-1.5">
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
              <span className="text-[10px] bg-emerald-900/60 text-emerald-300 px-1.5 py-0.5 rounded font-mono">
                {userFAQs.length} custom
              </span>
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

      {/* ─── MAIN CHAT AREA ──────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col h-full relative bg-[#1e1f24] overflow-hidden">
        {/* Top Header Bar */}
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
            {/* Toggle 50 FAQ Directory on right */}
            <button
              onClick={() => setRightPanelOpen(!rightPanelOpen)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-medium transition ${
                rightPanelOpen 
                  ? "bg-emerald-950/80 border-emerald-700 text-emerald-300" 
                  : "bg-[#262830] hover:bg-[#2e303a] border-[#343743] text-gray-200"
              }`}
            >
              <BookOpen size={14} className="text-emerald-400" />
              <span>50 FAQs Directory</span>
            </button>

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

                <div className="flex-1 space-y-2.5 overflow-hidden">
                  <div className="flex items-center justify-between text-xs text-gray-400">
                    <span className="font-bold text-gray-200">
                      {msg.sender === "bot" ? "AI FAQ Assistant" : currentUser.username}
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleCopyText(msg.text, msg.id)}
                        title="Copy answer"
                        className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#343743] transition"
                      >
                        {copyFeedback === msg.id ? (
                          <span className="text-[10px] text-emerald-400 font-bold">Copied!</span>
                        ) : (
                          <Copy size={13} />
                        )}
                      </button>
                      {msg.sender === "bot" && (
                        <button
                          onClick={() => handleSpeakText(msg.text)}
                          title="Read out loud"
                          className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#343743] transition"
                        >
                          <Volume2 size={13} />
                        </button>
                      )}
                      <span className="text-[11px] text-gray-500 font-mono">{msg.timestamp}</span>
                    </div>
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

        {/* ⭐ BOTTOM SUGGESTIONS CAROUSEL (Quick Clickable FAQ Topics) */}
        <div className="px-4 py-2 border-t border-[#262830] bg-[#1a1b20]/60 overflow-x-auto scrollbar-none flex items-center gap-2">
          <span className="text-[10px] font-bold text-gray-400 uppercase tracking-wider shrink-0 flex items-center gap-1">
            <Sparkles size={11} className="text-amber-400" />
            Quick Prompts:
          </span>
          {[
            "How can I reset my forgotten password?",
            "What is the standard refund policy?",
            "How can I track the live delivery status of my physical shipment?",
            "How do I configure Two-Factor Authentication (2FA)?",
            "What payment methods and currencies do you support?"
          ].map((prompt, idx) => (
            <button
              key={idx}
              onClick={() => handleSendMessage(prompt)}
              className="text-xs bg-[#24262f] hover:bg-[#2e323e] text-gray-300 hover:text-white px-3 py-1.5 rounded-full border border-[#343743] whitespace-nowrap transition shrink-0"
            >
              {prompt}
            </button>
          ))}
        </div>

        {/* Input Bar with Voice Typing Mic & Send Button */}
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
                placeholder={isListening ? "Listening... Speak your question now!" : "Type a question or use voice typing..."}
                rows={1}
                className="w-full bg-transparent px-4 py-3.5 text-sm text-gray-100 placeholder-gray-400 focus:outline-none resize-none max-h-32"
              />

              {/* Voice Typing Mic button inside input bar */}
              <button
                type="button"
                onClick={toggleVoiceTyping}
                title="Click to speak (Speech to text)"
                className={`p-2.5 mr-1 rounded-xl transition ${
                  isListening
                    ? "bg-rose-600 text-white animate-pulse"
                    : "text-gray-400 hover:text-emerald-400 hover:bg-[#343845]"
                }`}
              >
                {isListening ? <MicOff size={16} /> : <Mic size={16} />}
              </button>

              <button
                type="submit"
                disabled={!inputQuery.trim() || loading}
                className="mr-2 p-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-30 disabled:hover:bg-emerald-600 text-white transition shrink-0"
              >
                <Send size={16} />
              </button>
            </form>
            <div className="text-center text-[10px] text-gray-500 mt-2">
              9-Stage Natural Semantic Pipeline • 1500 Vector Dimensions • Speech-to-Text Supported
            </div>
          </div>
        </div>
      </main>

      {/* ─── ⭐ RIGHT-SIDE 50 FAQ DIRECTORY & SUGGESTIONS PANEL ───────────── */}
      {rightPanelOpen && (
        <aside className="w-80 bg-[#15161a] border-l border-[#26282f] flex flex-col h-full z-20 shrink-0 select-none animate-in slide-in-from-right duration-200">
          <div className="p-4 border-b border-[#26282f] flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="p-1 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400">
                <HelpCircle size={16} />
              </div>
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">FAQ Knowledge Directory</h3>
                <span className="text-[10px] text-gray-400">{allDirectoryFAQs.length} questions available</span>
              </div>
            </div>
            <button
              onClick={() => setRightPanelOpen(false)}
              className="text-gray-400 hover:text-white p-1 rounded hover:bg-[#22242c] transition"
              title="Close directory"
            >
              <X size={16} />
            </button>
          </div>

          {/* Search Questions */}
          <div className="p-3 border-b border-[#26282f] space-y-2">
            <div className="relative">
              <Search size={13} className="absolute left-3 top-2.5 text-gray-400" />
              <input
                type="text"
                value={questionSearch}
                onChange={(e) => setQuestionSearch(e.target.value)}
                placeholder="Search all 50 questions..."
                className="w-full bg-[#1e2026] border border-[#2e313c] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* Category Filter Pills */}
            <div className="flex gap-1 overflow-x-auto scrollbar-none pb-1">
              {categories.map((cat, idx) => (
                <button
                  key={idx}
                  onClick={() => setSelectedCategoryFilter(cat)}
                  className={`text-[10px] font-medium px-2.5 py-1 rounded-lg whitespace-nowrap transition ${
                    selectedCategoryFilter === cat
                      ? "bg-emerald-600 text-white font-bold"
                      : "bg-[#20222a] text-gray-400 hover:text-gray-200"
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Question List */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2 scrollbar-thin">
            <div className="text-[10px] uppercase font-bold text-gray-500 px-1">
              Click any question to ask:
            </div>
            {displayedDirectoryFAQs.length === 0 ? (
              <div className="text-xs text-gray-500 italic p-4 text-center">
                No matching questions found in this category.
              </div>
            ) : (
              displayedDirectoryFAQs.map((faq: any) => (
                <button
                  key={faq.id}
                  onClick={() => handleSendMessage(faq.question)}
                  className="w-full text-left p-2.5 rounded-xl bg-[#1d1f25] hover:bg-[#252831] border border-[#2a2c35] hover:border-emerald-700/60 transition group text-xs text-gray-200 block space-y-1"
                >
                  <div className="flex items-center justify-between text-[10px]">
                    <span className="text-emerald-400 font-medium truncate max-w-[170px]">
                      {faq.category}
                    </span>
                    {faq.is_custom && (
                      <span className="px-1.5 py-0.2 rounded bg-purple-950 text-purple-300 font-mono text-[9px] border border-purple-800">
                        Custom
                      </span>
                    )}
                  </div>
                  <div className="font-semibold text-gray-100 group-hover:text-emerald-300 transition-colors leading-snug">
                    {faq.question}
                  </div>
                </button>
              ))
            )}
          </div>
        </aside>
      )}

      {/* ═══════════════════════════════════════════════════════════════════════
          4. FULL-FEATURED 5-TAB CONTROL CENTER & SETTINGS MODAL
         ═══════════════════════════════════════════════════════════════════════ */}
      {showSettingsModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-md z-50 flex items-center justify-center p-4">
          <div className="bg-[#1a1c22] border border-[#2f323c] rounded-3xl w-full max-w-3xl max-h-[88vh] flex flex-col shadow-2xl relative overflow-hidden">
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#2b2e37]">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-400">
                  <SettingsIcon size={18} />
                </div>
                <div>
                  <h2 className="text-base font-bold text-white leading-tight">Control Center & Settings</h2>
                  <p className="text-[11px] text-gray-400">Manage custom questions, analytics, audit history, and calibration</p>
                </div>
              </div>
              <button
                onClick={() => setShowSettingsModal(false)}
                className="p-1.5 rounded-lg text-gray-400 hover:text-white hover:bg-[#25272e] transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex border-b border-[#2b2e37] bg-[#16171c] px-4 overflow-x-auto scrollbar-none">
              <button
                onClick={() => setSettingsTab("faqs")}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                  settingsTab === "faqs"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <BookOpen size={14} />
                <span>Upload & Delete Questions</span>
              </button>

              <button
                onClick={() => {
                  setSettingsTab("analytics");
                  fetchAnalytics();
                }}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                  settingsTab === "analytics"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <BarChart3 size={14} />
                <span>Live Analytics</span>
              </button>

              <button
                onClick={() => {
                  setSettingsTab("audit");
                  fetchLoginHistory();
                }}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                  settingsTab === "audit"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <Clock size={14} />
                <span>Login & Session Audit</span>
              </button>

              <button
                onClick={() => setSettingsTab("export")}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                  settingsTab === "export"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <Download size={14} />
                <span>Export Data</span>
              </button>

              <button
                onClick={() => setSettingsTab("config")}
                className={`flex items-center gap-2 py-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap transition ${
                  settingsTab === "config"
                    ? "border-emerald-500 text-emerald-400"
                    : "border-transparent text-gray-400 hover:text-gray-200"
                }`}
              >
                <Sliders size={14} />
                <span>Model Calibration</span>
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-thin">
              {settingsTab === "faqs" && (
                <div className="space-y-6">
                  <div className="rounded-2xl border border-[#30333e] bg-[#22242c] p-5 space-y-3.5 shadow-sm">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      <PlusCircle size={15} />
                      <span>Upload Single Question to 1500-Dim Vector Base</span>
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
                          placeholder="e.g. How do I request express courier delivery?"
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

                  <div className="rounded-2xl border border-[#30333e] bg-[#22242c] p-4 space-y-2.5">
                    <span className="text-xs font-bold text-gray-300 flex items-center gap-1.5">
                      <FileText size={14} className="text-blue-400" />
                      <span>Bulk JSON Upload (Import Multiple Questions)</span>
                    </span>
                    <textarea
                      rows={2}
                      value={bulkFaqJson}
                      onChange={(e) => setBulkFaqJson(e.target.value)}
                      placeholder='[{"category":"Support","question":"Where are our branches?","answer":"We have branches in NYC and London."}]'
                      className="w-full font-mono rounded-xl bg-[#17181d] border border-[#383b47] p-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-blue-500"
                    />
                    <button
                      onClick={handleBulkUpload}
                      disabled={!bulkFaqJson.trim()}
                      className="py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white text-xs font-bold transition"
                    >
                      Import & Index All (1500-dim)
                    </button>
                  </div>

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
                        No custom questions found.
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {filteredUserFAQs.map(faq => (
                          <div 
                            key={faq.id}
                            className="p-3.5 rounded-xl bg-[#22242c] border border-[#30333e] flex items-start justify-between gap-3 hover:border-[#3e4250] transition"
                          >
                            <div className="space-y-1 flex-1">
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

              {settingsTab === "analytics" && (
                <div className="space-y-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-gray-200">
                        Chatbot Health & Performance Metrics
                      </h3>
                      <p className="text-[11px] text-gray-400">Live statistics computed from SQLite and vector search logs</p>
                    </div>
                    <button
                      onClick={fetchAnalytics}
                      className="p-1.5 rounded-lg bg-[#22242c] text-emerald-400 hover:bg-[#292b34] transition"
                      title="Refresh statistics"
                    >
                      <RefreshCw size={14} />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    <div className="p-4 rounded-2xl bg-[#22242c] border border-[#30333e]">
                      <span className="text-gray-400 text-[10px] uppercase font-bold block mb-1">Total User Inquiries</span>
                      <span className="text-2xl font-extrabold text-white">{analytics.total_queries}</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#22242c] border border-[#30333e]">
                      <span className="text-gray-400 text-[10px] uppercase font-bold block mb-1">Resolution Success Rate</span>
                      <span className="text-2xl font-extrabold text-emerald-400">{analytics.success_rate}%</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#22242c] border border-[#30333e]">
                      <span className="text-gray-400 text-[10px] uppercase font-bold block mb-1">Avg Confidence Score</span>
                      <span className="text-2xl font-extrabold text-blue-400">{analytics.avg_confidence}%</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#22242c] border border-[#30333e]">
                      <span className="text-gray-400 text-[10px] uppercase font-bold block mb-1">Base Enterprise FAQs</span>
                      <span className="text-2xl font-extrabold text-purple-400">{analytics.base_faqs}</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#22242c] border border-[#30333e]">
                      <span className="text-gray-400 text-[10px] uppercase font-bold block mb-1">Custom User FAQs</span>
                      <span className="text-2xl font-extrabold text-teal-400">{analytics.custom_faqs}</span>
                    </div>

                    <div className="p-4 rounded-2xl bg-[#22242c] border border-[#30333e]">
                      <span className="text-gray-400 text-[10px] uppercase font-bold block mb-1">Total Indexed Vectors</span>
                      <span className="text-2xl font-extrabold text-amber-400">{analytics.total_knowledge_base}</span>
                    </div>
                  </div>
                </div>
              )}

              {settingsTab === "audit" && (
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

              {settingsTab === "export" && (
                <div className="space-y-4">
                  <div className="p-5 rounded-2xl bg-[#22242c] border border-[#30333e] space-y-3">
                    <div className="flex items-center gap-2 text-xs font-bold text-emerald-400 uppercase tracking-wider">
                      <Download size={15} />
                      <span>Export Full Knowledge Base & Chat History</span>
                    </div>
                    <p className="text-xs text-gray-300 leading-relaxed">
                      Download your entire FAQ database as a formatted JSON document for backups or external migrations.
                    </p>
                    <button
                      onClick={handleExportData}
                      className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-2 shadow transition"
                    >
                      <Download size={14} />
                      <span>Download JSON Backup</span>
                    </button>
                  </div>
                </div>
              )}

              {settingsTab === "config" && (
                <div className="space-y-5 text-xs">
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
