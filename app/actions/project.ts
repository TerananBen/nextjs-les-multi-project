"use server"

import { cookies, headers } from "next/headers"
import { getProjectById, getProjectByDomain, resolveProjectUuid, resolveProjectSlug, isIpAddress } from "@/config/projects"
import { fetchDbProjects } from "@/lib/project"
import { decodeJwtPayload, refreshKeycloakToken, updateUserActiveProject } from "@/lib/keycloak"

export interface SwitchProjectResult {
  success: boolean;
  error?: string;
  targetUrl?: string;
}

export async function switchProject(
  newProjectId: string,
  currentPath?: string
): Promise<SwitchProjectResult> {
  if (!newProjectId || typeof newProjectId !== "string") {
    return { success: false, error: "Invalid project ID" };
  }

  // Ensure projects are synced from DB
  await fetchDbProjects();

  const targetConfig =
    getProjectById(newProjectId) ||
    getProjectByDomain(newProjectId) ||
    getProjectById(resolveProjectUuid(newProjectId));

  const targetCode = targetConfig?.code || targetConfig?.id || newProjectId;
  const projectSlug = resolveProjectSlug(targetCode) || (targetCode && typeof targetCode === "string" && !targetCode.toLowerCase().includes("[object") ? targetCode : "project-a");

  const headerList = await headers();
  const currentHost = (headerList.get("x-forwarded-host") || headerList.get("host") || "").split(",")[0].trim();
  const currentPort = currentHost.includes(":") ? `:${currentHost.split(":")[1]}` : "";
  const hostWithoutPort = currentHost.split(":")[0].toLowerCase();
  const isLocalhost = hostWithoutPort.endsWith("localhost") || hostWithoutPort === "127.0.0.1" || isIpAddress(hostWithoutPort);
  const proto = headerList.get("x-forwarded-proto") || (isLocalhost ? "http" : (process.env.USING_HTTPS === "true" ? "https" : "http"));

  const cookieStore = await cookies();
  const usingHttps = !isLocalhost && process.env.USING_HTTPS === "true";
  const sessionMaxAge = 30 * 24 * 60 * 60;

  // 1. Update user active project in Keycloak and refresh token so claims have the new project
  const token = cookieStore.get("jwt")?.value;
  const refreshToken = cookieStore.get("refresh_token")?.value;
  if (token) {
    const payload = decodeJwtPayload(token);
    const userId = payload?.sub;
    if (userId && projectSlug) {
      await updateUserActiveProject(userId, projectSlug);
      if (refreshToken) {
        const targetClient = (payload?.azp as string) || undefined;
        const newTokens = await refreshKeycloakToken(refreshToken, targetClient);
        if (newTokens?.access_token) {
          cookieStore.set("jwt", newTokens.access_token, {
            path: "/",
            httpOnly: true,
            secure: usingHttps,
            sameSite: "lax",
            maxAge: sessionMaxAge,
          });
          if (newTokens.refresh_token) {
            cookieStore.set("refresh_token", newTokens.refresh_token, {
              path: "/",
              httpOnly: true,
              secure: usingHttps,
              sameSite: "lax",
              maxAge: sessionMaxAge,
            });
          }
        }
      }
    }
  }

  cookieStore.set("current_project", targetCode, {
    path: "/",
    httpOnly: false,
    secure: usingHttps,
    sameSite: "lax",
    maxAge: sessionMaxAge,
  });

  // Calculate target URL if subdomains are actively being used on the current host.
  // In bare hosts (e.g. localhost:3008 without subdomain), keep on same host and rely on cookie persistence.
  let targetUrl: string | undefined;
  const parts = hostWithoutPort.split(".");
  const minParts = hostWithoutPort.endsWith("localhost") ? 1 : 2;
  const currentHasSubdomain = !isIpAddress(hostWithoutPort) && parts.length > minParts && parts[0] !== "www";

  if (currentHasSubdomain && targetConfig?.domain) {
    const targetDomainClean = targetConfig.domain.split(":")[0];
    const targetHostWithPort = `${targetDomainClean}${currentPort}`;

    if (targetHostWithPort.toLowerCase() !== currentHost.toLowerCase()) {
      const path = currentPath && currentPath.startsWith("/") ? currentPath : "/";
      targetUrl = `${proto}://${targetHostWithPort}${path}`;
    }
  }

  return { success: true, targetUrl };
}
