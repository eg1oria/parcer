import type {
  AnswerCheckResponse,
  AnswerPayload,
  AuthResponse,
  AuthUser,
  ConfirmImportPayload,
  ConfirmImportResponse,
  FinishPayload,
  FinishResponse,
  ImportPreview,
  LeaderboardEntry,
  ParseFormat,
  PublicFinishPayload,
  PublicTestSummary,
  StartedTest,
  TestListItem,
} from "./types";

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | null;
  token?: string;
};

type LoginPayload = {
  email: string;
  password: string;
};

type PreviewImportPayload = {
  file: File;
  title?: string;
  format: ParseFormat;
};

const API_REQUEST_TIMEOUT_MS = 30000;

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export function getApiBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, "") ??
    "http://localhost:3000"
  );
}

export async function login(payload: LoginPayload): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/login", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function register(payload: LoginPayload): Promise<AuthResponse> {
  return apiRequest<AuthResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  return apiRequest<AuthUser>("/auth/me", { token });
}

export async function getTests(token: string): Promise<TestListItem[]> {
  return apiRequest<TestListItem[]>("/tests", { token });
}

export async function previewImport(
  token: string,
  payload: PreviewImportPayload,
): Promise<ImportPreview> {
  const formData = new FormData();
  formData.append("file", payload.file);
  formData.append("format", payload.format);

  if (payload.title?.trim()) {
    formData.append("title", payload.title.trim());
  }

  return apiRequest<ImportPreview>("/import/file-preview", {
    method: "POST",
    token,
    body: formData,
  });
}

export async function confirmImport(
  token: string,
  payload: ConfirmImportPayload,
): Promise<ConfirmImportResponse> {
  return apiRequest<ConfirmImportResponse>("/import/confirm", {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function startTest(
  token: string,
  testId: string,
): Promise<StartedTest> {
  return apiRequest<StartedTest>(`/tests/${testId}/start`, {
    method: "POST",
    token,
  });
}

export async function getPublicTestSummary(
  testId: string,
): Promise<PublicTestSummary> {
  return apiRequest<PublicTestSummary>(`/public/tests/${testId}`);
}

export async function getPublicLeaderboard(
  testId: string,
): Promise<LeaderboardEntry[]> {
  return apiRequest<LeaderboardEntry[]>(`/public/tests/${testId}/leaderboard`);
}

export async function startPublicTest(testId: string): Promise<StartedTest> {
  return apiRequest<StartedTest>(`/public/tests/${testId}/start`, {
    method: "POST",
  });
}

export async function checkPublicAnswer(
  testId: string,
  payload: AnswerPayload,
): Promise<AnswerCheckResponse> {
  return apiRequest<AnswerCheckResponse>(
    `/public/tests/${testId}/check-answer`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
  );
}

export async function finishPublicTest(
  testId: string,
  payload: PublicFinishPayload,
): Promise<FinishResponse> {
  return apiRequest<FinishResponse>(`/public/tests/${testId}/finish`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function checkAnswer(
  token: string,
  testId: string,
  payload: AnswerPayload,
): Promise<AnswerCheckResponse> {
  return apiRequest<AnswerCheckResponse>(`/tests/${testId}/check-answer`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

export async function finishTest(
  token: string,
  testId: string,
  payload: FinishPayload,
): Promise<FinishResponse> {
  return apiRequest<FinishResponse>(`/tests/${testId}/finish`, {
    method: "POST",
    token,
    body: JSON.stringify(payload),
  });
}

async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
): Promise<T> {
  const headers = new Headers(options.headers);
  const hasFormDataBody =
    typeof FormData !== "undefined" && options.body instanceof FormData;

  if (options.token) {
    headers.set("Authorization", `Bearer ${options.token}`);
  }

  if (options.body && !hasFormDataBody && !headers.has("Content-Type")) {
    headers.set("Content-Type", "application/json");
  }

  if (!headers.has("Accept")) {
    headers.set("Accept", "application/json");
  }

  const { signal, cleanup } = createRequestSignal(options.signal ?? undefined);
  let response: Response;

  try {
    response = await fetch(`${getApiBaseUrl()}${path}`, {
      ...options,
      headers,
      signal,
    });
  } catch (error) {
    if (isAbortLikeError(error)) {
      throw new ApiError(
        "Время ожидания ответа API истекло. Проверьте, что бэкенд запущен и доступен.",
        0,
        error,
      );
    }

    throw error;
  } finally {
    cleanup();
  }

  if (response.status === 204) {
    return undefined as T;
  }

  const payload = await readResponsePayload(response);

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(payload, response.statusText),
      response.status,
      payload,
    );
  }

  return payload as T;
}

function createRequestSignal(signal?: AbortSignal): {
  signal?: AbortSignal;
  cleanup: () => void;
} {
  if (signal) {
    return { signal, cleanup: () => undefined };
  }

  if (
    typeof AbortSignal !== "undefined" &&
    typeof AbortSignal.timeout === "function"
  ) {
    return {
      signal: AbortSignal.timeout(API_REQUEST_TIMEOUT_MS),
      cleanup: () => undefined,
    };
  }

  if (typeof AbortController === "undefined") {
    return { cleanup: () => undefined };
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(
    () => controller.abort(),
    API_REQUEST_TIMEOUT_MS,
  );

  return {
    signal: controller.signal,
    cleanup: () => globalThis.clearTimeout(timeoutId),
  };
}

function isAbortLikeError(error: unknown): boolean {
  return (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

async function readResponsePayload(response: Response): Promise<unknown> {
  const text = await response.text();

  if (!text) {
    return null;
  }

  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "string") {
    return payload;
  }

  if (!payload || typeof payload !== "object") {
    return fallback || "Ошибка запроса";
  }

  const record = payload as Record<string, unknown>;
  const message = record.message;

  if (Array.isArray(message)) {
    return message.join("; ");
  }

  if (typeof message === "string") {
    return message;
  }

  const warnings = record.warnings;

  if (Array.isArray(warnings)) {
    return warnings.map(String).join("; ");
  }

  return fallback || "Ошибка запроса";
}
