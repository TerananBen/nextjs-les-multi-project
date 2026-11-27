"use server"

import { cookies, headers } from "next/headers"
import { getProjectConfig, fetchDbProjects } from "@/lib/project"
import {
  getProjectById,
  resolveProjectUuid,
  resolveProjectSlug,
  isIpAddress,
  DEFAULT_PROJECT,
} from "@/config/projects"
import {
  isKeycloakConfigured,
  loginKeycloakDirectGrant,
  decodeJwtPayload,
  logoutKeycloak,
  refreshKeycloakToken,
  updateUserActiveProject,
  extractAllProjectIdsFromPayload,
  extractProjectCodeFromPayload,
  extractRolesFromPayload,
  getKeycloakLogoutUrl,
  isKeycloakTokenValid,
} from "@/lib/keycloak"
import { fetchNestJs } from "@/lib/nestjs"
import { getAuthToken, getRefreshToken, getIdToken, encryptCookieValue } from "@/lib/auth-cookies"
import { SUPERADMIN_FULL_MENUS } from "@/config/menus"

interface LoginState {
  success: boolean
  message?: string
  failedAttempts?: string | null
  errorKey?: string
  isLocked?: boolean
}

export async function login(prevState: LoginState, formData: FormData): Promise<LoginState> {
  const username = formData.get("username") as string
  const password = formData.get("password") as string
  const usingHttps = process.env.USING_HTTPS

  if (!username || !password) {
    return { success: false, message: "Username and password are required" }
  }

  // ── Keycloak Direct Access Grants Flow ────────────────
  if (isKeycloakConfigured()) {
    const keycloakResult = await loginKeycloakDirectGrant(username, password)

    if (!keycloakResult.success) {
      return {
        success: false,
        message: keycloakResult.message || "Authentication failed",
        errorKey: keycloakResult.errorKey || "usernameError",
        isLocked: keycloakResult.errorKey === "accountLocked",
      }
    }

    // Check project authorization for host subdomain where login occurred
    const headerList = await headers()
    const host = (headerList.get("x-forwarded-host") || headerList.get("host") || "")
      .split(",")[0]
      .trim()
    let hostProjectId: string | undefined
    let hostSubdomain: string | undefined
    const hostWithoutPort = host.split(":")[0].toLowerCase()
    if (hostWithoutPort && !isIpAddress(hostWithoutPort)) {
      const sub = hostWithoutPort.split(".")[0]
      if (sub && sub !== "localhost" && sub !== "www") {
        hostSubdomain = sub.toLowerCase()
        hostProjectId = resolveProjectUuid(hostSubdomain)
      }
    }

    const allowedProjects = extractAllProjectIdsFromPayload(keycloakResult.payload)
    const allowedUuids = allowedProjects.map((p) => resolveProjectUuid(p))
    const roles = extractRolesFromPayload(keycloakResult.payload)
    const isSuperAdmin = roles.some((r) => {
      const lower = r.toLowerCase()
      return (
        lower.includes("superadmin") ||
        lower.includes("super_admin") ||
        lower.includes("super-admin")
      )
    })

    // Reject login immediately if user attempts to log into an unauthorized subdomain project
    if (
      hostProjectId &&
      !isSuperAdmin &&
      allowedUuids.length > 0 &&
      !allowedUuids.includes(hostProjectId) &&
      (!hostSubdomain || !allowedProjects.includes(hostSubdomain))
    ) {
      return {
        success: false,
        message: "You do not have permission to access this project",
        errorKey: "unauthorizedProject",
      }
    }

    const tokenProjectCode = extractProjectCodeFromPayload(keycloakResult.payload)
    const cleanTokenProjectCode =
      tokenProjectCode && !tokenProjectCode.toLowerCase().includes("[object")
        ? tokenProjectCode
        : undefined
    let activeProjectId: string | undefined =
      cleanTokenProjectCode ||
      (hostProjectId &&
      (isSuperAdmin || allowedUuids.length === 0 || allowedUuids.includes(hostProjectId))
        ? hostProjectId
        : undefined) ||
      hostSubdomain ||
      (allowedProjects.length > 0 && !allowedProjects[0].toLowerCase().includes("[object")
        ? allowedProjects[0]
        : undefined)

    if (!activeProjectId || activeProjectId.toLowerCase().includes("[object")) {
      const dbProjects = await fetchDbProjects(keycloakResult.tokenData?.access_token)
      activeProjectId =
        dbProjects.length > 0 ? dbProjects[0].code || dbProjects[0].id : DEFAULT_PROJECT
    }

    const projectSlug = resolveProjectSlug(activeProjectId) || activeProjectId || DEFAULT_PROJECT

    // Update active project attribute in Keycloak and refresh tokens
    if (keycloakResult.payload?.sub && projectSlug) {
      await updateUserActiveProject(
        keycloakResult.payload.sub,
        projectSlug,
        keycloakResult.tokenData?.access_token
      )
      if (keycloakResult.tokenData?.refresh_token) {
        const refreshed = await refreshKeycloakToken(keycloakResult.tokenData.refresh_token)
        if (refreshed?.access_token) {
          keycloakResult.tokenData.access_token = refreshed.access_token
          if (refreshed.refresh_token) {
            keycloakResult.tokenData.refresh_token = refreshed.refresh_token
          }
        }
      }
    }

    const cookieStore = await cookies()
    const sessionMaxAge =
      keycloakResult.tokenData?.refresh_expires_in &&
      keycloakResult.tokenData.refresh_expires_in > 0
        ? keycloakResult.tokenData.refresh_expires_in
        : 30 * 24 * 60 * 60 // 30 days default

    if (keycloakResult.tokenData?.access_token) {
      cookieStore.set("jwt", await encryptCookieValue(keycloakResult.tokenData.access_token), {
        httpOnly: true,
        secure: usingHttps === "true",
        sameSite: "lax",
        path: "/",
        maxAge: sessionMaxAge,
      })
    }

    if (keycloakResult.tokenData?.refresh_token) {
      cookieStore.set(
        "refresh_token",
        await encryptCookieValue(keycloakResult.tokenData.refresh_token),
        {
          httpOnly: true,
          secure: usingHttps === "true",
          sameSite: "lax",
          path: "/",
          maxAge: sessionMaxAge,
        }
      )
    }

    if (keycloakResult.tokenData?.id_token) {
      cookieStore.set("id_token", await encryptCookieValue(keycloakResult.tokenData.id_token), {
        httpOnly: true,
        secure: usingHttps === "true",
        sameSite: "lax",
        path: "/",
        maxAge: sessionMaxAge,
      })
    }

    if (activeProjectId) {
      cookieStore.set("current_project", activeProjectId, {
        httpOnly: false,
        secure: usingHttps === "true",
        sameSite: "lax",
        path: "/",
        maxAge: sessionMaxAge,
      })
    }

    // Record user last login timestamp in NestJS (Keycloak user_attribute)
    if (keycloakResult.payload?.sub && keycloakResult.tokenData?.access_token) {
      fetchNestJs(`/api/users/${encodeURIComponent(keycloakResult.payload.sub)}/login`, {
        method: "POST",
        skipProject: true,
        skipAuth: true,
        headers: {
          Authorization: `Bearer ${keycloakResult.tokenData.access_token}`,
        },
      }).catch((err) => console.error("Failed to record login:", err))
    }

    return { success: true }
  }

  // ── Legacy API Login Fallback ─────────────────────────
  const projectConfig = await getProjectConfig()
  const projectName = projectConfig.code || projectConfig.id || DEFAULT_PROJECT
  const apiUrl = process.env.API_URL

  if (!apiUrl) {
    console.error("API_URL is not defined")
    return {
      success: false,
      message: "Server configuration error: API_URL is missing. Please restart the server.",
      errorKey: "connectionError",
    }
  }

  try {
    const response = await fetch(`${apiUrl}/StreetLight/accountLogin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        username,
        password,
        projectName,
      }),
    })

    let data
    try {
      data = await response.json()
    } catch (e) {
      console.error("Failed to parse response JSON", e)
      return {
        success: false,
        message: "Failed to connect to the server",
        errorKey: "connectionError",
      }
    }

    if (data.result) {
      // Success
      const cookieStore = await cookies()
      cookieStore.set("jwt", await encryptCookieValue(data.dataReturn), {
        httpOnly: true,
        secure: usingHttps === "true",
        sameSite: "lax",
        path: "/",
      })
      cookieStore.set("menuRole", data.dataMenuRole, {
        httpOnly: true,
        secure: usingHttps === "true",
        sameSite: "lax",
        path: "/",
      })
      return { success: true }
    } else {
      // Failure (including 401)
      const isLocked = data.dataContLogin === "10"
      return {
        success: false,
        message: data.dataReturn,
        failedAttempts: data.dataContLogin,
        errorKey: isLocked
          ? "accountLocked"
          : data.dataReturn === "denied"
            ? "usernameError"
            : undefined,
        isLocked,
      }
    }
  } catch (error) {
    console.error("Login error:", error)
    return { success: false, message: "An unexpected error occurred", errorKey: "connectionError" }
  }
}

export interface MenuItem {
  role_menu_id?: string
  role_id?: string
  menu_id: string
  menu_name: string
  readable: string
  writable?: string
  control: string
  label?: string
  path?: string
  api_version?: number
}

export async function getAuthorizedMenu(): Promise<MenuItem[]> {
  const jwtToken = await getAuthToken()

  // 1. Fetch from NestJS Backend Service if Keycloak JWT is present
  if (jwtToken) {
    try {
      const nestMenus = await fetchNestJs<MenuItem[]>("/api/permissions/my-menus")
      if (nestMenus && Array.isArray(nestMenus) && nestMenus.length > 0) {
        const payload = decodeJwtPayload(jwtToken)
        const roles = extractRolesFromPayload(payload)
        const isSuperAdmin = roles.some((r) => {
          const lower = r.toLowerCase()
          return (
            lower.includes("superadmin") ||
            lower.includes("super_admin") ||
            lower.includes("super-admin")
          )
        })
        if (
          isSuperAdmin &&
          !nestMenus.some(
            (m) => m.menu_name === "system_api_setting" || m.menu_name === "V_SettingApi"
          )
        ) {
          return [
            ...nestMenus,
            {
              menu_id: "17",
              menu_name: "system_api_setting",
              label: "API Settings",
              path: "/setting-system/api-settings",
              readable: "1",
              writable: "1",
              control: "1",
            },
          ]
        }
        return nestMenus
      }
    } catch (e) {
      console.error("Failed to fetch permissions from NestJS:", e)
    }

    // Fallback safeguard: If role is SuperAdmin, return full system menus
    const payload = decodeJwtPayload(jwtToken)
    const roles = extractRolesFromPayload(payload)
    const isSuperAdmin = roles.some((r) => {
      const lower = r.toLowerCase()
      return (
        lower.includes("superadmin") ||
        lower.includes("super_admin") ||
        lower.includes("super-admin")
      )
    })

    if (isSuperAdmin) {
      return SUPERADMIN_FULL_MENUS
    }
    return []
  }

  return []
}

export interface User {
  userId: string
  firstName: string
  lastName: string
  userRoleId: string
  userRole: string
  userName: string
}

export async function getCurrentUser(): Promise<User | null> {
  const cookieStore = await cookies()
  const token = await getAuthToken(cookieStore)

  if (!token) {
    return null
  }

  // 1. Check if token is a Keycloak JWT
  const payload = decodeJwtPayload(token)
  if (payload?.sub) {
    let currentClientId: string | undefined
    const currentProjId = cookieStore.get("current_project")?.value
    if (currentProjId) {
      const proj = getProjectById(currentProjId)
      if (proj?.domain) {
        currentClientId = proj.domain.split(".")[0].replace(/_/g, "-")
      }
    }
    const extractedRoles = extractRolesFromPayload(payload, currentClientId)
    const roles = extractedRoles.join(", ") || "User"

    return {
      userId: payload.sub,
      firstName: payload.given_name || payload.name || payload.preferred_username || "User",
      lastName: payload.family_name || "",
      userRoleId: String(payload.project_id || payload.tenant_id || currentProjId || "default"),
      userRole: roles,
      userName: payload.preferred_username || payload.email || "user",
    }
  }

  // 2. Fallback to legacy API
  const apiUrl = process.env.API_URL
  if (!apiUrl) {
    return null
  }

  try {
    const response = await fetch(`${apiUrl}/StreetLight/getDataUserPersonal`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({}),
    })

    if (!response.ok) {
      return null
    }

    const data = await response.json()
    if (data.result && data.dataReturn) {
      return data.dataReturn as User
    }

    return null
  } catch (error) {
    console.error("Error fetching user:", error)
    return null
  }
}

export async function logout() {
  const cookieStore = await cookies()
  const headerList = await headers()
  const refreshToken = await getRefreshToken(cookieStore)
  const idToken = await getIdToken(cookieStore)
  const currentProject = cookieStore.get("current_project")?.value

  // Determine host and protocol
  const forwardedHost = headerList.get("x-forwarded-host")
  const hostHeader = headerList.get("host")
  const host = (forwardedHost || hostHeader || "").split(",")[0].trim()
  const isLocal = host.includes("localhost") || host.includes("127.0.0.1")
  const proto =
    headerList.get("x-forwarded-proto") ||
    (isLocal ? "http" : process.env.USING_HTTPS === "true" ? "https" : "http")

  // Resolve client ID for Keycloak
  let resolvedClientId: string | undefined
  if (refreshToken) {
    const refreshPayload = decodeJwtPayload<{ azp?: string }>(refreshToken)
    if (
      refreshPayload?.azp &&
      typeof refreshPayload.azp === "string" &&
      refreshPayload.azp.trim()
    ) {
      resolvedClientId = refreshPayload.azp.trim()
    }
  }
  if (!resolvedClientId && idToken) {
    const idPayload = decodeJwtPayload<{ azp?: string }>(idToken)
    if (idPayload?.azp && typeof idPayload.azp === "string" && idPayload.azp.trim()) {
      resolvedClientId = idPayload.azp.trim()
    }
  }
  const hostWithoutPort = host.split(":")[0].toLowerCase()
  if (!resolvedClientId && hostWithoutPort && !isIpAddress(hostWithoutPort)) {
    const sub = hostWithoutPort.split(".")[0]
    if (sub && sub !== "localhost" && sub !== "www") {
      resolvedClientId = sub.toLowerCase()
    }
  }
  if (!resolvedClientId && currentProject) {
    resolvedClientId = currentProject
  }
  if (!resolvedClientId) {
    resolvedClientId = process.env.KEYCLOAK_CLIENT_ID || DEFAULT_PROJECT
  }

  const appUrl = host
    ? `${proto}://${host}`
    : process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3008"
  const loginUrl = `${appUrl}/api/auth/login?prompt=login`

  let keycloakLogoutUrl: string | undefined = loginUrl
  const hasValidIdToken = isKeycloakTokenValid(idToken)

  if (hasValidIdToken && idToken) {
    const url = getKeycloakLogoutUrl(loginUrl, idToken, resolvedClientId)
    if (url) {
      keycloakLogoutUrl = url
    }
  } else if (refreshToken) {
    try {
      await logoutKeycloak(refreshToken, resolvedClientId)
    } catch (e) {
      console.warn("[Logout] Backchannel logout failed:", e)
    }
  }

  // Force clear all auth cookies
  cookieStore.set("jwt", "", { path: "/", maxAge: 0 })
  cookieStore.set("refresh_token", "", { path: "/", maxAge: 0 })
  cookieStore.set("id_token", "", { path: "/", maxAge: 0 })
  cookieStore.set("menuRole", "", { path: "/", maxAge: 0 })
  cookieStore.set("current_project", "", { path: "/", maxAge: 0 })
  cookieStore.set("remember_me", "", { path: "/", maxAge: 0 })
  cookieStore.delete("jwt")
  cookieStore.delete("refresh_token")
  cookieStore.delete("id_token")
  cookieStore.delete("menuRole")
  cookieStore.delete("current_project")
  cookieStore.delete("current_tenant")
  cookieStore.delete("remember_me")
  cookieStore.delete("pkce_verifier")

  return { success: true, keycloakLogoutUrl }
}

export async function refreshTokenAction(): Promise<{ success: boolean }> {
  const cookieStore = await cookies()
  const refreshToken = await getRefreshToken(cookieStore)
  const token = await getAuthToken(cookieStore)

  if (!refreshToken) {
    return { success: false }
  }

  // Only refresh if token is missing or expiring within 2 minutes
  let activeClientId: string | undefined
  if (token) {
    const payload = decodeJwtPayload(token)
    if (payload?.azp) {
      activeClientId = String(payload.azp)
    }
    if (payload?.exp && payload.exp * 1000 > Date.now() + 120000) {
      return { success: true }
    }
  }

  if (!activeClientId) {
    const cookieProject = cookieStore.get("current_project")?.value
    if (cookieProject) {
      activeClientId = cookieProject
    }
  }

  const newTokens = await refreshKeycloakToken(refreshToken, activeClientId)
  if (!newTokens) {
    return { success: false }
  }

  const usingHttps = process.env.USING_HTTPS === "true"
  cookieStore.set("jwt", await encryptCookieValue(newTokens.access_token), {
    httpOnly: true,
    secure: usingHttps,
    sameSite: "lax",
    path: "/",
  })

  if (newTokens.refresh_token) {
    cookieStore.set("refresh_token", await encryptCookieValue(newTokens.refresh_token), {
      httpOnly: true,
      secure: usingHttps,
      sameSite: "lax",
      path: "/",
    })
  }

  if (newTokens.id_token) {
    cookieStore.set("id_token", await encryptCookieValue(newTokens.id_token), {
      httpOnly: true,
      secure: usingHttps,
      sameSite: "lax",
      path: "/",
    })
  }

  return { success: true }
}
