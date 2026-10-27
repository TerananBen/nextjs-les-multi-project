import { registerProjectAlias } from "@/config/projects";

export interface KeycloakTokenResponse {
  access_token: string;
  expires_in: number;
  refresh_expires_in: number;
  refresh_token: string;
  token_type: string;
  id_token?: string;
  scope?: string;
  session_state?: string;
}

export interface KeycloakJwtPayload {
  sub: string;
  preferred_username?: string;
  given_name?: string;
  family_name?: string;
  name?: string;
  email?: string;
  email_verified?: boolean;
  realm_access?: {
    roles?: string[];
  };
  resource_access?: Record<string, { roles?: string[] }>;
  project_id?: string;
  tenant_id?: string;
  projects?: Record<string, string> | string | string[];
  exp?: number;
  iat?: number;
  [key: string]: unknown;
}

export interface KeycloakAuthResult {
  success: boolean;
  tokenData?: KeycloakTokenResponse;
  payload?: KeycloakJwtPayload;
  errorKey?: string;
  message?: string;
}

export const getKeycloakConfig = () => {
  return {
    baseUrl: (process.env.KEYCLOAK_BASE_URL || "").replace(/\/+$/, ""),
    realm: process.env.KEYCLOAK_REALM || "",
    clientId: process.env.KEYCLOAK_CLIENT_ID || "project-a",
    clientSecret: process.env.KEYCLOAK_CLIENT_SECRET || "",
  };
};

export const isKeycloakConfigured = (): boolean => {
  const { baseUrl, realm, clientId } = getKeycloakConfig();
  return Boolean(baseUrl && realm && clientId);
};

export const extractProjectsMapFromPayload = (
  payload?: KeycloakJwtPayload | Record<string, unknown> | null
): Record<string, string> => {
  if (!payload) return {};
  const p = payload as Record<string, unknown>;
  const attributes = p.attributes as Record<string, unknown> | undefined;
  const userAttributes = p.user_attributes as Record<string, unknown> | undefined;

  const raw =
    p.projects ??
    p.project ??
    attributes?.projects ??
    attributes?.project ??
    userAttributes?.projects ??
    userAttributes?.project ??
    p["custom:projects"] ??
    p["custom:project"];

  if (!raw) return {};

  const parseCandidate = (val: unknown): Record<string, string> | null => {
    if (!val) return null;
    if (typeof val === "object" && !Array.isArray(val)) {
      const result: Record<string, string> = {};
      for (const [k, v] of Object.entries(val)) {
        if (k && v !== undefined && v !== null) {
          const cleanKey = k.trim();
          const cleanVal = String(v).trim();
          result[cleanKey] = cleanVal;
          registerProjectAlias(cleanKey, cleanVal);
        }
      }
      return Object.keys(result).length > 0 ? result : null;
    }
    if (typeof val === "string") {
      const trimmed = val.trim();
      if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
        try {
          const parsed = JSON.parse(trimmed);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            const result: Record<string, string> = {};
            for (const [k, v] of Object.entries(parsed)) {
              if (k && v !== undefined && v !== null) {
                const cleanKey = k.trim();
                const cleanVal = String(v).trim();
                result[cleanKey] = cleanVal;
                registerProjectAlias(cleanKey, cleanVal);
              }
            }
            return Object.keys(result).length > 0 ? result : null;
          }
        } catch {
          return null;
        }
      }
    }
    return null;
  };

  const direct = parseCandidate(raw);
  if (direct) return direct;

  if (Array.isArray(raw) && raw.length > 0) {
    for (const item of raw) {
      const parsedItem = parseCandidate(item);
      if (parsedItem) return parsedItem;
    }
  }

  return {};
};

export const getProjectUuidFromToken = (
  payload: KeycloakJwtPayload | Record<string, unknown> | null,
  projectCode: string
): string | undefined => {
  if (!payload || !projectCode) return undefined;
  const map = extractProjectsMapFromPayload(payload);
  const cleanCode = projectCode.trim();
  if (map[cleanCode]) return map[cleanCode];

  const lower = cleanCode.toLowerCase();
  for (const [k, v] of Object.entries(map)) {
    if (k.toLowerCase() === lower || k.toLowerCase().replace(/_/g, "-") === lower.replace(/_/g, "-")) {
      return v;
    }
  }
  return undefined;
};

