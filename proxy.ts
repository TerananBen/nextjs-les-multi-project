import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { NextRequest, NextResponse } from "next/server";
import { getProjectByDomain, getProjectById, DEFAULT_PROJECT, resolveProjectUuid, resolveProjectSlug, normalizeHostWithProject, isIpAddress } from "@/config/projects";
import { decodeJwtPayload, extractAllProjectIdsFromPayload, extractProjectCodeFromPayload, extractRolesFromPayload, refreshKeycloakToken, updateUserActiveProject } from "@/lib/keycloak";

export default async function proxy(request: NextRequest) {
  const defaultLocale =
    (process.env.DEFAULT_LOCALE as "en" | "th") || "th";
  const getValidLocale = (path: string): string => {
    const firstSegment = path.split("/")[1]?.toLowerCase();
    if (firstSegment && (routing.locales as readonly string[]).includes(firstSegment)) {
      return firstSegment;
    }
    return defaultLocale;
  };
  const intlMiddleware = createMiddleware({
    ...routing,
    defaultLocale,
    localeDetection: false,
  });

  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/api")) {
    return NextResponse.next();
  }

  const rawHost = request.headers.get("host") || "";
  const hostWithoutPort = rawHost.split(":")[0].toLowerCase();

  // ── Project Resolution ──────────────────────────────────
  let projectId: string | undefined;

  const rawToken = request.cookies.get("jwt")?.value;
  const existingCookieProject = request.cookies.get("current_project")?.value;

  // 1. Subdomain resolution has TOP PRIORITY (e.g. project-a.localhost or project-a.les.io)
  const isIp = isIpAddress(hostWithoutPort);
  const parts = hostWithoutPort.split(".");
  const isLocalhost = hostWithoutPort.endsWith("localhost") || hostWithoutPort === "127.0.0.1";
  const minParts = isLocalhost ? 1 : 2;

  if (!isIp && parts.length > minParts) {
    const candidateSub = parts[0];
    if (candidateSub && candidateSub !== "www") {
      projectId = candidateSub;
    }
  }

  // 2. Custom domain resolution (skip localhost so cookie persistence works in dev)
  if (!projectId && hostWithoutPort !== "localhost" && hostWithoutPort !== "127.0.0.1") {
    const projectByDomain = getProjectByDomain(hostWithoutPort);
    if (projectByDomain) {
      projectId = projectByDomain.code || projectByDomain.id;
    }
  }

  // 3. User project selection (Cookie persistence) & Token-based resolution
  if (!projectId) {
    let tokenProjectCode: string | undefined;
    let allowedProjects: string[] = [];
    let isSuperAdmin = false;

    if (rawToken) {
      const payload = decodeJwtPayload(rawToken);
      tokenProjectCode = extractProjectCodeFromPayload(payload);
      allowedProjects = extractAllProjectIdsFromPayload(payload);
      const roles = extractRolesFromPayload(payload);
      isSuperAdmin = roles.some((r) => {
        const lower = r.toLowerCase();
        return lower.includes("superadmin") || lower.includes("super_admin") || lower.includes("super-admin");
      });
    }

    // A. Priority to user's selected project from cookie if valid and permitted
    if (existingCookieProject) {
      const isCookieAllowed =
        !rawToken ||
        isSuperAdmin ||
        allowedProjects.length === 0 ||
        allowedProjects.some((p) => {
          const cleanP = p.toLowerCase();
          const cleanC = existingCookieProject.toLowerCase();
          return cleanP === cleanC || resolveProjectUuid(cleanP) === resolveProjectUuid(cleanC);
        }) ||
        (tokenProjectCode ? tokenProjectCode.toLowerCase() === existingCookieProject.toLowerCase() : false);

      if (isCookieAllowed && getProjectById(existingCookieProject)) {
        projectId = existingCookieProject;
      }
    }

    // B. Token-based fallback if no cookie or cookie not allowed
    if (!projectId) {
      if (tokenProjectCode) {
        projectId = tokenProjectCode;
      } else if (allowedProjects.length > 0) {
        projectId = allowedProjects[0];
      }
    }
  }

  // 4. Default fallback
  if (!projectId) {
    projectId = DEFAULT_PROJECT || "nb32-nbiot";
  }

  // Determine if cookie needs to be set/updated
  const shouldSetCookie =
    !existingCookieProject ||
    existingCookieProject !== projectId;

  // ── Helper: set project cookie on response ──────────────
  const applyProjectCookie = (response: NextResponse) => {
    if (shouldSetCookie) {
      response.cookies.set("current_project", projectId!, {
        path: "/",
        httpOnly: false,
        sameSite: "lax",
      });
    }
    // Actively delete legacy current_tenant cookie if present
    if (request.cookies.has("current_tenant")) {
      response.cookies.delete("current_tenant");
    }
    return response;
  };

  // In local development, if accessing via bare localhost / 127.0.0.1, redirect to the tenant subdomain
  if (isLocalhost && (hostWithoutPort === "localhost" || hostWithoutPort === "127.0.0.1")) {
    const targetSlug = resolveProjectSlug(projectId) || DEFAULT_PROJECT || "nb32-nbiot";
    const targetHost = normalizeHostWithProject(rawHost, targetSlug);
    const redirectUrl = new URL(
      request.nextUrl.pathname + request.nextUrl.search,
      `http://${targetHost}`
    );
    return applyProjectCookie(NextResponse.redirect(redirectUrl));
  }

  // Helper for login redirect
  const makeLoginRedirect = () => {
    const locale = getValidLocale(pathname);
    const targetSlug = resolveProjectSlug(projectId) || DEFAULT_PROJECT || "nb32-nbiot";
    const targetHost = normalizeHostWithProject(rawHost, targetSlug);
    const proto = isLocalhost ? "http" : (process.env.USING_HTTPS === "true" ? "https" : "http");
    const loginUrl = new URL(`/${locale}/login`, `${proto}://${targetHost}`);
    if (pathname && !pathname.includes("/login")) {
      loginUrl.searchParams.set("returnUrl", pathname);
    }
    return applyProjectCookie(NextResponse.redirect(loginUrl));
  };

  // ── Public pages check (Login, Unauthorized & Status) ──
  const isLoginPage = pathname.includes("/login");
  const isUnauthorizedPage = pathname.includes("/unauthorized");
  const isStatusPage = pathname === "/status" || pathname.endsWith("/status");

  if (isUnauthorizedPage || isStatusPage) {
    return applyProjectCookie(intlMiddleware(request));
  }

  if (isLoginPage) {
    const existingToken = request.cookies.get("jwt")?.value;
    if (existingToken) {
      const payload = decodeJwtPayload(existingToken);
      const isValid = payload?.exp ? payload.exp * 1000 > Date.now() : true;
      if (isValid) {
        let hostSub: string | undefined;
        if (!isIp && parts.length > minParts && parts[0] && parts[0] !== "www") {
          hostSub = parts[0].toLowerCase();
        }
        const tokenProjectCode = extractProjectCodeFromPayload(payload)?.toLowerCase();
        const roles = extractRolesFromPayload(payload);
        const isSuperAdmin = roles.some((r) => {
          const lower = r.toLowerCase();
          return lower.includes("superadmin") || lower.includes("super_admin") || lower.includes("super-admin");
        });
        const allowedProjects = extractAllProjectIdsFromPayload(payload).map((p) => p.toLowerCase());
        const hostProjUuid = hostSub ? resolveProjectUuid(hostSub).toLowerCase() : undefined;

        const isUnauthorized =
          hostSub &&
          !isSuperAdmin &&
          allowedProjects.length > 0 &&
          !allowedProjects.includes(hostSub) &&
          (hostProjUuid ? !allowedProjects.includes(hostProjUuid) : true) &&
          tokenProjectCode !== hostSub;

        if (!isUnauthorized) {
          const locale = getValidLocale(pathname);
          const targetSlug = tokenProjectCode || resolveProjectSlug(projectId) || DEFAULT_PROJECT || "nb32-nbiot";
          const targetHost = normalizeHostWithProject(rawHost, targetSlug);
          const proto = isLocalhost ? "http" : (process.env.USING_HTTPS === "true" ? "https" : "http");
          const groupUrl = new URL(`/${locale}/dashboard/group`, `${proto}://${targetHost}`);
          return applyProjectCookie(NextResponse.redirect(groupUrl));
        }
      }
    }
    return applyProjectCookie(intlMiddleware(request));
  }

  // ── JWT Auth check ─────────────────────────────────────
  let token = request.cookies.get("jwt")?.value;
  const refreshToken = request.cookies.get("refresh_token")?.value;
  const apiUrl = process.env.API_URL;
  const keycloakUrl = (process.env.KEYCLOAK_BASE_URL || "").replace(/\/+$/, "");
  const keycloakRealm = process.env.KEYCLOAK_REALM;
  let refreshedTokens: { access_token: string; refresh_token?: string; id_token?: string } | null = null;

  // If access token is missing but refresh token exists, attempt immediate refresh
  if (!token && refreshToken) {
    const newTokens = await refreshKeycloakToken(refreshToken);
    if (newTokens) {
      token = newTokens.access_token;
      refreshedTokens = {
        access_token: newTokens.access_token,
        refresh_token: newTokens.refresh_token,
        id_token: newTokens.id_token,
      };
      request.cookies.set("jwt", token);
      if (newTokens.refresh_token) {
        request.cookies.set("refresh_token", newTokens.refresh_token);
      }
      if (newTokens.id_token) {
        request.cookies.set("id_token", newTokens.id_token);
      }
    }
  }

  if (!token) {
    return makeLoginRedirect();
  }

  // Check if token is Keycloak JWT
  const payload = decodeJwtPayload(token);
  if (payload?.sub) {
    let hostSub: string | undefined;
    if (!isIp && parts.length > minParts && parts[0] && parts[0] !== "www") {
      hostSub = parts[0].toLowerCase();
    }
    const tokenProjectCode = extractProjectCodeFromPayload(payload)?.toLowerCase();
    const roles = extractRolesFromPayload(payload);
    const isSuperAdmin = roles.some((r) => {
      const lower = r.toLowerCase();
      return lower.includes("superadmin") || lower.includes("super_admin") || lower.includes("super-admin");
    });
    const allowedProjects = extractAllProjectIdsFromPayload(payload).map((p) => p.toLowerCase());
    const hostProjUuid = hostSub ? resolveProjectUuid(hostSub).toLowerCase() : undefined;

    const isUnauthorized =
      hostSub &&
      !isSuperAdmin &&
      allowedProjects.length > 0 &&
      !allowedProjects.includes(hostSub) &&
      (hostProjUuid ? !allowedProjects.includes(hostProjUuid) : true) &&
      tokenProjectCode !== hostSub;

    if (isUnauthorized) {
      const locale = getValidLocale(pathname);
      const targetSlug = hostSub || resolveProjectSlug(projectId) || DEFAULT_PROJECT || "nb32-nbiot";
      const targetHost = normalizeHostWithProject(rawHost, targetSlug);
      const proto = isLocalhost ? "http" : (process.env.USING_HTTPS === "true" ? "https" : "http");
      const unauthUrl = new URL(`/${locale}/unauthorized`, `${proto}://${targetHost}`);
      const redirectResponse = NextResponse.redirect(unauthUrl);
      redirectResponse.cookies.delete("jwt");
      redirectResponse.cookies.delete("refresh_token");
      redirectResponse.cookies.delete("id_token");
      redirectResponse.cookies.delete("current_project");
      redirectResponse.cookies.delete("menuRole");
      return redirectResponse;
    }

    // 1. Expiration & Tenant Sync check (refresh if expired, expiring soon, or project mismatch)
    const isExpiringSoon = payload.exp ? payload.exp * 1000 < Date.now() + 60000 : false;
    const isProjectMismatch = Boolean(
      projectId &&
      tokenProjectCode &&
      projectId.toLowerCase() !== tokenProjectCode.toLowerCase() &&
      (isSuperAdmin || allowedProjects.includes(projectId.toLowerCase()))
    );

    if ((isExpiringSoon || isProjectMismatch) && refreshToken && !refreshedTokens) {
      if (isProjectMismatch && payload.sub) {
        await updateUserActiveProject(payload.sub, projectId);
      }
      const newTokens = await refreshKeycloakToken(refreshToken, payload.azp as string);
      if (newTokens) {
        token = newTokens.access_token;
        refreshedTokens = {
          access_token: newTokens.access_token,
          refresh_token: newTokens.refresh_token,
          id_token: newTokens.id_token,
        };
        request.cookies.set("jwt", token);
        if (newTokens.refresh_token) {
          request.cookies.set("refresh_token", newTokens.refresh_token);
        }
        if (newTokens.id_token) {
          request.cookies.set("id_token", newTokens.id_token);
        }
      } else if (payload.exp && payload.exp * 1000 < Date.now()) {
        const redirectResponse = makeLoginRedirect();
        redirectResponse.cookies.delete("jwt");
        redirectResponse.cookies.delete("refresh_token");
        redirectResponse.cookies.delete("menuRole");
        return redirectResponse;
      }
    } else if (payload.exp && payload.exp * 1000 < Date.now() && !refreshedTokens) {
      const redirectResponse = makeLoginRedirect();
      redirectResponse.cookies.delete("jwt");
      redirectResponse.cookies.delete("refresh_token");
      redirectResponse.cookies.delete("menuRole");
      return redirectResponse;
    }

    // 2. Remote verification against Keycloak UserInfo endpoint (if configured)
    if (keycloakUrl && keycloakRealm) {
      try {
        const userInfoUrl = `${keycloakUrl}/realms/${keycloakRealm}/protocol/openid-connect/userinfo`;
        let keycloakRes = await fetch(userInfoUrl, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          cache: "no-store",
        });

        // If UserInfo returned 401, attempt refresh
        if (keycloakRes.status === 401 && refreshToken && !refreshedTokens) {
          const newTokens = await refreshKeycloakToken(refreshToken);
          if (newTokens) {
            token = newTokens.access_token;
            refreshedTokens = {
              access_token: newTokens.access_token,
              refresh_token: newTokens.refresh_token,
              id_token: newTokens.id_token,
            };
            request.cookies.set("jwt", token);
            if (newTokens.refresh_token) {
              request.cookies.set("refresh_token", newTokens.refresh_token);
            }
            if (newTokens.id_token) {
              request.cookies.set("id_token", newTokens.id_token);
            }
            keycloakRes = await fetch(userInfoUrl, {
              headers: {
                Authorization: `Bearer ${token}`,
              },
              cache: "no-store",
            });
          }
        }

        if (keycloakRes.status === 401 || !keycloakRes.ok) {
          const redirectResponse = makeLoginRedirect();
          redirectResponse.cookies.delete("jwt");
          redirectResponse.cookies.delete("refresh_token");
          redirectResponse.cookies.delete("menuRole");
          return redirectResponse;
        }
      } catch (error) {
        console.error("Middleware Keycloak auth check failed:", error);
        const redirectResponse = makeLoginRedirect();
        redirectResponse.cookies.delete("jwt");
        redirectResponse.cookies.delete("refresh_token");
        return redirectResponse;
      }
    }
  } else if (apiUrl) {
    try {
      const response = await fetch(`${apiUrl}/StreetLight/checkLogin`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.status === 401 || !response.ok) {
        const redirectResponse = makeLoginRedirect();
        redirectResponse.cookies.delete("jwt");
        redirectResponse.cookies.delete("menuRole");
        return redirectResponse;
      }
    } catch (error) {
      console.error("Middleware auth check failed:", error);
      return makeLoginRedirect();
    }
  }

  // ── i18n middleware + project cookie + refreshed tokens ──
  const response = applyProjectCookie(intlMiddleware(request));
  if (refreshedTokens) {
    const isHttps = process.env.USING_HTTPS === "true" && !isLocalhost && !isIp;
    const isRememberMe = request.cookies.has("remember_me");
    const refreshCookieOptions = {
      path: "/",
      httpOnly: true,
      secure: isHttps,
      sameSite: "lax" as const,
      ...(isRememberMe ? { maxAge: 30 * 24 * 60 * 60 } : {}),
    };
    response.cookies.set("jwt", refreshedTokens.access_token, refreshCookieOptions);
    if (refreshedTokens.refresh_token) {
      response.cookies.set("refresh_token", refreshedTokens.refresh_token, refreshCookieOptions);
    }
    if (refreshedTokens.id_token) {
      response.cookies.set("id_token", refreshedTokens.id_token, refreshCookieOptions);
    }
  }
  return response;
}

export const config = {
  // Match all request paths except for:
  // - API routes (/api/*)
  // - Next.js internals (/_next/*)
  // - Vercel internals (/_vercel/*)
  // - Static files containing dots (e.g. favicon.ico, images, svg, css, js)
  matcher: ["/((?!api|_next|_vercel|.*\\..*).*)"],
};
