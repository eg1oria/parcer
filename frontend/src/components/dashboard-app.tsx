/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { ChangeEvent, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AlertCircle,
  CheckCircle2,
  FileQuestion,
  Loader2,
  LogIn,
  LogOut,
  Plus,
  Play,
  RefreshCw,
  Save,
  Share2,
  Trash2,
  UploadCloud,
  UserPlus,
  XCircle,
} from "lucide-react";
import {
  ApiError,
  confirmImport,
  getCurrentUser,
  login,
  previewImport,
  register,
} from "@/lib/api";
import {
  clearStoredSession,
  readStoredSession,
  saveStoredSession,
} from "@/lib/session";
import { getSafeQuestionImageUrls } from "@/lib/images";
import type {
  AuthResponse,
  AuthUser,
  ImportPreview,
  ParsedQuestion,
  ParseFormat,
  TestListItem,
} from "@/lib/types";

type AuthStatus = "checking" | "guest" | "authenticated";
type AuthMode = "login" | "register";
type NoticeTone = "success" | "error" | "warning";

type NoticeState = {
  tone: NoticeTone;
  title: string;
  messages?: string[];
};

type ImportValidationIssue = {
  message: string;
  questionIndex?: number;
};

const PARSE_FORMATS: Array<{ value: ParseFormat; label: string }> = [
  { value: "AUTO", label: "Авто" },
  { value: "STANDARD", label: "Стандарт" },
  { value: "PARENS_MARKERS", label: "(!) / (?)" },
  { value: "TAGGED_FIRST_CORRECT", label: "<question>" },
  { value: "FIRST_VARIANT_CORRECT", label: "Первый ответ" },
];

const fieldClass =
  "min-h-10 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100";
const labelClass = "text-xs font-medium uppercase tracking-normal text-stone-500";
const primaryButtonClass =
  "inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-center text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600";
const secondaryButtonClass =
  "inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-center text-sm font-semibold text-stone-800 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400";
const dangerButtonClass =
  "inline-flex min-h-9 min-w-0 items-center justify-center gap-2 rounded-md border border-red-200 bg-white px-3 py-2 text-center text-sm font-semibold text-red-700 transition hover:bg-red-50 disabled:cursor-not-allowed disabled:text-stone-400";
const panelClass =
  "rounded-md border border-stone-200 bg-white p-4 shadow-sm sm:p-5";
const SESSION_CHECK_TIMEOUT_MS = 8000;
const SESSION_CHECK_TIMEOUT_MESSAGE = "Session check timed out";

export function DashboardApp() {
  const router = useRouter();
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  const logout = useCallback(() => {
    clearStoredSession();
    setToken(null);
    setUser(null);
    setAuthStatus("guest");
  }, []);

  useEffect(() => {
    let mounted = true;
    void Promise.resolve().then(async () => {
      const storedSession = readStoredSession();

      if (!mounted) {
        return;
      }

      if (!storedSession) {
        setAuthStatus("guest");
        return;
      }

      setToken(storedSession.accessToken);
      setUser(storedSession.user);

      try {
        const currentUser = await withTimeout(
          getCurrentUser(storedSession.accessToken),
          SESSION_CHECK_TIMEOUT_MS,
        );

        if (!mounted) {
          return;
        }

        const refreshedSession = {
          accessToken: storedSession.accessToken,
          user: currentUser,
        };

        saveStoredSession(refreshedSession);
        setUser(currentUser);
        setAuthStatus("authenticated");
      } catch (error) {
        if (!mounted) {
          return;
        }

        if (error instanceof ApiError && error.status === 401) {
          logout();
          return;
        }

        setAuthStatus("authenticated");
      }
    });

    return () => {
      mounted = false;
    };
  }, [logout]);

  const handleAuthenticated = (auth: AuthResponse) => {
    saveStoredSession(auth);
    setToken(auth.accessToken);
    setUser(auth.user);
    setAuthStatus("authenticated");
  };

  if (authStatus === "checking") {
    return <FullPageStatus label="Проверяем сессию" />;
  }

  if (authStatus === "guest" || !token || !user) {
    return <AuthScreen onAuthenticated={handleAuthenticated} />;
  }

  return (
    <main className="min-h-dvh bg-stone-100 text-stone-950">
      <header className="sticky top-0 z-30 border-b border-stone-200 bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-3 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-4 lg:px-6">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-teal-700 text-white">
              <FileQuestion size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="text-xl font-semibold text-stone-950">
                Test Prep
              </h1>
              <p className="truncate text-sm text-stone-500">{user.email}</p>
            </div>
          </div>
          <div className="grid gap-2 sm:flex sm:items-center">
            <Link
              className={`${secondaryButtonClass} w-full sm:w-auto`}
              href="/tests"
            >
              <CheckCircle2 size={17} aria-hidden="true" />
              Мои тесты
            </Link>
            <button
              type="button"
              className={`${secondaryButtonClass} w-full sm:w-auto`}
              onClick={logout}
            >
              <LogOut size={17} aria-hidden="true" />
              Выйти
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-7xl items-start gap-4 px-3 py-4 sm:gap-5 sm:px-4 sm:py-5 lg:px-6 xl:gap-6">
        <ImportPanel
          token={token}
          onImported={(testId) => {
            router.push(`/tests/${testId}`);
          }}
          onUnauthorized={logout}
        />
      </div>
    </main>
  );
}

