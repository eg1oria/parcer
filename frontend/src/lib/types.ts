export type AuthUser = {
  id: string;
  email: string;
  createdAt?: string;
  updatedAt?: string;
};

export type AuthResponse = {
  accessToken: string;
  user: AuthUser;
};

export type ParseFormat =
  | "AUTO"
  | "STANDARD"
  | "PARENS_MARKERS"
  | "TAGGED_FIRST_CORRECT"
  | "FIRST_VARIANT_CORRECT";

export type UploadedFileSummary = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
};

export type ParsedVariant = {
  text: string;
  imageUrls?: string[];
  isCorrect: boolean;
};

export type ParsedQuestion = {
  text: string;
  imageUrls?: string[];
  variants: ParsedVariant[];
  warnings?: string[];
};

export type ImportQuestionPayload = {
  text: string;
  imageUrls?: string[];
  variants: ParsedVariant[];
};

export type ImportPreview = {
  file: UploadedFileSummary;
  title: string;
  format: ParseFormat;
  questionsFound: number;
  validQuestions: number;
  invalidQuestions: number;
  questions: ParsedQuestion[];
  warnings: string[];
};

export type ConfirmImportPayload = {
  title: string;
  sourceFileId?: string;
  questions: ImportQuestionPayload[];
};

export type ConfirmImportResponse = {
  testId: string;
  title: string;
  questionsCount: number;
};

export type SavedTestResponse = {
  testId: string;
  title: string;
  questionsCount: number;
};

export type SplitTestPayload = {
  questionsPerPart: number;
};

export type SplitTestResponse = {
  totalParts: number;
  createdTests: SavedTestResponse[];
};

export type TestListItem = {
  id: string;
  title: string;
  type: "SINGLE_CHOICE";
  createdAt: string;
  updatedAt: string;
  sourceFile: UploadedFileSummary | null;
  _count: {
    questions: number;
    attempts: number;
  };
};

export type LeaderboardEntry = {
  rank: number;
  id: string;
  name: string;
  score: number;
  total: number;
  percent: number;
  createdAt: string;
};

export type PublicTestSummary = {
  id: string;
  title: string;
  questionsCount: number;
  leaderboard: LeaderboardEntry[];
};

export type StartedVariant = {
  id: string;
  text: string;
  imageUrls: string[];
  order: number;
};

export type StartedQuestion = {
  id: string;
  text: string;
  imageUrls: string[];
  order: number;
  variants: StartedVariant[];
};

export type StartedTest = {
  id: string;
  title: string;
  questions: StartedQuestion[];
};

export type AnswerPayload = {
  questionId: string;
  variantId: string;
};

export type AnswerCheckResponse = {
  isCorrect: boolean;
  correctVariantId: string;
  correctVariantText: string;
};

export type FinishPayload = {
  answers: AnswerPayload[];
};

export type PublicFinishPayload = FinishPayload & {
  nickname: string;
};

export type FinishResponse = {
  attemptId?: string;
  score: number;
  total: number;
  percent: number;
};
