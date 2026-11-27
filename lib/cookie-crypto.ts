const COOKIE_ENC_PREFIX = "enc.v1."
const IV_BYTE_LENGTH = 12

interface CachedKey {
  secret: string
  cryptoKey: CryptoKey
}

let cachedKey: CachedKey | null = null

const toBase64Url = (bytes: Uint8Array): string => {
  let binary = ""
  const chunkSize = 0x8000
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const slice = bytes.subarray(i, i + chunkSize)
    binary += String.fromCharCode(...slice)
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "")
}

const fromBase64Url = (input: string): Uint8Array<ArrayBuffer> => {
  const normalized = input.replace(/-/g, "+").replace(/_/g, "/")
  const padLength = (4 - (normalized.length % 4)) % 4
  const padded = normalized + "=".repeat(padLength)
  const binary = atob(padded)
  const buffer = new ArrayBuffer(binary.length)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return bytes
}

const hexToBytes = (hex: string): Uint8Array<ArrayBuffer> => {
  const buffer = new ArrayBuffer(hex.length / 2)
  const bytes = new Uint8Array(buffer)
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16)
  }
  return bytes
}

const getRawEncryptionSecret = (): string => {
  const secret = (process.env.COOKIE_ENCRYPTION_KEY || "").trim()
  if (!secret) {
    throw new Error(
      "[CookieCrypto] Missing COOKIE_ENCRYPTION_KEY environment variable. Set a 64-character hex key (32 bytes) in .env."
    )
  }
  return secret
}

const getCryptoKey = async (): Promise<CryptoKey> => {
  const secret = getRawEncryptionSecret()
  if (cachedKey && cachedKey.secret === secret) {
    return cachedKey.cryptoKey
  }

  let keyMaterial: ArrayBuffer
  if (/^[0-9a-f]{64}$/i.test(secret)) {
    keyMaterial = hexToBytes(secret).buffer
  } else {
    const encoded = new TextEncoder().encode(secret)
    keyMaterial = await crypto.subtle.digest("SHA-256", encoded)
  }

  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  )

  cachedKey = { secret, cryptoKey }
  return cryptoKey
}

const compressBytes = async (data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> => {
  const stream = new Blob([data]).stream().pipeThrough(new CompressionStream("deflate-raw"))
  const buffer = await new Response(stream).arrayBuffer()
  return new Uint8Array(buffer)
}

const decompressBytes = async (data: Uint8Array<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> => {
  const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream("deflate-raw"))
  const buffer = await new Response(stream).arrayBuffer()
  return new Uint8Array(buffer)
}

export const isEncryptedCookieValue = (value?: string | null): boolean => {
  return Boolean(value && value.startsWith(COOKIE_ENC_PREFIX))
}

export const encryptCookieValue = async (plaintext: string): Promise<string> => {
  if (!plaintext) return ""

  const key = await getCryptoKey()
  const rawBytes = new TextEncoder().encode(plaintext)
  const plainCopy = new Uint8Array(new ArrayBuffer(rawBytes.byteLength))
  plainCopy.set(rawBytes)

  const compressed = await compressBytes(plainCopy)
  const iv = new Uint8Array(new ArrayBuffer(IV_BYTE_LENGTH))
  crypto.getRandomValues(iv)

  const cipherBuffer = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    compressed
  )
  const cipherBytes = new Uint8Array(cipherBuffer)

  const combined = new Uint8Array(new ArrayBuffer(iv.byteLength + cipherBytes.byteLength))
  combined.set(iv, 0)
  combined.set(cipherBytes, iv.byteLength)

  return `${COOKIE_ENC_PREFIX}${toBase64Url(combined)}`
}

export const decryptCookieValue = async (encrypted?: string | null): Promise<string | undefined> => {
  if (!encrypted) return undefined
  if (!encrypted.startsWith(COOKIE_ENC_PREFIX)) {
    return undefined
  }

  try {
    const key = await getCryptoKey()
    const payload = encrypted.slice(COOKIE_ENC_PREFIX.length)
    const combined = fromBase64Url(payload)
    if (combined.byteLength <= IV_BYTE_LENGTH) {
      return undefined
    }

    const iv = new Uint8Array(new ArrayBuffer(IV_BYTE_LENGTH))
    iv.set(combined.subarray(0, IV_BYTE_LENGTH))

    const cipherLength = combined.byteLength - IV_BYTE_LENGTH
    const cipherBytes = new Uint8Array(new ArrayBuffer(cipherLength))
    cipherBytes.set(combined.subarray(IV_BYTE_LENGTH))

    const plainCompressedBuffer = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv },
      key,
      cipherBytes
    )
    const decompressed = await decompressBytes(new Uint8Array(plainCompressedBuffer))
    return new TextDecoder().decode(decompressed)
  } catch {
    return undefined
  }
}
