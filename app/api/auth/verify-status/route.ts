import { NextRequest, NextResponse } from "next/server";
import {
  registerPendingEmail,
  getVerificationRecord,
} from "@/lib/verify-email-store";

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

export async function POST(request: NextRequest) {
  let email: string | undefined;
  let username: string | undefined;

  try {
    const body = await request.json();
    if (body) {
      if (typeof body.email === "string") email = body.email.trim();
      if (typeof body.username === "string") username = body.username.trim();
    }
  } catch {
    // Body may be empty
  }

  registerPendingEmail(email, username);

  const response = NextResponse.json(
    { success: true, waiting: true, email: email || null, username: username || null },
    { headers: getCorsHeaders(request) }
  );

  const host = request.headers.get("host") || "";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const usingHttps = !isLocal && (process.env.USING_HTTPS === "true" || request.nextUrl.protocol === "https:");

  response.cookies.set("verify_email_waiting", "true", {
    path: "/",
    httpOnly: false,
    secure: usingHttps,
    sameSite: "lax",
    maxAge: 900, // 15 minutes
  });

  return response;
}

// 1x1 transparent GIF buffer for Image beacon registration
const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64"
);

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const action = searchParams.get("action");
  const callback = searchParams.get("callback");
  const emailParam = searchParams.get("email") || undefined;
  const userParam = searchParams.get("username") || undefined;

  // Helper to respond with either JSON or JSONP
  const respond = (data: Record<string, unknown>, setCookiesFn?: (res: NextResponse) => void) => {
    if (callback && /^[a-zA-Z0-9_$.]+$/.test(callback)) {
      const jsCode = `${callback}(${JSON.stringify(data)});`;
      const res = new NextResponse(jsCode, {
        status: 200,
        headers: {
          "Content-Type": "application/javascript; charset=utf-8",
          "Cache-Control": "no-store, no-cache, must-revalidate",
          ...getCorsHeaders(request),
        },
      });
      if (setCookiesFn) setCookiesFn(res);
      return res;
    }

    const res = NextResponse.json(data, {
      headers: getCorsHeaders(request),
    });
    if (setCookiesFn) setCookiesFn(res);
    return res;
  };

  // Beacon / Image-based registration (bypass all CORS & Private Network restrictions)
  if (action === "register") {
    registerPendingEmail(emailParam, userParam);

    const host = request.headers.get("host") || "";
    const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
    const usingHttps = !isLocal && (process.env.USING_HTTPS === "true" || request.nextUrl.protocol === "https:");

    const res = new NextResponse(TRANSPARENT_GIF, {
      status: 200,
      headers: {
        "Content-Type": "image/gif",
        "Cache-Control": "no-store, no-cache, must-revalidate",
        ...getCorsHeaders(request),
      },
    });

    res.cookies.set("verify_email_waiting", "true", {
      path: "/",
      httpOnly: false,
      secure: usingHttps,
      sameSite: "lax",
      maxAge: 900, // 15 minutes
    });

    return res;
  }

  const defaultLocale = process.env.DEFAULT_LOCALE || "th";
  const locale = searchParams.get("locale") || defaultLocale;

  const host = request.headers.get("host") || "";
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const usingHttps = !isLocal && (process.env.USING_HTTPS === "true" || request.nextUrl.protocol === "https:");
  const proto = request.headers.get("x-forwarded-proto") || (usingHttps ? "https" : "http");

  // 1. Check in store by email or username
  const record = getVerificationRecord(emailParam || userParam);
  if (record && record.status === "verified") {
    const rawRedirect = record.redirectUrl && record.redirectUrl !== "/" ? record.redirectUrl : `/${locale}/dashboard/group`;
    const fullRedirectUrl = rawRedirect.startsWith("http")
      ? rawRedirect
      : new URL(rawRedirect, `${proto}://${host}`).toString();

    const response = respond(
      { verified: true, action: "redirect", redirectUrl: fullRedirectUrl },
      (res) => {
        if (record.tokens?.accessToken) {
          res.cookies.set("jwt", record.tokens.accessToken, {
            httpOnly: true,
            secure: usingHttps,
            sameSite: "lax",
            path: "/",
          });
        }
        if (record.tokens?.refreshToken) {
          res.cookies.set("refresh_token", record.tokens.refreshToken, {
            httpOnly: true,
            secure: usingHttps,
            sameSite: "lax",
            path: "/",
          });
        }
        if (record.tokens?.idToken) {
          res.cookies.set("id_token", record.tokens.idToken, {
            httpOnly: true,
            secure: usingHttps,
            sameSite: "lax",
            path: "/",
          });
        }
        if (record.projectId) {
          res.cookies.set("current_project", record.projectId, {
            httpOnly: false,
            secure: usingHttps,
            sameSite: "lax",
            path: "/",
          });
        }
        if (record.roles && record.roles.length > 0) {
          res.cookies.set("menuRole", record.roles[0], {
            httpOnly: false,
            secure: usingHttps,
            sameSite: "lax",
            path: "/",
          });
        }
      }
    );

    return response;
  }

  // 2. Query NestJS API (which queries Keycloak DB directly in real-time)
  if (emailParam || userParam) {
    try {
      const nestJsUrl = `${process.env.API_URL || "http://localhost:5000"}/api/iam/users/verify-status?email=${encodeURIComponent(emailParam || "")}&username=${encodeURIComponent(userParam || "")}`;
      const nestRes = await fetch(nestJsUrl, { cache: "no-store" });
      if (nestRes.ok) {
        const nestData = (await nestRes.json()) as { verified?: boolean };
        if (nestData?.verified) {
          const fullRedirectUrl = new URL(`/${locale}/dashboard/group`, `${proto}://${host}`).toString();
          return respond({
            verified: true,
            action: "redirect",
            redirectUrl: fullRedirectUrl,
          });
        }
      }
    } catch (err) {
      console.warn("[Verify Status] Failed to query NestJS DB verify status:", err);
    }
  }

  return respond({ verified: false });
}
