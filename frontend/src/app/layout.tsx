import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Intelligent FAQ Chatbot | Pinecone Vector Search",
  description: "AI-Powered FAQ Chatbot with Semantic Search, Intent Routing, and Grounded Synthesis",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
