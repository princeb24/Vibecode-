/**
 * Scoring and competition evaluation logic for Code Battle
 */

export interface TestCaseResult {
  testCaseIndex: number;
  status: 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR';
  executionTimeMs: number;
  memoryKb?: number;
  input?: string;
  expectedOutput?: string;
  actualOutput?: string;
  error?: string;
  isPrivate: boolean;
}

export interface PlayerScoreSummary {
  userId: string;
  username: string;
  name: string;
  totalScore: number;
  problemsSolved: number;
  totalPenaltyMinutes: number;
  problemDetails: Record<string, {
    solved: boolean;
    points: number;
    attempts: number;
    solvedAtMinutes?: number;
    penaltyMinutes: number;
    status?: 'solved' | 'attempted' | 'unattempted' | 'expired';
  }>;
}

/**
 * Standard competitive programming penalty calculation (ICPC style):
 * penalty = time_of_accepted_submission_in_minutes + (20 * wrong_attempts_before_first_ac)
 */
export function calculatePenalty(solvedAtMinutes: number, wrongAttemptsBeforeAC: number): number {
  if (solvedAtMinutes < 0) return 0;
  return Math.round(solvedAtMinutes + (wrongAttemptsBeforeAC * 20));
}

/**
 * Normalizes code execution output for robust comparison:
 * - Trims leading and trailing whitespace
 * - Standardizes line breaks (\r\n -> \n)
 * - Trims trailing whitespace on each line
 */
export function normalizeOutput(raw: string): string {
  if (raw === null || raw === undefined) return '';
  return raw
    .replace(/\r\n/g, '\n')
    .replace(/\r/g, '\n')
    .split('\n')
    .map(line => line.trimEnd())
    .join('\n')
    .trim();
}

/**
 * Evaluates whether actual output matches expected output
 */
export function evaluateTestOutput(expected: string, actual: string): boolean {
  return normalizeOutput(expected) === normalizeOutput(actual);
}

/**
 * Calculates score for a submission based on test cases passed
 * If question gives full points only on all pass or proportional
 */
export function calculateSubmissionScore(
  totalPoints: number,
  results: TestCaseResult[],
  allowPartial: boolean = true
): { score: number; status: 'ACCEPTED' | 'WRONG_ANSWER' | 'TIME_LIMIT_EXCEEDED' | 'COMPILATION_ERROR' | 'RUNTIME_ERROR' } {
  if (!results || results.length === 0) {
    return { score: 0, status: 'RUNTIME_ERROR' };
  }

  const hasCompilationError = results.some(r => r.status === 'COMPILATION_ERROR');
  if (hasCompilationError) {
    return { score: 0, status: 'COMPILATION_ERROR' };
  }

  const passedCount = results.filter(r => r.status === 'ACCEPTED').length;
  const allPassed = passedCount === results.length;

  if (allPassed) {
    return { score: totalPoints, status: 'ACCEPTED' };
  }

  // Determine dominant failure status
  const firstFailure = results.find(r => r.status !== 'ACCEPTED');
  const failureStatus = firstFailure ? firstFailure.status : 'WRONG_ANSWER';

  if (!allowPartial) {
    return { score: 0, status: failureStatus };
  }

  // Proportional points for practice/friendly battles
  const proportional = Math.round((passedCount / results.length) * totalPoints);
  return { score: proportional, status: failureStatus };
}

/**
 * Formats duration in seconds to HH:MM:SS or MM:SS
 */
export function formatDuration(seconds: number): string {
  if (seconds <= 0) return '00:00';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  const pad = (n: number) => n.toString().padStart(2, '0');

  if (hrs > 0) {
    return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
  }
  return `${pad(mins)}:${pad(secs)}`;
}

/**
 * Computes leaderboard rankings with ties broken by lower penalty
 */
export function rankPlayers(summaries: PlayerScoreSummary[]): (PlayerScoreSummary & { rank: number })[] {
  const sorted = [...summaries].sort((a, b) => {
    // 1. Highest score first
    if (b.totalScore !== a.totalScore) {
      return b.totalScore - a.totalScore;
    }
    // 2. Highest problems solved
    if (b.problemsSolved !== a.problemsSolved) {
      return b.problemsSolved - a.problemsSolved;
    }
    // 3. Lowest penalty time
    return a.totalPenaltyMinutes - b.totalPenaltyMinutes;
  });

  return sorted.map((player, index) => ({
    ...player,
    rank: index + 1,
  }));
}
