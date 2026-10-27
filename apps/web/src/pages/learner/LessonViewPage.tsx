import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { ApiClient } from '../../services/api';
import { Breadcrumbs } from '../../components/common/Breadcrumbs';
import { SimpleMarkdown } from '../../components/common/SimpleMarkdown';
import { useToast } from '../../context/ToastContext';
import {
  BookOpen,
  CheckCircle2,
  Clock,
  ArrowLeft,
  ArrowRight,
  Code2,
  Copy,
  Check,
  AlertTriangle,
  Lightbulb,
  HelpCircle,
  ShieldAlert,
  ChevronLeft,
  ChevronRight,
  Menu,
  X,
  FileCheck2,
  Layers,
  Compass,
} from 'lucide-react';
import { useCourseCopyPasteProtection } from '../../hooks/useCourseCopyPasteProtection';

export const LessonViewPage: React.FC = () => {
  const { lessonId } = useParams<{ lessonId: string }>();
  const navigate = useNavigate();
  const { success, error } = useToast();

  useCourseCopyPasteProtection({
    enabled: true,
    message: 'Copy and paste are disabled in courses. Practice by typing code manually!',
  });

  const [lesson, setLesson] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [completing, setCompleting] = useState(false);

  // Left sidebar toggle
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);

  // Knowledge check state
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [showAnswer, setShowAnswer] = useState(false);

  useEffect(() => {
    const fetchLesson = async () => {
      setLoading(true);
      setSelectedOption(null);
      setShowAnswer(false);
      try {
        const data = await ApiClient.get<any>(`/lessons/${lessonId}`);
        setLesson(data);
      } catch (err: any) {
        error(err.message || 'Failed to load lesson');
      } finally {
        setLoading(false);
      }
    };

    fetchLesson();
  }, [lessonId]);

  const handleCopyCodeAttempt = () => {
    error('Copying course code is disabled. Type the code manually to practice and build retention!');
  };

  const handleMarkComplete = async () => {
    if (!lesson) return;
    setCompleting(true);
    try {
      await ApiClient.post(`/lessons/${lesson.id}/complete`);
      setLesson((prev: any) => ({ ...prev, isCompleted: true }));
      success('Lesson marked as completed! Progress updated.');
    } catch (err: any) {
      error(err.message || 'Failed to complete lesson');
    } finally {
      setCompleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 animate-pulse space-y-6">
        <div className="h-8 bg-canvas-subtle dark:bg-canvas-darkSubtle rounded-lg w-1/3" />
        <div className="h-12 bg-canvas-subtle dark:bg-canvas-darkSubtle rounded-lg w-3/4" />
        <div className="h-64 bg-canvas-subtle dark:bg-canvas-darkSubtle rounded-card" />
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4">
        <ShieldAlert className="w-12 h-12 text-state-error mx-auto" />
        <h2 className="text-xl font-bold text-ink-primary dark:text-ink-darkText">Lesson Not Available</h2>
        <p className="text-sm text-ink-secondary dark:text-ink-darkMuted">
          This lesson may belong to a locked module or does not exist.
        </p>
        <Link
          to="/dashboard"
          className="btn-primary"
        >
          Return to Dashboard
        </Link>
      </div>
    );
  }

  const nav = lesson.navigation || {};
  const siblingLessons = lesson.moduleLessons || [];

  return (
    <div className="min-h-screen flex flex-col bg-canvas-main dark:bg-canvas-darkMain text-ink-primary dark:text-ink-darkText">
      {/* Top Distraction-free Header */}
      <header className="sticky top-0 z-30 h-14 bg-canvas-main/90 dark:bg-canvas-darkElevated/90 backdrop-blur-md border-b border-ink-border dark:border-ink-darkBorder px-4 flex items-center justify-between">
        <div className="flex items-center gap-3 min-w-0">
          <Link
            to={`/learn/go-programming/module/${lesson.moduleId}`}
            className="flex items-center gap-1.5 text-xs font-semibold text-ink-secondary dark:text-ink-darkMuted hover:text-ink-primary dark:hover:text-ink-darkText transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span className="hidden sm:inline">Module {lesson.moduleOrder}</span>
          </Link>

          <span className="text-ink-tertiary">/</span>

          <span className="text-xs font-bold text-ink-primary dark:text-ink-darkText truncate max-w-[200px] sm:max-w-md">
            {lesson.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Toggle Module Sidebar */}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="hidden md:flex items-center gap-1.5 px-2.5 py-1 text-xs rounded-md border border-ink-border dark:border-ink-darkBorder text-ink-secondary hover:bg-canvas-subtle"
            title={sidebarOpen ? 'Hide lesson list' : 'Show lesson list'}
          >
            <BookOpen className="w-3.5 h-3.5" />
            <span>{sidebarOpen ? 'Hide Navigation' : 'Lessons'}</span>
          </button>

          {/* Mobile drawer button */}
          <button
            onClick={() => setMobileNavOpen(true)}
            className="p-1.5 rounded-md text-ink-secondary md:hidden hover:bg-canvas-subtle"
          >
            <Menu className="w-4 h-4" />
          </button>

          {/* Completion Status Badge */}
          {lesson.isCompleted ? (
            <span className="badge-emerald text-[11px]">
              <CheckCircle2 className="w-3.5 h-3.5" /> Completed
            </span>
          ) : (
            <span className="badge-neutral text-[11px]">In Progress</span>
          )}
        </div>
      </header>

      {/* Main 3-Column Layout Shell */}
      <div className="flex-1 flex min-w-0">
        {/* Mobile Lessons Drawer Backdrop */}
        {mobileNavOpen && (
          <div
            onClick={() => setMobileNavOpen(false)}
            className="fixed inset-0 z-40 bg-black/40 backdrop-blur-xs md:hidden"
          />
        )}

        {/* 1. Left Sidebar: Module & Lesson Navigation */}
        <aside
          className={`fixed md:sticky top-14 h-[calc(100vh-3.5rem)] z-40 md:z-20 bg-canvas-subtle dark:bg-canvas-darkElevated border-r border-ink-border dark:border-ink-darkBorder flex flex-col shrink-0 transition-all duration-200 ${
            sidebarOpen ? 'w-72' : 'w-0 overflow-hidden border-none'
          } ${mobileNavOpen ? 'w-72 translate-x-0' : '-translate-x-full md:translate-x-0'}`}
        >
          <div className="p-4 border-b border-ink-border dark:border-ink-darkBorder flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-brand">
                Module {lesson.moduleOrder}
              </span>
              <h3 className="text-xs font-bold text-ink-primary dark:text-ink-darkText truncate max-w-[200px]">
                {lesson.moduleTitle}
              </h3>
            </div>

            <button
              onClick={() => setMobileNavOpen(false)}
              className="p-1 text-ink-secondary md:hidden hover:bg-canvas-subtle rounded"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Lessons List */}
          <nav className="p-2 space-y-1 flex-1 overflow-y-auto">
            {siblingLessons.map((les: any) => {
              const isCurrent = les.id === lesson.id;
              return (
                <Link
                  key={les.id}
                  to={`/learn/go-programming/lesson/${les.id}`}
                  onClick={() => setMobileNavOpen(false)}
                  className={`flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs transition-colors ${
                    isCurrent
                      ? 'bg-brand-subtle dark:bg-brand-900/30 text-brand font-semibold border border-brand-200/50'
                      : 'text-ink-secondary dark:text-ink-darkMuted hover:bg-canvas-main dark:hover:bg-canvas-darkSubtle hover:text-ink-primary'
                  }`}
                >
                  <span className="font-mono text-[11px] text-ink-tertiary w-4 shrink-0">
                    {les.order}.
                  </span>
                  <span className="truncate">{les.title}</span>
                </Link>
              );
            })}
          </nav>

          {/* Module Lab / Test quick link */}
          <div className="p-3 border-t border-ink-border dark:border-ink-darkBorder space-y-1">
            <Link
              to={`/learn/go-programming/module/${lesson.moduleId}`}
              className="flex items-center justify-between p-2 rounded-lg text-xs font-semibold text-brand hover:bg-brand-subtle/50 transition-colors"
            >
              <span className="flex items-center gap-1.5">
                <FileCheck2 className="w-3.5 h-3.5" />
                Module Hub & Tests
              </span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
        </aside>

        {/* 2. Center Column: Lesson Reading Interface (680–820px wide) */}
        <main className="flex-1 flex justify-center px-4 sm:px-6 lg:px-8 py-8 overflow-y-auto">
          <div className="w-full max-w-[760px] space-y-8 pb-20">
            {/* Header Details */}
            <div className="space-y-3 border-b border-ink-border dark:border-ink-darkBorder pb-6">
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <span className="badge-emerald">
                  Module {lesson.moduleOrder} • Lesson {lesson.order}
                </span>
                <span className="flex items-center gap-1 text-ink-secondary dark:text-ink-darkMuted text-supporting">
                  <Clock className="w-3.5 h-3.5 text-ink-tertiary" />
                  {lesson.estimatedDuration || '30 mins'}
                </span>
              </div>

              <h1 className="text-section-heading sm:text-page-title font-bold text-ink-primary dark:text-ink-darkText tracking-tight">
                {lesson.title}
              </h1>

              <p className="text-body text-ink-secondary dark:text-ink-darkMuted leading-relaxed">
                {lesson.introduction}
              </p>
            </div>

            {/* Course Integrity Notice */}
            <div className="flex items-center gap-2.5 p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-300 select-none">
              <ShieldAlert className="w-4 h-4 shrink-0 text-amber-500" />
              <span>
                <strong>Course Integrity Active:</strong> Copy and paste are not allowed in course lessons. Practice typing the code examples manually to enhance learning retention.
              </span>
            </div>

            {/* Learning Objectives Callout */}
            {lesson.objectives && lesson.objectives.length > 0 && (
              <div className="card-base bg-brand-subtle/40 dark:bg-brand-900/15 border-brand-200/60 dark:border-brand-800/40 p-5 space-y-2.5">
                <h3 className="font-bold text-xs uppercase tracking-wider text-brand flex items-center gap-2">
                  <Lightbulb className="w-4 h-4 text-brand" />
                  Key Learning Objectives
                </h3>
                <ul className="space-y-1.5 text-supporting text-ink-primary dark:text-ink-darkText">
                  {lesson.objectives.map((obj: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand shrink-0 mt-0.5" />
                      <span className="leading-relaxed">{obj}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Reading Content */}
            <div className="text-body text-ink-primary dark:text-ink-darkText">
              <SimpleMarkdown text={lesson.readingContent} />
            </div>

            {/* Code Examples Component */}
            {lesson.codeExamples && lesson.codeExamples.length > 0 && (
              <div className="space-y-6 pt-4">
                <h3 className="text-card-title font-bold text-ink-primary dark:text-ink-darkText flex items-center gap-2">
                  <Code2 className="w-5 h-5 text-brand" />
                  Practical Code Examples
                </h3>

                {lesson.codeExamples.map((ex: any, idx: number) => (
                  <div
                    key={idx}
                    className="card-base p-0 overflow-hidden space-y-0"
                  >
                    <div className="px-4 py-2.5 bg-canvas-subtle dark:bg-canvas-darkSubtle border-b border-ink-border dark:border-ink-darkBorder flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-ink-primary dark:text-ink-darkText">
                          {ex.title}
                        </span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-canvas-main dark:bg-canvas-darkElevated border border-ink-border dark:border-ink-darkBorder text-ink-secondary">
                          Go 1.27
                        </span>
                      </div>

                      <button
                        onClick={handleCopyCodeAttempt}
                        className="btn-subtle text-xs gap-1.5 opacity-80 hover:opacity-100"
                        title="Copying is disabled to encourage hands-on typing"
                      >
                        <ShieldAlert className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-amber-600 dark:text-amber-400 font-medium">Copy Disabled</span>
                      </button>
                    </div>

                    {/* Dark Code Surface against Light learning page */}
                    <div className="bg-slate-950 text-slate-100 p-4 font-mono text-[13px] leading-relaxed overflow-x-auto">
                      <pre className="text-emerald-400">{ex.code}</pre>
                    </div>

                    {/* Expected Output */}
                    {ex.expectedOutput && (
                      <div className="px-4 py-3 bg-canvas-subtle dark:bg-canvas-darkSubtle border-t border-ink-border dark:border-ink-darkBorder text-supporting font-mono">
                        <span className="text-[10px] uppercase font-bold text-ink-tertiary block mb-1">
                          Standard Output:
                        </span>
                        <pre className="text-xs text-ink-primary dark:text-ink-darkText whitespace-pre-wrap">{ex.expectedOutput}</pre>
                      </div>
                    )}

                    {/* Explanation */}
                    {ex.explanation && (
                      <div className="p-4 text-supporting text-ink-secondary dark:text-ink-darkMuted leading-relaxed border-t border-ink-border dark:border-ink-darkBorder">
                        {ex.explanation}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Language Comparisons / Pitfalls */}
            {lesson.comparisonWithOtherLanguages && (
              <div className="card-base border-cyan-200 dark:border-cyan-900 bg-cyan-50/40 dark:bg-cyan-950/20 p-5 space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs uppercase font-bold tracking-wider text-state-info flex items-center gap-1.5">
                    <Compass className="w-4 h-4" />
                    Language Comparison
                  </h4>
                  {typeof lesson.comparisonWithOtherLanguages === 'object' && lesson.comparisonWithOtherLanguages.language && (
                    <span className="badge-neutral text-[10px] font-mono">
                      Transitioning from {lesson.comparisonWithOtherLanguages.language}
                    </span>
                  )}
                </div>
                <p className="text-supporting text-ink-primary dark:text-ink-darkText leading-relaxed whitespace-pre-line">
                  {typeof lesson.comparisonWithOtherLanguages === 'string'
                    ? lesson.comparisonWithOtherLanguages
                    : lesson.comparisonWithOtherLanguages.differences || ''}
                </p>
              </div>
            )}

            {lesson.commonMistakes && lesson.commonMistakes.length > 0 && (
              <div className="card-base border-amber-200 dark:border-amber-900 bg-amber-50/40 dark:bg-amber-950/20 p-5 space-y-2">
                <h4 className="text-xs uppercase font-bold tracking-wider text-state-warning flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4" />
                  Common Developer Mistakes
                </h4>
                <ul className="space-y-1.5 text-supporting text-ink-primary dark:text-ink-darkText">
                  {lesson.commonMistakes.map((mistake: string, i: number) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-state-warning font-bold">•</span>
                      <span className="leading-relaxed">{mistake}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Knowledge Check */}
            {lesson.knowledgeCheck && (
              <div className="card-base p-6 space-y-4 border-l-4 border-l-brand">
                <div className="flex items-center gap-2">
                  <HelpCircle className="w-5 h-5 text-brand" />
                  <h4 className="text-card-title font-bold text-ink-primary dark:text-ink-darkText">
                    Knowledge Check
                  </h4>
                </div>

                <p className="text-body font-medium text-ink-primary dark:text-ink-darkText">
                  {lesson.knowledgeCheck.question}
                </p>

                <div className="space-y-2 pt-1">
                  {lesson.knowledgeCheck.options.map((opt: string, idx: number) => {
                    const isSelected = selectedOption === idx;
                    const isCorrect = idx === lesson.knowledgeCheck.correctOptionIndex;

                    return (
                      <button
                        key={idx}
                        onClick={() => {
                          setSelectedOption(idx);
                          setShowAnswer(true);
                        }}
                        className={`w-full text-left p-3 rounded-lg text-supporting border transition-colors flex items-center justify-between ${
                          showAnswer
                            ? isCorrect
                              ? 'bg-state-success/10 border-state-success text-state-success font-medium'
                              : isSelected
                              ? 'bg-state-error/10 border-state-error text-state-error'
                              : 'border-ink-border dark:border-ink-darkBorder'
                            : isSelected
                            ? 'bg-brand-subtle border-brand text-brand font-medium'
                            : 'border-ink-border dark:border-ink-darkBorder hover:bg-canvas-subtle'
                        }`}
                      >
                        <span>{opt}</span>
                        {showAnswer && isCorrect && <CheckCircle2 className="w-4 h-4 text-state-success" />}
                      </button>
                    );
                  })}
                </div>

                {showAnswer && lesson.knowledgeCheck.explanation && (
                  <div className="p-3.5 rounded-lg bg-canvas-subtle dark:bg-canvas-darkSubtle text-supporting text-ink-secondary dark:text-ink-darkMuted leading-relaxed">
                    <span className="font-bold text-ink-primary dark:text-ink-darkText block mb-1">
                      Explanation:
                    </span>
                    {lesson.knowledgeCheck.explanation}
                  </div>
                )}
              </div>
            )}

            {/* 3. Bottom Navigation Controls */}
            <div className="card-base p-4 flex flex-col sm:flex-row items-center justify-between gap-4 border-t border-ink-border dark:border-ink-darkBorder">
              <div>
                {!lesson.isCompleted ? (
                  <button
                    onClick={handleMarkComplete}
                    disabled={completing}
                    className="btn-primary"
                  >
                    <CheckCircle2 className="w-4 h-4 mr-1.5" />
                    {completing ? 'Saving Progress...' : 'Mark as Complete'}
                  </button>
                ) : (
                  <span className="badge-emerald py-1 px-3">
                    <CheckCircle2 className="w-4 h-4" />
                    Lesson Finished
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2.5">
                {nav.prevLessonId && (
                  <Link
                    to={`/learn/go-programming/lesson/${nav.prevLessonId}`}
                    className="btn-secondary"
                  >
                    <ArrowLeft className="w-3.5 h-3.5 mr-1.5" />
                    Previous Lesson
                  </Link>
                )}

                {nav.nextLessonId ? (
                  <Link
                    to={`/learn/go-programming/lesson/${nav.nextLessonId}`}
                    className="btn-primary"
                  >
                    Next Lesson
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Link>
                ) : (
                  <Link
                    to={`/learn/go-programming/module/${lesson.moduleId}`}
                    className="btn-primary"
                  >
                    Complete Module Workspace
                    <ArrowRight className="w-3.5 h-3.5 ml-1.5" />
                  </Link>
                )}
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
};
