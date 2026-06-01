"use client";

import { BrowserProvider, Contract, JsonRpcProvider } from "ethers";
import {
  AlertCircle,
  BookOpenCheck,
  CheckCircle2,
  Clock3,
  Database,
  FileCode2,
  GraduationCap,
  Loader2,
  Network,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Wallet,
} from "lucide-react";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useState } from "react";

type EthereumEvent = "accountsChanged" | "chainChanged";

type EthereumProvider = {
  isMetaMask?: boolean;
  request: (request: {
    method: string;
    params?: unknown[] | Record<string, unknown>;
  }) => Promise<unknown>;
  on?: (event: EthereumEvent, handler: (...args: unknown[]) => void) => void;
  removeListener?: (
    event: EthereumEvent,
    handler: (...args: unknown[]) => void,
  ) => void;
};

declare global {
  interface Window {
    ethereum?: EthereumProvider;
  }
}

type DeploymentConfig = {
  contractName: string;
  address: string;
  chainId: number;
  network: string;
  owner: string;
  deployedAt: string;
};

type StudentTuple = readonly [bigint, string, string, bigint, bigint] & {
  id: bigint;
  name: string;
  email: string;
  gradeCount: bigint;
  averageScore: bigint;
};

type GradeTuple = readonly [string, bigint, bigint, string] & {
  subject: string;
  score: bigint;
  timestamp: bigint;
  teacher: string;
};

type Grade = {
  subject: string;
  score: number;
  timestamp: number;
  teacher: string;
};

type Student = {
  id: number;
  name: string;
  email: string;
  gradeCount: number;
  averageScore: number;
  grades: Grade[];
};

type Notice = {
  tone: "success" | "error" | "warning";
  title: string;
  message: string;
};

const HARDHAT_CHAIN_ID = 31337;
const HARDHAT_CHAIN_ID_HEX = "0x7a69";
const HARDHAT_RPC_URL = "http://127.0.0.1:8545";

const STUDENT_GRADES_ABI = [
  "function owner() view returns (address)",
  "function addStudent(string name, string email) returns (uint256)",
  "function addGrade(uint256 studentId, string subject, uint8 score)",
  "function getStudent(uint256 studentId) view returns (uint256 id, string name, string email, uint256 gradeCount, uint256 averageScore)",
  "function getGrades(uint256 studentId) view returns (tuple(string subject, uint8 score, uint256 timestamp, address teacher)[])",
  "function getStudentCount() view returns (uint256)",
  "function getAverageScore(uint256 studentId) view returns (uint256)",
  "event StudentAdded(uint256 indexed studentId, string name, string email, address indexed teacher)",
  "event GradeAdded(uint256 indexed studentId, string subject, uint8 score, address indexed teacher)",
];

const fieldClass =
  "min-h-11 w-full rounded-md border border-zinc-200 bg-white px-3.5 py-2.5 text-sm text-zinc-950 outline-none transition placeholder:text-zinc-400 focus:border-zinc-950 focus:ring-2 focus:ring-zinc-950/10 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400";

const primaryButtonClass =
  "inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md bg-zinc-950 px-4 py-2.5 text-center text-sm font-semibold text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:bg-zinc-200 disabled:text-zinc-500";

const secondaryButtonClass =
  "inline-flex min-h-11 min-w-0 items-center justify-center gap-2 rounded-md border border-zinc-200 bg-white px-4 py-2.5 text-center text-sm font-semibold text-zinc-800 transition hover:border-zinc-300 hover:bg-zinc-50 disabled:cursor-not-allowed disabled:bg-zinc-50 disabled:text-zinc-400";

const panelClass =
  "rounded-lg border border-zinc-200 bg-white p-4 shadow-[0_1px_2px_rgba(24,24,27,0.04)] sm:p-5";

const setupSteps = [
  {
    title: "Установить Hardhat-проект",
    command: "cd blockchain && npm install",
  },
  {
    title: "Скомпилировать Solidity-контракт",
    command: "npm run compile",
  },
  {
    title: "Запустить локальный Ethereum-узел",
    command: "npm run node",
  },
  {
    title: "Задеплоить контракт во втором терминале",
    command: "npm run deploy:localhost",
  },
  {
    title: "Импортировать owner-аккаунт Hardhat в MetaMask",
    command: "Возьмите private key из окна `npm run node` и импортируйте его в MetaMask.",
  },
  {
    title: "Добавить сеть Hardhat Local",
    command: "RPC http://127.0.0.1:8545, Chain ID 31337, Symbol ETH",
  },
  {
    title: "Запустить frontend",
    command: "cd frontend && npm install && npm run dev",
  },
  {
    title: "Открыть DApp",
    command: "http://localhost:3001/blockchain",
  },
];

