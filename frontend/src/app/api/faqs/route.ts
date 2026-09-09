import { NextResponse } from "next/server";
import faqData from "@/data/faq_data.json";

export async function GET() {
  return NextResponse.json(faqData);
}
