import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    status: "online",
    service: "FAQ Chatbot Cloud Engine",
    pinecone_connected: false,
    default_threshold: 0.50,
    embedding_model: "semantic-vector-engine",
    cloud_hosted: true
  });
}