const stackNotes = [
  {
    title: "Hardhat",
    text: "Локальная сеть на 8545, тестовые ETH и быстрый deploy для демонстрации.",
  },
  {
    title: "Solidity",
    text: "Контракт хранит студентов, оценки, owner-роль и средний балл.",
  },
  {
    title: "ethers.js",
    text: "Читает состояние через RPC и отправляет транзакции через signer MetaMask.",
  },
  {
    title: "MetaMask",
    text: "Подписывает запись студента и оценок от owner-аккаунта.",
  },
];

function getEthereum() {
  if (typeof window === "undefined") {
    return undefined;
  }

  return window.ethereum;
}

function parseAccounts(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((account): account is string => typeof account === "string");
}

function getReadableError(error: unknown) {
  const shapedError = error as {
    code?: number | string;
    reason?: string;
    shortMessage?: string;
    message?: string;
  };

  if (shapedError.code === 4001) {
    return "Операция отменена в MetaMask.";
  }

  if (shapedError.reason) {
    return shapedError.reason;
  }

  if (shapedError.shortMessage) {
    return shapedError.shortMessage;
  }

  if (shapedError.message?.includes("fetch failed")) {
    return "Не удалось подключиться к Hardhat node. Проверьте, что `npm run node` запущен.";
  }

  if (shapedError.message) {
    return shapedError.message;
  }

  return "Неизвестная ошибка DApp.";
}

function getErrorCode(error: unknown) {
  const shapedError = error as { code?: number | string };

  return shapedError.code;
}

function formatAddress(address?: string | null) {
  if (!address) {
    return "Не подключен";
  }

  return `${address.slice(0, 6)}...${address.slice(-4)}`;
}

function formatGpa(score: number) {
  return (score / 25).toFixed(2);
}

function formatDate(timestamp: number) {
  if (!timestamp) {
    return "-";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    dateStyle: "short",
    timeStyle: "short",
  }).format(new Date(timestamp * 1000));
}