export function FullPageStatus({ label }: { label: string }) {
  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-100 px-4 text-stone-900">
      <div className="flex items-center gap-3 rounded-md border border-stone-200 bg-white px-4 py-3 shadow-sm">
        <Loader2 className="animate-spin text-teal-700" size={18} aria-hidden="true" />
        <span className="text-sm font-medium">{label}</span>
      </div>
    </main>
  );
}

export function AuthScreen({
  onAuthenticated,
}: {
  onAuthenticated: (auth: AuthResponse) => void;
}) {
  const [mode, setMode] = useState<AuthMode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isRegister = mode === "register";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payload = { email: email.trim(), password };
      const auth = isRegister ? await register(payload) : await login(payload);
      onAuthenticated(auth);
    } catch (submitError) {
      setError(getReadableError(submitError));
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center bg-stone-100 px-3 py-6 text-stone-950 sm:px-4 sm:py-8">
      <section className="w-full max-w-md rounded-md border border-stone-200 bg-white p-5 shadow-sm sm:p-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-md bg-teal-700 text-white">
            <FileQuestion size={20} aria-hidden="true" />
          </div>
          <div>
            <h1 className="text-xl font-semibold">Test Prep</h1>
            <p className="text-sm text-stone-500">
              {isRegister ? "Регистрация" : "Вход"}
            </p>
          </div>
        </div>

        <div className="mb-5 grid grid-cols-2 gap-2 rounded-md bg-stone-100 p-1">
          <button
            type="button"
            className={`min-h-9 rounded-md text-sm font-semibold transition ${
              mode === "login"
                ? "bg-white text-stone-950 shadow-sm"
                : "text-stone-600 hover:text-stone-950"
            }`}
            onClick={() => setMode("login")}
          >
            Вход
          </button>
          <button
            type="button"
            className={`min-h-9 rounded-md text-sm font-semibold transition ${
              mode === "register"
                ? "bg-white text-stone-950 shadow-sm"
                : "text-stone-600 hover:text-stone-950"
            }`}
            onClick={() => setMode("register")}
          >
            Регистрация
          </button>
        </div>

        {error ? (
          <Notice
            tone="error"
            title={
              isRegister
                ? "Не удалось создать аккаунт"
                : "Не удалось выполнить вход"
            }
            messages={[error]}
          />
        ) : null}

        <form className="mt-5 space-y-4" onSubmit={handleSubmit}>
          <label className="block space-y-1.5">
            <span className={labelClass}>Email</span>
            <input
              className={fieldClass}
              type="email"
              value={email}
              autoComplete="email"
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label className="block space-y-1.5">
            <span className={labelClass}>Пароль</span>
            <input
              className={fieldClass}
              type="password"
              value={password}
              autoComplete={isRegister ? "new-password" : "current-password"}
              minLength={isRegister ? 8 : undefined}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </label>
          <button
            type="submit"
            className={`${primaryButtonClass} w-full`}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="animate-spin" size={17} aria-hidden="true" />
            ) : isRegister ? (
              <UserPlus size={17} aria-hidden="true" />
            ) : (
              <LogIn size={17} aria-hidden="true" />
            )}
            {isRegister ? "Создать аккаунт" : "Войти"}
          </button>
        </form>
      </section>
    </main>
  );
}