export const extractAllProjectIdsFromPayload = (
  payload?: KeycloakJwtPayload | Record<string, unknown> | null
): string[] => {
  if (!payload) return [];

  // 1. Check new JSON Map projects structure
  const projectsMap = extractProjectsMapFromPayload(payload);
  const mapCodes = Object.keys(projectsMap);
  const mapUuids = Object.values(projectsMap);
  if (mapCodes.length > 0) {
    return Array.from(new Set([...mapCodes, ...mapUuids]));
  }

  // 2. Legacy fallback
  const p = payload as Record<string, unknown>;
  const attributes = p.attributes as Record<string, unknown> | undefined;
  const userAttributes = p.user_attributes as Record<string, unknown> | undefined;

  const raw =
    p.projects ??
    p.project_code ??
    p.projectCode ??
    p.project_id ??
    p.projectId ??
    p.projectID ??
    p.project ??
    attributes?.projects ??
    attributes?.project_code ??
    attributes?.projectCode ??
    attributes?.project_id ??
    attributes?.projectId ??
    attributes?.projectID ??
    attributes?.project ??
    userAttributes?.projects ??
    userAttributes?.project_code ??
    userAttributes?.projectCode ??
    userAttributes?.project_id ??
    userAttributes?.projectId ??
    userAttributes?.projectID ??
    userAttributes?.project ??
    p["custom:project_code"] ??
    p["custom:project_id"] ??
    p["custom:project"] ??
    p.tenant_code ??
    p.tenantCode ??
    p.tenant_id ??
    p.tenantId ??
    p.tenant ??
    attributes?.tenant_code ??
    attributes?.tenantCode ??
    attributes?.tenant_id ??
    attributes?.tenantId ??
    attributes?.tenant ??
    userAttributes?.tenant_code ??
    userAttributes?.tenantCode ??
    userAttributes?.tenant_id ??
    userAttributes?.tenantId ??
    userAttributes?.tenant ??
    p["custom:tenant_code"] ??
    p["custom:tenant_id"] ??
    p["custom:tenant"];

  if (!raw) return [];
  if (Array.isArray(raw)) {
    return raw
      .map((item) => {
        if (!item) return "";
        if (typeof item === "object") {
          const keys = Object.keys(item);
          return keys.length > 0 ? keys[0] : "";
        }
        return String(item).trim();
      })
      .filter((item) => Boolean(item) && !item.toLowerCase().includes("[object"));
  }
  if (typeof raw === "object" && raw !== null) {
    const keys = Object.keys(raw);
    const vals = Object.values(raw);
    return [...keys, ...vals]
      .map((v) => String(v).trim())
      .filter((v) => Boolean(v) && !v.toLowerCase().includes("[object"));
  }
  const str = typeof raw === "string" ? raw.trim() : String(raw).trim();
  if (!str || str.toLowerCase().includes("[object")) return [];
  return [str];
};

export const extractProjectIdFromPayload = (
  payload?: KeycloakJwtPayload | Record<string, unknown> | null
): string | undefined => {
  const all = extractAllProjectIdsFromPayload(payload);
  return all.length > 0 ? all[0] : undefined;
};

