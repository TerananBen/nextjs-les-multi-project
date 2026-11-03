import { NextRequest, NextResponse } from "next/server";
import { verifyProfileEmailOtp } from "@/lib/email-otp-service";
import { fetchNestJs } from "@/lib/nestjs";

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
    const otp = body?.otp || body?.code || "";
    const locale = body?.locale || "th";
    const userId = body?.userId || "";
    const username = body?.username || "";

    const result = verifyProfileEmailOtp(email, otp, locale);
    if (result.verified && result.success) {
      try {
        await fetchNestJs("/api/users/verify-email", {
          method: "POST",
          body: JSON.stringify({ userId, username, email }),
          skipAuth: true,
        });
      } catch (kcErr) {
        console.warn("[Profile OTP Verify] Warning: Failed to update email verification on backend:", kcErr);
      }
    }
    return NextResponse.json(result, { headers: getCorsHeaders(request) });
  } catch (err) {
    console.error("[Profile OTP Verify API] Error:", err);
    return NextResponse.json(
      { success: false, verified: false, message: "Internal server error" },
      { status: 500, headers: getCorsHeaders(request) }
    );
  }
}
