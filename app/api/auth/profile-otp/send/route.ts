import { NextRequest, NextResponse } from "next/server";
import { sendProfileEmailOtp } from "@/lib/email-otp-service";

const getCorsHeaders = (request: NextRequest) => {
  const origin = request.headers.get("origin") || "*";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Private-Network": "true",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization, *",
  };
  if (origin !== "*") {
    headers["Access-Control-Allow-Credentials"] = "true";
  }
  return headers;
};

export async function OPTIONS(request: NextRequest) {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(request),
  });
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const email = body?.email || "";
    const locale = body?.locale || "th";

    const result = await sendProfileEmailOtp(email, locale);
    return NextResponse.json(result, { headers: getCorsHeaders(request) });
  } catch (err) {
    console.error("[Profile OTP Send API] Error:", err);
    return NextResponse.json(
      { success: false, message: "Internal server error" },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}
