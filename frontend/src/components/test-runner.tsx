/* eslint-disable @next/next/no-img-element */
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { CSSProperties, FormEvent } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  ArrowLeft,
  CheckCircle2,
  FileQuestion,
  Home,
  Loader2,
  Play,
  RotateCcw,
  Trophy,
  XCircle,
} from "lucide-react";
import {
  ApiError,
  checkAnswer,
  checkPublicAnswer,
  finishPublicTest,
  finishTest,
  getPublicLeaderboard,
  getPublicTestSummary,
  savePublicTest,
  splitPublicTest,
  startPublicTest,
  startTest,
} from "@/lib/api";
import { clearStoredSession, readStoredSession } from "@/lib/session";
import { getSafeQuestionImageUrls } from "@/lib/images";
import type {
  AnswerCheckResponse,
  FinishResponse,
  LeaderboardEntry,
  PublicTestSummary,
  StartedQuestion,
  StartedTest,
  StartedVariant,
} from "@/lib/types";

type AnswerMap = Record<string, string>;
type FeedbackMap = Record<string, AnswerCheckResponse>;
type RunnerMode = "authenticated" | "guest";
type QuestionTransitionState = "idle" | "exiting" | "entering";

const primaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md bg-teal-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-teal-800 disabled:cursor-not-allowed disabled:bg-stone-300 disabled:text-stone-600";
const secondaryButtonClass =
  "inline-flex min-h-10 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-sm font-semibold text-stone-800 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400";
const POINTS_PER_CORRECT_ANSWER = 700;
const QUESTION_TRANSITION_MS = 180;

