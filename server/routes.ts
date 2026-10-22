import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { randomUUID } from 'node:crypto';
import { db } from './db';
import { executor } from './executor';
import { User, SupportedLanguage, Submission, Question } from './types';
import { calculateSubmissionScore } from '../src/utils/scoring';

const JWT_SECRET = process.env.JWT_SECRET || 'codebattle-super-secret-jwt-key-2026';

export const apiRouter = Router();

// --- Auth Middleware ---
export interface AuthRequest extends Request {
  user?: User;
}

export function authenticate(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Authentication token missing or invalid' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const payload = jwt.verify(token, JWT_SECRET) as { userId: string };
    const user = db.getUserById(payload.userId);
    if (!user || user.disabled) {
      return res.status(401).json({ error: 'User not found or disabled' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ error: 'Invalid or expired session token' });
  }
}

export function requireAdmin(req: AuthRequest, res: Response, next: NextFunction) {
  if (!req.user || req.user.role !== 'admin') {
    return res.status(403).json({ error: 'Admin authorization required. Access denied.' });
  }
  next();
}

// --- Health ---
apiRouter.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'Code Battle Arena API',
    adminActive: true,
  });
});

// --- Auth Routes ---
apiRouter.post('/auth/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.getUserByUsername(username.trim());
  if (!user) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  const isValid = bcrypt.compareSync(password, user.passwordHash);
  if (!isValid) {
    return res.status(401).json({ error: 'Invalid username or password' });
  }

  if (user.disabled) {
    return res.status(403).json({ error: 'This account has been disabled by the administrator' });
  }

  const token = jwt.sign({ userId: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });

  res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      name: user.name,
      email: user.email,
      role: user.role,
    },
  });
});

apiRouter.post('/auth/register', (req, res) => {
  const { username, email, name, password } = req.body;
  if (!username || !email || !name || !password) {
    return res.status(400).json({ error: 'All fields (username, email, name, password) are required' });
  }

  const cleanUsername = username.trim();
  const cleanEmail = email.trim();

  if (cleanUsername.toUpperCase() === 'BLACKDRAGON') {
    return res.status(400).json({ error: 'The username BLACKDRAGON is reserved for the administrator' });
  }

  if (db.getUserByUsername(cleanUsername)) {
    return res.status(400).json({ error: 'Username is already taken' });
  }

  if (db.getUserByEmail(cleanEmail)) {
    return res.status(400).json({ error: 'Email is already registered' });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters long' });
  }

  const salt = bcrypt.genSaltSync(10);
  const passwordHash = bcrypt.hashSync(password, salt);

  const newUser: User = {
    id: `usr-${randomUUID()}`,
    username: cleanUsername,
    email: cleanEmail,
    name: name.trim(),
    role: 'player',
    passwordHash,
    createdAt: new Date().toISOString(),
  };

  db.addUser(newUser);

  const token = jwt.sign({ userId: newUser.id, role: newUser.role }, JWT_SECRET, { expiresIn: '7d' });

  res.status(201).json({
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      name: newUser.name,
      email: newUser.email,
      role: newUser.role,
    },
  });
});

apiRouter.get('/auth/me', authenticate, (req: AuthRequest, res) => {
  res.json({
    user: {
      id: req.user!.id,
      username: req.user!.username,
      name: req.user!.name,
      email: req.user!.email,
      role: req.user!.role,
    },
  });
});

// --- Competition & Per-Question Timer Control Routes ---
apiRouter.get('/competition', (req, res) => {
  const comp = db.getCompetition();
  const now = Date.now();
  const endMs = new Date(comp.currentQuestionEndTime).getTime();
  const remainingSeconds = Math.max(0, Math.floor((endMs - now) / 1000));

  res.json({
    competition: comp,
    serverNow: new Date().toISOString(),
    currentQuestionRemainingSeconds: remainingSeconds,
  });
});

apiRouter.post('/admin/competition/status', authenticate, requireAdmin, (req: AuthRequest, res) => {
  const { status, title, description, durationMinutes } = req.body;
  const updates: any = {};
  if (status) updates.status = status;
  if (title) updates.title = title;
  if (description) updates.description = description;
  if (durationMinutes) updates.durationMinutes = durationMinutes;

  const comp = db.updateCompetition(updates);
  res.json({ competition: comp });
});

/**
 * CRITICAL REQUIREMENT:
 * "for every code there should be a time the time should be only add by the admin
 * if the time over the next program should execute the previous program should not work if the time gets over"
 */