export const extractProjectCodeFromPayload = (
  payload?: KeycloakJwtPayload | Record<string, unknown> | null
): string | undefined => {
  if (!payload) return undefined;

  const p = payload as Record<string, unknown>;
  const attributes = p.attributes as Record<string, unknown> | undefined;
  const userAttributes = p.user_attributes as Record<string, unknown> | undefined;

  // 1. Direct active_project claim from Keycloak token / user attributes
  const directActive =
    p.active_project ??
    p.activeProject ??
    p.active_project_code ??
    p.activeProjectCode ??
    attributes?.active_project ??
    attributes?.activeProject ??
    userAttributes?.active_project ??
    userAttributes?.activeProject ??
    p["custom:active_project"] ??
    p["custom:activeProject"];

  if (typeof directActive === "string" && directActive.trim() && !directActive.includes("[object")) {
    return directActive.trim();
  }

  // 2. Check JSON Map projects structure
  const projectsMap = extractProjectsMapFromPayload(payload);
  const mapCodes = Object.keys(projectsMap);
  if (mapCodes.length > 0) {
    return mapCodes[0];
  }

  // 3. Legacy fallback
  const raw =
    p.project_code ??
    p.projectCode ??
    attributes?.project_code ??
    attributes?.projectCode ??
    userAttributes?.project_code ??
    userAttributes?.projectCode ??
    p["custom:project_code"] ??
    p["custom:projectCode"] ??
    p.tenant_code ??
    p.tenantCode ??
    attributes?.tenant_code ??
    attributes?.tenantCode ??
    userAttributes?.tenant_code ??
    userAttributes?.tenantCode ??
    p.project_id ??
    p.projectId ??
    attributes?.project_id ??
    attributes?.projectId ??
    userAttributes?.project_id ??
    userAttributes?.projectId ??
    p.tenant_id ??
    p.tenantId;

  if (!raw) return undefined;
  if (typeof raw === "object" && raw !== null && !Array.isArray(raw)) {
    const keys = Object.keys(raw);
    return keys.length > 0 && !keys[0].toLowerCase().includes("[object") ? keys[0] : undefined;
  }
  let codeStr = "";
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (first && typeof first === "object") {
      const keys = Object.keys(first);
      return keys.length > 0 && !keys[0].toLowerCase().includes("[object") ? keys[0] : undefined;
    }
    codeStr = typeof first === "string" ? first.trim() : String(first || "").trim();
  } else {
    codeStr = typeof raw === "string" ? raw.trim() : String(raw).trim();
  }

  if (codeStr.startsWith("{") && codeStr.endsWith("}")) {
    try {
      const parsed = JSON.parse(codeStr);
      if (parsed && typeof parsed === "object") {
        const keys = Object.keys(parsed);
        if (keys.length > 0 && !keys[0].toLowerCase().includes("[object")) return keys[0];
      }
    } catch {
      // ignore
    }
  }

  if (!codeStr || codeStr.toLowerCase().includes("[object")) return undefined;
  return codeStr;
};

export const decodeJwtPayload = <T = KeycloakJwtPayload>(token: string): T | null => {
  try {
    const parts = token.split(".");
    if (parts.length < 2) return null;

    const base64Url = parts[1];
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    let jsonString: string;

    if (typeof atob === "function") {
      const binary = atob(base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i++) {
        bytes[i] = binary.charCodeAt(i);
      }
      jsonString = new TextDecoder().decode(bytes);
    } else {
      jsonString = Buffer.from(base64, "base64").toString("utf-8");
    }

    return JSON.parse(jsonString) as T;
  } catch {
    return null;
  }
};

