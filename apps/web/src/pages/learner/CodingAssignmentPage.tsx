import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import Editor from '@monaco-editor/react';
import { ApiClient } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useTheme } from '../../context/ThemeContext';
import { Breadcrumbs } from '../../components/common/Breadcrumbs';
import { PageError } from '../../components/common/PageError';
import {
  Play,
  Send,
  RotateCcw,
  CheckCircle2,
  XCircle,
  Clock,
  Terminal,
  FileCode2,
  ListFilter,
  History,
  Lightbulb,
  Check,
  ShieldAlert,
} from 'lucide-react';
import { useCourseCopyPasteProtection } from '../../hooks/useCourseCopyPasteProtection';

export const CodingAssignmentPage: React.FC = () => {
  const { assignmentId } = useParams<{ assignmentId: string }>();
  const { theme } = useTheme();
  const { success, error, info } = useToast();

  useCourseCopyPasteProtection({
    enabled: true,
    message: 'Copy and paste are disabled in assignments to ensure authentic problem solving.',
  });

  const [assignment, setAssignment] = useState<any>(null);
  const [code, setCode] = useState('');
  const [stdin, setStdin] = useState('');
  const [activeLeftTab, setActiveLeftTab] = useState<'problem' | 'hints' | 'submissions'>('problem');
  const [activeRightTab, setActiveRightTab] = useState<'output' | 'tests' | 'stdin'>('output');

  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [runResult, setRunResult] = useState<any>(null);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [submissions, setSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const handleEditorDidMount = (editor: any) => {
    // Disable context menu inside Monaco to prevent right click -> Paste
    editor.updateOptions({
      contextmenu: false,
    });

    // Intercept keyboard shortcuts in Monaco editor
    editor.onKeyDown((e: any) => {
      const isModifier = e.ctrlKey || e.metaKey;
      const key = e.browserEvent?.key?.toLowerCase();
      const codeKey = e.code;

      // Block Paste: Ctrl+V, Cmd+V, Shift+Insert
      if ((isModifier && (codeKey === 'KeyV' || key === 'v')) || (e.shiftKey && codeKey === 'Insert')) {
        e.preventDefault();
        e.stopPropagation();
        error('Pasting code is not allowed in assignments. Please type your code manually.');
      }
      // Block Copy: Ctrl+C, Cmd+C, Ctrl+Insert
      else if ((isModifier && (codeKey === 'KeyC' || key === 'c')) || (isModifier && codeKey === 'Insert')) {
        e.preventDefault();
        e.stopPropagation();
        error('Copying code is not allowed in assignments.');
      }
      // Block Cut: Ctrl+X, Cmd+X
      else if (isModifier && (codeKey === 'KeyX' || key === 'x')) {
        e.preventDefault();
        e.stopPropagation();
        error('Cutting code is not allowed in assignments.');
      }
    });

    // Intercept DOM paste and copy events on the editor container
    const domNode = editor.getDomNode();
    if (domNode) {
      domNode.addEventListener(
        'paste',
        (e: ClipboardEvent) => {
          e.preventDefault();
          e.stopPropagation();
          error('Pasting code is not allowed in assignments. Please type your code manually.');
        },
        true
      );
      domNode.addEventListener(
        'copy',
        (e: ClipboardEvent) => {
          e.preventDefault();
          e.stopPropagation();
          error('Copying is not allowed in assignments.');
        },
        true
      );
      domNode.addEventListener(
        'cut',
        (e: ClipboardEvent) => {
          e.preventDefault();
          e.stopPropagation();
          error('Cutting is not allowed in assignments.');
        },
        true
      );
    }
  };

  useEffect(() => {
    const fetchAssignment = async () => {
      try {
        const data = await ApiClient.get<any>(`/assignments/${assignmentId}`);
        setAssignment(data);
        setCode(data.starterCode || 'package main\n\nimport "fmt"\n\nfunc main() {\n    // Code here\n}');

        // Load past submissions using the resolved assignment ID
        const resolvedId = data?.id || assignmentId;
        ApiClient.get<any[]>(`/assignments/${resolvedId}/submissions`)
          .then(setSubmissions)
          .catch(() => {});
      } catch (err: any) {
        setLoadError(err.message || 'Failed to load assignment');
      } finally {
        setLoading(false);
      }
    };

    fetchAssignment();
  }, [assignmentId]);

  const handleResetCode = () => {
    if (window.confirm('Reset editor to initial starter code? Any unsaved edits will be lost.')) {
      setCode(assignment?.starterCode || '');
      info('Code reset to starter template.');
    }
  };

  const handleRunCode = async () => {
    if (!code.trim()) {
      error('Please write some Go code before running.');
      return;
    }

    setIsRunning(true);
    setRunResult(null);
    setActiveRightTab('output');

    try {
      const res = await ApiClient.post<any>('/assignments/run', { code, stdin });
      setRunResult(res);
      if (res.exitCode === 0 && !res.compileError && !res.runtimeError) {
        success(`Executed in ${res.executionTimeMs}ms`);
      } else {
        error('Execution completed with errors. See console below.');
      }
    } catch (err: any) {
      error(err.message || 'Error running code');
    } finally {
      setIsRunning(false);
    }
  };

  const handleSubmitSolution = async () => {
    if (!code.trim()) {
      error('Cannot submit empty solution.');
      return;
    }

    setIsSubmitting(true);
    setSubmitResult(null);
    setActiveRightTab('tests');

    try {
      const targetId = assignment?.id || assignmentId;
      const res = await ApiClient.post<any>(`/assignments/${targetId}/submit`, {
        sourceCode: code,
      });
      setSubmitResult(res);

      if (res.passed) {
        success(`Solution accepted! Score: ${res.score}% (${res.passedTests}/${res.totalTests} tests passed)`);
      } else {
        error(`Failed: Passed ${res.passedTests}/${res.totalTests} test cases. (Score: ${res.score}%)`);
      }

      // Refresh past submissions list
      const subs = await ApiClient.get<any[]>(`/assignments/${targetId}/submissions`);
      setSubmissions(subs);
    } catch (err: any) {
      error(err.message || 'Submission error');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!loading && !assignment) {
    return <PageError message={loadError || 'Assignment not found.'} backTo="/courses/go-programming/learning-path" backLabel="Back to Learning Path" />;
  }

  if (loading || !assignment) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-16 animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/4" />
        <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-slate-100 dark:bg-slate-950 overflow-hidden">
      {/* Top Bar */}
      <div className="bg-white dark:bg-slate-900 border-b border-slate-200 dark:border-slate-800 px-4 py-2 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/learn/go-programming/module/${assignment.moduleId}`}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-white"
          >
            ← Back to Module
          </Link>
          <span className="text-slate-300 dark:text-slate-700">|</span>
          <h1 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
            {assignment.title}
          </h1>
          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
            {assignment.difficulty}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleResetCode}
            title="Reset to starter code"
            className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-700 text-slate-500 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handleRunCode}
            disabled={isRunning || isSubmitting}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100 transition-colors disabled:opacity-50"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            {isRunning ? 'Running...' : 'Run Code'}
          </button>

          <button
            onClick={handleSubmitSolution}
            disabled={isRunning || isSubmitting}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition-colors disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            {isSubmitting ? 'Evaluating...' : 'Submit Solution'}
          </button>
        </div>
      </div>

      {/* Main Split Grid */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 min-h-0 overflow-hidden">
        {/* Left Panel: Problem, Examples, Constraints, Submissions */}
        <div className="lg:col-span-5 bg-white dark:bg-slate-900 border-r border-slate-200 dark:border-slate-800 flex flex-col min-h-0">
          {/* Left Tabs Header */}
          <div className="flex items-center border-b border-slate-200 dark:border-slate-800 px-4 bg-slate-50/50 dark:bg-slate-900 shrink-0">
            <button
              onClick={() => setActiveLeftTab('problem')}
              className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
                activeLeftTab === 'problem'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              Problem Statement
            </button>
            <button
              onClick={() => setActiveLeftTab('hints')}
              className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1 ${
                activeLeftTab === 'hints'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <Lightbulb className="w-3.5 h-3.5" />
              Hints
            </button>
            <button
              onClick={() => setActiveLeftTab('submissions')}
              className={`py-2.5 px-3 text-xs font-semibold border-b-2 transition-colors flex items-center gap-1 ${
                activeLeftTab === 'submissions'
                  ? 'border-brand-600 text-brand-600 dark:text-brand-400'
                  : 'border-transparent text-slate-500 hover:text-slate-800 dark:hover:text-white'
              }`}
            >
              <History className="w-3.5 h-3.5" />
              Submissions ({submissions.length})
            </button>
          </div>

          {/* Left Tab Body */}
          <div className="flex-1 p-6 overflow-y-auto space-y-6 text-xs text-slate-700 dark:text-slate-300 leading-relaxed">
            {activeLeftTab === 'problem' && (
              <>
                <div className="flex items-center gap-2 p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-700 dark:text-amber-300 font-medium select-none">
                  <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
                  <span>
                    <strong>Integrity Mode:</strong> Copying and pasting are disabled in assignments. Please type your code manually to build retention.
                  </span>
                </div>

                <div className="space-y-2">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-white">Description</h3>
                  <p className="whitespace-pre-line leading-relaxed">{assignment.description}</p>
                </div>

                {/* Examples */}
                {assignment.examples && assignment.examples.length > 0 && (
                  <div className="space-y-3 pt-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Examples</h3>
                    {assignment.examples.map((ex: any, i: number) => (
                      <div
                        key={i}
                        className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 font-mono space-y-2"
                      >
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400">Input:</span>
                          <pre className="text-slate-900 dark:text-white whitespace-pre-wrap">{ex.input || '(empty stdin)'}</pre>
                        </div>
                        <div>
                          <span className="text-[10px] font-bold uppercase text-slate-400">Expected Output:</span>
                          <pre className="text-emerald-600 dark:text-emerald-400 whitespace-pre-wrap">{ex.output}</pre>
                        </div>
                        {ex.explanation && (
                          <p className="text-[11px] font-sans text-slate-500 dark:text-slate-400">
                            {ex.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                {/* Constraints */}
                {assignment.constraints && assignment.constraints.length > 0 && (
                  <div className="space-y-2 pt-2">
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">Constraints</h3>
                    <ul className="list-disc pl-4 space-y-1 text-slate-500">
                      {assignment.constraints.map((c: string, idx: number) => (
                        <li key={idx}>{c}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </>
            )}

            {activeLeftTab === 'hints' && (
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Assignment Hints</h3>
                {assignment.hints && assignment.hints.length > 0 ? (
                  assignment.hints.map((hint: string, idx: number) => (
                    <div
                      key={idx}
                      className="p-3.5 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 flex items-start gap-2.5"
                    >
                      <Lightbulb className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{hint}</span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400">No hints configured for this problem.</p>
                )}
              </div>
            )}

            {activeLeftTab === 'submissions' && (
              <div className="space-y-3">
                <h3 className="font-bold text-sm text-slate-900 dark:text-white">Past Submissions</h3>
                {submissions.length > 0 ? (
                  submissions.map((sub: any) => (
                    <div
                      key={sub.id}
                      className="p-3 rounded-xl border border-slate-200 dark:border-slate-800 flex items-center justify-between"
                    >
                      <div className="flex items-center gap-2">
                        {sub.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-500" />
                        )}
                        <div>
                          <p className="font-bold text-slate-800 dark:text-white">
                            Score: {sub.score}% ({sub.passedTests}/{sub.totalTests} passed)
                          </p>
                          <span className="text-[10px] text-slate-400">
                            {new Date(sub.submittedAt).toLocaleTimeString()} • {new Date(sub.submittedAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800">
                        {sub.executionStatus}
                      </span>
                    </div>
                  ))
                ) : (
                  <p className="text-slate-400">No submissions recorded yet.</p>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right Panel: Monaco Editor & Output/Tests Drawer */}
        <div className="lg:col-span-7 flex flex-col min-h-0 bg-slate-900">
          {/* Editor Header */}
          <div className="bg-slate-950 text-slate-400 text-xs px-4 py-2 flex items-center justify-between border-b border-slate-800 shrink-0 select-none">
            <div className="flex items-center gap-2">
              <FileCode2 className="w-4 h-4 text-brand-400" />
              <span className="font-mono text-slate-200 font-semibold">main.go</span>
            </div>
            <div className="flex items-center gap-3">
              <span
                className="text-[11px] font-mono text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded flex items-center gap-1"
                title="Pasting and copying code is disabled in assignments"
              >
                <ShieldAlert className="w-3 h-3 text-amber-400" />
                No Copy/Paste
              </span>
              <span className="text-[11px] font-mono text-slate-400">Go 1.27 • Native Runner</span>
            </div>
          </div>

          {/* Monaco Editor Component */}
          <div className="flex-1 min-h-[300px]">
            <Editor
              height="100%"
              defaultLanguage="go"
              theme={theme === 'dark' ? 'vs-dark' : 'light'}
              value={code}
              onChange={(value) => setCode(value || '')}
              onMount={handleEditorDidMount}
              options={{
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: 'Fira Code, monospace',
                lineNumbers: 'on',
                automaticLayout: true,
                tabSize: 4,
                insertSpaces: false, // Go idiomatic tabs
                wordWrap: 'on',
                contextmenu: false,
              }}
            />
          </div>

          {/* Bottom Execution Console & Results Drawer */}
          <div className="h-56 bg-slate-950 border-t border-slate-800 flex flex-col shrink-0">
            {/* Console Tabs */}
            <div className="flex items-center justify-between border-b border-slate-800 px-4 bg-slate-900 text-xs">
              <div className="flex items-center">
                <button
                  onClick={() => setActiveRightTab('output')}
                  className={`py-2 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                    activeRightTab === 'output'
                      ? 'border-brand-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Terminal className="w-3.5 h-3.5" />
                  Console Output
                </button>
                <button
                  onClick={() => setActiveRightTab('tests')}
                  className={`py-2 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                    activeRightTab === 'tests'
                      ? 'border-brand-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ListFilter className="w-3.5 h-3.5" />
                  Test Results {submitResult && `(${submitResult.passedTests}/${submitResult.totalTests})`}
                </button>
                <button
                  onClick={() => setActiveRightTab('stdin')}
                  className={`py-2 px-3 font-semibold border-b-2 flex items-center gap-1.5 transition-colors ${
                    activeRightTab === 'stdin'
                      ? 'border-brand-500 text-white'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  Custom Stdin
                </button>
              </div>

              {runResult && (
                <span className="text-[11px] font-mono text-slate-400 flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {runResult.executionTimeMs}ms
                </span>
              )}
            </div>

            {/* Console Body */}
            <div className="flex-1 p-4 overflow-y-auto font-mono text-xs text-slate-300">
              {activeRightTab === 'output' && (
                <div>
                  {runResult ? (
                    <div className="space-y-2">
                      {runResult.compileError && (
                        <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800 text-rose-300 whitespace-pre-wrap">
                          <p className="font-bold uppercase tracking-wider text-[10px]">Compilation Error:</p>
                          {runResult.compileError}
                        </div>
                      )}
                      {runResult.runtimeError && (
                        <div className="p-3 rounded-lg bg-amber-950/60 border border-amber-800 text-amber-300 whitespace-pre-wrap">
                          <p className="font-bold uppercase tracking-wider text-[10px]">Runtime Error:</p>
                          {runResult.runtimeError}
                        </div>
                      )}
                      {runResult.stdout ? (
                        <pre className="text-emerald-400 whitespace-pre-wrap">{runResult.stdout}</pre>
                      ) : (
                        !runResult.compileError && !runResult.runtimeError && (
                          <span className="text-slate-500">(Program finished with exit code 0 and no output)</span>
                        )
                      )}
                    </div>
                  ) : (
                    <span className="text-slate-600">
                      Click "Run Code" to compile and execute your program with custom stdin.
                    </span>
                  )}
                </div>
              )}

              {activeRightTab === 'tests' && (
                <div>
                  {submitResult ? (
                    <div className="space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                        <span className="font-bold text-sm text-white">
                          Score: {submitResult.score}%
                        </span>
                        <span className={`font-bold px-2 py-0.5 rounded text-[10px] ${submitResult.passed ? 'bg-emerald-950 text-emerald-300' : 'bg-rose-950 text-rose-300'}`}>
                          {submitResult.passed ? 'PASSED' : 'FAILED'}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {submitResult.testResults?.map((tr: any, idx: number) => (
                          <div
                            key={idx}
                            className={`p-3 rounded-xl border text-xs ${
                              tr.passed
                                ? 'bg-emerald-950/30 border-emerald-800/80 text-emerald-200'
                                : 'bg-rose-950/30 border-rose-800/80 text-rose-200'
                            }`}
                          >
                            <div className="flex items-center justify-between font-bold">
                              <span>Test Case #{idx + 1} {tr.hidden && '(Hidden Test)'}</span>
                              <span>{tr.passed ? '✓ PASSED' : '✗ FAILED'}</span>
                            </div>

                            {!tr.hidden && (
                              <div className="mt-2 space-y-1 font-mono text-[11px] text-slate-300">
                                <div>
                                  <span className="text-slate-500">Input: </span>
                                  <span>{tr.input || '(empty)'}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Expected: </span>
                                  <span className="text-emerald-400">{tr.expectedOutput}</span>
                                </div>
                                <div>
                                  <span className="text-slate-500">Actual: </span>
                                  <span className={tr.passed ? 'text-emerald-400' : 'text-rose-400'}>{tr.actualOutput || '(none)'}</span>
                                </div>
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <span className="text-slate-600">
                      Click "Submit Solution" to run your code against all visible and hidden evaluation test cases.
                    </span>
                  )}
                </div>
              )}

              {activeRightTab === 'stdin' && (
                <div className="h-full flex flex-col space-y-2">
                  <span className="text-[11px] text-slate-400">
                    Input piped directly to standard input (os.Stdin):
                  </span>
                  <textarea
                    value={stdin}
                    onChange={(e) => setStdin(e.target.value)}
                    placeholder="Enter sample stdin here..."
                    className="w-full h-24 p-2.5 rounded-lg bg-slate-900 border border-slate-800 text-xs font-mono text-white focus:outline-none focus:ring-1 focus:ring-brand-500 resize-none"
                  />
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
