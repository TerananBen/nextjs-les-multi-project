import { NextRequest, NextResponse } from "next/server";
import { fetchNestJs } from "@/lib/nestjs";

interface CheckResetUserResult {
  exists: boolean;
  hasEmail: boolean;
  email?: string | null;
  status: "USER_NOT_FOUND" | "NO_EMAIL" | "VALID";
}

const getCorsHeaders = (request: NextRequest) => {
  const origin = request.headers.get("origin") || "*";
  const headers: Record<string, string> = {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Private-Network": "true",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
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

export async function GET(request: NextRequest) {
  const query =
    request.nextUrl.searchParams.get("query") ||
    request.nextUrl.searchParams.get("username") ||
    request.nextUrl.searchParams.get("email") ||
    "";
  const result = await fetchNestJs<CheckResetUserResult>(`/api/users/check-reset?query=${encodeURIComponent(query)}`, {
    skipAuth: true,
  }) || { exists: false, hasEmail: false, status: "USER_NOT_FOUND" };
  return NextResponse.json(result, { headers: getCorsHeaders(request) });
}

export async function POST(request: NextRequest) {
  let identifier = "";
  try {
    const body = await request.json();
    if (body) {
      identifier = body.query || body.username || body.email || "";
    }
  } catch {
    // Body parsing error fallback
  }

  const result = await fetchNestJs<CheckResetUserResult>(`/api/users/check-reset?query=${encodeURIComponent(identifier)}`, {
    skipAuth: true,
  }) || { exists: false, hasEmail: false, status: "USER_NOT_FOUND" };
  return NextResponse.json(result, { headers: getCorsHeaders(request) });
}
