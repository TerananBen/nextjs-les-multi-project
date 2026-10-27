import fs from "fs";
import path from "path";

export interface VerificationRecord {
  email?: string;
  username?: string;
  status: "waiting" | "verified";
  waitingSince: number;
  verifiedAt?: number;
  redirectUrl?: string;
  tokens?: {
    accessToken?: string;
    refreshToken?: string;
    idToken?: string;
  };
  projectId?: string;
  roles?: string[];
}

interface StoreData {
  records: Record<string, VerificationRecord>;
  lastWaitingSince?: number;
}

const getStoreFilePath = (): string => {
  const nextDir = path.join(process.cwd(), ".next");
  if (fs.existsSync(nextDir)) {
    return path.join(nextDir, "verify-store.json");
  }
  return path.join(process.cwd(), ".verify-store.json");
};

const readStore = (): StoreData => {
  try {
    const filePath = getStoreFilePath();
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, "utf-8");
      return JSON.parse(content) as StoreData;
    }
  } catch {
    // Return empty on error
  }
  return { records: {} };
};

const writeStore = (data: StoreData): void => {
  try {
    const filePath = getStoreFilePath();
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), "utf-8");
  } catch {
    // Silent fail if filesystem not writable
  }
};

const CLEANUP_THRESHOLD_MS = 30 * 60 * 1000; // 30 minutes

const normalizeKey = (val?: string): string => {
  return (val || "").toLowerCase().trim();
};

export const registerPendingEmail = (email?: string, username?: string): void => {
  const normEmail = normalizeKey(email);
  const normUser = normalizeKey(username);
  if (!normEmail && !normUser) return;

  const data = readStore();
  const now = Date.now();

  const record: VerificationRecord = {
    email: normEmail || undefined,
    username: normUser || undefined,
    status: "waiting",
    waitingSince: now,
  };

  if (normEmail) {
    data.records[normEmail] = record;
  }
  if (normUser) {
    data.records[normUser] = record;
  }

  // Cleanup old records
  for (const [key, item] of Object.entries(data.records)) {
    if (now - item.waitingSince > CLEANUP_THRESHOLD_MS) {
      delete data.records[key];
    }
  }

  writeStore(data);
};

export const isEmailPending = (email?: string, username?: string): boolean => {
  const normEmail = normalizeKey(email);
  const normUser = normalizeKey(username);
  if (!normEmail && !normUser) return false;

  const data = readStore();
  const now = Date.now();

  if (normEmail && data.records[normEmail]) {
    const r = data.records[normEmail];
    if (r.status === "waiting" && now - r.waitingSince <= CLEANUP_THRESHOLD_MS) {
      return true;
    }
  }

  if (normUser && data.records[normUser]) {
    const r = data.records[normUser];
    if (r.status === "waiting" && now - r.waitingSince <= CLEANUP_THRESHOLD_MS) {
      return true;
    }
  }

  return false;
};

export const markEmailVerified = (
  identifier?: string,
  details?: {
    redirectUrl?: string;
    tokens?: {
      accessToken?: string;
      refreshToken?: string;
      idToken?: string;
    };
    projectId?: string;
    roles?: string[];
  }
): void => {
  const normId = normalizeKey(identifier);
  if (!normId) return;

  const data = readStore();
  const now = Date.now();

  const updateRecord = (record: VerificationRecord): VerificationRecord => ({
    ...record,
    status: "verified",
    verifiedAt: now,
    redirectUrl: details?.redirectUrl,
    tokens: details?.tokens,
    projectId: details?.projectId,
    roles: details?.roles,
  });

  const baseRecord: VerificationRecord = {
    email: normId || undefined,
    status: "verified",
    waitingSince: now,
    verifiedAt: now,
    redirectUrl: details?.redirectUrl,
    tokens: details?.tokens,
    projectId: details?.projectId,
    roles: details?.roles,
  };

  data.records[normId] = updateRecord(data.records[normId] || baseRecord);

  // Update any other waiting records with matching email or username
  for (const [key, r] of Object.entries(data.records)) {
    if (
      (r.email && r.email === normId) ||
      (r.username && r.username === normId) ||
      key === normId
    ) {
      data.records[key] = updateRecord(r);
    }
  }

  writeStore(data);
};

export const getVerificationRecord = (identifier?: string): VerificationRecord | null => {
  const normId = normalizeKey(identifier);
  if (!normId) return null;

  const data = readStore();
  const now = Date.now();

  if (data.records[normId]) {
    const record = data.records[normId];
    if (now - record.waitingSince <= CLEANUP_THRESHOLD_MS) {
      return record;
    }
  }

  for (const r of Object.values(data.records)) {
    if (
      ((r.email && r.email === normId) || (r.username && r.username === normId)) &&
      now - r.waitingSince <= CLEANUP_THRESHOLD_MS
    ) {
      return r;
    }
  }

  return null;
};

export const consumeVerification = (identifier?: string): void => {
  const normId = normalizeKey(identifier);
  if (!normId) return;

  const data = readStore();

  if (data.records[normId]) {
    delete data.records[normId];
  }

  for (const [key, r] of Object.entries(data.records)) {
    if (r.email === normId || r.username === normId) {
      delete data.records[key];
    }
  }

  writeStore(data);
};