export const loginKeycloakDirectGrant = async (
  username: string,
  password: string
): Promise<KeycloakAuthResult> => {
  const { baseUrl, realm, clientId, clientSecret } = getKeycloakConfig();

  if (!baseUrl || !realm || !clientId) {
    return {
      success: false,
      message: "Keycloak configuration is missing in environment variables.",
      errorKey: "connectionError",
    };
  }

  const tokenUrl = `${baseUrl}/realms/${realm}/protocol/openid-connect/token`;

  const params = new URLSearchParams();
  params.append("grant_type", "password");
  params.append("client_id", clientId);
  if (clientSecret) {
    params.append("client_secret", clientSecret);
  }
  params.append("username", username);
  params.append("password", password);
  params.append("scope", "openid profile email");

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      const error = data?.error;
      const desc = data?.error_description || "";

      console.warn(`[Keycloak] Direct grant failed for user "${username}": ${error} - ${desc}`);

      if (error === "invalid_grant") {
        const lowerDesc = desc.toLowerCase();
        if (lowerDesc.includes("locked")) {
          return {
            success: false,
            message: desc,
            errorKey: "accountLocked",
          };
        }
        if (lowerDesc.includes("disabled") || lowerDesc.includes("suspended")) {
          return {
            success: false,
            message: desc,
            errorKey: "accountDisabled",
          };
        }
        if (lowerDesc.includes("not fully set up") || lowerDesc.includes("required action")) {
          return {
            success: false,
            message: desc,
            errorKey: "accountNotSetUp",
          };
        }
        return {
          success: false,
          message: desc || "Invalid username or password",
          errorKey: "usernameError",
        };
      }

      return {
        success: false,
        message: desc || "Authentication failed",
        errorKey: desc ? undefined : "connectionError",
      };
    }

    const tokenData = data as KeycloakTokenResponse;
    const accessPayload = decodeJwtPayload(tokenData.access_token) || undefined;
    const idPayload = tokenData.id_token ? decodeJwtPayload(tokenData.id_token) : undefined;
    const resolvedTenantId =
      extractProjectIdFromPayload(accessPayload) ||
      extractProjectIdFromPayload(idPayload);

    const payload: KeycloakJwtPayload = {
      ...(idPayload || {}),
      ...(accessPayload || { sub: "" }),
      project_id: resolvedTenantId,
      tenant_id: resolvedTenantId,
    };

    console.log(`[Keycloak Direct Grant] User "${username}" authenticated. Project ID in claims: "${resolvedTenantId || 'NONE'}"`);
    if (!resolvedTenantId) {
      console.warn("[Keycloak Direct Grant] Warning: No project_id/tenant_id found in access_token or id_token. Available keys in token payload:", Object.keys(accessPayload || {}));
    }

    return {
      success: true,
      tokenData,
      payload,
    };
  } catch (error) {
    console.error("Keycloak direct grant request failed:", error);
    return {
      success: false,
      message: "Unable to reach Keycloak authentication server.",
      errorKey: "connectionError",
    };
  }
};

export const verifyKeycloakToken = async (token: string): Promise<boolean> => {
  const { baseUrl, realm } = getKeycloakConfig();
  if (!baseUrl || !realm) return false;

  // Fast-path: local expiration check
  const payload = decodeJwtPayload(token);
  if (payload?.exp && payload.exp * 1000 < Date.now()) {
    return false;
  }

  // Remote verification via UserInfo endpoint
  try {
    const userInfoUrl = `${baseUrl}/realms/${realm}/protocol/openid-connect/userinfo`;
    const response = await fetch(userInfoUrl, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: "no-store",
    });

    return response.ok;
  } catch (error) {
    console.error("Keycloak token verification error:", error);
    return false;
  }
};

export const refreshKeycloakToken = async (
  refreshToken: string,
  clientIdOverride?: string
): Promise<KeycloakTokenResponse | null> => {
  const { baseUrl, realm, clientId: defaultClientId, clientSecret } = getKeycloakConfig();

  // Keycloak strictly requires client_id to match the refresh token's authorized party (azp)
  let tokenAzp: string | undefined;
  try {
    const payload = decodeJwtPayload<{ azp?: string }>(refreshToken);
    if (payload?.azp && typeof payload.azp === "string" && payload.azp.trim()) {
      tokenAzp = payload.azp.trim();
    }
  } catch {
    // ignore
  }

  const clientId = clientIdOverride || tokenAzp || defaultClientId;
  if (!baseUrl || !realm || !clientId) return null;

  const tokenUrl = `${baseUrl}/realms/${realm}/protocol/openid-connect/token`;
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("client_id", clientId);
  if (clientSecret && (clientId === defaultClientId || clientId === tokenAzp)) {
    params.append("client_secret", clientSecret);
  }
  params.append("refresh_token", refreshToken);

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      cache: "no-store",
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      console.warn(`[Keycloak] Token refresh failed for client '${clientId}': HTTP ${response.status} -> ${errText}`);
      return null;
    }
    return (await response.json()) as KeycloakTokenResponse;
  } catch (error) {
    console.error("Keycloak token refresh error:", error);
    return null;
  }
};

