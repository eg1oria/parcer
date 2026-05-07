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
  ParsedQuestion,
  ParsedVariant,
  PublicFinishPayload,
  PublicTestSummary,
  SavedTestResponse,
  SplitTestPayload,
  SplitTestResponse,
  StartedQuestion,
  StartedTest,
  StartedVariant,
  TestListItem,
  UploadedFileSummary,
} from "./types";

type ApiRequestOptions = Omit<RequestInit, "body"> & {
  body?: BodyInit | null;
  token?: string;
  timeoutMs?: number;
};

type ApiResponseParser<T> = (payload: unknown, status: number) => T;
type ValueParser<T> = (value: unknown, status: number, path: string) => T;

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
const IMPORT_REQUEST_TIMEOUT_MS = 300000;

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
  return apiRequest(
    "/auth/login",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    parseAuthResponse,
  );
}

export async function register(payload: LoginPayload): Promise<AuthResponse> {
  return apiRequest(
    "/auth/register",
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    parseAuthResponse,
  );
}

export async function getCurrentUser(token: string): Promise<AuthUser> {
  return apiRequest("/auth/me", { token }, parseAuthUser);
}

export async function getTests(token: string): Promise<TestListItem[]> {
  return apiRequest("/tests", { token }, parseTestListResponse);
}

export async function deleteTest(token: string, testId: string): Promise<void> {
  return apiRequest(
    `/tests/${testId}`,
    {
      method: "DELETE",
      token,
    },
    parseEmptyResponse,
  );
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

  return apiRequest(
    "/import/file-preview",
    {
      method: "POST",
      token,
      body: formData,
      timeoutMs: IMPORT_REQUEST_TIMEOUT_MS,
    },
    parseImportPreview,
  );
}

export async function discardImportPreview(
  token: string,
  sourceFileId: string,
): Promise<void> {
  return apiRequest(
    `/import/file-preview/${sourceFileId}`,
    {
      method: "DELETE",
      token,
      keepalive: true,
    },
    parseEmptyResponse,
  );
}

export async function confirmImport(
  token: string,
  payload: ConfirmImportPayload,
): Promise<ConfirmImportResponse> {
  return apiRequest(
    "/import/confirm",
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
      timeoutMs: IMPORT_REQUEST_TIMEOUT_MS,
    },
    parseConfirmImportResponse,
  );
}

export async function startTest(
  token: string,
  testId: string,
): Promise<StartedTest> {
  return apiRequest(
    `/tests/${testId}/start`,
    {
      method: "POST",
      token,
    },
    parseStartedTest,
  );
}

export async function getPublicTestSummary(
  testId: string,
): Promise<PublicTestSummary> {
  return apiRequest(`/public/tests/${testId}`, {}, parsePublicTestSummary);
}

export async function getPublicLeaderboard(
  testId: string,
): Promise<LeaderboardEntry[]> {
  return apiRequest(
    `/public/tests/${testId}/leaderboard`,
    {},
    parseLeaderboardEntries,
  );
}

export async function startPublicTest(testId: string): Promise<StartedTest> {
  return apiRequest(
    `/public/tests/${testId}/start`,
    {
      method: "POST",
    },
    parseStartedTest,
  );
}

export async function savePublicTest(
  token: string,
  testId: string,
): Promise<SavedTestResponse> {
  return apiRequest(
    `/public/tests/${testId}/save`,
    {
      method: "POST",
      token,
    },
    parseSavedTestResponse,
  );
}

export async function splitPublicTest(
  token: string,
  testId: string,
  payload: SplitTestPayload,
): Promise<SplitTestResponse> {
  return apiRequest(
    `/public/tests/${testId}/split`,
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    },
    parseSplitTestResponse,
  );
}

export async function checkPublicAnswer(
  testId: string,
  payload: AnswerPayload,
): Promise<AnswerCheckResponse> {
  return apiRequest(
    `/public/tests/${testId}/check-answer`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    parseAnswerCheckResponse,
  );
}

export async function finishPublicTest(
  testId: string,
  payload: PublicFinishPayload,
): Promise<FinishResponse> {
  return apiRequest(
    `/public/tests/${testId}/finish`,
    {
      method: "POST",
      body: JSON.stringify(payload),
    },
    parseFinishResponse,
  );
}

export async function checkAnswer(
  token: string,
  testId: string,
  payload: AnswerPayload,
): Promise<AnswerCheckResponse> {
  return apiRequest(
    `/tests/${testId}/check-answer`,
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    },
    parseAnswerCheckResponse,
  );
}