export function TestRunner({ testId }: { testId: string }) {
  const router = useRouter();
  const [token, setToken] = useState<string | null>(null);
  const [mode, setMode] = useState<RunnerMode | null>(null);
  const [test, setTest] = useState<StartedTest | null>(null);
  const [summary, setSummary] = useState<PublicTestSummary | null>(null);
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [nickname, setNickname] = useState("");
  const [answers, setAnswers] = useState<AnswerMap>({});
  const [feedback, setFeedback] = useState<FeedbackMap>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [result, setResult] = useState<FinishResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);
  const [savingCopy, setSavingCopy] = useState(false);
  const [splittingTest, setSplittingTest] = useState(false);
  const [splitQuestionsPerPart, setSplitQuestionsPerPart] = useState("10");
  const [error, setError] = useState<string | null>(null);
  const [questionTransitionState, setQuestionTransitionState] =
    useState<QuestionTransitionState>("idle");
  const autoAdvanceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );
  const autoAdvancedQuestionRef = useRef<string | null>(null);
  const questionTransitionTimeoutRef = useRef<ReturnType<
    typeof setTimeout
  > | null>(null);

  const clearAutoAdvance = useCallback(() => {
    if (autoAdvanceTimeoutRef.current) {
      clearTimeout(autoAdvanceTimeoutRef.current);
      autoAdvanceTimeoutRef.current = null;
    }
  }, []);

  const clearQuestionTransition = useCallback(() => {
    if (questionTransitionTimeoutRef.current) {
      clearTimeout(questionTransitionTimeoutRef.current);
      questionTransitionTimeoutRef.current = null;
    }
  }, []);

  const resetRunProgress = useCallback(() => {
    clearAutoAdvance();
    clearQuestionTransition();
    autoAdvancedQuestionRef.current = null;
    setTest(null);
    setAnswers({});
    setFeedback({});
    setCurrentIndex(0);
    setQuestionTransitionState("idle");
    setResult(null);
    setChecking(false);
  }, [clearAutoAdvance, clearQuestionTransition]);

  const refreshLeaderboard = useCallback(async () => {
    try {
      setLeaderboard(await getPublicLeaderboard(testId));
    } catch {
      // Рейтинг не должен ломать прохождение теста.
    }
  }, [testId]);

  const loadIntro = useCallback(
    async (nextToken: string | null) => {
      resetRunProgress();
      setMode(null);
      setToken(nextToken);
      setError(null);
      setLoading(true);

      try {
        const publicSummary = await getPublicTestSummary(testId);
        setSummary(publicSummary);
        setLeaderboard(publicSummary.leaderboard);
      } catch (loadError) {
        setSummary(null);
        setError(getReadableError(loadError));
      } finally {
        setLoading(false);
      }
    },
    [resetRunProgress, testId],
  );

  const loadGuestIntro = useCallback(async () => {
    await loadIntro(null);
  }, [loadIntro]);

  const startRun = useCallback(
    async (nextMode: RunnerMode) => {
      if (nextMode === "authenticated" && !token) {
        await loadGuestIntro();
        return;
      }

      resetRunProgress();
      setMode(nextMode);
      setError(null);
      setLoading(true);

      try {
        const nextTest =
          nextMode === "authenticated"
            ? await startTest(token!, testId)
            : await startPublicTest(testId);

        setSummary(null);
        setTest(nextTest);
        void refreshLeaderboard();
      } catch (loadError) {
        if (nextMode === "authenticated" && loadError instanceof ApiError) {
          if (loadError.status === 401) {
            clearStoredSession();
            await loadGuestIntro();
            return;
          }

          if (loadError.status === 404) {
            await loadGuestIntro();
            return;
          }
        }

        setMode(null);
        setError(getReadableError(loadError));
      } finally {
        setLoading(false);
      }
    },
    [loadGuestIntro, refreshLeaderboard, resetRunProgress, testId, token],
  );

  const loadInitialState = useCallback(async () => {
    const session = readStoredSession();
    await loadIntro(session?.accessToken ?? null);
  }, [loadIntro]);

  useEffect(() => {
    void Promise.resolve().then(loadInitialState);
  }, [loadInitialState]);

  useEffect(() => {
    if (!summary) {
      return;
    }

    setSplitQuestionsPerPart(
      String(getDefaultSplitQuestionsPerPart(summary.questionsCount)),
    );
  }, [summary]);

  const handleSaveCopy = useCallback(async () => {
    if (!token || savingCopy) {
      return;
    }

    setSavingCopy(true);
    setError(null);

    try {
      const savedTest = await savePublicTest(token, testId);
      router.push(`/tests/${savedTest.testId}`);
    } catch (saveError) {
      if (saveError instanceof ApiError && saveError.status === 401) {
        clearStoredSession();
        await loadGuestIntro();
        return;
      }

      setError(getReadableError(saveError));
    } finally {
      setSavingCopy(false);
    }
  }, [loadGuestIntro, router, savingCopy, testId, token]);

  const handleSplitTest = useCallback(async () => {
    if (!token || !summary || splittingTest) {
      return;
    }

    const parsedQuestionsPerPart = Number.parseInt(splitQuestionsPerPart, 10);

    if (
      !Number.isFinite(parsedQuestionsPerPart) ||
      parsedQuestionsPerPart < 1
    ) {
      setError("Укажите корректное количество вопросов в части.");
      return;
    }

    if (parsedQuestionsPerPart >= summary.questionsCount) {
      setError("Размер части должен быть меньше общего количества вопросов.");
      return;
    }

    setSplittingTest(true);
    setError(null);

    try {
      await splitPublicTest(token, testId, {
        questionsPerPart: parsedQuestionsPerPart,
      });
      router.push("/tests");
    } catch (splitError) {
      if (splitError instanceof ApiError && splitError.status === 401) {
        clearStoredSession();
        await loadGuestIntro();
        return;
      }

      setError(getReadableError(splitError));
    } finally {
      setSplittingTest(false);
    }
  }, [
    loadGuestIntro,
    router,
    splitQuestionsPerPart,
    splittingTest,
    summary,
    testId,
    token,
  ]);

  const currentQuestion = test?.questions[currentIndex] ?? null;
  const selectedVariantId = currentQuestion
    ? answers[currentQuestion.id]
    : undefined;
  const currentFeedback = currentQuestion
    ? feedback[currentQuestion.id]
    : undefined;
  const answeredAll = useMemo(
    () =>
      Boolean(
        test?.questions.length &&
        test.questions.every((question) => answers[question.id]),
      ),
    [answers, test],
  );
  const correctAnswersCount = useMemo(
    () =>
      Object.values(feedback).filter(
        (answerFeedback) => answerFeedback.isCorrect,
      ).length,
    [feedback],
  );
  const currentPoints = correctAnswersCount * POINTS_PER_CORRECT_ANSWER;
  const maxPoints = (test?.questions.length ?? 0) * POINTS_PER_CORRECT_ANSWER;
  const questionTransitionClass =
    questionTransitionState === "idle"
      ? "translate-y-0 scale-100 opacity-100"
      : questionTransitionState === "exiting"
        ? "pointer-events-none translate-y-3 scale-[0.99] opacity-0"
        : "pointer-events-none -translate-y-3 scale-[0.99] opacity-0";
  const showCorrectReward = Boolean(currentFeedback?.isCorrect);

  const transitionToQuestion = useCallback(
    (nextIndex: number) => {
      if (!test || questionTransitionState !== "idle") {
        return;
      }

      const clampedIndex = Math.min(
        Math.max(nextIndex, 0),
        test.questions.length - 1,
      );

      if (clampedIndex === currentIndex) {
        return;
      }

      clearQuestionTransition();
      setQuestionTransitionState("exiting");
      questionTransitionTimeoutRef.current = setTimeout(() => {
        setCurrentIndex(clampedIndex);
        setQuestionTransitionState("entering");
        questionTransitionTimeoutRef.current = setTimeout(() => {
          questionTransitionTimeoutRef.current = null;
          setQuestionTransitionState("idle");
        }, 20);
      }, QUESTION_TRANSITION_MS);
    },
    [clearQuestionTransition, currentIndex, questionTransitionState, test],
  );

  async function handleSelectAnswer(variantId: string) {
    if (
      !mode ||
      (mode === "authenticated" && !token) ||
      !test ||
      !currentQuestion ||
      checking ||
      questionTransitionState !== "idle" ||
      currentFeedback
    ) {
      return;
    }

    const questionId = currentQuestion.id;

    setAnswers((current) => ({
      ...current,
      [questionId]: variantId,
    }));
    setChecking(true);
    setError(null);

    try {
      const answerFeedback =
        mode === "authenticated"
          ? await checkAnswer(token!, test.id, {
              questionId,
              variantId,
            })
          : await checkPublicAnswer(test.id, {
              questionId,
              variantId,
            });

      setFeedback((current) => ({
        ...current,
        [questionId]: answerFeedback,
      }));
    } catch (checkError) {
      if (
        mode === "authenticated" &&
        checkError instanceof ApiError &&
        checkError.status === 401
      ) {
        clearStoredSession();
        await loadGuestIntro();
        return;
      }

      setAnswers((current) => {
        if (current[questionId] !== variantId) {
          return current;
        }

        const nextAnswers = { ...current };
        delete nextAnswers[questionId];
        return nextAnswers;
      });
      setError(getReadableError(checkError));
    } finally {
      setChecking(false);
    }
  }

  const handleFinish = useCallback(async () => {
    if (
      !mode ||
      (mode === "authenticated" && !token) ||
      !test ||
      !answeredAll
    ) {
      return;
    }

    setError(null);

    try {
      const finishAnswers = test.questions.map((question) => ({
        questionId: question.id,
        variantId: answers[question.id],
      }));
      const finishResult =
        mode === "authenticated"
          ? await finishTest(token!, test.id, {
              answers: finishAnswers,
            })
          : await finishPublicTest(test.id, {
              nickname,
              answers: finishAnswers,
            });

      setResult(finishResult);
      await refreshLeaderboard();
    } catch (finishError) {
      if (
        mode === "authenticated" &&
        finishError instanceof ApiError &&
        finishError.status === 401
      ) {
        clearStoredSession();
        await loadGuestIntro();
        return;
      }

      setError(getReadableError(finishError));
    } finally {
      setChecking(false);
    }
  }, [
    answeredAll,
    answers,
    loadGuestIntro,
    mode,
    nickname,
    refreshLeaderboard,
    test,
    token,
  ]);

  useEffect(() => {
    if (!test || !currentQuestion || !currentFeedback || result) {
      return;
    }

    if (autoAdvancedQuestionRef.current === currentQuestion.id) {
      return;
    }

    autoAdvancedQuestionRef.current = currentQuestion.id;
    autoAdvanceTimeoutRef.current = setTimeout(() => {
      autoAdvanceTimeoutRef.current = null;

      if (currentIndex < test.questions.length - 1) {
        transitionToQuestion(currentIndex + 1);
        return;
      }

      void handleFinish();
    }, 2000);

    return clearAutoAdvance;
  }, [
    clearAutoAdvance,
    currentFeedback,
    currentIndex,
    currentQuestion,
    handleFinish,
    result,
    test,
    transitionToQuestion,
  ]);

  async function handleNicknameSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const trimmedNickname = nickname.trim();

    if (!trimmedNickname) {
      setError("Введите ник, чтобы попасть в рейтинг.");
      return;
    }

    setNickname(trimmedNickname);
    await startRun("guest");
  }

  if (loading) {
    return (
      <main className="flex min-h-dvh items-center justify-center bg-stone-100 px-4 text-stone-900">
        <div className="flex items-center gap-3 rounded-md border border-stone-200 bg-white px-4 py-3 shadow-sm">
          <Loader2
            className="animate-spin text-teal-700"
            size={18}
            aria-hidden="true"
          />
          <span className="text-sm font-medium">Открываем тест</span>
        </div>
      </main>
    );
  }

  if (!test && summary) {
    if (token) {
      return (
        <StartGate
          summary={summary}
          error={error}
          leaderboard={leaderboard}
          savingCopy={savingCopy}
          splittingTest={splittingTest}
          splitQuestionsPerPart={splitQuestionsPerPart}
          onStart={() => {
            void startRun("authenticated");
          }}
          onSaveCopy={() => {
            void handleSaveCopy();
          }}
          onSplitQuestionsPerPartChange={setSplitQuestionsPerPart}
          onSplit={() => {
            void handleSplitTest();
          }}
        />
      );
    }

    return (
      <NicknameGate
        summary={summary}
        nickname={nickname}
        error={error}
        leaderboard={leaderboard}
        onNicknameChange={setNickname}
        onSubmit={handleNicknameSubmit}
      />
    );
  }

  if (error && !test) {
    return (
      <main className="min-h-dvh bg-stone-100 px-4 py-6 text-stone-950">
        <div className="mx-auto max-w-3xl rounded-md border border-red-200 bg-red-50 p-5 text-red-900">
          <div className="flex items-start gap-3">
            <XCircle className="mt-0.5 shrink-0" size={19} aria-hidden="true" />
            <div>
              <h1 className="font-semibold">Тест недоступен</h1>
              <p className="mt-1 text-sm">{error}</p>
              <Link className={`${secondaryButtonClass} mt-4`} href="/">
                <Home size={17} aria-hidden="true" />В кабинет
              </Link>
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!test || !currentQuestion) {
    return (
      <main className="min-h-dvh bg-stone-100 px-4 py-6 text-stone-950">
        <div className="mx-auto max-w-3xl rounded-md border border-stone-200 bg-white p-5">
          <p className="text-sm text-stone-500">Вопросы не найдены.</p>
          <Link className={`${secondaryButtonClass} mt-4`} href="/">
            <Home size={17} aria-hidden="true" />В кабинет
          </Link>
        </div>
      </main>
    );
  }

  if (result) {
    return (
      <main className="min-h-dvh bg-stone-100 px-4 py-6 text-stone-950">
        <div className="mx-auto max-w-3xl space-y-4">
          <section className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
            <div className="mb-6 flex items-center gap-3">
              <div className="flex size-10 items-center justify-center rounded-md bg-emerald-700 text-white">
                <CheckCircle2 size={20} aria-hidden="true" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Результат</h1>
                <p className="text-sm text-stone-500">{test.title}</p>
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-4">
              <ResultMetric
                label="Очки"
                value={formatPoints(result.score * POINTS_PER_CORRECT_ANSWER)}
              />
              <ResultMetric label="Верно" value={result.score} />
              <ResultMetric label="Всего" value={result.total} />
              <ResultMetric label="Процент" value={`${result.percent}%`} />
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Link className={primaryButtonClass} href="/">
                <Home size={17} aria-hidden="true" />В кабинет
              </Link>
              <button
                type="button"
                className={secondaryButtonClass}
                onClick={() => {
                  if (mode) {
                    void startRun(mode);
                  }
                }}
              >
                <RotateCcw size={17} aria-hidden="true" />
                Пройти снова
              </button>
            </div>
          </section>

          <Leaderboard
            entries={leaderboard}
            currentAttemptId={result.attemptId}
          />
        </div>
      </main>
    );
  }

  return (
    <main className="flex min-h-dvh flex-col bg-stone-100 text-stone-950">
      <header className="border-b border-stone-200 bg-white">
        <div className="mx-auto flex max-w-4xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-teal-700 text-white">
              <FileQuestion size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="break-words text-lg font-semibold">
                {test.title}
              </h1>
              <p className="text-sm text-stone-500">
                Вопрос {currentIndex + 1} из {test.questions.length}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 sm:justify-end">
            <ScorePill points={currentPoints} maxPoints={maxPoints} />
            <Link className={secondaryButtonClass} href="/">
              <ArrowLeft size={17} aria-hidden="true" />В кабинет
            </Link>
          </div>
        </div>
      </header>

      <section className="mx-auto flex w-full max-w-4xl flex-1 flex-col justify-center px-4 py-6">
        {error ? (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
            {error}
          </div>
        ) : null}

        <div
          className={`transform-gpu transition-all duration-200 ease-out ${questionTransitionClass}`}
        >
          <QuestionStep
            question={currentQuestion}
            selectedVariantId={selectedVariantId}
            feedback={currentFeedback}
            checking={checking}
            onSelect={handleSelectAnswer}
          />
        </div>
      </section>

      {showCorrectReward ? (
        <CorrectAnswerReward
          key={currentQuestion.id}
          points={POINTS_PER_CORRECT_ANSWER}
        />
      ) : null}
    </main>
  );
}