function ImportPanel({
  token,
  onImported,
  onUnauthorized,
}: {
  token: string;
  onImported: (testId: string) => void | Promise<void>;
  onUnauthorized: () => void;
}) {
  const [fileInputKey, setFileInputKey] = useState(0);
  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState("");
  const [format, setFormat] = useState<ParseFormat>("AUTO");
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [questions, setQuestions] = useState<ParsedQuestion[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [confirmLoading, setConfirmLoading] = useState(false);
  const [notice, setNotice] = useState<NoticeState | null>(null);
  const [focusedQuestionIndex, setFocusedQuestionIndex] = useState<
    number | null
  >(null);
  const focusTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const validationIssues = useMemo(
    () => getImportValidationIssues(title, questions),
    [questions, title],
  );
  const canConfirm =
    Boolean(preview) && validationIssues.length === 0 && !confirmLoading;

  useEffect(() => {
    return () => {
      if (focusTimeoutRef.current) {
        clearTimeout(focusTimeoutRef.current);
      }
    };
  }, []);

  function handleFileChange(event: ChangeEvent<HTMLInputElement>) {
    const nextFile = event.target.files?.[0] ?? null;
    setFile(nextFile);
    setPreview(null);
    setQuestions([]);
    setNotice(null);
    setFocusedQuestionIndex(null);

    if (nextFile && !title.trim()) {
      setTitle(getTitleFromFileName(nextFile.name));
    }
  }

  async function handlePreview(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setNotice(null);

    if (!file) {
      setNotice({
        tone: "error",
        title: "Файл не выбран",
        messages: ["Выберите файл .txt, .doc, .docx или .pdf."],
      });
      return;
    }

    setPreviewLoading(true);

    try {
      const result = await previewImport(token, {
        file,
        title,
        format,
      });

      setPreview(result);
      setTitle(result.title);
      setQuestions(normalizeQuestions(result.questions));
      setFocusedQuestionIndex(null);
      setNotice({
        tone: "success",
        title: "Превью готово",
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onUnauthorized();
        return;
      }

      setNotice({
        tone: "error",
        title: "Не удалось разобрать файл",
        messages: [getReadableError(error)],
      });
    } finally {
      setPreviewLoading(false);
    }
  }

  async function handleConfirm() {
    if (!preview || validationIssues.length > 0) {
      return;
    }

    setNotice(null);
    setConfirmLoading(true);

    try {
      const result = await confirmImport(token, {
        title: title.trim(),
        sourceFileId: preview.file.id,
        questions: questions.map((question) => ({
          text: question.text.trim(),
          imageUrls: getSafeQuestionImageUrls(question.imageUrls),
          variants: question.variants.map((variant) => ({
            text: variant.text.trim(),
            imageUrls: getSafeQuestionImageUrls(variant.imageUrls),
            isCorrect: variant.isCorrect,
          })),
        })),
      });

      setNotice({
        tone: "success",
        title: `Тест сохранен: ${result.title}`,
        messages: [`Вопросов: ${result.questionsCount}`],
      });
      setFile(null);
      setPreview(null);
      setQuestions([]);
      setTitle("");
      setFileInputKey((key) => key + 1);
      await onImported(result.testId);
    } catch (error) {
      if (error instanceof ApiError && error.status === 401) {
        onUnauthorized();
        return;
      }

      setNotice({
        tone: "error",
        title: "Не удалось сохранить тест",
        messages: [getReadableError(error)],
      });
    } finally {
      setConfirmLoading(false);
    }
  }

  return (
    <section className={panelClass}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-950">Импорт</h2>
          <p className="text-sm text-stone-500">TXT, DOC, DOCX, PDF</p>
        </div>
        {preview ? (
          <div className="flex flex-wrap gap-2 text-sm">
            <Metric label="Найдено" value={preview.questionsFound} />
            <Metric label="Валидно" value={preview.validQuestions} tone="success" />
            <Metric label="Ошибок" value={preview.invalidQuestions} tone="warning" />
          </div>
        ) : null}
      </div>

      {notice ? <Notice {...notice} /> : null}

      <form
        className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_220px]"
        onSubmit={handlePreview}
      >
        <label className="block space-y-1.5">
          <span className={labelClass}>Файл</span>
          <span className="flex min-h-12 cursor-pointer items-center gap-3 rounded-md border border-stone-300 bg-white px-3 py-2 transition hover:border-stone-400 hover:bg-stone-50 focus-within:border-teal-600 focus-within:ring-2 focus-within:ring-teal-100">
            <input
              key={fileInputKey}
              className="sr-only"
              type="file"
              accept=".txt,.doc,.docx,.pdf,text/plain,application/msword,application/pdf,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
              onChange={handleFileChange}
            />
            <span className="flex size-8 shrink-0 items-center justify-center rounded-md bg-stone-100 text-stone-700">
              <UploadCloud size={17} aria-hidden="true" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-stone-950">
                {file ? file.name : "Выберите файл"}
              </span>
              <span className="block text-xs text-stone-500">
                {file ? formatFileSize(file.size) : "TXT, DOC, DOCX, PDF"}
              </span>
            </span>
            <span className="hidden min-h-8 shrink-0 items-center rounded-md border border-stone-300 px-2.5 text-xs font-semibold text-stone-700 sm:inline-flex">
              Выбрать
            </span>
          </span>
        </label>
        <label className="block space-y-1.5">
          <span className={labelClass}>Формат</span>
          <select
            className={fieldClass}
            value={format}
            onChange={(event) => setFormat(event.target.value as ParseFormat)}
          >
            {PARSE_FORMATS.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label className="block space-y-1.5 lg:col-span-2">
          <span className="flex items-center justify-between gap-3">
            <span className={labelClass}>Название</span>
            <span className="text-xs text-stone-400">{title.length}/160</span>
          </span>
          <input
            className={fieldClass}
            type="text"
            value={title}
            maxLength={160}
            onChange={(event) => setTitle(event.target.value)}
          />
        </label>
        <div className="grid gap-2 sm:flex sm:flex-wrap lg:col-span-2">
          <button
            type="submit"
            className={`${primaryButtonClass} w-full sm:w-auto`}
            disabled={!file || previewLoading}
          >
            {previewLoading ? (
              <Loader2 className="animate-spin" size={17} aria-hidden="true" />
            ) : (
              <UploadCloud size={17} aria-hidden="true" />
            )}
            Разобрать файл
          </button>
          <button
            type="button"
            className={`${secondaryButtonClass} w-full sm:w-auto`}
            onClick={() => {
              setPreview(null);
              setQuestions([]);
              setNotice(null);
              setFocusedQuestionIndex(null);
            }}
            disabled={!preview && questions.length === 0}
          >
            <XCircle size={17} aria-hidden="true" />
            Сбросить превью
          </button>
        </div>
      </form>

      {preview?.warnings?.length ? (
        <div className="mt-5">
          <Notice
            tone="warning"
            title="Предупреждения парсера"
            messages={preview.warnings}
          />
        </div>
      ) : null}

      {preview ? (
        <div className="mt-6 grid gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
          <div className="order-2 xl:order-1">
            <QuestionEditor
              questions={questions}
              focusedQuestionIndex={focusedQuestionIndex}
              onQuestionsChange={setQuestions}
            />
          </div>

          <PreviewControlPanel
            questionCount={questions.length}
            issues={validationIssues}
            canConfirm={canConfirm}
            confirmLoading={confirmLoading}
            onConfirm={handleConfirm}
            onFocusQuestion={focusPreviewQuestion}
          />
        </div>
      ) : null}
    </section>
  );

  function focusPreviewQuestion(questionIndex: number) {
    setFocusedQuestionIndex(questionIndex);

    window.requestAnimationFrame(() => {
      document
        .getElementById(getPreviewQuestionId(questionIndex))
        ?.scrollIntoView({ behavior: "smooth", block: "center" });
    });

    if (focusTimeoutRef.current) {
      clearTimeout(focusTimeoutRef.current);
    }

    focusTimeoutRef.current = setTimeout(() => {
      setFocusedQuestionIndex(null);
      focusTimeoutRef.current = null;
    }, 2400);
  }
}

function PreviewControlPanel({
  questionCount,
  issues,
  canConfirm,
  confirmLoading,
  onConfirm,
  onFocusQuestion,
}: {
  questionCount: number;
  issues: ImportValidationIssue[];
  canConfirm: boolean;
  confirmLoading: boolean;
  onConfirm: () => void;
  onFocusQuestion: (questionIndex: number) => void;
}) {
  const hasIssues = issues.length > 0;

  return (
    <div className="order-1 flex flex-col rounded-md border border-stone-200 bg-stone-50 p-3 shadow-sm xl:sticky xl:top-20 xl:z-20 xl:order-2 xl:max-h-[calc(100dvh-6rem)]">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-stone-950">Превью теста</p>
          <p className="mt-1 text-xs text-stone-500">Вопросов: {questionCount}</p>
        </div>
        {hasIssues ? (
          <AlertCircle className="mt-0.5 shrink-0 text-amber-700" size={18} aria-hidden="true" />
        ) : (
          <CheckCircle2 className="mt-0.5 shrink-0 text-teal-700" size={18} aria-hidden="true" />
        )}
      </div>

      <div className="mt-3 min-h-0 xl:flex-1 xl:overflow-y-auto xl:pr-1">
        {hasIssues ? (
          <PreviewIssuesPanel issues={issues} onFocusQuestion={onFocusQuestion} />
        ) : (
          <div className="rounded-md border border-teal-200 bg-teal-50 p-3 text-sm font-medium text-teal-900">
            Превью готово к сохранению.
          </div>
        )}
      </div>

      <button
        type="button"
        className={`${primaryButtonClass} mt-3 w-full`}
        onClick={onConfirm}
        disabled={!canConfirm}
      >
        {confirmLoading ? (
          <Loader2 className="animate-spin" size={17} aria-hidden="true" />
        ) : (
          <Save size={17} aria-hidden="true" />
        )}
        Сохранить тест
      </button>
    </div>
  );
}

function QuestionEditor({
  questions,
  focusedQuestionIndex,
  onQuestionsChange,
}: {
  questions: ParsedQuestion[];
  focusedQuestionIndex: number | null;
  onQuestionsChange: (questions: ParsedQuestion[]) => void;
}) {
  function updateQuestionText(questionIndex: number, text: string) {
    onQuestionsChange(
      questions.map((question, index) =>
        index === questionIndex ? { ...question, text } : question,
      ),
    );
  }

  function removeQuestionImage(questionIndex: number, imageIndex: number) {
    onQuestionsChange(
      questions.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              imageUrls: (question.imageUrls ?? []).filter(
                (_, currentImageIndex) => currentImageIndex !== imageIndex,
              ),
            }
          : question,
      ),
    );
  }

  function updateVariantText(
    questionIndex: number,
    variantIndex: number,
    text: string,
  ) {
    onQuestionsChange(
      questions.map((question, index) => {
        if (index !== questionIndex) {
          return question;
        }

        return {
          ...question,
          variants: question.variants.map((variant, currentVariantIndex) =>
            currentVariantIndex === variantIndex ? { ...variant, text } : variant,
          ),
        };
      }),
    );
  }

  function removeVariantImage(
    questionIndex: number,
    variantIndex: number,
    imageIndex: number,
  ) {
    onQuestionsChange(
      questions.map((question, index) => {
        if (index !== questionIndex) {
          return question;
        }

        return {
          ...question,
          variants: question.variants.map((variant, currentVariantIndex) =>
            currentVariantIndex === variantIndex
              ? {
                  ...variant,
                  imageUrls: (variant.imageUrls ?? []).filter(
                    (_, currentImageIndex) => currentImageIndex !== imageIndex,
                  ),
                }
              : variant,
          ),
        };
      }),
    );
  }

  function chooseCorrectVariant(questionIndex: number, variantIndex: number) {
    onQuestionsChange(
      questions.map((question, index) => {
        if (index !== questionIndex) {
          return question;
        }

        return {
          ...question,
          variants: question.variants.map((variant, currentVariantIndex) => ({
            ...variant,
            isCorrect: currentVariantIndex === variantIndex,
          })),
        };
      }),
    );
  }

  function addVariant(questionIndex: number) {
    onQuestionsChange(
      questions.map((question, index) =>
        index === questionIndex
          ? {
              ...question,
              variants: [
                ...question.variants,
                { text: "", isCorrect: question.variants.length === 0 },
              ],
            }
          : question,
      ),
    );
  }

  function removeVariant(questionIndex: number, variantIndex: number) {
    onQuestionsChange(
      questions.map((question, index) => {
        if (index !== questionIndex) {
          return question;
        }

        const variants = question.variants.filter(
          (_, currentVariantIndex) => currentVariantIndex !== variantIndex,
        );
        const hasCorrect = variants.some((variant) => variant.isCorrect);

        return {
          ...question,
          variants: variants.map((variant, currentVariantIndex) => ({
            ...variant,
            isCorrect:
              variant.isCorrect || (!hasCorrect && currentVariantIndex === 0),
          })),
        };
      }),
    );
  }

  function removeQuestion(questionIndex: number) {
    onQuestionsChange(
      questions.filter((_, currentIndex) => currentIndex !== questionIndex),
    );
  }

  if (questions.length === 0) {
    return (
      <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-stone-500">
        Вопросы не найдены.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {questions.map((question, questionIndex) => {
        const issues = getQuestionIssues(question);
        const correctCount = question.variants.filter(
          (variant) => variant.isCorrect,
        ).length;

        return (
          <article
            key={`question-${questionIndex}`}
            id={getPreviewQuestionId(questionIndex)}
            className={`scroll-mt-24 rounded-md border p-3 transition sm:p-4 ${
              issues.length > 0
                ? "border-amber-300 bg-amber-50"
                : "border-stone-200 bg-white"
            } ${
              focusedQuestionIndex === questionIndex
                ? "ring-4 ring-teal-200"
                : ""
            }`}
          >
            <div className="mb-3 flex items-start justify-between gap-3">
              <div>
                <h3 className="text-sm font-semibold text-stone-950">
                  Вопрос {questionIndex + 1}
                </h3>
                {issues.length > 0 ? (
                  <p className="mt-1 text-xs text-amber-700">
                    {issues.join("; ")}
                  </p>
                ) : null}
              </div>
              <button
                type="button"
                className={`${dangerButtonClass} size-9 shrink-0 px-0`}
                onClick={() => removeQuestion(questionIndex)}
                aria-label={`Удалить вопрос ${questionIndex + 1}`}
              >
                <Trash2 size={16} aria-hidden="true" />
              </button>
            </div>

            <label className="block space-y-1.5">
              <span className={labelClass}>Текст вопроса</span>
              <textarea
                className={`${fieldClass} min-h-20 resize-y`}
                value={question.text}
                onChange={(event) =>
                  updateQuestionText(questionIndex, event.target.value)
                }
              />
            </label>

            <QuestionImageEditor
              imageUrls={question.imageUrls}
              questionIndex={questionIndex}
              onRemove={removeQuestionImage}
            />

            <div className="mt-4 space-y-2">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <span className={labelClass}>Варианты</span>
                  {correctCount !== 1 ? (
                    <p className="mt-1 text-xs font-medium text-amber-700">
                      Отмечено правильных: {correctCount}. Выберите один
                      вариант.
                    </p>
                  ) : null}
                </div>
                <button
                  type="button"
                  className={`${secondaryButtonClass} w-full sm:w-auto`}
                  onClick={() => addVariant(questionIndex)}
                >
                  <Plus size={16} aria-hidden="true" />
                  Вариант
                </button>
              </div>

              {question.variants.map((variant, variantIndex) => (
                <div
                  key={`${questionIndex}-${variantIndex}`}
                  className="grid gap-2"
                >
                  <div className="grid grid-cols-[32px_minmax(0,1fr)_40px] items-center gap-2">
                  <input
                    className="size-4 justify-self-center accent-teal-700"
                    type="radio"
                    name={`question-${questionIndex}-correct`}
                    checked={variant.isCorrect}
                    onChange={() =>
                      chooseCorrectVariant(questionIndex, variantIndex)
                    }
                    aria-label={`Сделать вариант ${variantIndex + 1} правильным`}
                  />
                  <input
                    className={fieldClass}
                    type="text"
                    value={variant.text}
                    aria-label={`Текст варианта ${variantIndex + 1}`}
                    onChange={(event) =>
                      updateVariantText(
                        questionIndex,
                        variantIndex,
                        event.target.value,
                      )
                    }
                  />
                  <button
                    type="button"
                    className={`${dangerButtonClass} size-10 px-0`}
                    onClick={() => removeVariant(questionIndex, variantIndex)}
                    aria-label={`Удалить вариант ${variantIndex + 1}`}
                  >
                    <Trash2 size={15} aria-hidden="true" />
                  </button>
                  </div>
                  <VariantImageEditor
                    imageUrls={variant.imageUrls}
                    questionIndex={questionIndex}
                    variantIndex={variantIndex}
                    onRemove={removeVariantImage}
                  />
                </div>
              ))}
            </div>
          </article>
        );
      })}
    </div>
  );
}

function QuestionImageEditor({
  imageUrls,
  questionIndex,
  onRemove,
}: {
  imageUrls?: string[];
  questionIndex: number;
  onRemove: (questionIndex: number, imageIndex: number) => void;
}) {
  const safeImageUrls = getSafeQuestionImageUrls(imageUrls);

  if (safeImageUrls.length === 0) {
    return null;
  }

  return (
    <div className="mt-3 grid gap-3 sm:grid-cols-2">
      {safeImageUrls.map((imageUrl, imageIndex) => (
        <figure
          key={`${imageUrl.slice(0, 48)}-${imageIndex}`}
          className="relative overflow-hidden rounded-md border border-stone-200 bg-stone-50"
        >
          <img
            className="max-h-64 w-full object-contain"
            src={imageUrl}
            alt={`Изображение к вопросу ${questionIndex + 1}`}
          />
          <button
            type="button"
            className={`${dangerButtonClass} absolute right-2 top-2 size-9 bg-white/95 px-0 shadow-sm`}
            onClick={() => onRemove(questionIndex, imageIndex)}
            aria-label={`Удалить изображение ${imageIndex + 1} из вопроса ${
              questionIndex + 1
            }`}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </figure>
      ))}
    </div>
  );
}

function VariantImageEditor({
  imageUrls,
  questionIndex,
  variantIndex,
  onRemove,
}: {
  imageUrls?: string[];
  questionIndex: number;
  variantIndex: number;
  onRemove: (
    questionIndex: number,
    variantIndex: number,
    imageIndex: number,
  ) => void;
}) {
  const safeImageUrls = getSafeQuestionImageUrls(imageUrls);

  if (safeImageUrls.length === 0) {
    return null;
  }

  return (
    <div className="ml-8 grid gap-2 sm:grid-cols-2">
      {safeImageUrls.map((imageUrl, imageIndex) => (
        <figure
          key={`${imageUrl.slice(0, 48)}-${imageIndex}`}
          className="relative overflow-hidden rounded-md border border-stone-200 bg-stone-50"
        >
          <img
            className="max-h-44 w-full object-contain"
            src={imageUrl}
            alt={`Изображение к варианту ${variantIndex + 1}`}
          />
          <button
            type="button"
            className={`${dangerButtonClass} absolute right-2 top-2 size-9 bg-white/95 px-0 shadow-sm`}
            onClick={() => onRemove(questionIndex, variantIndex, imageIndex)}
            aria-label={`Удалить изображение ${imageIndex + 1} из варианта ${
              variantIndex + 1
            }`}
          >
            <Trash2 size={15} aria-hidden="true" />
          </button>
        </figure>
      ))}
    </div>
  );
}

function PreviewIssuesPanel({
  issues,
  onFocusQuestion,
}: {
  issues: ImportValidationIssue[];
  onFocusQuestion: (questionIndex: number) => void;
}) {
  return (
    <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-amber-900">
      <div className="flex items-start gap-2">
        <AlertCircle
          className="mt-0.5 shrink-0"
          size={17}
          aria-hidden="true"
        />
        <div className="min-w-0">
          <p className="text-sm font-semibold">Нужно поправить превью</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {issues.map((issue, index) =>
              typeof issue.questionIndex === "number" ? (
                <button
                  key={`${issue.message}-${index}`}
                  type="button"
                  className="max-w-full break-words rounded-md border border-amber-300 bg-white px-2.5 py-1 text-left text-sm font-medium text-amber-950 transition hover:bg-amber-100"
                  onClick={() => onFocusQuestion(issue.questionIndex!)}
                >
                  {issue.message}
                </button>
              ) : (
                <span
                  key={`${issue.message}-${index}`}
                  className="inline-flex max-w-full items-center break-words rounded-md border border-amber-300 bg-white px-2.5 py-1 text-sm font-medium text-amber-950"
                >
                  {issue.message}
                </span>
              ),
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export function TestsPanel({
  tests,
  loading,
  error,
  onRefresh,
}: {
  tests: TestListItem[];
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}) {
  const [copiedTestId, setCopiedTestId] = useState<string | null>(null);
  const copyTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }
    };
  }, []);

  async function handleShare(test: TestListItem) {
    const shareUrl = `${window.location.origin}/tests/${test.id}`;

    try {
      await copyToClipboard(shareUrl);
      setCopiedTestId(test.id);

      if (copyTimeoutRef.current) {
        clearTimeout(copyTimeoutRef.current);
      }

      copyTimeoutRef.current = setTimeout(() => {
        setCopiedTestId(null);
        copyTimeoutRef.current = null;
      }, 2200);
    } catch {
      setCopiedTestId(null);
    }
  }

  return (
    <aside className={panelClass}>
      <div className="mb-5 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-stone-950">Мои тесты</h2>
          <p className="text-sm text-stone-500">Всего: {tests.length}</p>
        </div>
        <button
          type="button"
          className={`${secondaryButtonClass} w-full sm:w-auto`}
          onClick={onRefresh}
          disabled={loading}
        >
          <RefreshCw
            className={loading ? "animate-spin" : undefined}
            size={17}
            aria-hidden="true"
          />
          Обновить
        </button>
      </div>

      {error ? (
        <Notice tone="error" title="Не удалось загрузить тесты" messages={[error]} />
      ) : null}

      <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading && tests.length === 0 ? (
          <div className="flex min-h-28 items-center justify-center rounded-md border border-stone-200 bg-stone-50 text-sm text-stone-500 sm:col-span-2 lg:col-span-3">
            <Loader2 className="mr-2 animate-spin" size={17} aria-hidden="true" />
            Загрузка
          </div>
        ) : null}

        {!loading && tests.length === 0 ? (
          <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-5 text-sm text-stone-500 sm:col-span-2 lg:col-span-3">
            Сохраненных тестов пока нет.
          </div>
        ) : null}

        {tests.map((test) => (
          <article
            key={test.id}
            className="flex h-full flex-col rounded-md border border-stone-200 bg-white p-4 transition hover:border-stone-300"
          >
            <div className="flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <h3 className="break-words text-base font-semibold text-stone-950">
                    {test.title}
                  </h3>
                  <p className="mt-1 text-sm text-stone-500">
                    {test._count.questions} вопросов · {test._count.attempts} прохождений
                  </p>
                </div>
                <span className="shrink-0 rounded-md bg-teal-50 px-2.5 py-1 text-xs font-semibold text-teal-800">
                  {test.type}
                </span>
              </div>

              <div className="mt-3 space-y-1 text-sm text-stone-500">
                <p>{formatDate(test.createdAt)}</p>
                {test.sourceFile ? (
                  <p className="break-words">{test.sourceFile.originalName}</p>
                ) : null}
              </div>
            </div>

            <div className="mt-auto pt-4">
              <Link
                className={`${primaryButtonClass} w-full`}
                href={`/tests/${test.id}`}
              >
                <Play size={17} aria-hidden="true" />
                Начать
              </Link>
              <button
                type="button"
                className={`${secondaryButtonClass} mt-2 w-full`}
                onClick={() => {
                  void handleShare(test);
                }}
              >
                {copiedTestId === test.id ? (
                  <CheckCircle2 size={17} aria-hidden="true" />
                ) : (
                  <Share2 size={17} aria-hidden="true" />
                )}
                {copiedTestId === test.id ? "Ссылка скопирована" : "Поделиться"}
              </button>
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}

function Notice({ tone, title, messages }: NoticeState) {
  const toneClass = {
    success: "border-emerald-200 bg-emerald-50 text-emerald-900",
    error: "border-red-200 bg-red-50 text-red-900",
    warning: "border-amber-200 bg-amber-50 text-amber-900",
  }[tone];
  const Icon =
    tone === "success" ? CheckCircle2 : tone === "error" ? XCircle : AlertCircle;

  return (
    <div className={`rounded-md border p-3 ${toneClass}`}>
      <div className="flex items-start gap-2">
        <Icon className="mt-0.5 shrink-0" size={17} aria-hidden="true" />
        <div className="min-w-0">
          <p className="text-sm font-semibold">{title}</p>
          {messages?.length ? (
            <ul className="mt-1 space-y-1 text-sm">
              {messages.map((message, index) => (
                <li key={`${message}-${index}`} className="break-words">
                  {message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "success" | "warning";
}) {
  const toneClass = {
    neutral: "border-stone-200 bg-stone-50 text-stone-800",
    success: "border-emerald-200 bg-emerald-50 text-emerald-800",
    warning: "border-amber-200 bg-amber-50 text-amber-800",
  }[tone];

  return (
    <span
      className={`inline-flex min-h-8 items-center gap-2 rounded-md border px-2.5 py-1 font-medium ${toneClass}`}
    >
      <span className="text-stone-500">{label}</span>
      <span>{value}</span>
    </span>
  );
}

function normalizeQuestions(questions: ParsedQuestion[]): ParsedQuestion[] {
  return questions.map((question) => ({
    text: question.text ?? "",
    imageUrls: getSafeQuestionImageUrls(question.imageUrls),
    warnings: question.warnings ?? [],
    variants: question.variants.map((variant) => ({
      text: variant.text ?? "",
      imageUrls: getSafeQuestionImageUrls(variant.imageUrls),
      isCorrect: Boolean(variant.isCorrect),
    })),
  }));
}

function getImportValidationIssues(
  title: string,
  questions: ParsedQuestion[],
): ImportValidationIssue[] {
  const issues: ImportValidationIssue[] = [];

  if (!title.trim()) {
    issues.push({ message: "Название теста пустое." });
  }

  if (questions.length === 0) {
    issues.push({ message: "Добавьте хотя бы один вопрос." });
  }

  questions.forEach((question, index) => {
    getQuestionIssues(question).forEach((issue) => {
      issues.push({
        message: `Вопрос ${index + 1}: ${issue}`,
        questionIndex: index,
      });
    });
  });

  return issues;
}

function getPreviewQuestionId(questionIndex: number): string {
  return `preview-question-${questionIndex + 1}`;
}

function getQuestionIssues(question: ParsedQuestion): string[] {
  const issues: string[] = [];

  if (
    !question.text.trim() &&
    getSafeQuestionImageUrls(question.imageUrls).length === 0
  ) {
    issues.push("нет текста");
  }

  if (question.variants.length < 2) {
    issues.push("меньше двух вариантов");
  }

  const correctCount = question.variants.filter((variant) => variant.isCorrect)
    .length;

  if (correctCount !== 1) {
    issues.push("нужен ровно один правильный ответ");
  }

  if (
    question.variants.some(
      (variant) =>
        !variant.text.trim() &&
        getSafeQuestionImageUrls(variant.imageUrls).length === 0,
    )
  ) {
    issues.push("есть пустые варианты");
  }

  return issues;
}

function getTitleFromFileName(fileName: string): string {
  return fileName.replace(/\.[^.]+$/, "").trim();
}

function formatFileSize(bytes: number): string {
  const units = ["Б", "КБ", "МБ", "ГБ"];
  let size = bytes;
  let unitIndex = 0;

  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex += 1;
  }

  return `${new Intl.NumberFormat("ru-RU", {
    maximumFractionDigits: size >= 10 || unitIndex === 0 ? 0 : 1,
  }).format(size)} ${units[unitIndex]}`;
}

async function copyToClipboard(value: string): Promise<void> {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(value);
    return;
  }

  const textarea = document.createElement("textarea");
  textarea.value = value;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.append(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getReadableError(error: unknown): string {
  if (error instanceof ApiError) {
    return error.message;
  }

  if (error instanceof TypeError) {
    return "Не удалось подключиться к API. Проверьте адрес бэкенда.";
  }

  if (isAbortLikeError(error)) {
    return "Запрос к API был прерван. Повторите действие, когда бэкенд будет доступен.";
  }

  if (error instanceof Error) {
    return error.message;
  }

  return "Неизвестная ошибка";
}

function withTimeout<T>(promise: Promise<T>, timeoutMs: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null;

  const timeoutPromise = new Promise<never>((_, reject) => {
    timeoutId = setTimeout(() => {
      reject(new Error(SESSION_CHECK_TIMEOUT_MESSAGE));
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }
  });
}

function isAbortLikeError(error: unknown): boolean {
  return (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}
