import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import {
  Code2,
  Plus,
  Trash2,
  Edit3,
  Clock,
  CheckCircle2,
  AlertCircle,
  Play,
  Lock,
  X,
  Save,
} from 'lucide-react';

export const AdminQuestionsView: React.FC = () => {
  const [questions, setQuestions] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [editingQ, setEditingQ] = useState<any | null>(null);
  const [isCreating, setIsCreating] = useState<boolean>(false);

  // New question form state
  const [formData, setFormData] = useState<any>({
    title: '',
    difficulty: 'Medium',
    category: 'Algorithms',
    points: 100,
    allocatedTimeMinutes: 10,
    timeLimitMs: 3000,
    description: '',
    inputFormat: '',
    outputFormat: '',
    constraints: '1 <= N <= 10^5',
    testCasesInput: '5\n1 2 3 4 5',
    testCasesOutput: '15',
  });

  const fetchQuestions = async () => {
    try {
      const res = await api.getQuestions(true);
      setQuestions(res.questions);
    } catch (err) {
      console.error('Failed to load questions:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this question?')) return;
    try {
      await api.deleteQuestion(id);
      fetchQuestions();
    } catch (err: any) {
      alert(err.message || 'Failed to delete question');
    }
  };

  const handleStartQuestion = async (qId: string, durationMins: number) => {
    if (!confirm(`Start this question now with ${durationMins} minutes allocated?`)) return;
    try {
      await api.setQuestionTimer(qId, durationMins);
      alert('Question timer started in Arena!');
      fetchQuestions();
    } catch (err: any) {
      alert(err.message || 'Failed to start question');
    }
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title || !formData.description) {
      alert('Please fill in title and description');
      return;
    }

    try {
      await api.createQuestion({
        title: formData.title,
        difficulty: formData.difficulty,
        category: formData.category,
        points: parseInt(formData.points, 10) || 100,
        allocatedTimeMinutes: parseInt(formData.allocatedTimeMinutes, 10) || 10,
        timeLimitMs: parseInt(formData.timeLimitMs, 10) || 3000,
        description: formData.description,
        inputFormat: formData.inputFormat,
        outputFormat: formData.outputFormat,
        constraints: formData.constraints.split('\n').filter(Boolean),
        testCases: [
          {
            id: 'tc-new-1',
            input: formData.testCasesInput,
            expectedOutput: formData.testCasesOutput,
            isPrivate: false,
            explanation: 'Sample test case',
          },
          {
            id: 'tc-new-2',
            input: formData.testCasesInput,
            expectedOutput: formData.testCasesOutput,
            isPrivate: true,
          },
        ],
      });

      setIsCreating(false);
      fetchQuestions();
      alert('New program created successfully with allocated time!');
    } catch (err: any) {
      alert(err.message || 'Failed to create question');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-white flex items-center space-x-2">
            <Code2 className="w-7 h-7 text-amber-400" />
            <span>Manage Tournament Questions</span>
          </h1>
          <p className="text-sm text-zinc-400 mt-1">
            Configure challenge statements, starter code, test suites, and allocated time limits per program.
          </p>
        </div>

        <button
          onClick={() => setIsCreating(true)}
          className="flex items-center space-x-1.5 px-4 py-2 bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-black font-bold rounded-xl text-xs shadow-lg transition"
        >
          <Plus className="w-4 h-4" />
          <span>Create New Problem</span>
        </button>
      </div>

      {/* Questions List Table */}
      <div className="bg-zinc-900 border border-zinc-800 rounded-2xl overflow-hidden shadow-2xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-zinc-300">
            <thead className="bg-zinc-950/80 text-xs font-mono text-zinc-400 uppercase tracking-wider border-b border-zinc-800">
              <tr>
                <th scope="col" className="px-6 py-3 w-16">
                  #
                </th>
                <th scope="col" className="px-6 py-3">
                  Title
                </th>
                <th scope="col" className="px-4 py-3">
                  Difficulty
                </th>
                <th scope="col" className="px-4 py-3">
                  Category
                </th>
                <th scope="col" className="px-4 py-3 text-right">
                  Points
                </th>
                <th scope="col" className="px-4 py-3 text-center">
                  Allocated Time
                </th>
                <th scope="col" className="px-6 py-3 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 font-mono text-xs">
              {questions.map((q, idx) => (
                <tr key={q.id} className="hover:bg-zinc-800/40 transition">
                  <td className="px-6 py-4 font-bold text-zinc-400">
                    {idx + 1}
                  </td>

                  <td className="px-6 py-4 font-sans font-bold text-white text-sm">
                    {q.title}
                  </td>

                  <td className="px-4 py-4">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] font-semibold ${
                        q.difficulty === 'Easy'
                          ? 'bg-emerald-950 text-emerald-400 border border-emerald-500/30'
                          : q.difficulty === 'Medium'
                          ? 'bg-amber-950 text-amber-400 border border-amber-500/30'
                          : 'bg-red-950 text-red-400 border border-red-500/30'
                      }`}
                    >
                      {q.difficulty}
                    </span>
                  </td>

                  <td className="px-4 py-4 text-zinc-400 font-sans">
                    {q.category}
                  </td>

                  <td className="px-4 py-4 text-right font-bold text-amber-400">
                    {q.points}
                  </td>

                  <td className="px-4 py-4 text-center">
                    <span className="px-2.5 py-1 bg-amber-500/20 text-amber-300 border border-amber-500/40 rounded-lg font-bold">
                      {q.allocatedTimeMinutes || 10} mins
                    </span>
                  </td>

                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end space-x-2">
                      <button
                        onClick={() => handleStartQuestion(q.id, q.allocatedTimeMinutes || 10)}
                        title="Start this question as active in the Arena"
                        className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-[11px] font-sans font-semibold flex items-center space-x-1"
                      >
                        <Play className="w-3 h-3" />
                        <span>Launch</span>
                      </button>

                      <button
                        onClick={() => handleDelete(q.id)}
                        title="Delete question"
                        className="p-1.5 text-zinc-400 hover:text-red-400 rounded-lg hover:bg-zinc-800 transition"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create New Question Modal */}
      {isCreating && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-900 border border-zinc-700 rounded-2xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="p-4 border-b border-zinc-800 flex items-center justify-between bg-zinc-950">
              <h3 className="font-bold text-white text-base flex items-center space-x-2">
                <Plus className="w-4 h-4 text-amber-400" />
                <span>Create New Tournament Program</span>
              </h3>
              <button
                onClick={() => setIsCreating(false)}
                className="p-1.5 text-zinc-400 hover:text-white rounded hover:bg-zinc-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="flex-1 p-6 overflow-y-auto space-y-4 text-xs font-sans">
              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Problem Title:</label>
                <input
                  type="text"
                  required
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="e.g. Inverted Binary Tree Bug"
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Difficulty:</label>
                  <select
                    value={formData.difficulty}
                    onChange={(e) => setFormData({ ...formData, difficulty: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs"
                  >
                    <option value="Easy">Easy</option>
                    <option value="Medium">Medium</option>
                    <option value="Hard">Hard</option>
                  </select>
                </div>

                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Points:</label>
                  <input
                    type="number"
                    value={formData.points}
                    onChange={(e) => setFormData({ ...formData, points: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg px-3 py-2 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="block text-amber-400 font-bold mb-1">
                    Allocated Time (Mins):
                  </label>
                  <input
                    type="number"
                    value={formData.allocatedTimeMinutes}
                    onChange={(e) => setFormData({ ...formData, allocatedTimeMinutes: e.target.value })}
                    className="w-full bg-zinc-950 border border-amber-500/50 rounded-lg px-3 py-2 text-amber-300 font-bold text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-300 font-semibold mb-1">Problem Description:</label>
                <textarea
                  rows={4}
                  required
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Describe problem statement and what bug to fix..."
                  className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-3 text-white text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Sample Input:</label>
                  <textarea
                    rows={2}
                    value={formData.testCasesInput}
                    onChange={(e) => setFormData({ ...formData, testCasesInput: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white text-xs font-mono"
                  />
                </div>
                <div>
                  <label className="block text-zinc-300 font-semibold mb-1">Sample Output:</label>
                  <textarea
                    rows={2}
                    value={formData.testCasesOutput}
                    onChange={(e) => setFormData({ ...formData, testCasesOutput: e.target.value })}
                    className="w-full bg-zinc-950 border border-zinc-700 rounded-lg p-2 text-white text-xs font-mono"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-800 flex justify-end space-x-2">
                <button
                  type="button"
                  onClick={() => setIsCreating(false)}
                  className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-lg font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-lg shadow-md"
                >
                  Save Question
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