function ScorePill({
  points,
  maxPoints,
}: {
  points: number;
  maxPoints: number;
}) {
  return (
    <div className="inline-flex min-h-10 items-center gap-2 rounded-md border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-950">
      <Trophy className="text-amber-700" size={17} aria-hidden="true" />
      <span className="text-xs font-medium text-amber-700">Очки</span>
      <span>{formatPoints(points)}</span>
      <span className="text-xs font-medium text-amber-700">
        / {formatPoints(maxPoints)}
      </span>
    </div>
  );
}

const CONFETTI_PIECES = [
  { x: -82, y: 34, rotate: -170, delay: 0, colorClass: "bg-emerald-500" },
  { x: -58, y: -12, rotate: -120, delay: 20, colorClass: "bg-amber-400" },
  { x: -34, y: 48, rotate: -80, delay: 40, colorClass: "bg-teal-500" },
  { x: -12, y: -26, rotate: -40, delay: 10, colorClass: "bg-lime-500" },
  { x: 14, y: 42, rotate: 55, delay: 30, colorClass: "bg-sky-500" },
  { x: 38, y: -16, rotate: 95, delay: 50, colorClass: "bg-amber-500" },
  { x: 66, y: 32, rotate: 135, delay: 15, colorClass: "bg-emerald-600" },
  { x: 88, y: -4, rotate: 180, delay: 35, colorClass: "bg-teal-600" },
];

