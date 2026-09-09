import { NextRequest, NextResponse } from "next/server";
import faqData from "@/data/faq_data.json";

interface FAQ {
  id: string;
  category: string;
  question: string;
  answer: string;
  keywords: string[];
}

const GREETINGS = new Set([
  "hi", "hello", "hey", "good morning", "good afternoon", "good evening",
  "greetings", "howdy", "what's up", "sup", "hi there", "hello there"
]);

const OUT_OF_SCOPE_KEYWORDS = [
  "recipe", "chocolate cake", "who is the president", "write code for",
  "tell me a joke", "play music", "weather in", "stock price", "sports score",
  "write a poem", "solve math", "translate to french"
];

const VAGUE_MAPPINGS: Record<string, string> = {
  // Category 7: Orders, Shipping & Parcel Tracking
  "track shipment": "How can I track the live delivery status of my physical shipment?",
  "track my shipment": "How can I track the live delivery status of my physical shipment?",
  "track parcel": "How can I track the live delivery status of my physical shipment?",
  "track package": "How can I track the live delivery status of my physical shipment?",
  "track order": "How can I track the live delivery status of my physical shipment?",
  "where is my stuff": "How can I track the live delivery status of my physical shipment?",
  "where is my package": "How can I track the live delivery status of my physical shipment?",
  "shipping time": "What are your standard and expedited shipping delivery estimates?",
  "delivery time": "What are your standard and expedited shipping delivery estimates?",
  "delivery estimate": "What are your standard and expedited shipping delivery estimates?",
  "express delivery": "What are your standard and expedited shipping delivery estimates?",
  "overnight shipping": "What are your standard and expedited shipping delivery estimates?",
  "change address": "Can I edit the destination address after placing an order?",
  "update address": "Can I edit the destination address after placing an order?",
  "wrong address": "Can I edit the destination address after placing an order?",
  "international delivery": "Do you deliver internationally to all global countries?",
  "international shipping": "Do you deliver internationally to all global countries?",
  "worldwide shipping": "Do you deliver internationally to all global countries?",
  "damaged shipment": "What steps should I take if my shipment arrives damaged or missing items?",
  "damaged package": "What steps should I take if my shipment arrives damaged or missing items?",
  "broken goods": "What steps should I take if my shipment arrives damaged or missing items?",
  "arrived broken": "What steps should I take if my shipment arrives damaged or missing items?",
  "arrived damaged": "What steps should I take if my shipment arrives damaged or missing items?",

  // Account & Setup
  "forgot pass": "How can I reset my forgotten password?",
  "lost password": "How can I reset my forgotten password?",
  "cant login": "How can I reset my forgotten password?",
  "reset password": "How can I reset my forgotten password?",
  "forgot credentials": "How can I reset my forgotten password?",
  "2fa": "How do I configure Two-Factor Authentication (2FA)?",
  "two factor": "How do I configure Two-Factor Authentication (2FA)?",
  "account locked": "Why is my account locked and how do I unlock it?",

  // Billing & Subscriptions
  "money back": "What is the standard refund policy?",
  "refund policy": "What is the standard refund policy?",
  "pricing plans": "What subscription plans are available?",
  "subscription cost": "What subscription plans are available?",
  "cancel subscription": "How do I cancel my active subscription?",
  "stop plan": "How do I cancel my active subscription?",
  "download invoice": "Where can I download my monthly tax invoices and receipts?",
  "tax invoice": "Where can I download my monthly tax invoices and receipts?",
  "pay methods": "What payment methods and currencies do you support?",
  "payment methods": "What payment methods and currencies do you support?",

  // Features & Support
  "dark mode": "How do I enable Dark Mode theme in the web application?",
  "night theme": "How do I enable Dark Mode theme in the web application?",
  "talk to person": "How do I contact human customer support?",
  "human support": "How do I contact human customer support?",
  "contact support": "How do I contact human customer support?",
  "shortcuts": "What keyboard shortcuts are available to speed up navigation?"
};

