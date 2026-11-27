import { getActiveProjectCode } from "@/lib/project"
import { getBffServiceToken, invalidateBffServiceToken } from "@/lib/keycloak"
import { getAuthToken } from "@/lib/auth-cookies"

const BACKEND_BASE_URL = process.env.API_URL || "http://localhost:5000"

export interface NestJsRequestOptions extends RequestInit {
  skipAuth?: boolean
  skipProject?: boolean
  useServiceToken?: boolean
}

export interface NestJsDetailedResult<T> {
  ok: boolean
  status: number
  data: T | null
  errorText?: string
  message?: string
}

export async function fetchNestJsDetailed<T>(
  endpoint: string,
  options: NestJsRequestOptions = {}
): Promise<NestJsDetailedResult<T>> {
  try {
    const { skipAuth, skipProject, useServiceToken, ...fetchInit } = options
    const token = await getAuthToken()

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...((fetchInit.headers as Record<string, string>) || {}),
    }

    if (useServiceToken) {
      const serviceToken = await getBffServiceToken()
      if (serviceToken) {
        headers["Authorization"] = `Bearer ${serviceToken}`
      }
    } else if (!skipAuth && token) {
      headers["Authorization"] = `Bearer ${token}`
    }

    if (!skipProject) {
      const projectCode =
        (fetchInit.headers as Record<string, string>)?.["X-Project-Name"] ||
        (await getActiveProjectCode())
      if (projectCode) {
        headers["X-Project-Name"] = projectCode
      }
    }

    let cleanEndpoint = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
    if (!cleanEndpoint.startsWith("/api/iam")) {
      if (cleanEndpoint.startsWith("/api/")) {
        cleanEndpoint = `/api/iam${cleanEndpoint.substring(4)}`
      } else {
        cleanEndpoint = `/api/iam${cleanEndpoint}`
      }
    }
    const url = `${BACKEND_BASE_URL}${cleanEndpoint}`

    let response = await fetch(url, {
      cache: "no-store",
      ...fetchInit,
      headers,
    })

    // Retry once with a fresh BFF service token if cached token was rejected
    if (response.status === 401 && useServiceToken) {
      invalidateBffServiceToken()
      const freshToken = await getBffServiceToken()
      if (freshToken) {
        headers["Authorization"] = `Bearer ${freshToken}`
        response = await fetch(url, {
          cache: "no-store",
          ...fetchInit,
          headers,
        })
      }
    }

    if (!response.ok) {
      const errorText = await response.text().catch(() => "")
      console.error(
        `NestJS API error [${response.status}]: ${response.statusText} (${url}) -> ${errorText}`
      )
      let parsedMessage: string | undefined
      try {
        const parsed = JSON.parse(errorText)
        parsedMessage =
          parsed.message || parsed.errorMessage || parsed.error_description || parsed.error
        if (Array.isArray(parsedMessage)) {
          parsedMessage = parsedMessage.join(", ")
        }
      } catch {
        parsedMessage = errorText
      }
      return {
        ok: false,
        status: response.status,
        data: null,
        errorText,
        message: parsedMessage,
      }
    }

    const data = (await response.json().catch(() => null)) as T
    return {
      ok: true,
      status: response.status,
      data,
    }
  } catch (error) {
    console.error(`NestJS API fetch exception (${endpoint}):`, error)
    return {
      ok: false,
      status: 500,
      data: null,
      errorText: String(error),
      message: "Network or server connection failed",
    }
  }
}

export async function fetchNestJs<T>(
  endpoint: string,
  options: NestJsRequestOptions = {}
): Promise<T | null> {
  const res = await fetchNestJsDetailed<T>(endpoint, options)
  return res.ok ? res.data : null
}

export async function fetchMenuNestJs<T>(
  menuName: string,
  endpoint: string,
  options: NestJsRequestOptions & { apiVersion?: number } = {}
): Promise<T | null> {
  let version = options.apiVersion
  if (!version) {
    try {
      const { getAuthorizedMenu } = await import("@/app/actions/auth")
      const menus = await getAuthorizedMenu()
      const found = menus.find((m) => m.menu_name === menuName)
      version = found?.api_version || 1
    } catch {
      version = 1
    }
  }

  const clean = endpoint.startsWith("/") ? endpoint : `/${endpoint}`
  let versionedEndpoint: string

  if (clean.startsWith(`/api/v`) || clean.includes(`/v${version}/`)) {
    versionedEndpoint = clean
  } else if (clean.startsWith("/api/")) {
    versionedEndpoint = `/api/v${version}${clean.substring(4)}`
  } else {
    versionedEndpoint = `/api/v${version}${clean}`
  }

  return fetchNestJs<T>(versionedEndpoint, options)
}