export async function finishTest(
  token: string,
  testId: string,
  payload: FinishPayload,
): Promise<FinishResponse> {
  return apiRequest(
    `/tests/${testId}/finish`,
    {
      method: "POST",
      token,
      body: JSON.stringify(payload),
    },
    parseFinishResponse,
  );
}

async function apiRequest<T>(
  path: string,
  options: ApiRequestOptions = {},
  parseResponse: ApiResponseParser<T>,
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

  const { signal, cleanup } = createRequestSignal(
    options.signal ?? undefined,
    options.timeoutMs,
  );
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

  const payload = await readResponsePayload(response);

  if (!response.ok) {
    throw new ApiError(
      getErrorMessage(payload, response.statusText),
      response.status,
      payload,
    );
  }

  return parseResponse(payload, response.status);
}

function createRequestSignal(
  signal?: AbortSignal,
  timeoutMs = API_REQUEST_TIMEOUT_MS,
): {
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
      signal: AbortSignal.timeout(timeoutMs),
      cleanup: () => undefined,
    };
  }

  if (typeof AbortController === "undefined") {
    return { cleanup: () => undefined };
  }

  const controller = new AbortController();
  const timeoutId = globalThis.setTimeout(() => controller.abort(), timeoutMs);

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
    return JSON.parse(text);
  } catch {
    return text;
  }
}

function parseAuthResponse(payload: unknown, status: number): AuthResponse {
  const record = expectRecord(payload, status, "response");

  return {
    accessToken: expectString(record.accessToken, status, "response.accessToken"),
    user: parseAuthUser(record.user, status, "response.user"),
  };
}

function parseAuthUser(
  value: unknown,
  status: number,
  path = "response",
): AuthUser {
  const record = expectRecord(value, status, path);

  return {
    id: expectString(record.id, status, `${path}.id`),
    email: expectString(record.email, status, `${path}.email`),
    createdAt: expectOptionalString(record.createdAt, status, `${path}.createdAt`),
    updatedAt: expectOptionalString(record.updatedAt, status, `${path}.updatedAt`),
  };
}

function parseTestListResponse(payload: unknown, status: number): TestListItem[] {
  return expectArray(payload, status, "response", parseTestListItem);
}

function parseEmptyResponse(): void {
  return undefined;
}

function parseTestListItem(
  value: unknown,
  status: number,
  path: string,
): TestListItem {
  const record = expectRecord(value, status, path);

  return {
    id: expectString(record.id, status, `${path}.id`),
    title: expectString(record.title, status, `${path}.title`),
    type: expectTestType(record.type, status, `${path}.type`),
    createdAt: expectString(record.createdAt, status, `${path}.createdAt`),
    updatedAt: expectString(record.updatedAt, status, `${path}.updatedAt`),
    sourceFile: expectNullable(
      record.sourceFile,
      status,
      `${path}.sourceFile`,
      parseUploadedFileSummary,
    ),
    _count: parseTestCounts(record._count, status, `${path}._count`),
  };
}

function parseTestCounts(
  value: unknown,
  status: number,
  path: string,
): TestListItem["_count"] {
  const record = expectRecord(value, status, path);

  return {
    questions: expectNumber(record.questions, status, `${path}.questions`),
    attempts: expectNumber(record.attempts, status, `${path}.attempts`),
  };
}

function parseImportPreview(
  value: unknown,
  status: number,
  path = "response",
): ImportPreview {
  const record = expectRecord(value, status, path);

  return {
    file: parseUploadedFileSummary(record.file, status, `${path}.file`),
    title: expectString(record.title, status, `${path}.title`),
    format: expectParseFormat(record.format, status, `${path}.format`),
    questionsFound: expectNumber(
      record.questionsFound,
      status,
      `${path}.questionsFound`,
    ),
    validQuestions: expectNumber(
      record.validQuestions,
      status,
      `${path}.validQuestions`,
    ),
    invalidQuestions: expectNumber(
      record.invalidQuestions,
      status,
      `${path}.invalidQuestions`,
    ),
    questions: expectArray(
      record.questions,
      status,
      `${path}.questions`,
      parseParsedQuestion,
    ),
    warnings: expectStringArray(record.warnings, status, `${path}.warnings`),
  };
}

function parseUploadedFileSummary(
  value: unknown,
  status: number,
  path: string,
): UploadedFileSummary {
  const record = expectRecord(value, status, path);

  return {
    id: expectString(record.id, status, `${path}.id`),
    originalName: expectString(
      record.originalName,
      status,
      `${path}.originalName`,
    ),
    mimeType: expectString(record.mimeType, status, `${path}.mimeType`),
    size: expectNumber(record.size, status, `${path}.size`),
  };
}