function formatSyncTime(value: Date | null) {
  if (!value) {
    return "Еще не синхронизировано";
  }

  return new Intl.DateTimeFormat("ru-RU", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(value);
}

async function fetchDeployment() {
  const response = await fetch("/student-grades-deployment.json", {
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(
      "Файл deployment не найден. Запустите `cd blockchain`, затем `npm run deploy:localhost`.",
    );
  }

  const deployment = (await response.json()) as Partial<DeploymentConfig>;

  if (!deployment.address || !deployment.contractName) {
    throw new Error("Deployment JSON найден, но в нем нет адреса контракта.");
  }

  return deployment as DeploymentConfig;
}

async function ensureContractHasCode(
  provider: JsonRpcProvider,
  deployment: DeploymentConfig,
) {
  const code = await provider.getCode(deployment.address);

  if (code === "0x") {
    throw new Error(
      `По адресу ${deployment.address} в Hardhat Local нет контракта. Если вы перезапускали \`npm run node\`, выполните \`cd blockchain && npm run deploy:localhost\`, затем обновите страницу.`,
    );
  }
}

function parseGrade(grade: GradeTuple): Grade {
  return {
    subject: grade.subject ?? grade[0],
    score: Number(grade.score ?? grade[1]),
    timestamp: Number(grade.timestamp ?? grade[2]),
    teacher: grade.teacher ?? grade[3],
  };
}

export function StudentGradesDapp() {
  const readProvider = useMemo(() => new JsonRpcProvider(HARDHAT_RPC_URL), []);

  const [deployment, setDeployment] = useState<DeploymentConfig | null>(null);
  const [owner, setOwner] = useState<string | null>(null);
  const [account, setAccount] = useState<string | null>(null);
  const [chainId, setChainId] = useState<string | null>(null);
  const [students, setStudents] = useState<Student[]>([]);
  const [selectedStudentId, setSelectedStudentId] = useState<number | null>(null);
  const [studentForm, setStudentForm] = useState({ name: "", email: "" });
  const [gradeForm, setGradeForm] = useState({ subject: "", score: "90" });
  const [studentQuery, setStudentQuery] = useState("");
  const [notice, setNotice] = useState<Notice | null>(null);
  const [lastTxHash, setLastTxHash] = useState<string | null>(null);
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [walletLoading, setWalletLoading] = useState(false);
  const [studentSubmitting, setStudentSubmitting] = useState(false);
  const [gradeSubmitting, setGradeSubmitting] = useState(false);

  const isHardhatNetwork = chainId?.toLowerCase() === HARDHAT_CHAIN_ID_HEX;
  const isOwner =
    Boolean(account && owner) && account?.toLowerCase() === owner?.toLowerCase();
  const totalGrades = students.reduce((total, student) => total + student.gradeCount, 0);
  const groupAverage =
    students.length === 0
      ? 0
      : Math.round(
          students.reduce((total, student) => total + student.averageScore, 0) /
            students.length,
        );
  const selectedStudent =
    students.find((student) => student.id === selectedStudentId) ?? students[0] ?? null;
  const canMutate = Boolean(deployment && account && isHardhatNetwork && isOwner);
  const normalizedQuery = studentQuery.trim().toLowerCase();
  const visibleStudents = normalizedQuery
    ? students.filter(
        (student) =>
          student.name.toLowerCase().includes(normalizedQuery) ||
          student.email.toLowerCase().includes(normalizedQuery) ||
          student.id.toString().includes(normalizedQuery),
      )
    : students;
  const scoreValue = Number(gradeForm.score);
  const scoreIsValid =
    Number.isInteger(scoreValue) && scoreValue >= 0 && scoreValue <= 100;

  const readinessItems = [
    {
      label: "Контракт",
      value: deployment ? formatAddress(deployment.address) : "Deployment не найден",
      ready: Boolean(deployment),
    },
    {
      label: "Сеть",
      value: isHardhatNetwork ? "Hardhat Local" : chainId ?? "Не выбрана",
      ready: isHardhatNetwork,
    },
    {
      label: "Кошелек",
      value: account ? formatAddress(account) : "MetaMask не подключен",
      ready: Boolean(account),
    },
    {
      label: "Права записи",
      value: isOwner ? "Owner" : "Только чтение",
      ready: isOwner,
    },
  ];

  const readWalletState = useCallback(async () => {
    const ethereum = getEthereum();

    if (!ethereum) {
      setAccount(null);
      setChainId(null);
      return;
    }

    try {
      const [accountsValue, chainValue] = await Promise.all([
        ethereum.request({ method: "eth_accounts" }),
        ethereum.request({ method: "eth_chainId" }),
      ]);
      const accounts = parseAccounts(accountsValue);

      setAccount(accounts[0] ?? null);
      setChainId(typeof chainValue === "string" ? chainValue.toLowerCase() : null);
    } catch (error) {
      setNotice({
        tone: "warning",
        title: "MetaMask не ответил",
        message: getReadableError(error),
      });
    }
  }, []);

  const loadBlockchainData = useCallback(async () => {
    setLoading(true);

    try {
      const nextDeployment = await fetchDeployment();
      await ensureContractHasCode(readProvider, nextDeployment);

      const contract = new Contract(
        nextDeployment.address,
        STUDENT_GRADES_ABI,
        readProvider,
      );
      const [ownerAddress, countValue] = await Promise.all([
        contract.owner() as Promise<string>,
        contract.getStudentCount() as Promise<bigint>,
      ]);
      const count = Number(countValue);
      const nextStudents = await Promise.all(
        Array.from({ length: count }, async (_, index) => {
          const id = index + 1;
          const [studentResult, gradesResult] = await Promise.all([
            contract.getStudent(id) as Promise<StudentTuple>,
            contract.getGrades(id) as Promise<GradeTuple[]>,
          ]);

          return {
            id: Number(studentResult.id ?? studentResult[0]),
            name: studentResult.name ?? studentResult[1],
            email: studentResult.email ?? studentResult[2],
            gradeCount: Number(studentResult.gradeCount ?? studentResult[3]),
            averageScore: Number(studentResult.averageScore ?? studentResult[4]),
            grades: gradesResult.map(parseGrade),
          };
        }),
      );

      setDeployment(nextDeployment);
      setOwner(ownerAddress);
      setStudents(nextStudents);
      setLastSyncAt(new Date());
      setSelectedStudentId((current) => {
        if (current && nextStudents.some((student) => student.id === current)) {
          return current;
        }

        return nextStudents[0]?.id ?? null;
      });
      setNotice((current) =>
        current?.tone === "error"
          ? {
              tone: "success",
              title: "Контракт подключен",
              message: "Данные загружены из локального Hardhat-блокчейна.",
            }
          : current,
      );
    } catch (error) {
      setDeployment(null);
      setOwner(null);
      setStudents([]);
      setSelectedStudentId(null);
      setNotice({
        tone: "error",
        title: "Контракт недоступен",
        message: getReadableError(error),
      });
    } finally {
      setLoading(false);
    }
  }, [readProvider]);

  const connectWallet = useCallback(async () => {
    const ethereum = getEthereum();

    if (!ethereum) {
      setNotice({
        tone: "error",
        title: "MetaMask не найден",
        message: "Установите расширение MetaMask и обновите страницу.",
      });
      return;
    }

    setWalletLoading(true);

    try {
      await ethereum.request({ method: "eth_requestAccounts" });
      await readWalletState();
      setNotice({
        tone: "success",
        title: "Кошелек подключен",
        message: "Теперь можно переключиться на Hardhat Local и отправлять транзакции.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Кошелек не подключен",
        message: getReadableError(error),
      });
    } finally {
      setWalletLoading(false);
    }
  }, [readWalletState]);

  const switchToHardhatNetwork = useCallback(async () => {
    const ethereum = getEthereum();

    if (!ethereum) {
      setNotice({
        tone: "error",
        title: "MetaMask не найден",
        message: "Переключение сети доступно только через MetaMask.",
      });
      return;
    }

    setWalletLoading(true);

    try {
      try {
        await ethereum.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: HARDHAT_CHAIN_ID_HEX }],
        });
      } catch (switchError) {
        if (getErrorCode(switchError) !== 4902) {
          throw switchError;
        }

        await ethereum.request({
          method: "wallet_addEthereumChain",
          params: [
            {
              chainId: HARDHAT_CHAIN_ID_HEX,
              chainName: "Hardhat Local 31337",
              nativeCurrency: {
                name: "Ether",
                symbol: "ETH",
                decimals: 18,
              },
              rpcUrls: [HARDHAT_RPC_URL],
            },
          ],
        });
      }

      await readWalletState();
      setNotice({
        tone: "success",
        title: "Сеть Hardhat активна",
        message: "MetaMask подключен к локальному RPC http://127.0.0.1:8545.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Не удалось переключить сеть",
        message: getReadableError(error),
      });
    } finally {
      setWalletLoading(false);
    }
  }, [readWalletState]);

  const getWriteContract = useCallback(async () => {
    const ethereum = getEthereum();

    if (!ethereum) {
      throw new Error("MetaMask не найден.");
    }

    if (!deployment) {
      throw new Error("Сначала задеплойте контракт и обновите страницу.");
    }

    const browserProvider = new BrowserProvider(ethereum);
    const network = await browserProvider.getNetwork();

    if (network.chainId !== BigInt(HARDHAT_CHAIN_ID)) {
      throw new Error("Переключите MetaMask на сеть Hardhat Local 31337.");
    }

    const signer = await browserProvider.getSigner();
    const signerAddress = await signer.getAddress();

    if (owner && signerAddress.toLowerCase() !== owner.toLowerCase()) {
      throw new Error("Транзакции может отправлять только owner-преподаватель.");
    }

    return new Contract(deployment.address, STUDENT_GRADES_ABI, signer);
  }, [deployment, owner]);

  const handleAddStudent = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!studentForm.name.trim() || !studentForm.email.trim()) {
      setNotice({
        tone: "warning",
        title: "Заполните студента",
        message: "ФИО и email нужны для записи студента в контракт.",
      });
      return;
    }

    setStudentSubmitting(true);

    try {
      const contract = await getWriteContract();
      const tx = await contract.addStudent(studentForm.name.trim(), studentForm.email.trim());

      setLastTxHash(tx.hash);
      setNotice({
        tone: "success",
        title: "Транзакция отправлена",
        message: `Ожидаем подтверждение ${tx.hash}.`,
      });

      await tx.wait();
      setStudentForm({ name: "", email: "" });
      await loadBlockchainData();
      setNotice({
        tone: "success",
        title: "Студент записан",
        message: "Новая запись сохранена в локальном блокчейне.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Студент не записан",
        message: getReadableError(error),
      });
    } finally {
      setStudentSubmitting(false);
    }
  };

  const handleAddGrade = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    if (!selectedStudent) {
      setNotice({
        tone: "warning",
        title: "Нет студента",
        message: "Сначала добавьте хотя бы одного студента.",
      });
      return;
    }

    if (!gradeForm.subject.trim() || !scoreIsValid) {
      setNotice({
        tone: "warning",
        title: "Проверьте оценку",
        message: "Предмет обязателен, оценка должна быть целым числом от 0 до 100.",
      });
      return;
    }

    setGradeSubmitting(true);

    try {
      const contract = await getWriteContract();
      const tx = await contract.addGrade(
        selectedStudent.id,
        gradeForm.subject.trim(),
        scoreValue,
      );

      setLastTxHash(tx.hash);
      setNotice({
        tone: "success",
        title: "Транзакция оценки отправлена",
        message: `Ожидаем подтверждение ${tx.hash}.`,
      });

      await tx.wait();
      setGradeForm({ subject: "", score: "90" });
      await loadBlockchainData();
      setNotice({
        tone: "success",
        title: "Оценка сохранена",
        message: "GPA и средний балл обновлены из данных смарт-контракта.",
      });
    } catch (error) {
      setNotice({
        tone: "error",
        title: "Оценка не сохранена",
        message: getReadableError(error),
      });
    } finally {
      setGradeSubmitting(false);
    }
  };

  useEffect(() => {
    let mounted = true;

    void Promise.resolve().then(() => {
      if (!mounted) {
        return;
      }

      void readWalletState();
      void loadBlockchainData();
    });

    return () => {
      mounted = false;
    };
  }, [loadBlockchainData, readWalletState]);

  useEffect(() => {
    const ethereum = getEthereum();

    if (!ethereum?.on) {
      return;
    }

    const handleAccountsChanged = (accountsValue: unknown) => {
      const accounts = parseAccounts(accountsValue);
      setAccount(accounts[0] ?? null);
    };

    const handleChainChanged = (chainValue: unknown) => {
      setChainId(typeof chainValue === "string" ? chainValue.toLowerCase() : null);
      setNotice({
        tone: "warning",
        title: "Сеть изменена",
        message: "Проверьте, что активна сеть Hardhat Local 31337.",
      });
    };

    ethereum.on("accountsChanged", handleAccountsChanged);
    ethereum.on("chainChanged", handleChainChanged);

    return () => {
      ethereum.removeListener?.("accountsChanged", handleAccountsChanged);
      ethereum.removeListener?.("chainChanged", handleChainChanged);
    };
  }, []);

  return (
    <main className="min-h-dvh bg-[#f6f7f5] text-zinc-950">
      <div className="mx-auto grid max-w-7xl gap-5 px-4 py-5 sm:px-6 lg:px-8">
        <header className="flex flex-col gap-4 border-b border-zinc-200 pb-5 lg:flex-row lg:items-center lg:justify-between">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-lg border border-zinc-200 bg-white text-zinc-950">
              <GraduationCap size={22} aria-hidden="true" />
            </div>
            <div className="min-w-0">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-emerald-700">
                Local blockchain lab
              </p>
              <h1 className="truncate text-2xl font-semibold text-zinc-950 sm:text-3xl">
                StudentGrades DApp
              </h1>
            </div>
          </div>

          <div className="grid gap-2 sm:grid-cols-3 lg:flex lg:items-center">
            <button
              className={secondaryButtonClass}
              disabled={walletLoading}
              onClick={connectWallet}
              type="button"
            >
              {walletLoading ? (
                <Loader2 className="animate-spin" size={17} aria-hidden="true" />
              ) : (
                <Wallet size={17} aria-hidden="true" />
              )}
              <span className="truncate">
                {account ? formatAddress(account) : "Подключить MetaMask"}
              </span>
            </button>
            <button
              className={secondaryButtonClass}
              disabled={walletLoading}
              onClick={switchToHardhatNetwork}
              type="button"
            >
              <Network size={17} aria-hidden="true" />
              Hardhat Local
            </button>
            <button
              className={primaryButtonClass}
              disabled={loading}
              onClick={loadBlockchainData}
              type="button"
            >
              <RefreshCw
                className={loading ? "animate-spin" : undefined}
                size={17}
                aria-hidden="true"
              />
              Обновить
            </button>
          </div>
        </header>

        {notice ? (
          <NoticeBanner notice={notice} />
        ) : null}

        <section className="grid gap-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="rounded-lg border border-zinc-200 bg-white p-5 shadow-[0_1px_2px_rgba(24,24,27,0.04)] sm:p-6">
            <div className="grid gap-6 lg:grid-cols-[1fr_0.8fr] lg:items-end">
              <div>
                <div className="inline-flex items-center gap-2 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-1.5 text-sm font-medium text-emerald-800">
                  <Database size={15} aria-hidden="true" />
                  Solidity ledger
                </div>
                <h2 className="mt-5 max-w-2xl text-3xl font-semibold leading-tight text-zinc-950 sm:text-4xl">
                  Успеваемость студентов, сохраненная в локальном блокчейне.
                </h2>
                <p className="mt-4 max-w-2xl text-sm leading-6 text-zinc-600 sm:text-base">
                  Чтение идет напрямую из контракта, а запись доступна только
                  owner-аккаунту в сети Hardhat Local.
                </p>
              </div>

              <div className="grid gap-3">
                {readinessItems.map((item) => (
                  <ReadinessRow
                    key={item.label}
                    label={item.label}
                    ready={item.ready}
                    value={item.value}
                  />
                ))}
              </div>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3">
              <MetricCard label="Студенты" value={students.length.toString()} />
              <MetricCard label="Оценки" value={totalGrades.toString()} />
              <MetricCard label="Средний GPA" value={formatGpa(groupAverage)} />
            </div>
          </div>

          <div className={panelClass}>
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-zinc-950">Состояние сессии</p>
                <p className="mt-1 text-sm leading-6 text-zinc-500">
                  Последняя синхронизация: {formatSyncTime(lastSyncAt)}
                </p>
              </div>
              <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-zinc-950 text-white">
                <Clock3 size={18} aria-hidden="true" />
              </div>
            </div>

            <div className="mt-5 grid gap-3">
              <StatusLine
                icon={<Wallet size={17} aria-hidden="true" />}
                label="Аккаунт"
                value={formatAddress(account)}
                detail={account ?? "Кошелек еще не подключен"}
              />
              <StatusLine
                icon={<Network size={17} aria-hidden="true" />}
                label="Сеть"
                value={isHardhatNetwork ? "Hardhat Local" : chainId ?? "Не выбрана"}
                detail={`Нужен chainId ${HARDHAT_CHAIN_ID}`}
              />
              <StatusLine
                icon={<ShieldCheck size={17} aria-hidden="true" />}
                label="Owner"
                value={owner ? formatAddress(owner) : "Не загружен"}
                detail={isOwner ? "Запись разрешена" : "Режим чтения"}
              />
            </div>

            {lastTxHash ? (
              <div className="mt-5 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-zinc-500">
                  Последняя транзакция
                </p>
                <p className="mt-2 break-all font-mono text-xs leading-5 text-zinc-700">
                  {lastTxHash}
                </p>
              </div>
            ) : null}
          </div>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="grid gap-5">
            <section className={panelClass}>
              <SectionTitle
                icon={<Plus size={18} aria-hidden="true" />}
                title="Новый студент"
              />
              <form className="mt-5 grid gap-3" onSubmit={handleAddStudent}>
                <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
                  ФИО студента
                  <input
                    className={fieldClass}
                    disabled={!canMutate || studentSubmitting}
                    onChange={(event) =>
                      setStudentForm((current) => ({
                        ...current,
                        name: event.target.value,
                      }))
                    }
                    placeholder="Иван Кимран"
                    value={studentForm.name}
                  />
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
                  Email
                  <input
                    className={fieldClass}
                    disabled={!canMutate || studentSubmitting}
                    onChange={(event) =>
                      setStudentForm((current) => ({
                        ...current,
                        email: event.target.value,
                      }))
                    }
                    placeholder="student@alt.edu.kz"
                    type="email"
                    value={studentForm.email}
                  />
                </label>
                <button
                  className={primaryButtonClass}
                  disabled={!canMutate || studentSubmitting}
                  type="submit"
                >
                  {studentSubmitting ? (
                    <Loader2 className="animate-spin" size={17} aria-hidden="true" />
                  ) : (
                    <Database size={17} aria-hidden="true" />
                  )}
                  Записать в контракт
                </button>
                {!canMutate ? (
                  <p className="text-sm leading-6 text-zinc-500">
                    Для записи нужен MetaMask в сети Hardhat Local и owner-аккаунт,
                    который деплоил контракт.
                  </p>
                ) : null}
              </form>
            </section>

            <section className={panelClass}>
              <SectionTitle
                icon={<BookOpenCheck size={18} aria-hidden="true" />}
                title="Новая оценка"
              />
              <form className="mt-5 grid gap-3" onSubmit={handleAddGrade}>
                <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
                  Студент
                  <select
                    className={fieldClass}
                    disabled={!canMutate || gradeSubmitting || students.length === 0}
                    onChange={(event) => setSelectedStudentId(Number(event.target.value))}
                    value={selectedStudent?.id ?? ""}
                  >
                    {students.length === 0 ? (
                      <option value="">Нет студентов</option>
                    ) : (
                      students.map((student) => (
                        <option key={student.id} value={student.id}>
                          #{student.id} {student.name}
                        </option>
                      ))
                    )}
                  </select>
                </label>
                <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
                  Предмет
                  <input
                    className={fieldClass}
                    disabled={!canMutate || gradeSubmitting || students.length === 0}
                    onChange={(event) =>
                      setGradeForm((current) => ({
                        ...current,
                        subject: event.target.value,
                      }))
                    }
                    placeholder="Solidity"
                    value={gradeForm.subject}
                  />
                </label>
                <div className="grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
                  <label className="grid gap-1.5 text-sm font-medium text-zinc-700">
                    Оценка, 0-100
                    <input
                      className={fieldClass}
                      disabled={!canMutate || gradeSubmitting || students.length === 0}
                      max={100}
                      min={0}
                      onChange={(event) =>
                        setGradeForm((current) => ({
                          ...current,
                          score: event.target.value,
                        }))
                      }
                      type="number"
                      value={gradeForm.score}
                    />
                  </label>
                  <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-2.5 text-sm">
                    <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
                      GPA
                    </p>
                    <p className="mt-1 text-lg font-semibold text-zinc-950">
                      {scoreIsValid ? formatGpa(scoreValue) : "-"}
                    </p>
                  </div>
                </div>
                <button
                  className={primaryButtonClass}
                  disabled={!canMutate || gradeSubmitting || students.length === 0}
                  type="submit"
                >
                  {gradeSubmitting ? (
                    <Loader2 className="animate-spin" size={17} aria-hidden="true" />
                  ) : (
                    <Database size={17} aria-hidden="true" />
                  )}
                  Сохранить оценку
                </button>
              </form>
            </section>
          </div>

          <section className={panelClass}>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <SectionTitle
                icon={<GraduationCap size={18} aria-hidden="true" />}
                title="Журнал студентов"
              />
              <label className="relative block w-full sm:max-w-xs">
                <Search
                  className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-zinc-400"
                  aria-hidden="true"
                />
                <input
                  className={`${fieldClass} pl-9`}
                  onChange={(event) => setStudentQuery(event.target.value)}
                  placeholder="Поиск по имени, email или ID"
                  value={studentQuery}
                />
              </label>
            </div>

            <div className="mt-5 overflow-x-auto rounded-lg border border-zinc-200">
              <table className="w-full min-w-[620px] text-left text-sm">
                <thead className="bg-zinc-50 text-xs uppercase tracking-[0.08em] text-zinc-500">
                  <tr>
                    <th className="px-4 py-3 font-semibold">ID</th>
                    <th className="px-4 py-3 font-semibold">Студент</th>
                    <th className="px-4 py-3 font-semibold">Оценок</th>
                    <th className="px-4 py-3 font-semibold">Средний</th>
                    <th className="px-4 py-3 font-semibold">GPA</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-200">
                  {loading ? (
                    <TableMessage colSpan={5} text="Загрузка данных из контракта..." />
                  ) : students.length === 0 ? (
                    <TableMessage
                      colSpan={5}
                      text="Студентов пока нет. Добавьте первую запись через MetaMask."
                    />
                  ) : visibleStudents.length === 0 ? (
                    <TableMessage colSpan={5} text="По этому запросу ничего не найдено." />
                  ) : (
                    visibleStudents.map((student) => (
                      <tr
                        className={
                          selectedStudent?.id === student.id
                            ? "bg-emerald-50/70"
                            : "bg-white hover:bg-zinc-50"
                        }
                        key={student.id}
                      >
                        <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                          #{student.id}
                        </td>
                        <td className="px-4 py-3">
                          <button
                            className="max-w-[280px] text-left font-medium text-zinc-950 transition hover:text-emerald-700"
                            onClick={() => setSelectedStudentId(student.id)}
                            type="button"
                          >
                            <span className="block truncate">{student.name}</span>
                            <span className="block truncate text-xs font-normal text-zinc-500">
                              {student.email}
                            </span>
                          </button>
                        </td>
                        <td className="px-4 py-3 text-zinc-700">{student.gradeCount}</td>
                        <td className="px-4 py-3 text-zinc-700">{student.averageScore}</td>
                        <td className="px-4 py-3 font-semibold text-zinc-950">
                          {formatGpa(student.averageScore)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            <div className="mt-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <h3 className="text-base font-semibold text-zinc-950">
                    История оценок
                  </h3>
                  <p className="mt-1 text-sm text-zinc-500">
                    {selectedStudent
                      ? `${selectedStudent.name}, ID #${selectedStudent.id}`
                      : "Студент не выбран"}
                  </p>
                </div>
                {selectedStudent ? (
                  <div className="rounded-md bg-zinc-100 px-3 py-1.5 text-sm font-medium text-zinc-700">
                    {selectedStudent.gradeCount} записей
                  </div>
                ) : null}
              </div>

              <div className="mt-4 overflow-x-auto rounded-lg border border-zinc-200">
                <table className="w-full min-w-[620px] text-left text-sm">
                  <thead className="bg-zinc-50 text-xs uppercase tracking-[0.08em] text-zinc-500">
                    <tr>
                      <th className="px-4 py-3 font-semibold">Предмет</th>
                      <th className="px-4 py-3 font-semibold">Оценка</th>
                      <th className="px-4 py-3 font-semibold">Дата</th>
                      <th className="px-4 py-3 font-semibold">Teacher</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-200">
                    {!selectedStudent || selectedStudent.grades.length === 0 ? (
                      <TableMessage
                        colSpan={4}
                        text="Для выбранного студента еще нет оценок."
                      />
                    ) : (
                      selectedStudent.grades.map((grade, index) => (
                        <tr className="bg-white hover:bg-zinc-50" key={`${grade.subject}-${grade.timestamp}-${index}`}>
                          <td className="px-4 py-3 font-medium text-zinc-950">
                            {grade.subject}
                          </td>
                          <td className="px-4 py-3 text-zinc-700">{grade.score}</td>
                          <td className="px-4 py-3 text-zinc-500">
                            {formatDate(grade.timestamp)}
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-zinc-500">
                            {formatAddress(grade.teacher)}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </section>
        </section>

        <section className="grid gap-5 lg:grid-cols-[0.8fr_1.2fr]">
          <div className={panelClass}>
            <SectionTitle
              icon={<FileCode2 size={18} aria-hidden="true" />}
              title="Стек проекта"
            />
            <div className="mt-5 grid gap-3 sm:grid-cols-2 lg:grid-cols-1">
              {stackNotes.map((item) => (
                <div className="border-b border-zinc-200 pb-3 last:border-b-0 last:pb-0" key={item.title}>
                  <p className="text-sm font-semibold text-zinc-950">{item.title}</p>
                  <p className="mt-1 text-sm leading-6 text-zinc-500">{item.text}</p>
                </div>
              ))}
            </div>
          </div>

          <div className={panelClass}>
            <SectionTitle
              icon={<CheckCircle2 size={18} aria-hidden="true" />}
              title="Локальный запуск"
            />
            <div className="mt-5 grid gap-3 md:grid-cols-2">
              {setupSteps.map((step, index) => (
                <div
                  className="rounded-lg border border-zinc-200 bg-zinc-50 p-3"
                  key={step.title}
                >
                  <p className="text-sm font-semibold text-zinc-950">
                    {index + 1}. {step.title}
                  </p>
                  <code className="mt-2 block break-words rounded-md bg-white px-3 py-2 font-mono text-xs leading-5 text-zinc-700">
                    {step.command}
                  </code>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function NoticeBanner({ notice }: { notice: Notice }) {
  const toneClass =
    notice.tone === "success"
      ? "border-emerald-200 bg-emerald-50 text-emerald-900"
      : notice.tone === "warning"
        ? "border-amber-200 bg-amber-50 text-amber-900"
        : "border-red-200 bg-red-50 text-red-900";

  return (
    <div className={`rounded-lg border p-4 text-sm ${toneClass}`} role="status">
      <div className="flex gap-3">
        {notice.tone === "success" ? (
          <CheckCircle2 className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        ) : (
          <AlertCircle className="mt-0.5 size-5 shrink-0" aria-hidden="true" />
        )}
        <div>
          <p className="font-semibold">{notice.title}</p>
          <p className="mt-1 leading-6">{notice.message}</p>
        </div>
      </div>
    </div>
  );
}

function SectionTitle({ icon, title }: { icon: ReactNode; title: string }) {
  return (
    <div className="flex items-center gap-2 text-zinc-950">
      <span className="flex size-8 items-center justify-center rounded-md bg-zinc-100 text-zinc-700">
        {icon}
      </span>
      <h2 className="text-base font-semibold">{title}</h2>
    </div>
  );
}

function ReadinessRow({
  label,
  ready,
  value,
}: {
  label: string;
  ready: boolean;
  value: string;
}) {
  return (
    <div className="flex min-w-0 items-center justify-between gap-3 border-b border-zinc-200 pb-3 last:border-b-0 last:pb-0">
      <div className="min-w-0">
        <p className="text-sm font-medium text-zinc-500">{label}</p>
        <p className="mt-0.5 truncate text-sm font-semibold text-zinc-950">{value}</p>
      </div>
      <span
        className={`inline-flex shrink-0 items-center rounded-md px-2 py-1 text-xs font-semibold ${
          ready ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"
        }`}
      >
        {ready ? "OK" : "Нужно"}
      </span>
    </div>
  );
}

function StatusLine({
  detail,
  icon,
  label,
  value,
}: {
  detail: string;
  icon: ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex min-w-0 gap-3 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
      <div className="mt-0.5 text-zinc-500">{icon}</div>
      <div className="min-w-0">
        <p className="text-xs font-medium uppercase tracking-[0.12em] text-zinc-500">
          {label}
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-zinc-950">{value}</p>
        <p className="mt-1 truncate text-xs text-zinc-500">{detail}</p>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
      <p className="text-sm font-medium text-zinc-500">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-normal text-zinc-950">
        {value}
      </p>
    </div>
  );
}

function TableMessage({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <tr>
      <td className="px-4 py-10 text-center text-sm text-zinc-500" colSpan={colSpan}>
        {text}
      </td>
    </tr>
  );
}
