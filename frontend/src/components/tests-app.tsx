"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { ArrowLeft, FileQuestion, LogOut } from "lucide-react";
import { ApiError, getCurrentUser, getTests } from "@/lib/api";
import {
  clearStoredSession,
  readStoredSession,
  saveStoredSession,
} from "@/lib/session";
import type { AuthResponse, AuthUser, TestListItem } from "@/lib/types";
import {
  AuthScreen,
  FullPageStatus,
  TestsPanel,
  getReadableError,
} from "@/components/dashboard-app";

type AuthStatus = "checking" | "guest" | "authenticated";

const secondaryButtonClass =
  "inline-flex min-h-10 min-w-0 items-center justify-center gap-2 rounded-md border border-stone-300 bg-white px-4 py-2 text-center text-sm font-semibold text-stone-800 transition hover:bg-stone-100 disabled:cursor-not-allowed disabled:bg-stone-100 disabled:text-stone-400";

export function TestsApp() {
  const [authStatus, setAuthStatus] = useState<AuthStatus>("checking");
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);
  const [tests, setTests] = useState<TestListItem[]>([]);
  const [testsLoading, setTestsLoading] = useState(false);
  const [testsError, setTestsError] = useState<string | null>(null);

  const logout = useCallback(() => {
    clearStoredSession();
    setToken(null);
    setUser(null);
    setTests([]);
    setTestsError(null);
    setAuthStatus("guest");
  }, []);

  const loadTests = useCallback(
    async (authToken: string) => {
      setTestsLoading(true);
      setTestsError(null);

      try {
        setTests(await getTests(authToken));
      } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
          logout();
          return;
        }

        setTestsError(getReadableError(error));
      } finally {
        setTestsLoading(false);
      }
    },
    [logout],
  );

  useEffect(() => {
    let mounted = true;
    void Promise.resolve().then(() => {
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

      void getCurrentUser(storedSession.accessToken)
        .then((currentUser) => {
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
        })
        .catch((error) => {
          if (!mounted) {
            return;
          }

          if (error instanceof ApiError && error.status === 401) {
            logout();
            return;
          }

          setAuthStatus("authenticated");
          setTestsError(getReadableError(error));
        });
    });

    return () => {
      mounted = false;
    };
  }, [logout]);

  useEffect(() => {
    if (authStatus === "authenticated" && token) {
      void Promise.resolve().then(() => loadTests(token));
    }
  }, [authStatus, loadTests, token]);

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
                Мои тесты
              </h1>
              <p className="truncate text-sm text-stone-500">{user.email}</p>
            </div>
          </div>

          <div className="grid gap-2 sm:flex sm:items-center">
            <Link
              className={`${secondaryButtonClass} w-full sm:w-auto`}
              href="/"
            >
              <ArrowLeft size={17} aria-hidden="true" />
              Импорт
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

      <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-5 lg:px-6 xl:py-6">
        <TestsPanel
          tests={tests}
          loading={testsLoading}
          error={testsError}
          onRefresh={() => loadTests(token)}
        />
      </div>
    </main>
  );
}
