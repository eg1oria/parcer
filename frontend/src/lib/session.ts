import type { AuthResponse } from "./types";

const SESSION_STORAGE_KEY = "testprep.session";
const IMPORT_PREVIEW_STORAGE_KEY = "testprep.import-preview";

export type StoredSession = AuthResponse;

export function readStoredSession(): StoredSession | null {
  const storage = getLocalStorage();

  if (!storage) {
    return null;
  }

  let rawSession: string | null;

  try {
    rawSession = storage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }

  if (!rawSession) {
    return null;
  }

  try {
    const session = JSON.parse(rawSession) as StoredSession;

    if (!session.accessToken || !session.user?.id) {
      clearStoredSession();
      return null;
    }

    return session;
  } catch {
    clearStoredSession();
    return null;
  }
}

export function saveStoredSession(session: StoredSession): void {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  } catch {
    // Private browsing and blocked storage should not break the app shell.
  }
}

export function clearStoredSession(): void {
  const storage = getLocalStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(SESSION_STORAGE_KEY);
  } catch {
    // Nothing else to clear when browser storage is unavailable.
  }
}

export function readStoredImportPreviewSourceFileId(): string | null {
  const storage = getSessionStorage();

  if (!storage) {
    return null;
  }

  try {
    const sourceFileId = storage.getItem(IMPORT_PREVIEW_STORAGE_KEY)?.trim();

    return sourceFileId ? sourceFileId : null;
  } catch {
    return null;
  }
}

export function saveStoredImportPreviewSourceFileId(sourceFileId: string): void {
  const storage = getSessionStorage();

  if (!storage) {
    return;
  }

  try {
    storage.setItem(IMPORT_PREVIEW_STORAGE_KEY, sourceFileId);
  } catch {
    // Blocked storage should not break preview cleanup.
  }
}

export function clearStoredImportPreviewSourceFileId(): void {
  const storage = getSessionStorage();

  if (!storage) {
    return;
  }

  try {
    storage.removeItem(IMPORT_PREVIEW_STORAGE_KEY);
  } catch {
    // Nothing else to do when browser storage is unavailable.
  }
}

function getLocalStorage(): Storage | null {
  return getWindowStorage("localStorage");
}

function getSessionStorage(): Storage | null {
  return getWindowStorage("sessionStorage");
}

function getWindowStorage(
  storageType: "localStorage" | "sessionStorage",
): Storage | null {
  if (typeof window === "undefined") {
    return null;
  }

  try {
    return window[storageType];
  } catch {
    return null;
  }
}
