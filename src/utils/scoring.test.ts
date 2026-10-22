import test from 'node:test';
import assert from 'node:assert/strict';
import {
  calculatePenalty,
  normalizeOutput,
  evaluateTestOutput,
  calculateSubmissionScore,
  formatDuration,
  rankPlayers,
  PlayerScoreSummary,
  TestCaseResult,
} from './scoring';

test('calculatePenalty calculates standard penalty accurately', () => {
  // AC at 15 minutes with 0 wrong attempts
  assert.equal(calculatePenalty(15, 0), 15);

  // AC at 25 minutes with 2 wrong attempts: 25 + 2 * 20 = 65
  assert.equal(calculatePenalty(25, 2), 65);

  // Negative time clamp
  assert.equal(calculatePenalty(-5, 0), 0);
});

test('normalizeOutput handles trailing whitespace, CRLF, and empty spaces', () => {
  const output1 = 'Hello World  \r\n';
  const output2 = 'Hello World\n';
  assert.equal(normalizeOutput(output1), 'Hello World');
  assert.equal(normalizeOutput(output2), 'Hello World');
  assert.equal(evaluateTestOutput(output1, output2), true);

  const multilineExpected = '1 2 3\n4 5 6  \r\n';
  const multilineActual = '1 2 3 \n4 5 6\n';
  assert.equal(evaluateTestOutput(multilineExpected, multilineActual), true);
});

test('calculateSubmissionScore handles all passed, partial pass, and compilation error', () => {
  const acResults: TestCaseResult[] = [
    { testCaseIndex: 0, status: 'ACCEPTED', executionTimeMs: 12, isPrivate: false },
    { testCaseIndex: 1, status: 'ACCEPTED', executionTimeMs: 15, isPrivate: true },
  ];
  const acScore = calculateSubmissionScore(100, acResults);
  assert.equal(acScore.score, 100);
  assert.equal(acScore.status, 'ACCEPTED');

  const partialResults: TestCaseResult[] = [
    { testCaseIndex: 0, status: 'ACCEPTED', executionTimeMs: 10, isPrivate: false },
    { testCaseIndex: 1, status: 'WRONG_ANSWER', executionTimeMs: 14, isPrivate: true },
  ];
  const partialScore = calculateSubmissionScore(100, partialResults, true);
  assert.equal(partialScore.score, 50);
  assert.equal(partialScore.status, 'WRONG_ANSWER');

  const compileErrorResults: TestCaseResult[] = [
    { testCaseIndex: 0, status: 'COMPILATION_ERROR', executionTimeMs: 0, isPrivate: false, error: 'syntax error' },
  ];
  const ceScore = calculateSubmissionScore(100, compileErrorResults);
  assert.equal(ceScore.score, 0);
  assert.equal(ceScore.status, 'COMPILATION_ERROR');
});

test('formatDuration formats HH:MM:SS and MM:SS correctly', () => {
  assert.equal(formatDuration(0), '00:00');
  assert.equal(formatDuration(65), '01:05');
  assert.equal(formatDuration(3665), '01:01:05');
});

test('rankPlayers sorts by total score, then solved count, then penalty minutes', () => {
  const players: PlayerScoreSummary[] = [
    {
      userId: '1',
      username: 'alice',
      name: 'Alice',
      totalScore: 200,
      problemsSolved: 2,
      totalPenaltyMinutes: 60,
      problemDetails: {},
    },
    {
      userId: '2',
      username: 'bob',
      name: 'Bob',
      totalScore: 200,
      problemsSolved: 2,
      totalPenaltyMinutes: 45, // Bob has lower penalty, should rank higher
      problemDetails: {},
    },
    {
      userId: '3',
      username: 'charlie',
      name: 'Charlie',
      totalScore: 300, // Highest score, should rank 1st
      problemsSolved: 3,
      totalPenaltyMinutes: 110,
      problemDetails: {},
    },
  ];

  const ranked = rankPlayers(players);
  assert.equal(ranked[0].username, 'charlie');
  assert.equal(ranked[0].rank, 1);
  assert.equal(ranked[1].username, 'bob');
  assert.equal(ranked[1].rank, 2);
  assert.equal(ranked[2].username, 'alice');
  assert.equal(ranked[2].rank, 3);
});