function getVector(text: string, dimension = 384): number[] {
  const vec = new Array(dimension).fill(0);
  const words = text.toLowerCase().replace(/[^\w\s]/g, "").split(/\s+/).filter(Boolean);
  
  for (const word of words) {
    let hash = 0;
    for (let i = 0; i < word.length; i++) {
      hash = ((hash << 5) - hash) + word.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % dimension;
    const sign = (hash % 2 === 0) ? 1.0 : -1.0;
    vec[idx] += sign * (1.0 + word.length * 0.1);
  }

  let norm = 0;
  for (let i = 0; i < dimension; i++) norm += vec[i] * vec[i];
  norm = Math.sqrt(norm);

  if (norm > 0) {
    for (let i = 0; i < dimension; i++) vec[i] /= norm;
  } else {
    vec[0] = 1.0;
  }
  return vec;
}

function cosineSimilarity(v1: number[], v2: number[]): number {
  let dot = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
  }
  return Math.max(0, Math.min(1, dot));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const userQuery = (body.question || "").trim();
    const threshold = typeof body.threshold === "number" ? body.threshold : 0.50;

    // Step 3: Input validation
    if (!userQuery || userQuery.length < 2) {
      return NextResponse.json({
        answer: "Please enter a valid question so I can assist you.",
        confidence_score: 0.0,
        threshold,
        is_fallback: true,
        route: "EMPTY",
        suggested_questions: [
          "How can I track the live delivery status of my physical shipment?",
          "What are your standard and expedited shipping delivery estimates?",
          "Can I edit the destination address after placing an order?"
        ]
      });
    }

    const cleanLower = userQuery.toLowerCase().replace(/[^\w\s]/g, "").trim();

    // Step 4: Query Router - Greeting Check
    if (GREETINGS.has(cleanLower)) {
      return NextResponse.json({
        answer: "Hello! 👋 I am your automated Customer Support FAQ Assistant. How can I help you today? Feel free to ask about orders, shipping tracking, billing, or refunds!",
        confidence_score: 1.0,
        threshold,
        is_fallback: false,
        route: "GREETING",
        suggested_questions: [
          "How can I track the live delivery status of my physical shipment?",
          "What are your standard and expedited shipping delivery estimates?",
          "Can I edit the destination address after placing an order?"
        ]
      });
    }

    // Step 4: Query Router - Out of Scope Check
    for (const pattern of OUT_OF_SCOPE_KEYWORDS) {
      if (cleanLower.includes(pattern)) {
        return NextResponse.json({
          answer: "I apologize, but that topic is outside our FAQ knowledge base. I can assist with orders, shipment tracking, billing, account security, and technical support.",
          confidence_score: 0.0,
          threshold,
          is_fallback: true,
          route: "OUT_OF_SCOPE",
          suggested_questions: [
            "How can I track the live delivery status of my physical shipment?",
            "What are your standard and expedited shipping delivery estimates?",
            "What steps should I take if my shipment arrives damaged or missing items?"
          ]
        });
      }
    }

    // Step 7: Query Rewriter
    let rewrittenQuery = userQuery;
    for (const [vague, expanded] of Object.entries(VAGUE_MAPPINGS)) {
      if (cleanLower.includes(vague)) {
        rewrittenQuery = expanded;
        break;
      }
    }

    // Step 5: Semantic Search against 50 FAQs
    const queryVector = getVector(rewrittenQuery);
    const scoredFaqs = (faqData as FAQ[]).map(faq => {
      const faqText = faq.question + " " + (faq.keywords || []).join(" ");
      const docVector = getVector(faqText);
      const score = cosineSimilarity(queryVector, docVector);
      return { faq, score };
    });

    scoredFaqs.sort((a, b) => b.score - a.score);
    const topMatch = scoredFaqs[0];
    const topCandidates = scoredFaqs.slice(0, 3);

    // Step 6: Answer Selection (Threshold Gating)
    if (!topMatch || topMatch.score < threshold) {
      // Step 9: Fallback Handler
      const suggestions = topCandidates
        .map(c => c.faq.question)
        .filter(Boolean)
        .slice(0, 3);

      return NextResponse.json({
        answer: "I'm sorry, I couldn't find a direct answer to your question in our FAQ database. You can rephrase your question or explore one of the common topics below, or reach out to support@example.com.",
        confidence_score: topMatch ? topMatch.score : 0.0,
        threshold,
        is_fallback: true,
        route: "FAQ_SEARCH",
        rewritten_query: rewrittenQuery !== userQuery ? rewrittenQuery : null,
        suggested_questions: suggestions.length > 0 ? suggestions : [
          "How can I track the live delivery status of my physical shipment?",
          "What are your standard and expedited shipping delivery estimates?",
          "Can I edit the destination address after placing an order?"
        ]
      });
    }

    // Step 8: Grounded Response Writer
    const selected = topMatch.faq;
    const finalAnswer = `${selected.answer}\n\n📌 *Related Topic: ${selected.category}*\n*(Matched Question: "${selected.question}")*`;

    return NextResponse.json({
      answer: finalAnswer,
      confidence_score: topMatch.score,
      threshold,
      is_fallback: false,
      route: "FAQ_SEARCH",
      rewritten_query: rewrittenQuery !== userQuery ? rewrittenQuery : null,
      matched_faq: {
        id: selected.id,
        question: selected.question,
        category: selected.category,
        answer: selected.answer
      },
      suggested_questions: topCandidates.slice(1).map(c => c.faq.question)
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: "Internal server error", details: err?.message || String(err) },
      { status: 500 }
    );
  }
}
