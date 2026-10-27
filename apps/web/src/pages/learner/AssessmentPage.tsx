import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ApiClient } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { Breadcrumbs } from '../../components/common/Breadcrumbs';
import { PageError } from '../../components/common/PageError';
import {
  HelpCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  ShieldAlert,
  Send,
  RotateCcw,
  Award,
} from 'lucide-react';
import { useCourseCopyPasteProtection } from '../../hooks/useCourseCopyPasteProtection';

export const AssessmentPage: React.FC = () => {
  const { assessmentId } = useParams<{ assessmentId: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();

  useCourseCopyPasteProtection({
    enabled: true,
    message: 'Copying questions and pasting answers is not allowed during assessments.',
  });

  const [quiz, setQuiz] = useState<any>(null);
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, string[]>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        const data = await ApiClient.get<any>(`/quizzes/${assessmentId}`);
        setQuiz(data);
      } catch (err: any) {
        setLoadError(err.message || 'Failed to load assessment');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [assessmentId]);

  const handleSelectOption = (questionId: string, optionId: string, isMulti: boolean) => {
    setSelectedAnswers((prev) => {
      const current = prev[questionId] || [];
      if (isMulti) {
        return {
          ...prev,
          [questionId]: current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId],
        };
      }
      return {
        ...prev,
        [questionId]: [optionId],
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quiz) return;

    // Check all questions answered
    const unanswered = quiz.questions?.some(
      (q: any) => !selectedAnswers[q.id] || selectedAnswers[q.id].length === 0
    );

    if (unanswered && !window.confirm('Some questions are unanswered. Do you want to submit anyway?')) {
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        answers: Object.entries(selectedAnswers).map(([questionId, selectedOptionIds]) => ({
          questionId,
          selectedOptionIds,
        })),
      };

      const res = await ApiClient.post<any>(`/quizzes/${assessmentId}/attempts`, payload);
      setResult(res);
      // Keep the attempts counter in the header in sync with the server
      setQuiz((prev: any) =>
        prev
          ? {
              ...prev,
              userStats: {
                ...(prev.userStats || {}),
                attemptsUsed: res.attemptNumber,
                attemptsRemaining: res.attemptsRemaining,
                passed: prev.userStats?.passed || res.passed,
              },
            }
          : prev
      );

      if (res.passed) {
        success(`Assessment passed! Score: ${res.score}%`);
      } else {
        error(`Score: ${res.score}%. Passing threshold is ${res.passingScore}%.`);
      }
    } catch (err: any) {
      error(err.message || 'Failed to submit assessment');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRetake = () => {
    setSelectedAnswers({});
    setResult(null);
  };

  if (!loading && !quiz) {
    return <PageError message={loadError || 'Assessment not found.'} backTo="/courses/go-programming/learning-path" backLabel="Back to Learning Path" />;
  }

  const noAttemptsLeft =
    !!quiz?.userStats && quiz.maxAttempts > 0 && quiz.userStats.attemptsUsed >= quiz.maxAttempts;

  if (loading || !quiz) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 animate-pulse space-y-6">
        <div className="h-8 bg-slate-200 dark:bg-slate-800 rounded-xl w-1/3" />
        <div className="h-64 bg-slate-200 dark:bg-slate-800 rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 space-y-8 pb-24">
      <Breadcrumbs
        items={[
          { label: 'Courses', path: '/courses' },
          { label: 'Go Programming', path: '/courses/go-programming' },
          { label: quiz.title },
        ]}
      />

      {/* Header Card */}
      <div className="p-8 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 text-xs font-bold rounded-lg bg-brand-50 text-brand-700 dark:bg-brand-950 dark:text-brand-300">
              {quiz.isModuleTest ? 'Module Comprehensive Test' : 'Concept Quiz'}
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Passing Score: {quiz.passingScore}%
            </span>
          </div>

          {quiz.userStats && (
            <span className="text-xs text-slate-400 font-medium">
              Attempts: {quiz.userStats.attemptsUsed} / {quiz.maxAttempts}
            </span>
          )}
        </div>

        <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          {quiz.title}
        </h1>

        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          {quiz.instructions}
        </p>

        <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 select-none">
          <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
          <span>
            <strong>Assessment Integrity Mode:</strong> Copying questions and pasting answers is strictly disabled during assessments.
          </span>
        </div>
      </div>

      {/* Results View */}
      {result ? (
        <div className="space-y-6">
          <div
            className={`p-6 rounded-2xl border ${
              result.passed
                ? 'bg-emerald-50 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-900 dark:text-emerald-200'
                : 'bg-rose-50 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-900 dark:text-rose-200'
            } flex items-center justify-between`}
          >
            <div className="flex items-center gap-4">
              {result.passed ? (
                <CheckCircle2 className="w-10 h-10 text-emerald-600 shrink-0" />
              ) : (
                <XCircle className="w-10 h-10 text-rose-600 shrink-0" />
              )}
              <div>
                <h3 className="text-lg font-bold">
                  {result.passed ? 'Assessment Passed!' : 'Assessment Not Passed'}
                </h3>
                <p className="text-xs opacity-90">
                  Your Score: <span className="font-extrabold">{result.score}%</span> (Required: {result.passingScore}%)
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {result.attemptsRemaining > 0 && !result.passed && (
                <button
                  onClick={handleRetake}
                  className="px-4 py-2 rounded-xl text-xs font-bold bg-white text-slate-900 hover:bg-slate-50 border shadow-sm transition-colors"
                >
                  Retake Attempt
                </button>
              )}
              <Link
                to={quiz.moduleId ? `/learn/go-programming/module/${quiz.moduleId}` : '/dashboard'}
                className="px-4 py-2 rounded-xl text-xs font-bold bg-brand-600 text-white hover:bg-brand-700 shadow-sm transition-colors"
              >
                Return to Module
              </Link>
            </div>
          </div>

          {/* Question Explanations Breakdown */}
          <div className="space-y-4">
            <h3 className="font-bold text-base text-slate-900 dark:text-white">
              Answer Review & Explanations
            </h3>

            {result.questionResults?.map((res: any, idx: number) => {
              const originalQ = quiz.questions?.find((q: any) => q.id === res.questionId);

              return (
                <div
                  key={idx}
                  className={`p-5 rounded-2xl border space-y-3 bg-white dark:bg-slate-900 ${
                    res.isCorrect
                      ? 'border-emerald-200 dark:border-emerald-900'
                      : 'border-rose-200 dark:border-rose-900'
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <span className="font-bold text-sm text-slate-900 dark:text-white">
                      Q{idx + 1}. {originalQ?.prompt}
                    </span>
                    <span
                      className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase tracking-wider shrink-0 ${
                        res.isCorrect ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
                      }`}
                    >
                      {res.isCorrect ? 'Correct' : 'Incorrect'}
                    </span>
                  </div>

                  {originalQ?.codeSnippet && (
                    <pre className="p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto">
                      <code>{originalQ.codeSnippet}</code>
                    </pre>
                  )}

                  {/* Explanation text */}
                  {res.explanation && (
                    <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-800 text-xs text-slate-600 dark:text-slate-300">
                      <span className="font-bold text-slate-900 dark:text-white">Explanation: </span>
                      {res.explanation}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* Questions Quiz Form */
        <form onSubmit={handleSubmit} className="space-y-6">
          {quiz.questions?.map((q: any, qIdx: number) => {
            const isMulti = q.type === 'multiple-select';
            const userSelections = selectedAnswers[q.id] || [];

            return (
              <div
                key={q.id}
                className="p-6 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-card space-y-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="space-y-1">
                    <span className="text-[11px] font-bold uppercase tracking-wider text-brand-600 dark:text-brand-400">
                      Question {qIdx + 1} of {quiz.questions.length} • {q.points || 10} Points
                    </span>
                    <h3 className="font-bold text-sm text-slate-900 dark:text-white">
                      {q.prompt}
                    </h3>
                  </div>
                  {isMulti && (
                    <span className="text-[10px] font-semibold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded">
                      Multiple Select
                    </span>
                  )}
                </div>

                {q.codeSnippet && (
                  <pre className="p-3 rounded-xl bg-slate-950 text-emerald-400 font-mono text-xs overflow-x-auto">
                    <code>{q.codeSnippet}</code>
                  </pre>
                )}

                <div className="space-y-2 pt-1">
                  {q.options?.map((opt: any) => {
                    const isSelected = userSelections.includes(opt.id);

                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => handleSelectOption(q.id, opt.id, isMulti)}
                        className={`w-full text-left p-3.5 rounded-xl border text-xs transition-colors flex items-center justify-between ${
                          isSelected
                            ? 'border-brand-500 bg-brand-50/60 dark:bg-brand-950/40 text-brand-900 dark:text-brand-200 font-semibold shadow-subtle'
                            : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900'
                        }`}
                      >
                        <span>{opt.text}</span>
                        <div
                          className={`w-4 h-4 rounded-${isMulti ? 'md' : 'full'} border flex items-center justify-center shrink-0 ${
                            isSelected
                              ? 'border-brand-600 bg-brand-600 text-white'
                              : 'border-slate-300 dark:border-slate-700'
                          }`}
                        >
                          {isSelected && <CheckCircle2 className="w-3 h-3 text-white" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}

          {noAttemptsLeft && (
            <div className="p-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 text-amber-900 dark:text-amber-200 text-xs">
              You have used all {quiz.maxAttempts} attempts for this assessment
              {quiz.userStats?.bestScore != null ? ` (best score ${quiz.userStats.bestScore}%)` : ''}. Ask an admin
              if you need another try.
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || noAttemptsLeft}
            className="w-full py-3 rounded-xl font-bold text-sm bg-brand-600 hover:bg-brand-700 text-white shadow-elevated flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
          >
            <Send className="w-4 h-4" />
            {isSubmitting ? 'Evaluating Submission...' : 'Submit Assessment'}
          </button>
        </form>
      )}
    </div>
  );
};