function CorrectAnswerReward({ points }: { points: number }) {
  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-50 flex justify-center overflow-visible px-4 pb-6 sm:pb-8"
      role="status"
      aria-label={`+${formatPoints(points)} очков`}
    >
      <style>{`
        @keyframes correct-answer-reward-pop {
          0% {
            opacity: 0;
            transform: translate3d(0, 42px, 0) scale(0.98);
          }

          45% {
            opacity: 1;
            transform: translate3d(0, -3px, 0) scale(1.01);
          }

          72% {
            opacity: 1;
            transform: translate3d(0, 1px, 0) scale(0.998);
          }

          100% {
            opacity: 1;
            transform: translate3d(0, 0, 0) scale(1);
          }
        }
      `}</style>
      <div
        className="relative flex min-h-20 min-w-36 transform-gpu items-center justify-center overflow-visible px-6 py-3 text-4xl font-black text-emerald-700 sm:text-5xl"
        style={{
          animation:
            "correct-answer-reward-pop 760ms cubic-bezier(0.16, 1, 0.3, 1) forwards",
          willChange: "transform, opacity",
        }}
      >
        <CorrectAnswerConfetti />
        <span className="relative z-10">+{formatPoints(points)}</span>
      </div>
    </div>
  );
}

function CorrectAnswerConfetti() {
  return (
    <div
      className="pointer-events-none absolute left-1/2 top-1/2 h-28 w-72 -translate-x-1/2 -translate-y-1/2 overflow-visible"
      aria-hidden="true"
    >
      <style>{`
        @keyframes correct-answer-confetti {
          0% {
            opacity: 0;
            transform: translate(-50%, 0) scale(0.45) rotate(0deg);
          }

          12%,
          72% {
            opacity: 1;
          }

          100% {
            opacity: 0;
            transform: translate(calc(-50% + var(--confetti-x)), var(--confetti-y)) scale(1) rotate(var(--confetti-rotate));
          }
        }
      `}</style>
      {CONFETTI_PIECES.map((piece, index) => (
        <span
          key={`${piece.x}-${index}`}
          className={`absolute left-1/2 top-1/2 h-2.5 w-1.5 rounded-sm ${piece.colorClass}`}
          style={
            {
              "--confetti-x": `${piece.x}px`,
              "--confetti-y": `${piece.y}px`,
              "--confetti-rotate": `${piece.rotate}deg`,
              animation:
                "correct-answer-confetti 850ms cubic-bezier(0.18, 0.85, 0.28, 1) forwards",
              animationDelay: `${piece.delay}ms`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  );
}

function StartGate({
  summary,
  error,
  leaderboard,
  savingCopy,
  splittingTest,
  splitQuestionsPerPart,
  onStart,
  onSaveCopy,
  onSplitQuestionsPerPartChange,
  onSplit,
}: {
  summary: PublicTestSummary;
  error: string | null;
  leaderboard: LeaderboardEntry[];
  savingCopy: boolean;
  splittingTest: boolean;
  splitQuestionsPerPart: string;
  onStart: () => void;
  onSaveCopy?: () => void;
  onSplitQuestionsPerPartChange: (value: string) => void;
  onSplit?: () => void;
}) {
  return (
    <main className="min-h-dvh bg-stone-100 px-4 py-6 text-stone-950">
      <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-teal-700 text-white">
              <FileQuestion size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="break-words text-xl font-semibold">
                {summary.title}
              </h1>
              <p className="text-sm text-stone-500">
                {summary.questionsCount} вопросов
              </p>
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              {error}
            </div>
          ) : null}

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className={`${primaryButtonClass} w-full sm:w-auto`}
              onClick={onStart}
            >
              <PlayIcon />
              Начать тест
            </button>
            {onSaveCopy ? (
              <button
                type="button"
                className={`${secondaryButtonClass} w-full sm:w-auto`}
                onClick={onSaveCopy}
                disabled={savingCopy}
              >
                {savingCopy ? (
                  <Loader2
                    className="animate-spin"
                    size={17}
                    aria-hidden="true"
                  />
                ) : (
                  <CheckCircle2 size={17} aria-hidden="true" />
                )}
                {
                  "\u0421\u043e\u0445\u0440\u0430\u043d\u0438\u0442\u044c \u0441\u0435\u0431\u0435"
                }
              </button>
            ) : null}
            <Link
              className={`${secondaryButtonClass} w-full sm:w-auto`}
              href="/"
            >
              <Home size={17} aria-hidden="true" />В кабинет
            </Link>
          </div>

          {onSplit ? (
            <div className="mt-5 rounded-md border border-stone-200 bg-stone-50 p-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="block flex-1 space-y-1.5">
                  <span className="text-xs font-medium uppercase tracking-normal text-stone-500">
                    По сколько вопросов
                  </span>
                  <input
                    className="min-h-10 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                    type="number"
                    min={1}
                    max={Math.max(summary.questionsCount - 1, 1)}
                    inputMode="numeric"
                    value={splitQuestionsPerPart}
                    onChange={(event) =>
                      onSplitQuestionsPerPartChange(event.target.value)
                    }
                    disabled={splittingTest}
                  />
                </label>
                <button
                  type="button"
                  className={`${secondaryButtonClass} w-full sm:w-auto`}
                  onClick={onSplit}
                  disabled={splittingTest || summary.questionsCount < 2}
                >
                  {splittingTest ? (
                    <Loader2
                      className="animate-spin"
                      size={17}
                      aria-hidden="true"
                    />
                  ) : (
                    <CheckCircle2 size={17} aria-hidden="true" />
                  )}
                  Разделить на части
                </button>
              </div>
              <p className="mt-2 text-sm text-stone-500">
                Будут созданы новые тесты в вашем кабинете.
              </p>
            </div>
          ) : null}
        </section>

        <Leaderboard entries={leaderboard} />
      </div>
    </main>
  );
}

function NicknameGate({
  summary,
  nickname,
  error,
  leaderboard,
  onNicknameChange,
  onSubmit,
}: {
  summary: PublicTestSummary;
  nickname: string;
  error: string | null;
  leaderboard: LeaderboardEntry[];
  onNicknameChange: (value: string) => void;
  onSubmit: (event: FormEvent<HTMLFormElement>) => void;
}) {
  return (
    <main className="min-h-dvh bg-stone-100 px-4 py-6 text-stone-950">
      <div className="mx-auto grid max-w-5xl gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section className="rounded-md border border-stone-200 bg-white p-6 shadow-sm">
          <div className="mb-6 flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-md bg-teal-700 text-white">
              <FileQuestion size={20} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <h1 className="break-words text-xl font-semibold">
                {summary.title}
              </h1>
              <p className="text-sm text-stone-500">
                {summary.questionsCount} вопросов
              </p>
            </div>
          </div>

          {error ? (
            <div className="mb-4 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-900">
              {error}
            </div>
          ) : null}

          <form className="space-y-4" onSubmit={onSubmit}>
            <label className="block space-y-1.5">
              <span className="text-xs font-medium uppercase tracking-normal text-stone-500">
                Ник
              </span>
              <input
                className="min-h-10 w-full rounded-md border border-stone-300 bg-white px-3 py-2 text-sm text-stone-950 outline-none transition focus:border-teal-600 focus:ring-2 focus:ring-teal-100"
                type="text"
                value={nickname}
                maxLength={40}
                autoComplete="nickname"
                onChange={(event) => onNicknameChange(event.target.value)}
                required
              />
            </label>
            <button
              type="submit"
              className={`${primaryButtonClass} w-full sm:w-auto`}
            >
              <PlayIcon />
              Начать тест
            </button>
            <Link
              className={`${secondaryButtonClass} w-full sm:w-auto`}
              href="/"
            >
              <Home size={17} aria-hidden="true" />
              {
                "\u0412\u043e\u0439\u0442\u0438 \u0438 \u0440\u0430\u0437\u0434\u0435\u043b\u0438\u0442\u044c \u0441\u0435\u0431\u0435"
              }
            </Link>
          </form>
        </section>

        <Leaderboard entries={leaderboard} />
      </div>
    </main>
  );
}

function PlayIcon() {
  return <Play size={17} aria-hidden="true" />;
}

function Leaderboard({
  entries,
  currentAttemptId,
}: {
  entries: LeaderboardEntry[];
  currentAttemptId?: string;
}) {
  return (
    <section className="rounded-md border border-stone-200 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-3">
        <div className="flex size-9 items-center justify-center rounded-md bg-amber-600 text-white">
          <Trophy size={18} aria-hidden="true" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-stone-950">Рейтинг</h2>
          <p className="text-sm text-stone-500">Топ результатов</p>
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="rounded-md border border-dashed border-stone-300 bg-stone-50 p-4 text-sm text-stone-500">
          Результатов пока нет.
        </div>
      ) : (
        <div className="divide-y divide-stone-100">
          {entries.map((entry) => {
            const isCurrent = entry.id === currentAttemptId;

            return (
              <div
                key={entry.id}
                className={`grid grid-cols-[36px_minmax(0,1fr)_auto] items-center gap-3 py-3 ${
                  isCurrent ? "rounded-md bg-teal-50 px-2 text-teal-950" : ""
                }`}
              >
                <span className="flex size-8 items-center justify-center rounded-md bg-stone-100 text-sm font-semibold text-stone-700">
                  {entry.rank}
                </span>
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{entry.name}</p>
                  <p className="text-xs text-stone-500">
                    {formatDate(entry.createdAt)}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm font-semibold">{entry.percent}%</p>
                  <p className="text-xs text-stone-500">
                    {entry.score}/{entry.total}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </section>
  );
}

function QuestionStep({
  question,
  selectedVariantId,
  feedback,
  checking,
  onSelect,
}: {
  question: StartedQuestion;
  selectedVariantId?: string;
  feedback?: AnswerCheckResponse;
  checking: boolean;
  onSelect: (variantId: string) => void;
}) {
  const shownVariantIds = feedback
    ? new Set(
        feedback.isCorrect
          ? [selectedVariantId ?? feedback.correctVariantId]
          : [selectedVariantId, feedback.correctVariantId].filter(Boolean),
      )
    : null;

  return (
    <article>
      <h2 className="text-center text-2xl sm:text-3xl font-medium text-gray-900 leading-snug mb-8 max-w-2xl mx-auto bg-gray-50 px-6 py-4 rounded-xl border border-gray-100">
        {question.text}
      </h2>

      <QuestionImageGallery imageUrls={question.imageUrls} />

      <div className="mt-7 space-y-4">
        {question.variants.map((variant) => (
          <VariantOption
            key={variant.id}
            variant={variant}
            selected={selectedVariantId === variant.id}
            feedback={feedback}
            checking={checking && selectedVariantId === variant.id && !feedback}
            disabled={Boolean(feedback) || checking}
            concealed={Boolean(
              shownVariantIds && !shownVariantIds.has(variant.id),
            )}
            onSelect={onSelect}
          />
        ))}
      </div>
    </article>
  );
}

function QuestionImageGallery({ imageUrls }: { imageUrls?: string[] }) {
  const safeImageUrls = getSafeQuestionImageUrls(imageUrls);

  if (safeImageUrls.length === 0) {
    return null;
  }

  return (
    <div className="-mt-6 mb-8 grid gap-3">
      {safeImageUrls.map((imageUrl, index) => (
        <figure
          key={`${imageUrl.slice(0, 48)}-${index}`}
          className="overflow-hidden rounded-md border border-stone-200 bg-white p-2 shadow-sm"
        >
          <img
            className="max-h-[42dvh] w-full object-contain"
            src={imageUrl}
            alt={`Изображение ${index + 1} к вопросу`}
          />
        </figure>
      ))}
    </div>
  );
}

function VariantOption({
  variant,
  selected,
  feedback,
  checking,
  disabled,
  concealed,
  onSelect,
}: {
  variant: StartedVariant;
  selected: boolean;
  feedback?: AnswerCheckResponse;
  checking: boolean;
  disabled: boolean;
  concealed: boolean;
  onSelect: (variantId: string) => void;
}) {
  const isCorrect = feedback?.correctVariantId === variant.id;
  const isSelectedWrong = Boolean(feedback && selected && !feedback.isCorrect);
  const stateClass = isCorrect
    ? "border-emerald-400 bg-emerald-50 text-emerald-950 ring-1 ring-emerald-200"
    : isSelectedWrong
      ? "border-red-400 bg-red-50 text-red-950 ring-1 ring-red-200"
      : selected
        ? "border-teal-400 bg-teal-50 text-teal-950"
        : "border-stone-200 bg-white text-stone-900 hover:border-teal-300 hover:bg-stone-50";
  const statusIconClass = isCorrect
    ? "text-emerald-700"
    : isSelectedWrong
      ? "text-red-700"
      : selected || checking
        ? "text-teal-700"
        : "text-stone-400";

  return (
    <button
      type="button"
      className={`relative flex min-h-16 w-full cursor-pointer items-center justify-center rounded-md border border-stone-300 px-12 py-4 text-center transition ${stateClass} ${
        disabled ? "cursor-default" : ""
      } ${concealed ? "invisible" : ""}`}
      onClick={() => onSelect(variant.id)}
      disabled={disabled}
      aria-hidden={concealed}
    >
      <span
        className={`absolute left-5 flex size-6 items-center justify-center transition ${statusIconClass}`}
      >
        {checking ? (
          <Loader2 className="animate-spin" size={21} aria-hidden="true" />
        ) : isCorrect ? (
          <CheckCircle2 size={22} aria-hidden="true" />
        ) : isSelectedWrong ? (
          <XCircle size={22} aria-hidden="true" />
        ) : null}
      </span>
      <span className="flex min-w-0 flex-col items-center gap-3">
        {variant.text ? (
          <span className="break-words text-lg font-semibold leading-7 sm:text-xl sm:leading-8">
            {variant.text}
          </span>
        ) : null}
        <VariantImageGallery imageUrls={variant.imageUrls} />
      </span>
    </button>
  );
}

function VariantImageGallery({ imageUrls }: { imageUrls?: string[] }) {
  const safeImageUrls = getSafeQuestionImageUrls(imageUrls);

  if (safeImageUrls.length === 0) {
    return null;
  }

  return (
    <span className="grid max-w-full gap-2">
      {safeImageUrls.map((imageUrl, index) => (
        <img
          key={`${imageUrl.slice(0, 48)}-${index}`}
          className="max-h-52 max-w-full rounded-md border border-stone-200 bg-white object-contain"
          src={imageUrl}
          alt={`Изображение ${index + 1} к варианту`}
        />
      ))}
    </span>
  );
}

function ResultMetric({
  label,
  value,
}: {
  label: string;
  value: number | string;
}) {
  return (
    <div className="rounded-md border border-stone-200 bg-stone-50 p-4">
      <p className="text-sm text-stone-500">{label}</p>
      <p className="mt-1 text-3xl font-semibold text-stone-950">{value}</p>
    </div>
  );
}

function formatPoints(value: number): string {
  return new Intl.NumberFormat("ru-RU").format(value);
}

function formatDate(value: string): string {
  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(value));
}

function getReadableError(error: unknown): string {
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

function isAbortLikeError(error: unknown): boolean {
  return (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    (error.name === "AbortError" || error.name === "TimeoutError")
  );
}

function getDefaultSplitQuestionsPerPart(questionsCount: number): number {
  if (questionsCount <= 1) {
    return 1;
  }

  if (questionsCount <= 10) {
    return Math.max(1, Math.ceil(questionsCount / 2));
  }

  return 10;
}