apiRouter.post('/admin/competition/add-time', authenticate, requireAdmin, (req: AuthRequest, res) => {
  const { seconds } = req.body;
  const extraSec = parseInt(seconds, 10);
  if (isNaN(extraSec) || extraSec <= 0) {
    return res.status(400).json({ error: 'Valid positive number of seconds to add is required' });
  }

  const comp = db.addTimeToCurrentQuestion(extraSec);
  const now = Date.now();
  const endMs = new Date(comp.currentQuestionEndTime).getTime();
  const remainingSeconds = Math.max(0, Math.floor((endMs - now) / 1000));

  res.json({
    success: true,
    message: `Added ${extraSec} seconds to the current program timer.`,
    competition: comp,
    currentQuestionRemainingSeconds: remainingSeconds,
  });
});

apiRouter.post('/admin/competition/advance-question', authenticate, requireAdmin, (req: AuthRequest, res) => {
  const comp = db.advanceToNextQuestion();
  const now = Date.now();
  const endMs = new Date(comp.currentQuestionEndTime).getTime();
  const remainingSeconds = Math.max(0, Math.floor((endMs - now) / 1000));

  res.json({
    success: true,
    message: 'Advanced arena to the next program.',
    competition: comp,
    currentQuestionRemainingSeconds: remainingSeconds,
  });
});

apiRouter.post('/admin/competition/set-question-timer', authenticate, requireAdmin, (req: AuthRequest, res) => {
  const { questionId, durationMinutes } = req.body;
  if (!questionId) {
    return res.status(400).json({ error: 'questionId is required' });
  }
  const minutes = parseInt(durationMinutes, 10) || 10;
  const comp = db.startQuestion(questionId, minutes);
  const now = Date.now();
  const endMs = new Date(comp.currentQuestionEndTime).getTime();
  const remainingSeconds = Math.max(0, Math.floor((endMs - now) / 1000));

  res.json({
    success: true,
    competition: comp,
    currentQuestionRemainingSeconds: remainingSeconds,
  });
});

// --- Questions Routes ---
apiRouter.get('/questions', (req, res) => {
  const includeDrafts = req.query.all === 'true';
  const questions = db.getQuestions(includeDrafts);
  const comp = db.getCompetition();
  const questionsPublished = db.getQuestions(false);
  const currentIdx = questionsPublished.findIndex(q => q.id === comp.currentQuestionId);

  // Return list with active/locked status for each question
  const sanitized = questions.map((q, idx) => {
    const isPast = idx < currentIdx;
    const isActive = q.id === comp.currentQuestionId;
    const isUpcoming = idx > currentIdx;

    return {
      id: q.id,
      slug: q.slug,
      title: q.title,
      difficulty: q.difficulty,
      category: q.category,
      points: q.points,
      allocatedTimeMinutes: q.allocatedTimeMinutes,
      status: q.status,
      order: q.order,
      isCurrentActive: isActive,
      isTimeExpiredLocked: isPast,
      isUpcoming: isUpcoming,
      exampleTestCasesCount: q.testCases.filter(tc => !tc.isPrivate).length,
      totalTestCasesCount: q.testCases.length,
    };
  });

  res.json({ questions: sanitized, currentQuestionId: comp.currentQuestionId });
});

apiRouter.get('/questions/:idOrSlug', (req, res) => {
  const idOrSlug = req.params.idOrSlug;
  const q = db.getQuestionById(idOrSlug) || db.getQuestionBySlug(idOrSlug);
  if (!q) {
    return res.status(404).json({ error: 'Question not found' });
  }

  const comp = db.getCompetition();
  const questionsPublished = db.getQuestions(false);
  const currentIdx = questionsPublished.findIndex(item => item.id === comp.currentQuestionId);
  const thisIdx = questionsPublished.findIndex(item => item.id === q.id);

  const isTimeExpiredLocked = thisIdx >= 0 && thisIdx < currentIdx;
  const isCurrentActive = q.id === comp.currentQuestionId;
  const isUpcoming = thisIdx > currentIdx;

  // Filter test cases: ONLY reveal non-private (example) test cases
  const publicTestCases = q.testCases.filter(tc => !tc.isPrivate);

  res.json({
    ...q,
    testCases: publicTestCases,
    isCurrentActive,
    isTimeExpiredLocked,
    isUpcoming,
    currentQuestionId: comp.currentQuestionId,
  });
});

