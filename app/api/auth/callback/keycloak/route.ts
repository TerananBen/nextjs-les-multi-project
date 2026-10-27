import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import {
  exchangeKeycloakCode,
  extractAllProjectIdsFromPayload,
  extractProjectCodeFromPayload,
  extractRolesFromPayload,
  getAuthCallbackUri,
  logoutKeycloak,
  refreshKeycloakToken,
  updateUserActiveProject,
} from "@/lib/keycloak";
import { resolveProjectUuid, resolveProjectSlug, isIpAddress } from "@/config/projects";
import { markEmailVerified } from "@/lib/verify-email-store";

export async function GET(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const errorDesc = searchParams.get("error_description");
  const state = searchParams.get("state");

  // Determine locale from cookie or default
  const defaultLocale = process.env.DEFAULT_LOCALE || "th";
  let targetLocale = defaultLocale;
  let returnUrl = `/${targetLocale}/dashboard/group`;
  let resolvedClientId: string | undefined;

  if (state) {
    try {
      // If state is JSON encoded with returnUrl, locale, and clientId
      if (state.startsWith("{")) {
        const parsedState = JSON.parse(state);
        if (parsedState.locale && (parsedState.locale === "th" || parsedState.locale === "en")) {
          targetLocale = parsedState.locale;
        } else {
          targetLocale = "th";
        }
        if (parsedState.returnUrl && parsedState.returnUrl.startsWith("/")) {
          returnUrl = parsedState.returnUrl;
        }
        if (parsedState.clientId) {
          resolvedClientId = parsedState.clientId;
        }
      } else if (state.startsWith("/")) {
        returnUrl = state;
        const potentialLocale = state.split("/")[1];
        if (potentialLocale === "th" || potentialLocale === "en") {
          targetLocale = potentialLocale;
        }
      }
    } catch {
      targetLocale = "th";
    }
  }

  // Ensure returnUrl always has the proper locale prefix
  if (returnUrl === "/" || returnUrl === "") {
    returnUrl = `/${targetLocale}/dashboard/group`;
  } else if (!returnUrl.startsWith("/th/") && !returnUrl.startsWith("/en/") && returnUrl !== "/th" && returnUrl !== "/en") {
    returnUrl = `/${targetLocale}${returnUrl}`;
  }

  // Fallback clientId from subdomain
  if (!resolvedClientId) {
    const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(",")[0].trim();
    const hostWithoutPort = host.split(":")[0].toLowerCase();
    if (!isIpAddress(hostWithoutPort)) {
      const sub = hostWithoutPort.split(".")[0];
      if (sub && sub !== "localhost" && sub !== "www") {
        resolvedClientId = sub;
      }
    }
  }

  if (!resolvedClientId) {
    resolvedClientId = process.env.KEYCLOAK_CLIENT_ID || "project-a";
  }

  // Handle Keycloak error responses (e.g. user cancelled)
  if (error || !code) {
    console.warn(`[Keycloak Callback] Auth error or missing code: ${error} - ${errorDesc}`);
    const loginRedirect = new URL(`/${targetLocale}/login`, request.url);
    if (error) loginRedirect.searchParams.set("error", error);
    return NextResponse.redirect(loginRedirect);
  }

  // Retrieve PKCE verifier from cookie
  const cookieStore = await cookies();
  const codeVerifier = cookieStore.get("pkce_verifier")?.value;
  cookieStore.delete("pkce_verifier");

  // Determine callback redirect URI exactly matching the one sent in auth request
  const redirectUri = getAuthCallbackUri(request);
  const authResult = await exchangeKeycloakCode(code, redirectUri, resolvedClientId, codeVerifier);

  if (!authResult.success || !authResult.tokenData?.access_token) {
    console.error(`[Keycloak Callback] Token exchange failed: ${authResult.message}`);
    const loginRedirect = new URL(`/${targetLocale}/login`, request.url);
    loginRedirect.searchParams.set("error", "token_exchange_failed");
    return NextResponse.redirect(loginRedirect);
  }

  const { tokenData, payload } = authResult;
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(",")[0].trim();
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const usingHttps = !isLocal && (process.env.USING_HTTPS === "true" || request.nextUrl.protocol === "https:");

  // Extract client or realm role and cache in menuRole cookie
  const roles = extractRolesFromPayload(payload, resolvedClientId);
  const isSuperAdmin = roles.some((r) => {
    const lower = r.toLowerCase();
    return lower.includes("superadmin") || lower.includes("super_admin") || lower.includes("super-admin");
  });

  // Auto-set project: prioritize client / subdomain where login was initiated if allowed
  const allowedProjects = extractAllProjectIdsFromPayload(payload);
  const allowedUuids = allowedProjects.map((p) => resolveProjectUuid(p));
  const targetFromClient = resolvedClientId ? resolveProjectUuid(resolvedClientId) : undefined;

  // Check if user is attempting to log into an unauthorized subdomain project
  const isHostProjectUnauthorized =
    targetFromClient &&
    !isSuperAdmin &&
    allowedUuids.length > 0 &&
    !allowedUuids.includes(targetFromClient) &&
    (!resolvedClientId || !allowedProjects.includes(resolvedClientId));

  if (isHostProjectUnauthorized) {
    if (tokenData.refresh_token) {
      await logoutKeycloak(tokenData.refresh_token, resolvedClientId);
    }
    const unauthRedirect = new URL(`/${targetLocale}/unauthorized`, request.url);
    const response = NextResponse.redirect(unauthRedirect);
    response.cookies.delete("jwt");
    response.cookies.delete("refresh_token");
    response.cookies.delete("id_token");
    response.cookies.delete("current_project");
    response.cookies.delete("menuRole");
    response.cookies.delete("remember_me");
    response.cookies.delete("pkce_verifier");
    return response;
  }

  // Differentiate Remember Me (long-lived persistent session) from standard session.
  // In Keycloak, when Remember Me is configured, refresh_expires_in reflects the extended remember me lifespan (> 1 day / 86400s).
  // Standard sessions (without Remember Me) have refresh_expires_in <= realm idle/max timeout.
  // For standard sessions, cookies must NOT have maxAge so they are Session Cookies (cleared when browser closes).
  const isRememberMe = Boolean(tokenData.refresh_expires_in && tokenData.refresh_expires_in > 86400);
  const sessionMaxAge = isRememberMe ? tokenData.refresh_expires_in : undefined;

  const cookieOptions = {
    httpOnly: true,
    secure: usingHttps,
    sameSite: "lax" as const,
    path: "/",
    ...(sessionMaxAge !== undefined ? { maxAge: sessionMaxAge } : {}),
  };

  const clientCookieOptions = {
    httpOnly: false,
    secure: usingHttps,
    sameSite: "lax" as const,
    path: "/",
    ...(sessionMaxAge !== undefined ? { maxAge: sessionMaxAge } : {}),
  };

  const tokenProjectCode = extractProjectCodeFromPayload(payload);
  const cleanTokenProjectCode = tokenProjectCode && !tokenProjectCode.toLowerCase().includes("[object") ? tokenProjectCode : undefined;
  let activeProjectId: string | undefined =
    cleanTokenProjectCode ||
    (targetFromClient && (isSuperAdmin || allowedProjects.includes(resolvedClientId!)) ? targetFromClient : undefined) ||
    resolvedClientId ||
    (allowedProjects.length > 0 && !allowedProjects[0].toLowerCase().includes("[object") ? allowedProjects[0] : undefined);

  if (!activeProjectId || activeProjectId.toLowerCase().includes("[object")) {
    activeProjectId = process.env.DEFAULT_PROJECT_CODE || "project-a";
  }

  const projectSlug = resolveProjectSlug(activeProjectId) || "project-a";

  // Update active project in Keycloak user attributes and refresh token to get updated claims
  if (payload?.sub && projectSlug) {
    await updateUserActiveProject(payload.sub, projectSlug);
    if (tokenData.refresh_token) {
      const refreshed = await refreshKeycloakToken(tokenData.refresh_token);
      if (refreshed?.access_token) {
        tokenData.access_token = refreshed.access_token;
        if (refreshed.refresh_token) {
          tokenData.refresh_token = refreshed.refresh_token;
        }
      }
    }
  }

  // Set JWT access token cookie
  cookieStore.set("jwt", tokenData.access_token, cookieOptions);

  // Set Refresh token cookie
  if (tokenData.refresh_token) {
    cookieStore.set("refresh_token", tokenData.refresh_token, cookieOptions);
  }

  // Set ID token cookie (used for Keycloak logout hint)
  if (tokenData.id_token) {
    cookieStore.set("id_token", tokenData.id_token, cookieOptions);
  }

  if (activeProjectId) {
    cookieStore.set("current_project", activeProjectId, clientCookieOptions);
  }

  if (roles.length > 0) {
    cookieStore.set("menuRole", roles[0], clientCookieOptions);
  }

  if (isRememberMe) {
    cookieStore.set("remember_me", "1", {
      httpOnly: true,
      secure: usingHttps,
      sameSite: "lax",
      path: "/",
      maxAge: sessionMaxAge,
    });
  } else {
    cookieStore.delete("remember_me");
  }

  cookieStore.set("NEXT_LOCALE", targetLocale, {
    path: "/",
    maxAge: 365 * 24 * 60 * 60, // Persist language preference for 1 year
    sameSite: "lax",
  });

  // Record user last login timestamp in NestJS (Keycloak user_attribute)
  if (payload?.sub) {
    fetch(`${process.env.API_URL || "http://localhost:5000"}/api/iam/users/${encodeURIComponent(payload.sub)}/login`, {
      method: "POST",
    }).catch((err) => console.error("[Keycloak Callback] Failed to record login:", err));
  }

  // Detect email verification callback (Tab 2 only)
  const userEmail = payload?.email ? String(payload.email).toLowerCase().trim() : undefined;
  const username = payload?.preferred_username ? String(payload.preferred_username).toLowerCase().trim() : undefined;
  const referer = request.headers.get("referer") || "";
  const isActionTokenReferer = referer.includes("action-token") || referer.includes("execution=VERIFY_EMAIL");

  const isFromVerifyEmail = isActionTokenReferer;

  if (isFromVerifyEmail) {
    cookieStore.delete("verify_email_waiting");

    markEmailVerified(userEmail || username, {
      redirectUrl: returnUrl,
      tokens: {
        accessToken: tokenData.access_token,
        refreshToken: tokenData.refresh_token,
        idToken: tokenData.id_token,
      },
      projectId: activeProjectId,
      roles,
    });

    const closeHtml = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script>
    function tryClose() {
      try {
        window.opener = null;
        window.open('', '_self');
        window.close();
      } catch (e) {}
    }
    tryClose();
  </script>
</head>
<body onload="tryClose()" style="background:#090d16;margin:0;">
  <script>
    tryClose();
    setTimeout(tryClose, 50);
    setTimeout(tryClose, 200);
  </script>
</body>
</html>`;

    const closeResponse = new NextResponse(closeHtml, {
      status: 200,
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    });

    closeResponse.cookies.set("jwt", tokenData.access_token, cookieOptions);
    if (tokenData.refresh_token) {
      closeResponse.cookies.set("refresh_token", tokenData.refresh_token, cookieOptions);
    }
    if (tokenData.id_token) {
      closeResponse.cookies.set("id_token", tokenData.id_token, cookieOptions);
    }
    if (activeProjectId) {
      closeResponse.cookies.set("current_project", activeProjectId, clientCookieOptions);
    }
    if (roles.length > 0) {
      closeResponse.cookies.set("menuRole", roles[0], clientCookieOptions);
    }
    if (isRememberMe) {
      closeResponse.cookies.set("remember_me", "1", {
        httpOnly: true,
        secure: usingHttps,
        sameSite: "lax",
        path: "/",
        maxAge: sessionMaxAge,
      });
    } else {
      closeResponse.cookies.delete("remember_me");
    }
    closeResponse.cookies.set("NEXT_LOCALE", targetLocale, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60,
      sameSite: "lax",
    });
    closeResponse.cookies.delete("verify_email_waiting");

    return closeResponse;
  }

  // Redirect to target dashboard preserving the actual host / subdomain
  const proto = request.headers.get("x-forwarded-proto") || (usingHttps ? "https" : "http");
  const destination = new URL(returnUrl, `${proto}://${host}`);
  return NextResponse.redirect(destination);
}