function parseParsedQuestion(
  value: unknown,
  status: number,
  path: string,
): ParsedQuestion {
  const record = expectRecord(value, status, path);

  return {
    text: expectString(record.text, status, `${path}.text`),
    imageUrls: expectOptionalStringArray(
      record.imageUrls,
      status,
      `${path}.imageUrls`,
    ),
    variants: expectArray(
      record.variants,
      status,
      `${path}.variants`,
      parseParsedVariant,
    ),
    warnings: expectOptionalStringArray(
      record.warnings,
      status,
      `${path}.warnings`,
    ),
  };
}

function parseParsedVariant(
  value: unknown,
  status: number,
  path: string,
): ParsedVariant {
  const record = expectRecord(value, status, path);

  return {
    text: expectString(record.text, status, `${path}.text`),
    imageUrls: expectOptionalStringArray(
      record.imageUrls,
      status,
      `${path}.imageUrls`,
    ),
    isCorrect: expectBoolean(record.isCorrect, status, `${path}.isCorrect`),
  };
}

function parseConfirmImportResponse(
  payload: unknown,
  status: number,
): ConfirmImportResponse {
  return parseSavedTestResponse(payload, status);
}

function parseSavedTestResponse(
  value: unknown,
  status: number,
  path = "response",
): SavedTestResponse {
  const record = expectRecord(value, status, path);

  return {
    testId: expectString(record.testId, status, `${path}.testId`),
    title: expectString(record.title, status, `${path}.title`),
    questionsCount: expectNumber(
      record.questionsCount,
      status,
      `${path}.questionsCount`,
    ),
  };
}

function parseStartedTest(
  value: unknown,
  status: number,
  path = "response",
): StartedTest {
  const record = expectRecord(value, status, path);

  return {
    id: expectString(record.id, status, `${path}.id`),
    title: expectString(record.title, status, `${path}.title`),
    questions: expectArray(
      record.questions,
      status,
      `${path}.questions`,
      parseStartedQuestion,
    ),
  };
}

function parseStartedQuestion(
  value: unknown,
  status: number,
  path: string,
): StartedQuestion {
  const record = expectRecord(value, status, path);

  return {
    id: expectString(record.id, status, `${path}.id`),
    text: expectString(record.text, status, `${path}.text`),
    imageUrls: expectStringArray(record.imageUrls, status, `${path}.imageUrls`),
    order: expectNumber(record.order, status, `${path}.order`),
    variants: expectArray(
      record.variants,
      status,
      `${path}.variants`,
      parseStartedVariant,
    ),
  };
}

function parseStartedVariant(
  value: unknown,
  status: number,
  path: string,
): StartedVariant {
  const record = expectRecord(value, status, path);

  return {
    id: expectString(record.id, status, `${path}.id`),
    text: expectString(record.text, status, `${path}.text`),
    imageUrls: expectStringArray(record.imageUrls, status, `${path}.imageUrls`),
    order: expectNumber(record.order, status, `${path}.order`),
  };
}

function parsePublicTestSummary(
  value: unknown,
  status: number,
  path = "response",
): PublicTestSummary {
  const record = expectRecord(value, status, path);

  return {
    id: expectString(record.id, status, `${path}.id`),
    title: expectString(record.title, status, `${path}.title`),
    questionsCount: expectNumber(
      record.questionsCount,
      status,
      `${path}.questionsCount`,
    ),
    leaderboard: expectArray(
      record.leaderboard,
      status,
      `${path}.leaderboard`,
      parseLeaderboardEntry,
    ),
  };
}

function parseLeaderboardEntries(
  payload: unknown,
  status: number,
): LeaderboardEntry[] {
  return expectArray(payload, status, "response", parseLeaderboardEntry);
}

function parseLeaderboardEntry(
  value: unknown,
  status: number,
  path: string,
): LeaderboardEntry {
  const record = expectRecord(value, status, path);

  return {
    rank: expectNumber(record.rank, status, `${path}.rank`),
    id: expectString(record.id, status, `${path}.id`),
    name: expectString(record.name, status, `${path}.name`),
    score: expectNumber(record.score, status, `${path}.score`),
    total: expectNumber(record.total, status, `${path}.total`),
    percent: expectNumber(record.percent, status, `${path}.percent`),
    createdAt: expectString(record.createdAt, status, `${path}.createdAt`),
  };
}