// Admin Question Management
apiRouter.post('/admin/questions', authenticate, requireAdmin, (req: AuthRequest, res) => {
  const {
    title,
    difficulty,
    category,
    points,
    timeLimitMs,
    allocatedTimeMinutes,
    description,
    inputFormat,
    outputFormat,
    constraints,
    starterCode,
    solutionCode,
    testCases,
    status,
  } = req.body;

  if (!title || !description) {
    return res.status(400).json({ error: 'Title and description are required' });
  }

  const currentQuestions = db.getQuestions(true);
  const newQuestion: Question = {
    id: `q-${randomUUID().slice(0, 8)}`,
    slug: title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''),
    title: title.trim(),
    difficulty: difficulty || 'Medium',
    category: category || 'Algorithms',
    points: parseInt(points, 10) || 100,
    timeLimitMs: parseInt(timeLimitMs, 10) || 3000,
    allocatedTimeMinutes: parseInt(allocatedTimeMinutes, 10) || 10,
    memoryLimitMb: 128,
    description: description.trim(),
    inputFormat: inputFormat || '',
    outputFormat: outputFormat || '',
    constraints: Array.isArray(constraints) ? constraints : (constraints ? [constraints] : []),
    status: status || 'published',
    order: currentQuestions.length + 1,
    starterCode: starterCode || {
      python: '# Write your code here\nimport sys\n',
      c: '#include <stdio.h>\nint main() {\n    return 0;\n}\n',
      cpp: '#include <iostream>\nusing namespace std;\nint main() {\n    return 0;\n}\n',
      java: 'import java.util.*;\npublic class Solution {\n    public static void main(String[] args) {\n    }\n}\n',
    },
    solutionCode,
    testCases: Array.isArray(testCases) ? testCases : [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  db.addQuestion(newQuestion);
  res.status(201).json({ question: newQuestion });
});

apiRouter.put('/admin/questions/:id', authenticate, requireAdmin, (req: AuthRequest, res) => {
  const id = req.params.id;
  const updated = db.updateQuestion(id, req.body);
  if (!updated) {
    return res.status(404).json({ error: 'Question not found' });
  }
  res.json({ question: updated });
});

apiRouter.delete('/admin/questions/:id', authenticate, requireAdmin, (req: AuthRequest, res) => {
  const id = req.params.id;
  const ok = db.deleteQuestion(id);
  if (!ok) {
    return res.status(404).json({ error: 'Question not found' });
  }
  res.json({ success: true, message: 'Question deleted successfully' });
});

// --- Code Execution: Run (Testing with custom/example input) ---
apiRouter.post('/execute/run', authenticate, async (req: AuthRequest, res) => {
  const { language, code, input, timeoutMs } = req.body;
  if (!language || !code) {
    return res.status(400).json({ error: 'Language and code are required' });
  }

  const validLangs: SupportedLanguage[] = ['python', 'c', 'cpp', 'java'];
  if (!validLangs.includes(language)) {
    return res.status(400).json({ error: `Unsupported language: ${language}. Must be one of: python, c, cpp, java` });
  }

  try {
    const result = await executor.runSingle(
      language,
      code,
      input || '',
      Math.min(timeoutMs || 4000, 8000)
    );
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: 'Execution failed', details: err.message });
  }
});

// --- Code Execution: Submit (Evaluate against private test cases & enforce per-program time limit!) ---
apiRouter.post('/execute/submit', authenticate, async (req: AuthRequest, res) => {
  const { questionId, language, code } = req.body;
  if (!questionId || !language || !code) {
    return res.status(400).json({ error: 'Question ID, language, and code are required' });
  }

  const validLangs: SupportedLanguage[] = ['python', 'c', 'cpp', 'java'];
  if (!validLangs.includes(language)) {
    return res.status(400).json({ error: `Unsupported language: ${language}` });
  }

  const question = db.getQuestionById(questionId);
  if (!question) {
    return res.status(404).json({ error: 'Question not found' });
  }

  /**
   * CRITICAL CHECK:
   * "if the time over the next program should execute the previous program should not work if the time gets over"
   */
  const activeCheck = db.isQuestionActiveForSubmissions(questionId);
  if (!activeCheck.active) {
    return res.status(403).json({
      error: activeCheck.reason || 'This program is locked. Submissions are closed.',
      isTimeExpiredLocked: true,
      currentQuestionId: db.getCompetition().currentQuestionId,
    });
  }

  try {
    // Run against ALL test cases (both public and private)
    const evalResult = await executor.evaluateTestCases(
      language,
      code,
      question.testCases,
      question.timeLimitMs || 3000
    );

    const comp = db.getCompetition();
    const compStartMs = new Date(comp.startTime).getTime();
    const now = Date.now();
    const compMinute = Math.max(0, Math.floor((now - compStartMs) / (60 * 1000)));

    const scoreSummary = calculateSubmissionScore(
      question.points,
      evalResult.results as any,
      true
    );

    const submission: Submission = {
      id: `sub-${randomUUID().slice(0, 8)}`,
      competitionId: comp.id,
      userId: req.user!.id,
      username: req.user!.username,
      userDisplayName: req.user!.name,
      questionId: question.id,
      questionTitle: question.title,
      language,
      code,
      verdict: evalResult.overallVerdict,
      score: scoreSummary.score,
      totalPoints: question.points,
      passedTestCases: evalResult.passedTestCases,
      totalTestCases: question.testCases.length,
      executionTimeMs: evalResult.totalExecutionTimeMs,
      results: evalResult.results,
      submittedAt: new Date().toISOString(),
      competitionMinute: compMinute,
    };

    db.addSubmission(submission);

    res.json({
      submission,
      message:
        evalResult.overallVerdict === 'ACCEPTED'
          ? 'Congratulations! All test cases passed!'
          : `Submission evaluated: ${evalResult.overallVerdict}. Passed ${evalResult.passedTestCases}/${question.testCases.length} test cases.`,
    });
  } catch (err: any) {
    res.status(500).json({ error: 'Evaluation failed', details: err.message });
  }
});

