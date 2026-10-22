import { spawn, execFile } from 'node:child_process';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';
import { randomUUID } from 'node:crypto';
import { SupportedLanguage, SubmissionVerdict, SubmissionTestCaseResult } from './types';
import { evaluateTestOutput } from '../src/utils/scoring';

interface ExecutionResult {
  stdout: string;
  stderr: string;
  executionTimeMs: number;
  exitCode: number | null;
  timedOut: boolean;
}

export class CodeExecutor {
  private baseSandboxDir = path.join(os.tmpdir(), 'codebattle-sandboxes');

  constructor() {
    fs.mkdir(this.baseSandboxDir, { recursive: true }).catch(() => {});
  }

  /**
   * Compiles code if needed (for C, C++, Java)
   * Returns null on success, or compilation error message string on failure
   */
  private async compile(
    language: SupportedLanguage,
    workDir: string,
    sourceFileName: string,
    binaryName: string
  ): Promise<{ success: boolean; error?: string }> {
    if (language === 'python') {
      // Python syntax check
      return new Promise((resolve) => {
        execFile('python3', ['-m', 'py_compile', sourceFileName], { cwd: workDir, timeout: 5000 }, (err, stdout, stderr) => {
          if (err) {
            resolve({ success: false, error: stderr || stdout || 'Python syntax compilation error' });
          } else {
            resolve({ success: true });
          }
        });
      });
    }

    if (language === 'c') {
      return new Promise((resolve) => {
        execFile('gcc', ['-O2', '-w', sourceFileName, '-o', binaryName, '-lm'], { cwd: workDir, timeout: 8000 }, (err, stdout, stderr) => {
          if (err) {
            resolve({ success: false, error: stderr || stdout || 'C compilation failed' });
          } else {
            resolve({ success: true });
          }
        });
      });
    }

    if (language === 'cpp') {
      return new Promise((resolve) => {
        execFile('g++', ['-O2', '-w', '-std=c++17', sourceFileName, '-o', binaryName, '-lm'], { cwd: workDir, timeout: 10000 }, (err, stdout, stderr) => {
          if (err) {
            resolve({ success: false, error: stderr || stdout || 'C++ compilation failed' });
          } else {
            resolve({ success: true });
          }
        });
      });
    }

    if (language === 'java') {
      return new Promise((resolve) => {
        execFile('javac', [sourceFileName], { cwd: workDir, timeout: 12000 }, (err, stdout, stderr) => {
          if (err) {
            resolve({ success: false, error: stderr || stdout || 'Java compilation failed' });
          } else {
            resolve({ success: true });
          }
        });
      });
    }

    return { success: true };
  }