function parseSplitTestResponse(
  value: unknown,
  status: number,
  path = "response",
): SplitTestResponse {
  const record = expectRecord(value, status, path);

  return {
    totalParts: expectNumber(record.totalParts, status, `${path}.totalParts`),
    createdTests: expectArray(
      record.createdTests,
      status,
      `${path}.createdTests`,
      parseSavedTestResponse,
    ),
  };
}

function parseAnswerCheckResponse(
  value: unknown,
  status: number,
  path = "response",
): AnswerCheckResponse {
  const record = expectRecord(value, status, path);

  return {
    isCorrect: expectBoolean(record.isCorrect, status, `${path}.isCorrect`),
    correctVariantId: expectString(
      record.correctVariantId,
      status,
      `${path}.correctVariantId`,
    ),
    correctVariantText: expectString(
      record.correctVariantText,
      status,
      `${path}.correctVariantText`,
    ),
  };
}

function parseFinishResponse(
  value: unknown,
  status: number,
  path = "response",
): FinishResponse {
  const record = expectRecord(value, status, path);

  return {
    attemptId: expectOptionalString(record.attemptId, status, `${path}.attemptId`),
    score: expectNumber(record.score, status, `${path}.score`),
    total: expectNumber(record.total, status, `${path}.total`),
    percent: expectNumber(record.percent, status, `${path}.percent`),
  };
}

function expectRecord(
  value: unknown,
  status: number,
  path: string,
): Record<string, unknown> {
  if (!isRecord(value)) {
    throw createInvalidResponseError(status, path, value);
  }

  return value;
}

function expectArray<T>(
  value: unknown,
  status: number,
  path: string,
  parseItem: ValueParser<T>,
): T[] {
  if (!Array.isArray(value)) {
    throw createInvalidResponseError(status, path, value);
  }

  return value.map((item, index) => parseItem(item, status, `${path}[${index}]`));
}

function expectString(value: unknown, status: number, path: string): string {
  if (typeof value !== "string") {
    throw createInvalidResponseError(status, path, value);
  }

  return value;
}

function expectNumber(value: unknown, status: number, path: string): number {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw createInvalidResponseError(status, path, value);
  }

  return value;
}

function expectBoolean(value: unknown, status: number, path: string): boolean {
  if (typeof value !== "boolean") {
    throw createInvalidResponseError(status, path, value);
  }

  return value;
}

function expectNullable<T>(
  value: unknown,
  status: number,
  path: string,
  parseValue: ValueParser<T>,
): T | null {
  if (value === null) {
    return null;
  }

  return parseValue(value, status, path);
}

function expectOptionalString(
  value: unknown,
  status: number,
  path: string,
): string | undefined {
  if (value === null || typeof value === "undefined") {
    return undefined;
  }

  return expectString(value, status, path);
}

function expectStringArray(
  value: unknown,
  status: number,
  path: string,
): string[] {
  return expectArray(value, status, path, expectString);
}

function expectOptionalStringArray(
  value: unknown,
  status: number,
  path: string,
): string[] | undefined {
  if (value === null || typeof value === "undefined") {
    return undefined;
  }

  return expectStringArray(value, status, path);
}

function expectParseFormat(
  value: unknown,
  status: number,
  path: string,
): ParseFormat {
  switch (value) {
    case "AUTO":
    case "STANDARD":
    case "PARENS_MARKERS":
    case "TAGGED_FIRST_CORRECT":
    case "FIRST_VARIANT_CORRECT":
      return value;
    default:
      throw createInvalidResponseError(status, path, value);
  }
}

function expectTestType(
  value: unknown,
  status: number,
  path: string,
): TestListItem["type"] {
  if (value !== "SINGLE_CHOICE") {
    throw createInvalidResponseError(status, path, value);
  }

  return value;
}

function createInvalidResponseError(
  status: number,
  path: string,
  payload: unknown,
): ApiError {
  return new ApiError(
    `Сервер вернул данные в неожиданном формате (${path}).`,
    status,
    { path, payload },
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function getErrorMessage(payload: unknown, fallback: string): string {
  if (typeof payload === "string") {
    return payload;
  }

  if (!isRecord(payload)) {
    return fallback || "Ошибка запроса";
  }

  const message = payload.message;

  if (Array.isArray(message)) {
    return message.join("; ");
  }

  if (typeof message === "string") {
    return message;
  }

  const warnings = payload.warnings;

  if (Array.isArray(warnings)) {
    return warnings.map(String).join("; ");
  }

  return fallback || "Ошибка запроса";
}