export const updateUserActiveProject = async (
  userId: string,
  activeProject: string
): Promise<boolean> => {
  if (!userId || !activeProject || typeof activeProject !== "string" || activeProject.toLowerCase().includes("[object")) return false;
  try {
    const cleanProject = activeProject.trim();
    if (!cleanProject || cleanProject.toLowerCase().includes("[object")) return false;
    const apiUrl = process.env.API_URL || "http://localhost:5000";
    const res = await fetch(`${apiUrl}/api/iam/users/${encodeURIComponent(userId)}/active-project`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ activeProject: cleanProject }),
      cache: "no-store",
    });
    return res.ok;
  } catch (error) {
    console.error("Failed to update user active project in Keycloak:", error);
    return false;
  }
};

export const logoutKeycloak = async (
  refreshToken?: string,
  clientIdOverride?: string
): Promise<void> => {
  const { baseUrl, realm, clientId: defaultClientId, clientSecret } = getKeycloakConfig();
  const clientId = clientIdOverride || defaultClientId;
  if (!baseUrl || !realm || !clientId || !refreshToken) return;

  const logoutUrl = `${baseUrl}/realms/${realm}/protocol/openid-connect/logout`;
  const params = new URLSearchParams();
  params.append("client_id", clientId);
  if (clientSecret && clientId === defaultClientId) {
    params.append("client_secret", clientSecret);
  }
  params.append("refresh_token", refreshToken);

  try {
    await fetch(logoutUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      cache: "no-store",
    });
  } catch (error) {
    console.error("Keycloak logout error:", error);
  }
};

export const extractRolesFromPayload = (
  payload?: KeycloakJwtPayload | null,
  clientId?: string
): string[] => {
  if (!payload) return [];

  const isSystemRole = (r: string) =>
    r.startsWith("default-roles") ||
    r.startsWith("manage-") ||
    r.startsWith("view-") ||
    r.startsWith("query-") ||
    ["offline_access", "uma_authorization", "uma_protection"].includes(r);

  const realmRoles = (payload.realm_access?.roles || []).filter((r) => !isSystemRole(r));
  const isSuperAdmin = realmRoles.some((r) => r.toLowerCase() === "superadmin");

  // 1. SuperAdmin realm role takes highest priority across all projects
  if (isSuperAdmin) {
    return ["SuperAdmin", ...realmRoles.filter((r) => r.toLowerCase() !== "superadmin")];
  }

  // 2. If clientId provided, check client roles in resource_access[clientId].roles
  if (clientId && payload.resource_access?.[clientId]?.roles) {
    const clientRoles = payload.resource_access[clientId].roles?.filter((r) => !isSystemRole(r)) || [];
    if (clientRoles.length > 0) return clientRoles;
  }

  // 3. Check any project client roles in resource_access
  if (payload.resource_access) {
    for (const [key, resource] of Object.entries(payload.resource_access)) {
      if (key.startsWith("project-") || key.startsWith("project_")) {
        const roles = (resource.roles || []).filter((r) => !isSystemRole(r));
        if (roles.length > 0) return roles;
      }
    }
  }

  // 4. Fallback to realm_access.roles
  return realmRoles;
};

import { createHash, randomBytes } from "crypto";
import type { NextRequest } from "next/server";

export const getAuthCallbackUri = (request: NextRequest): string => {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const hostHeader = request.headers.get("host");
  const rawHost = (forwardedHost || hostHeader || request.nextUrl.host).split(",")[0].trim();
  const canonicalHost = rawHost.replace(/_/g, "-");

  const forwardedProto = request.headers.get("x-forwarded-proto");
  const isLocal = canonicalHost.includes("localhost") || canonicalHost.startsWith("127.0.0.1");
  const defaultProto = isLocal ? "http" : (process.env.USING_HTTPS === "true" ? "https" : "http");
  const proto = forwardedProto || (request.nextUrl.protocol ? request.nextUrl.protocol.replace(":", "") : defaultProto);

  return `${proto}://${canonicalHost}/api/auth/callback/keycloak`;
};

export const generatePkcePair = (): { codeVerifier: string; codeChallenge: string } => {
  const codeVerifier = randomBytes(32).toString("base64url");
  const codeChallenge = createHash("sha256").update(codeVerifier).digest("base64url");
  return { codeVerifier, codeChallenge };
};

