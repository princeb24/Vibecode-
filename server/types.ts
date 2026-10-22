export type UserRole = 'admin' | 'player';

export interface User {
  id: string;
  username: string;
  email: string;
  name: string;
  role: UserRole;
  passwordHash: string;
  createdAt: string;
  disabled?: boolean;
}

export type SupportedLanguage = 'python' | 'c' | 'cpp' | 'java';

export interface TestCase {
  id: string;
  input: string;
  expectedOutput: string;
  isPrivate: boolean;
  explanation?: string;
  weight?: number;
}

export interface Question {
  id: string;
  slug: string;
  title: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  points: number;
  timeLimitMs: number;          // Per test case execution timeout (e.g. 3000ms)
  allocatedTimeMinutes: number; // Competition round time window set by admin (e.g. 10 mins)
  memoryLimitMb: number;
  description: string;
  inputFormat: string;
  outputFormat: string;
  constraints: string[];
  status: 'published' | 'draft' | 'archived';
  order: number;
  starterCode: {
    python: string;
    c: string;
    cpp: string;
    java: string;
  };
  solutionCode?: {
    python?: string;
    c?: string;
    cpp?: string;
    java?: string;
  };
  testCases: TestCase[];
  createdAt: string;
  updatedAt: string;
}

export type SubmissionVerdict =
  | 'ACCEPTED'
  | 'WRONG_ANSWER'
  | 'TIME_LIMIT_EXCEEDED'
  | 'COMPILATION_ERROR'
  | 'RUNTIME_ERROR'
  | 'TIME_OVER_LOCKED'
  | 'PENDING';

export interface SubmissionTestCaseResult {
  testCaseIndex: number;
  status: SubmissionVerdict;
  executionTimeMs: number;
  memoryKb?: number;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  error?: string;
  isPrivate: boolean;
}

export interface Submission {
  id: string;
  competitionId: string;
  userId: string;
  username: string;
  userDisplayName: string;
  questionId: string;
  questionTitle: string;
  language: SupportedLanguage;
  code: string;
  verdict: SubmissionVerdict;
  score: number;
  totalPoints: number;
  passedTestCases: number;
  totalTestCases: number;
  executionTimeMs: number;
  results: SubmissionTestCaseResult[];
  submittedAt: string;
  competitionMinute: number;
}

export type CompetitionStatus = 'scheduled' | 'active' | 'paused' | 'ended';

export interface Competition {
  id: string;
  title: string;
  description: string;
  status: CompetitionStatus;
  durationMinutes: number;
  startTime: string; // ISO string
  endTime: string;   // ISO string
  pausedRemainingSeconds?: number;
  freezeMinutesBeforeEnd: number;
  isFrozen: boolean;

  // Question sequential progression & per-program timer set ONLY by admin
  currentQuestionId: string;
  currentQuestionIndex: number;
  currentQuestionStartTime: string;
  currentQuestionDurationSeconds: number;
  currentQuestionEndTime: string;
  autoAdvanceOnTimeOver: boolean;

  createdAt: string;
}

export interface LeaderboardProblemStat {
  solved: boolean;
  points: number;
  attempts: number;
  solvedAtMinutes?: number;
  penaltyMinutes: number;
  status: 'solved' | 'attempted' | 'unattempted' | 'expired';
}

export interface LeaderboardRow {
  rank: number;
  userId: string;
  username: string;
  name: string;
  totalScore: number;
  problemsSolved: number;
  totalPenaltyMinutes: number;
  problemStats: Record<string, LeaderboardProblemStat>;
  lastSubmissionTime?: string;
}