  /**
   * Executes binary/script with given input and timeout
   */
  private async runProcess(
    language: SupportedLanguage,
    workDir: string,
    binaryName: string,
    input: string,
    timeoutMs: number
  ): Promise<ExecutionResult> {
    return new Promise((resolve) => {
      let cmd: string;
      let args: string[];

      if (language === 'python') {
        cmd = 'python3';
        args = [binaryName];
      } else if (language === 'java') {
        // Run class file named Solution
        cmd = 'java';
        args = ['-Xmx256m', '-XX:+UseSerialGC', binaryName.replace('.class', '')];
      } else {
        // C or C++ binary executable
        cmd = path.join(workDir, binaryName);
        args = [];
      }

      const startTime = Date.now();
      let stdout = '';
      let stderr = '';
      let timedOut = false;
      let isDone = false;

      const child = spawn(cmd, args, {
        cwd: workDir,
        env: {
          PATH: process.env.PATH || '/usr/bin:/bin:/usr/local/bin',
          PYTHONUNBUFFERED: '1',
          LANG: 'en_US.UTF-8',
        },
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      const timer = setTimeout(() => {
        if (!isDone) {
          timedOut = true;
          isDone = true;
          try {
            child.kill('SIGKILL');
          } catch {}
          resolve({
            stdout,
            stderr: stderr + '\nExecution timed out (Time Limit Exceeded)',
            executionTimeMs: timeoutMs,
            exitCode: null,
            timedOut: true,
          });
        }
      }, timeoutMs);

      child.stdout.on('data', (data) => {
        if (stdout.length < 50000) {
          stdout += data.toString('utf-8');
        }
      });

      child.stderr.on('data', (data) => {
        if (stderr.length < 20000) {
          stderr += data.toString('utf-8');
        }
      });

      child.on('error', (err) => {
        if (!isDone) {
          clearTimeout(timer);
          isDone = true;
          resolve({
            stdout,
            stderr: stderr + '\nProcess error: ' + err.message,
            executionTimeMs: Date.now() - startTime,
            exitCode: 1,
            timedOut: false,
          });
        }
      });

      child.on('close', (code) => {
        if (!isDone) {
          clearTimeout(timer);
          isDone = true;
          resolve({
            stdout,
            stderr,
            executionTimeMs: Math.max(1, Date.now() - startTime),
            exitCode: code,
            timedOut,
          });
        }
      });

      // Write stdin and close
      try {
        if (input) {
          child.stdin.write(input);
        }
        child.stdin.end();
      } catch (err: any) {
        // ignore stdin pipe errors if child immediately closed
      }
    });
  }

  /**
   * Runs single execution with custom input
   */
  async runSingle(
    language: SupportedLanguage,
    code: string,
    input: string = '',
    timeoutMs: number = 3000
  ): Promise<{
    verdict: SubmissionVerdict;
    stdout: string;
    stderr: string;
    executionTimeMs: number;
    error?: string;
  }> {
    const sandboxId = randomUUID();
    const workDir = path.join(this.baseSandboxDir, sandboxId);
    await fs.mkdir(workDir, { recursive: true });

    try {
      let sourceFileName = 'solution.py';
      let binaryName = 'solution.py';

      if (language === 'c') {
        sourceFileName = 'solution.c';
        binaryName = 'solution_bin';
      } else if (language === 'cpp') {
        sourceFileName = 'solution.cpp';
        binaryName = 'solution_bin';
      } else if (language === 'java') {
        sourceFileName = 'Solution.java';
        binaryName = 'Solution';
      }

      await fs.writeFile(path.join(workDir, sourceFileName), code, 'utf-8');

      // Compile
      const compileRes = await this.compile(language, workDir, sourceFileName, binaryName);
      if (!compileRes.success) {
        return {
          verdict: 'COMPILATION_ERROR',
          stdout: '',
          stderr: compileRes.error || 'Compilation failed',
          executionTimeMs: 0,
          error: compileRes.error,
        };
      }

      // Execute
      const execRes = await this.runProcess(language, workDir, binaryName, input, timeoutMs);

      if (execRes.timedOut) {
        return {
          verdict: 'TIME_LIMIT_EXCEEDED',
          stdout: execRes.stdout,
          stderr: execRes.stderr,
          executionTimeMs: execRes.executionTimeMs,
          error: 'Time Limit Exceeded (> ' + timeoutMs + 'ms)',
        };
      }

      if (execRes.exitCode !== 0) {
        return {
          verdict: 'RUNTIME_ERROR',
          stdout: execRes.stdout,
          stderr: execRes.stderr,
          executionTimeMs: execRes.executionTimeMs,
          error: execRes.stderr || `Process exited with code ${execRes.exitCode}`,
        };
      }

      return {
        verdict: 'ACCEPTED',
        stdout: execRes.stdout,
        stderr: execRes.stderr,
        executionTimeMs: execRes.executionTimeMs,
      };
    } finally {
      // Clean up sandbox
      fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }

  /**
   * Evaluates code across a suite of test cases (for submit or run-all)
   */
  async evaluateTestCases(
    language: SupportedLanguage,
    code: string,
    testCases: Array<{
      input: string;
      expectedOutput: string;
      isPrivate: boolean;
      explanation?: string;
    }>,
    timeoutMs: number = 3000
  ): Promise<{
    results: SubmissionTestCaseResult[];
    overallVerdict: SubmissionVerdict;
    totalExecutionTimeMs: number;
    passedTestCases: number;
  }> {
    const sandboxId = randomUUID();
    const workDir = path.join(this.baseSandboxDir, sandboxId);
    await fs.mkdir(workDir, { recursive: true });

    try {
      let sourceFileName = 'solution.py';
      let binaryName = 'solution.py';

      if (language === 'c') {
        sourceFileName = 'solution.c';
        binaryName = 'solution_bin';
      } else if (language === 'cpp') {
        sourceFileName = 'solution.cpp';
        binaryName = 'solution_bin';
      } else if (language === 'java') {
        sourceFileName = 'Solution.java';
        binaryName = 'Solution';
      }

      await fs.writeFile(path.join(workDir, sourceFileName), code, 'utf-8');

      // Compile once for all test cases
      const compileRes = await this.compile(language, workDir, sourceFileName, binaryName);
      if (!compileRes.success) {
        const results: SubmissionTestCaseResult[] = testCases.map((tc, idx) => ({
          testCaseIndex: idx,
          status: 'COMPILATION_ERROR',
          executionTimeMs: 0,
          input: tc.isPrivate ? undefined : tc.input,
          expectedOutput: tc.isPrivate ? undefined : tc.expectedOutput,
          error: compileRes.error || 'Compilation Error',
          isPrivate: tc.isPrivate,
        }));

        return {
          results,
          overallVerdict: 'COMPILATION_ERROR',
          totalExecutionTimeMs: 0,
          passedTestCases: 0,
        };
      }

      const results: SubmissionTestCaseResult[] = [];
      let totalExecutionTimeMs = 0;
      let passedTestCases = 0;
      let firstFailureVerdict: SubmissionVerdict | null = null;

      for (let i = 0; i < testCases.length; i++) {
        const tc = testCases[i];
        const execRes = await this.runProcess(language, workDir, binaryName, tc.input, timeoutMs);
        totalExecutionTimeMs += execRes.executionTimeMs;

        let status: SubmissionVerdict = 'ACCEPTED';
        let errorMsg: string | undefined = undefined;

        if (execRes.timedOut) {
          status = 'TIME_LIMIT_EXCEEDED';
          errorMsg = `Time Limit Exceeded (> ${timeoutMs}ms)`;
        } else if (execRes.exitCode !== 0) {
          status = 'RUNTIME_ERROR';
          errorMsg = execRes.stderr || `Runtime Error (exit code ${execRes.exitCode})`;
        } else {
          const isCorrect = evaluateTestOutput(tc.expectedOutput, execRes.stdout);
          if (!isCorrect) {
            status = 'WRONG_ANSWER';
          }
        }

        if (status === 'ACCEPTED') {
          passedTestCases++;
        } else if (!firstFailureVerdict) {
          firstFailureVerdict = status;
        }

        results.push({
          testCaseIndex: i,
          status,
          executionTimeMs: execRes.executionTimeMs,
          input: tc.isPrivate ? undefined : tc.input,
          expectedOutput: tc.isPrivate ? undefined : tc.expectedOutput,
          actualOutput: tc.isPrivate ? undefined : execRes.stdout,
          error: tc.isPrivate && status === 'WRONG_ANSWER' ? 'Wrong answer on private test case' : errorMsg,
          isPrivate: tc.isPrivate,
        });
      }

      const overallVerdict: SubmissionVerdict =
        passedTestCases === testCases.length
          ? 'ACCEPTED'
          : (firstFailureVerdict || 'WRONG_ANSWER');

      return {
        results,
        overallVerdict,
        totalExecutionTimeMs,
        passedTestCases,
      };
    } finally {
      fs.rm(workDir, { recursive: true, force: true }).catch(() => {});
    }
  }
}

export const executor = new CodeExecutor();