export const getKeycloakLoginUrl = (
  redirectUri: string,
  state?: string,
  locale?: string,
  clientIdOverride?: string,
  codeChallenge?: string,
  prompt?: string
): string => {
  const { baseUrl, realm, clientId: defaultClientId } = getKeycloakConfig();
  const clientId = clientIdOverride || defaultClientId;
  if (!baseUrl || !realm || !clientId) return "";

  const authUrl = new URL(`${baseUrl}/realms/${realm}/protocol/openid-connect/auth`);
  authUrl.searchParams.set("client_id", clientId);
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("scope", "openid profile email");
  authUrl.searchParams.set("redirect_uri", redirectUri);
  if (codeChallenge) {
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
  }
  if (state) {
    authUrl.searchParams.set("state", state);
  }
  const targetLocale = locale || "th";
  authUrl.searchParams.set("ui_locales", targetLocale);
  authUrl.searchParams.set("kc_locale", targetLocale);
  if (prompt) {
    authUrl.searchParams.set("prompt", prompt);
  }
  return authUrl.toString();
};

export const exchangeKeycloakCode = async (
  code: string,
  redirectUri: string,
  clientIdOverride?: string,
  codeVerifier?: string
): Promise<KeycloakAuthResult> => {
  const { baseUrl, realm, clientId: defaultClientId, clientSecret } = getKeycloakConfig();
  const clientId = clientIdOverride || defaultClientId;
  if (!baseUrl || !realm || !clientId) {
    return {
      success: false,
      message: "Keycloak configuration is missing in environment variables.",
      errorKey: "connectionError",
    };
  }

  const tokenUrl = `${baseUrl}/realms/${realm}/protocol/openid-connect/token`;
  const params = new URLSearchParams();
  params.append("grant_type", "authorization_code");
  params.append("client_id", clientId);
  if (clientSecret && clientId === defaultClientId) {
    params.append("client_secret", clientSecret);
  }
  if (codeVerifier) {
    params.append("code_verifier", codeVerifier);
  }
  params.append("code", code);
  params.append("redirect_uri", redirectUri);

  try {
    const response = await fetch(tokenUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: params.toString(),
      cache: "no-store",
    });

    const data = await response.json();

    if (!response.ok) {
      const desc = data?.error_description || data?.error || "Token exchange failed";
      console.warn(`[Keycloak] Authorization code exchange failed: ${desc}`);
      return {
        success: false,
        message: desc,
        errorKey: "connectionError",
      };
    }

    const tokenData = data as KeycloakTokenResponse;
    const accessPayload = decodeJwtPayload(tokenData.access_token) || undefined;
    const idPayload = tokenData.id_token ? decodeJwtPayload(tokenData.id_token) : undefined;
    const resolvedTenantId =
      extractProjectIdFromPayload(accessPayload) ||
      extractProjectIdFromPayload(idPayload);

    const payload: KeycloakJwtPayload = {
      ...(idPayload || {}),
      ...(accessPayload || { sub: "" }),
      project_id: resolvedTenantId,
      tenant_id: resolvedTenantId,
    };

    return {
      success: true,
      tokenData,
      payload,
    };
  } catch (error) {
    console.error("Keycloak authorization code exchange error:", error);
    return {
      success: false,
      message: "Unable to exchange authorization code with Keycloak.",
      errorKey: "connectionError",
    };
  }
};

export const getKeycloakLogoutUrl = (
  postLogoutRedirectUri: string,
  idToken?: string,
  clientIdOverride?: string
): string => {
  const { baseUrl, realm, clientId: defaultClientId } = getKeycloakConfig();
  const clientId = clientIdOverride || defaultClientId;
  if (!baseUrl || !realm || !idToken) return "";

  const logoutUrl = new URL(`${baseUrl}/realms/${realm}/protocol/openid-connect/logout`);
  logoutUrl.searchParams.set("client_id", clientId);
  logoutUrl.searchParams.set("post_logout_redirect_uri", postLogoutRedirectUri);
  logoutUrl.searchParams.set("id_token_hint", idToken);
  return logoutUrl.toString();
};
