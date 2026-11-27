import { cookies } from "next/headers"
import { decryptCookieValue, encryptCookieValue } from "@/lib/cookie-crypto"

type CookieGetter = {
  get: (name: string) => { value: string } | undefined
}

export const getAuthToken = async (cookieStore?: CookieGetter): Promise<string | undefined> => {
  try {
    const store = cookieStore ?? (await cookies())
    const raw = store.get("jwt")?.value
    return decryptCookieValue(raw)
  } catch {
    return undefined
  }
}

export const getRefreshToken = async (cookieStore?: CookieGetter): Promise<string | undefined> => {
  try {
    const store = cookieStore ?? (await cookies())
    const raw = store.get("refresh_token")?.value
    return decryptCookieValue(raw)
  } catch {
    return undefined
  }
}

export const getIdToken = async (cookieStore?: CookieGetter): Promise<string | undefined> => {
  try {
    const store = cookieStore ?? (await cookies())
    const raw = store.get("id_token")?.value
    return decryptCookieValue(raw)
  } catch {
    return undefined
  }
}

export { encryptCookieValue, decryptCookieValue }