// --- Submissions ---
apiRouter.get('/submissions', authenticate, (req: AuthRequest, res) => {
  const { questionId, verdict } = req.query;
  const filter: any = {};
  if (questionId) filter.questionId = String(questionId);
  if (verdict) filter.verdict = String(verdict);

  // Players can only see their own submissions; Admins can view all or filter by user
  if (req.user!.role === 'player') {
    filter.userId = req.user!.id;
  } else if (req.query.userId) {
    filter.userId = String(req.query.userId);
  }

  const list = db.getSubmissions(filter);
  res.json({ submissions: list });
});

apiRouter.get('/submissions/:id', authenticate, (req: AuthRequest, res) => {
  const sub = db.getSubmissionById(req.params.id);
  if (!sub) {
    return res.status(404).json({ error: 'Submission not found' });
  }

  // Ensure players cannot inspect other players' code
  if (req.user!.role === 'player' && sub.userId !== req.user!.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  res.json({ submission: sub });
});

// --- Leaderboard ---
apiRouter.get('/leaderboard', (req, res) => {
  const leaderboard = db.getLeaderboard();
  const comp = db.getCompetition();
  res.json({
    leaderboard,
    competition: comp,
    lastUpdated: new Date().toISOString(),
  });
});

// --- Admin: Players Management ---
apiRouter.get('/admin/players', authenticate, requireAdmin, (req: AuthRequest, res) => {
  const players = db.getUsers().filter(u => u.role === 'player');
  const submissions = db.getSubmissions();

  const playerStats = players.map(p => {
    const userSubs = submissions.filter(s => s.userId === p.id);
    const acceptedCount = userSubs.filter(s => s.verdict === 'ACCEPTED').length;
    return {
      ...p,
      totalSubmissions: userSubs.length,
      acceptedSubmissions: acceptedCount,
      lastActive: userSubs[0]?.submittedAt || p.createdAt,
    };
  });

  res.json({ players: playerStats });
});

apiRouter.post('/admin/players/:id/toggle', authenticate, requireAdmin, (req: AuthRequest, res) => {
  const user = db.getUserById(req.params.id);
  if (!user) {
    return res.status(404).json({ error: 'Player not found' });
  }
  const updated = db.updateUser(user.id, { disabled: !user.disabled });
  res.json({ player: updated });
});

// --- Admin: CSV Exports ---
apiRouter.get('/admin/export/leaderboard', authenticate, requireAdmin, (req: AuthRequest, res) => {
  const leaderboard = db.getLeaderboard();
  const questions = db.getQuestions(false);

  let csv = 'Rank,Username,Name,Total Score,Problems Solved,Total Penalty (mins)';
  questions.forEach(q => {
    csv += `,"${q.title.replace(/"/g, '""')} (Pts/Tries)"`;
  });
  csv += '\n';

  leaderboard.forEach(row => {
    csv += `${row.rank},"${row.username}","${row.name}",${row.totalScore},${row.problemsSolved},${row.totalPenaltyMinutes}`;
    questions.forEach(q => {
      const pStat = row.problemStats[q.id];
      if (pStat) {
        csv += `,"${pStat.points}pts (${pStat.attempts} tries - ${pStat.status})"`;
      } else {
        csv += ',"-"';
      }
    });
    csv += '\n';
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="codebattle_leaderboard.csv"');
  res.send(csv);
});

apiRouter.get('/admin/export/submissions', authenticate, requireAdmin, (req: AuthRequest, res) => {
  const submissions = db.getSubmissions();

  let csv = 'Submission ID,Username,Question,Language,Verdict,Score,Passed Tests,Total Tests,Execution Time (ms),Timestamp\n';
  submissions.forEach(s => {
    csv += `"${s.id}","${s.username}","${s.questionTitle.replace(/"/g, '""')}","${s.language}","${s.verdict}",${s.score},${s.passedTestCases},${s.totalTestCases},${s.executionTimeMs},"${s.submittedAt}"\n`;
  });

  res.setHeader('Content-Type', 'text/csv');
  res.setHeader('Content-Disposition', 'attachment; filename="codebattle_submissions.csv"');
  res.send(csv);
});
