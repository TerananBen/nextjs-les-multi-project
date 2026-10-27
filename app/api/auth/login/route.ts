import { NextRequest, NextResponse } from "next/server";
import { getKeycloakLoginUrl, isKeycloakConfigured, generatePkcePair, getAuthCallbackUri } from "@/lib/keycloak";
import { isIpAddress } from "@/config/projects";

export async function GET(request: NextRequest) {
  if (!isKeycloakConfigured()) {
    return NextResponse.json(
      { error: "Keycloak is not configured in environment variables." },
      { status: 500 }
    );
  }

  const { searchParams } = request.nextUrl;
  const locale = searchParams.get("locale") || process.env.DEFAULT_LOCALE || "th";
  const returnUrl = searchParams.get("returnUrl") || `/${locale}/dashboard/group`;

  // Resolve project client ID from host subdomain or cookie
  const host = (request.headers.get("x-forwarded-host") || request.headers.get("host") || "").split(",")[0].trim();
  const hostWithoutPort = host.split(":")[0].toLowerCase();
  const isIp = isIpAddress(hostWithoutPort);
  const parts = hostWithoutPort.split(".");
  const isLocalhost = hostWithoutPort.endsWith("localhost");
  const minParts = isLocalhost ? 1 : 2;

  let projectClientId: string | undefined;
  if (!isIp && parts.length > minParts && parts[0] && parts[0] !== "www") {
    projectClientId = parts[0];
  } else {
    const cookieProject = request.cookies.get("current_project")?.value;
    if (cookieProject) {
      projectClientId = cookieProject;
    }
  }

  if (!projectClientId) {
    projectClientId = process.env.KEYCLOAK_CLIENT_ID || "project-a";
  }

  const state = JSON.stringify({
    locale,
    returnUrl,
    clientId: projectClientId || undefined,
  });

  const { codeVerifier, codeChallenge } = generatePkcePair();

  const prompt = searchParams.get("prompt") || undefined;
  const redirectUri = getAuthCallbackUri(request);
  const keycloakAuthUrl = getKeycloakLoginUrl(
    redirectUri,
    state,
    locale,
    projectClientId || undefined,
    codeChallenge,
    prompt
  );

  const isLocal = host.includes("localhost") || host.includes("127.0.0.1");
  const isSecure = !isLocal && (request.nextUrl.protocol === "https:" || request.headers.get("x-forwarded-proto") === "https");

  const response = NextResponse.redirect(keycloakAuthUrl);
  response.cookies.set("pkce_verifier", codeVerifier, {
    httpOnly: true,
    secure: isSecure,
    sameSite: "lax",
    path: "/",
    maxAge: 300,
  });
  // Clear any existing session tokens so a fresh login is forced
  response.cookies.delete("jwt");
  response.cookies.delete("refresh_token");
  response.cookies.delete("menuRole");

  return response;
}
