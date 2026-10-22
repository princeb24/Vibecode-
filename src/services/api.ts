export interface ApiResponse<T = any> {
  data?: T;
  error?: string;
  isTimeExpiredLocked?: boolean;
  currentQuestionId?: string;
}

class ApiService {
  private token: string | null = null;
  private onConnectionErrorCallback: ((hasError: boolean, msg?: string) => void) | null = null;

  constructor() {
    this.token = localStorage.getItem('cb_token');
  }

  setToken(token: string | null) {
    this.token = token;
    if (token) {
      localStorage.setItem('cb_token', token);
    } else {
      localStorage.removeItem('cb_token');
    }
  }

  getToken(): string | null {
    return this.token;
  }

  setConnectionErrorListener(cb: (hasError: boolean, msg?: string) => void) {
    this.onConnectionErrorCallback = cb;
  }

  async request<T = any>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    try {
      const response = await fetch(`/api${endpoint}`, {
        ...options,
        headers,
      });

      if (this.onConnectionErrorCallback) {
        this.onConnectionErrorCallback(false);
      }

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        const errorMsg = data.error || `Server returned error (${response.status})`;
        const errorObj: any = new Error(errorMsg);
        errorObj.status = response.status;
        errorObj.data = data;
        errorObj.isTimeExpiredLocked = data.isTimeExpiredLocked;
        errorObj.currentQuestionId = data.currentQuestionId;
        throw errorObj;
      }

      return data as T;
    } catch (err: any) {
      if (err.name === 'TypeError' && err.message.includes('fetch')) {
        if (this.onConnectionErrorCallback) {
          this.onConnectionErrorCallback(true, 'Cannot connect to Code Battle backend server. Please verify your connection.');
        }
      }
      throw err;
    }
  }

  // --- Auth ---
  login(username: string, password: string) {
    return this.request<{ token: string; user: any }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    });
  }

  register(username: string, email: string, name: string, password: string) {
    return this.request<{ token: string; user: any }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, name, password }),
    });
  }

  getMe() {
    return this.request<{ user: any }>('/auth/me');
  }

  // --- Competition ---
  getCompetition() {
    return this.request<{ competition: any; serverNow: string; currentQuestionRemainingSeconds: number }>('/competition');
  }

  updateCompetitionStatus(status: string) {
    return this.request<{ competition: any }>('/admin/competition/status', {
      method: 'POST',
      body: JSON.stringify({ status }),
    });
  }

  // Admin-only: add time to current program
  addTimeToCurrentQuestion(seconds: number) {
    return this.request<{ success: boolean; message: string; competition: any; currentQuestionRemainingSeconds: number }>('/admin/competition/add-time', {
      method: 'POST',
      body: JSON.stringify({ seconds }),
    });
  }

  // Admin-only: advance to next question
  advanceToNextQuestion() {
    return this.request<{ success: boolean; competition: any; currentQuestionRemainingSeconds: number }>('/admin/competition/advance-question', {
      method: 'POST',
    });
  }

  // Admin-only: start specific question with duration
  setQuestionTimer(questionId: string, durationMinutes: number) {
    return this.request<{ success: boolean; competition: any; currentQuestionRemainingSeconds: number }>('/admin/competition/set-question-timer', {
      method: 'POST',
      body: JSON.stringify({ questionId, durationMinutes }),
    });
  }

  // --- Questions ---
  getQuestions(all: boolean = false) {
    return this.request<{ questions: any[]; currentQuestionId: string }>(`/questions${all ? '?all=true' : ''}`);
  }

  getQuestion(idOrSlug: string) {
    return this.request<any>(`/questions/${idOrSlug}`);
  }

  createQuestion(data: any) {
    return this.request<{ question: any }>('/admin/questions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  updateQuestion(id: string, data: any) {
    return this.request<{ question: any }>(`/admin/questions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  deleteQuestion(id: string) {
    return this.request<{ success: boolean; message: string }>(`/admin/questions/${id}`, {
      method: 'DELETE',
    });
  }

  // --- Execution ---
  runCode(language: string, code: string, input?: string) {
    return this.request<{
      verdict: string;
      stdout: string;
      stderr: string;
      executionTimeMs: number;
      error?: string;
    }>('/execute/run', {
      method: 'POST',
      body: JSON.stringify({ language, code, input }),
    });
  }

  submitCode(questionId: string, language: string, code: string) {
    return this.request<{
      submission: any;
      message: string;
    }>('/execute/submit', {
      method: 'POST',
      body: JSON.stringify({ questionId, language, code }),
    });
  }

  // --- Submissions ---
  getSubmissions(params?: { questionId?: string; verdict?: string; userId?: string }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request<{ submissions: any[] }>(`/submissions${query ? `?${query}` : ''}`);
  }

  getSubmission(id: string) {
    return this.request<{ submission: any }>(`/submissions/${id}`);
  }

  // --- Leaderboard ---
  getLeaderboard() {
    return this.request<{ leaderboard: any[]; competition: any; lastUpdated: string }>('/leaderboard');
  }

  // --- Admin Players ---
  getPlayers() {
    return this.request<{ players: any[] }>('/admin/players');
  }

  togglePlayer(id: string) {
    return this.request<{ player: any }>(`/admin/players/${id}/toggle`, {
      method: 'POST',
    });
  }

  // --- Health Check ---
  checkHealth() {
    return this.request<{ status: string; timestamp: string }>('/health');
  }
}

export const api = new ApiService();
