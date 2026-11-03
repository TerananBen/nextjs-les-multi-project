import { NextRequest, NextResponse } from "next/server";
import { getKeycloakLogoutUrl, logoutKeycloak, isKeycloakTokenValid } from "@/lib/keycloak";
import { resolveProjectSlug, isIpAddress } from "@/config/projects";

export async function GET(request: NextRequest) {
  const refreshToken = request.cookies.get("refresh_token")?.value;
  const idToken = request.cookies.get("id_token")?.value;
  const currentProject = request.cookies.get("current_project")?.value;

  // Determine host and protocol
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(",")[0].trim();
  const hostWithoutPort = host.split(":")[0].toLowerCase();
  const isIp = isIpAddress(hostWithoutPort);
  const parts = hostWithoutPort.split(".");
  const isLocalhost = hostWithoutPort.endsWith("localhost");
  const minParts = isLocalhost ? 1 : 2;

  let resolvedClientId: string | undefined;
  if (!isIp && parts.length > minParts && parts[0] && parts[0] !== "www") {
    resolvedClientId = resolveProjectSlug(parts[0]);
  }
  if (!resolvedClientId && currentProject) {
    resolvedClientId = resolveProjectSlug(currentProject);
  }
  if (!resolvedClientId) {
    resolvedClientId = process.env.KEYCLOAK_CLIENT_ID || "project-a";
  }

  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const proto = request.headers.get("x-forwarded-proto") || (isLocal ? "http" : (process.env.USING_HTTPS === "true" ? "https" : "http"));
  const appUrl = host ? `${proto}://${host}` : (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3008");

  const loginUrl = `${appUrl}/api/auth/login?prompt=login`;

  let targetUrl: string = loginUrl;
  const hasValidIdToken = isKeycloakTokenValid(idToken);

  if (hasValidIdToken && idToken) {
    // If idToken is valid, frontchannel logout with id_token_hint clears Keycloak session & browser cookies and redirects to post_logout_redirect_uri.
    // Do NOT invoke backchannel logout first, as it would destroy the session and cause Keycloak to reject id_token_hint as expired/invalid.
    const keycloakLogoutUrl = getKeycloakLogoutUrl(loginUrl, idToken, resolvedClientId);
    if (keycloakLogoutUrl) {
      targetUrl = keycloakLogoutUrl;
    }
  } else if (refreshToken) {
    // If idToken is expired or absent, do NOT send expired id_token_hint to Keycloak (which causes EXPIRED_ACTION error).
    // Instead, terminate session via backchannel logout and redirect directly to login with prompt=login.
    try {
      await logoutKeycloak(refreshToken, resolvedClientId);
    } catch (e) {
      console.warn("[Logout] Backchannel logout failed:", e);
    }
  }

  const response = NextResponse.redirect(targetUrl);

  // Force clear all auth cookies on the response
  response.cookies.set("jwt", "", { path: "/", maxAge: 0 });
  response.cookies.set("refresh_token", "", { path: "/", maxAge: 0 });
  response.cookies.set("id_token", "", { path: "/", maxAge: 0 });
  response.cookies.set("menuRole", "", { path: "/", maxAge: 0 });
  response.cookies.set("current_project", "", { path: "/", maxAge: 0 });
  response.cookies.set("remember_me", "", { path: "/", maxAge: 0 });
  response.cookies.set("pkce_verifier", "", { path: "/", maxAge: 0 });
  response.cookies.delete("jwt");
  response.cookies.delete("refresh_token");
  response.cookies.delete("id_token");
  response.cookies.delete("menuRole");
  response.cookies.delete("current_project");
  response.cookies.delete("current_tenant");
  response.cookies.delete("remember_me");
  response.cookies.delete("pkce_verifier");

  return response;
}
