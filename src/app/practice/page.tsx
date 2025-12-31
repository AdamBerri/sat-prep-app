"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type {
  Question,
  ExamMode,
  SectionId,
  LocalUserAnswer,
  GoalId,
  ModeId,
  OnboardingStep,
} from "@/types";
import {
  SAT_CONFIG,
  GOALS,
  createModes,
  SECTIONS,
  formatTime,
  formatDomain,
} from "@/lib/constants";
import { getVisitorId } from "@/lib/visitor";
import {
  Leaf,
  Flag,
  Grid3X3,
  ChevronLeft,
  ChevronRight,
  Clock,
  X,
  BookOpen,
  Send,
  Home,
  RotateCcw,
  Eye,
  AlertCircle,
} from "lucide-react";

// ─────────────────────────────────────────────────────────
// TIMER COMPONENT
// ─────────────────────────────────────────────────────────

function Timer({
  seconds,
  isWarning,
}: {
  seconds: number;
  isWarning: boolean;
}) {
  return (
    <div
      className={`font-body font-mono text-lg px-4 py-2 rounded-lg flex items-center gap-2 ${
        isWarning
          ? "bg-[var(--barn-red)]/20 text-[var(--barn-red)] border border-[var(--barn-red)]/30"
          : "bg-[var(--grass-light)]/20 text-[var(--grass-dark)] border border-[var(--grass-medium)]/30"
      }`}
    >
      <Clock className="w-4 h-4" />
      {formatTime(seconds)}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// QUESTION NAVIGATION
// ─────────────────────────────────────────────────────────

function QuestionNav({
  questions,
  answers,
  currentIndex,
  onSelect,
  onClose,
}: {
  questions: Question[];
  answers: Map<string, LocalUserAnswer>;
  currentIndex: number;
  onSelect: (index: number) => void;
  onClose: () => void;
}) {
  return (
    <div className="card-paper p-4 sm:p-6 rounded-xl shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-display text-lg font-bold text-[var(--ink-black)]">
          Question Navigator
        </h3>
        <button
          onClick={onClose}
          className="p-1 rounded hover:bg-[var(--paper-aged)] text-[var(--ink-faded)]"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="grid grid-cols-6 sm:grid-cols-9 gap-2">
        {questions.map((q, i) => {
          const answer = answers.get(q._id);
          const hasAnswer = answer?.selectedAnswer;
          const isFlagged = answer?.flagged;
          const isCurrent = i === currentIndex;

          let bgClass = "bg-white border-[var(--paper-lines)] text-[var(--ink-faded)]";
          if (isCurrent) {
            bgClass = "bg-[var(--grass-dark)] border-[var(--grass-dark)] text-white";
          } else if (hasAnswer) {
            bgClass = "bg-[var(--grass-light)]/50 border-[var(--grass-medium)] text-[var(--grass-dark)]";
          }

          return (
            <button
              key={q._id}
              onClick={() => onSelect(i)}
              className={`w-9 h-9 text-sm font-body font-medium rounded-lg border-2 transition-all hover:scale-105 ${bgClass} ${
                isFlagged ? "ring-2 ring-[var(--sunflower)]" : ""
              }`}
            >
              {i + 1}
            </button>
          );
        })}
      </div>
      <div className="flex flex-wrap items-center gap-4 mt-4 text-sm font-body text-[var(--ink-faded)]">
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-[var(--grass-light)]/50 border border-[var(--grass-medium)]" />
          <span>Answered</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-white border border-[var(--paper-lines)]" />
          <span>Unanswered</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-4 h-4 rounded bg-white border border-[var(--paper-lines)] ring-2 ring-[var(--sunflower)]" />
          <span>Flagged</span>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PASSAGE VIEW
// ─────────────────────────────────────────────────────────

function PassageView({
  passage,
}: {
  passage: { title?: string; author?: string; content: string } | null;
}) {
  if (!passage) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--ink-faded)] gap-4 p-8">
        <BookOpen className="w-12 h-12 opacity-30" />
        <p>No passage for this question</p>
      </div>
    );
  }

  const paragraphs = passage.content.split("\n\n");

  return (
    <div className="p-6 sm:p-8 notebook-paper min-h-full">
      <div className="notebook-margin">
        {passage.title && (
          <h3 className="font-display text-xl font-bold text-[var(--ink-black)] mb-1">
            {passage.title}
          </h3>
        )}
        {passage.author && (
          <p className="font-body text-sm text-[var(--ink-faded)] mb-6 italic">
            — {passage.author}
          </p>
        )}
        <div className="space-y-5">
          {paragraphs.map((para, i) => (
            <p
              key={i}
              className="font-body text-[var(--ink-black)] leading-relaxed text-base"
            >
              {para}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ANSWER OPTION BUTTON
// ─────────────────────────────────────────────────────────

function AnswerOptionButton({
  optionKey,
  content,
  isSelected,
  isCrossedOut,
  isCorrect,
  isReviewMode,
  userSelected,
  onSelect,
  onCrossOut,
}: {
  optionKey: string;
  content: string;
  isSelected: boolean;
  isCrossedOut: boolean;
  isCorrect: boolean;
  isReviewMode: boolean;
  userSelected: boolean;
  onSelect: () => void;
  onCrossOut: () => void;
}) {
  let containerClass = "answer-option";
  let keyClass = "bg-white border-[var(--paper-lines)] text-[var(--ink-faded)]";

  if (isReviewMode) {
    if (isCorrect) {
      containerClass = "answer-option correct";
      keyClass = "bg-[var(--grass-dark)] border-[var(--grass-dark)] text-white";
    } else if (userSelected && !isCorrect) {
      containerClass = "answer-option incorrect";
      keyClass = "bg-[var(--barn-red)] border-[var(--barn-red)] text-white";
    }
  } else if (isSelected) {
    containerClass = "answer-option selected";
    keyClass = "bg-[var(--grass-dark)] border-[var(--grass-dark)] text-white";
  }

  return (
    <div className="flex items-center gap-2">
      <button
        onClick={onSelect}
        disabled={isCrossedOut && !isReviewMode}
        className={`flex-1 flex items-center gap-3 sm:gap-4 p-3 sm:p-4 rounded-lg transition-all font-body ${containerClass} ${
          isCrossedOut ? "opacity-40" : ""
        }`}
      >
        <span
          className={`w-8 h-8 sm:w-10 sm:h-10 flex items-center justify-center rounded-full border-2 font-semibold transition-colors text-sm sm:text-base ${keyClass}`}
        >
          {optionKey}
        </span>
        <span
          className={`flex-1 text-left text-[var(--ink-black)] text-sm sm:text-base ${
            isCrossedOut ? "line-through text-[var(--ink-faded)]" : ""
          }`}
        >
          {content}
        </span>
      </button>
      {!isReviewMode && (
        <button
          onClick={onCrossOut}
          className={`p-2 rounded-lg hover:bg-[var(--paper-aged)] transition-colors hidden sm:block ${
            isCrossedOut ? "text-[var(--barn-red)]" : "text-[var(--ink-faded)]"
          }`}
          title={isCrossedOut ? "Restore option" : "Cross out option"}
        >
          <X className="w-5 h-5" />
        </button>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// ONBOARDING MODAL
// ─────────────────────────────────────────────────────────

function OnboardingModal({
  onStart,
  isLoading,
  onClose,
  initialMode,
  initialSection,
}: {
  onStart: (params: { mode: ExamMode; section: SectionId }) => void;
  isLoading: boolean;
  onClose: () => void;
  initialMode?: string | null;
  initialSection?: string | null;
}) {
  const [step, setStep] = useState<OnboardingStep>("goal");
  const [selectedGoal, setSelectedGoal] = useState<GoalId | null>(null);
  const [selectedMode, setSelectedMode] = useState<ModeId | null>(
    initialMode === "timed" ? "timed" : null
  );
  const [selectedSection, setSelectedSection] = useState<SectionId | null>(
    initialSection as SectionId | null
  );

  const modes = useMemo(() => createModes(selectedGoal), [selectedGoal]);

  // Skip to section if mode is pre-selected
  useEffect(() => {
    if (initialMode === "timed") {
      setStep("section");
    }
  }, [initialMode]);

  const handleStart = () => {
    if (selectedMode && selectedSection) {
      const examMode: ExamMode = selectedMode === "timed" ? "sat" : "practice";
      onStart({ mode: examMode, section: selectedSection });
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card-paper max-w-lg w-full p-6 sm:p-8 rounded-2xl relative max-h-[90vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[var(--paper-aged)] text-[var(--ink-faded)]"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Goal Step */}
        {step === "goal" && (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-gradient-to-br from-[var(--grass-light)] to-[var(--grass-dark)] rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Leaf className="w-8 h-8 text-white" />
              </div>
              <h2 className="font-display text-2xl font-bold text-[var(--ink-black)]">
                What's your goal?
              </h2>
            </div>
            <div className="space-y-3">
              {GOALS.map((goal) => (
                <button
                  key={goal.id}
                  onClick={() => {
                    setSelectedGoal(goal.id);
                    setStep("mode");
                  }}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all font-body ${
                    selectedGoal === goal.id
                      ? "border-[var(--grass-dark)] bg-[var(--grass-light)]/20"
                      : "border-[var(--paper-lines)] hover:border-[var(--grass-medium)] bg-white"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{goal.icon}</span>
                    <div>
                      <div className="font-semibold text-[var(--ink-black)]">
                        {goal.label}
                      </div>
                      <div className="text-sm text-[var(--ink-faded)]">
                        {goal.desc}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Mode Step */}
        {step === "mode" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-[var(--ink-black)]">
                Choose your mode
              </h2>
            </div>
            <div className="space-y-3">
              {modes.map((mode) => (
                <button
                  key={mode.id}
                  onClick={() => {
                    setSelectedMode(mode.id);
                    setStep("section");
                  }}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all font-body ${
                    selectedMode === mode.id
                      ? "border-[var(--grass-dark)] bg-[var(--grass-light)]/20"
                      : "border-[var(--paper-lines)] hover:border-[var(--grass-medium)] bg-white"
                  }`}
                >
                  <div className="flex items-center gap-4">
                    <span className="text-2xl">{mode.icon}</span>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-[var(--ink-black)]">
                          {mode.label}
                        </span>
                        {mode.recommended && (
                          <span className="text-xs px-2 py-0.5 bg-[var(--grass-dark)] text-white rounded-full">
                            Recommended
                          </span>
                        )}
                      </div>
                      <div className="text-sm text-[var(--ink-faded)]">
                        {mode.desc}
                      </div>
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <button
              onClick={() => setStep("goal")}
              className="text-[var(--ink-faded)] hover:text-[var(--ink-black)] font-body flex items-center gap-1"
            >
              <ChevronLeft className="w-4 h-4" /> Back
            </button>
          </div>
        )}

        {/* Section Step */}
        {step === "section" && (
          <div className="space-y-6">
            <div className="text-center">
              <h2 className="font-display text-2xl font-bold text-[var(--ink-black)]">
                What do you want to practice?
              </h2>
            </div>
            <div className="space-y-3">
              {SECTIONS.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setSelectedSection(section.id)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all font-body ${
                    selectedSection === section.id
                      ? "border-[var(--grass-dark)] bg-[var(--grass-light)]/20"
                      : "border-[var(--paper-lines)] hover:border-[var(--grass-medium)] bg-white"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                      <span className="text-2xl">{section.icon}</span>
                      <span className="font-semibold text-[var(--ink-black)]">
                        {section.label}
                      </span>
                    </div>
                    <div className="text-sm text-[var(--ink-faded)]">
                      {section.questions} questions
                    </div>
                  </div>
                </button>
              ))}
            </div>
            <div className="flex justify-between items-center pt-4">
              <button
                onClick={() => setStep(initialMode ? "section" : "mode")}
                className="text-[var(--ink-faded)] hover:text-[var(--ink-black)] font-body flex items-center gap-1"
              >
                <ChevronLeft className="w-4 h-4" /> Back
              </button>
              <button
                onClick={handleStart}
                disabled={!selectedSection || isLoading}
                className="btn-grass flex items-center gap-2"
              >
                {isLoading ? (
                  "Loading..."
                ) : (
                  <>
                    Start Practice <ChevronRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// RESULTS SCREEN
// ─────────────────────────────────────────────────────────

function ResultsScreen({
  questions,
  answers,
  onRestart,
  onReview,
  onHome,
}: {
  questions: Question[];
  answers: Map<string, LocalUserAnswer>;
  onRestart: () => void;
  onReview: () => void;
  onHome: () => void;
}) {
  const stats = useMemo(() => {
    let correct = 0;
    let attempted = 0;
    const bySection = {
      reading_writing: { correct: 0, total: 0 },
      math: { correct: 0, total: 0 },
    };

    questions.forEach((q) => {
      const answer = answers.get(q._id);
      bySection[q.category].total++;

      if (answer?.selectedAnswer) {
        attempted++;
        if (answer.selectedAnswer === q.correctAnswer) {
          correct++;
          bySection[q.category].correct++;
        }
      }
    });

    return {
      correct,
      attempted,
      total: questions.length,
      bySection,
    };
  }, [questions, answers]);

  const percentage = stats.total > 0 ? Math.round((stats.correct / stats.total) * 100) : 0;

  const rwRaw = stats.bySection.reading_writing.correct;
  const rwTotal = stats.bySection.reading_writing.total;
  const mathRaw = stats.bySection.math.correct;
  const mathTotal = stats.bySection.math.total;
  const rwScaled = rwTotal > 0 ? Math.round(200 + (rwRaw / 54) * 600) : 200;
  const mathScaled = mathTotal > 0 ? Math.round(200 + (mathRaw / 44) * 600) : 200;
  const totalScaled = rwScaled + mathScaled;

  return (
    <div className="min-h-screen bg-[var(--paper-cream)] flex items-center justify-center p-4 sm:p-8">
      <div className="max-w-2xl w-full space-y-6 sm:space-y-8">
        <div className="text-center">
          <div className="w-16 sm:w-20 h-16 sm:h-20 bg-gradient-to-br from-[var(--grass-light)] to-[var(--grass-dark)] rounded-2xl flex items-center justify-center mx-auto mb-4 sm:mb-6">
            <Leaf className="w-8 sm:w-10 h-8 sm:h-10 text-white" />
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--ink-black)] mb-2">
            Your Results
          </h1>
          <p className="font-body text-[var(--ink-faded)]">
            Great effort! Here's how you did.
          </p>
        </div>

        {/* Score Circle */}
        <div className="relative w-44 sm:w-56 h-44 sm:h-56 mx-auto">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="var(--paper-lines)"
              strokeWidth="16"
            />
            <circle
              cx="50%"
              cy="50%"
              r="45%"
              fill="none"
              stroke="var(--grass-dark)"
              strokeWidth="16"
              strokeLinecap="round"
              strokeDasharray={`${percentage * 2.83} 283`}
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="font-display text-4xl sm:text-5xl font-bold text-[var(--ink-black)]">
              {totalScaled}
            </span>
            <span className="font-body text-sm text-[var(--ink-faded)]">out of 1600</span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 gap-3 sm:gap-4">
          <div className="card-paper p-4 sm:p-6 rounded-xl text-center">
            <div className="font-display text-2xl sm:text-3xl font-bold text-[var(--grass-dark)]">
              {rwScaled}
            </div>
            <div className="font-body text-xs sm:text-sm text-[var(--ink-faded)] mb-1">
              Reading & Writing
            </div>
            <div className="font-body text-xs text-[var(--ink-faded)]">
              {rwRaw}/{rwTotal} correct
            </div>
          </div>
          <div className="card-paper p-4 sm:p-6 rounded-xl text-center">
            <div className="font-display text-2xl sm:text-3xl font-bold text-[var(--grass-dark)]">
              {mathScaled}
            </div>
            <div className="font-body text-xs sm:text-sm text-[var(--ink-faded)] mb-1">
              Math
            </div>
            <div className="font-body text-xs text-[var(--ink-faded)]">
              {mathRaw}/{mathTotal} correct
            </div>
          </div>
        </div>

        {/* Overall Stats */}
        <div className="card-paper p-4 sm:p-6 rounded-xl text-center">
          <div className="font-display text-lg sm:text-xl text-[var(--ink-black)]">
            {stats.correct} / {stats.total} questions correct ({percentage}%)
          </div>
          <div className="font-body text-sm text-[var(--ink-faded)]">
            {stats.attempted} questions attempted
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <button
            onClick={onHome}
            className="btn-outline-wood flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" /> Dashboard
          </button>
          <button
            onClick={onReview}
            className="btn-outline-wood flex items-center justify-center gap-2"
          >
            <Eye className="w-4 h-4" /> Review Answers
          </button>
          <button onClick={onRestart} className="btn-grass flex items-center justify-center gap-2">
            <RotateCcw className="w-4 h-4" /> New Test
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// EXAM SCREEN (Mobile Responsive)
// ─────────────────────────────────────────────────────────

function ExamScreen({
  questions,
  mode,
  onComplete,
  onExit,
  attemptId,
}: {
  questions: Question[];
  mode: ExamMode;
  onComplete: () => void;
  onExit: () => void;
  attemptId: Id<"examAttempts">;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState<Map<string, LocalUserAnswer>>(new Map());
  const [timeRemaining, setTimeRemaining] = useState(
    mode === "sat" ? SAT_CONFIG.totalTimeMinutes * 60 : 0
  );
  const [isReviewMode, setIsReviewMode] = useState(false);
  const [showNav, setShowNav] = useState(false);
  const [showPassage, setShowPassage] = useState(false);

  const saveAnswer = useMutation(api.answers.saveAnswer);

  const currentQuestion = questions[currentIndex];

  useEffect(() => {
    if (mode !== "sat" || isReviewMode) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => {
        if (prev <= 1) {
          onComplete();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(interval);
  }, [mode, isReviewMode, onComplete]);

  const handleSaveAnswer = useCallback(
    async (questionId: Id<"questions">, answer: LocalUserAnswer) => {
      try {
        await saveAnswer({
          attemptId,
          questionId,
          selectedAnswer: answer.selectedAnswer,
          flagged: answer.flagged,
          crossedOut: answer.crossedOut,
          timeSpentMs: answer.timeSpentMs,
        });
      } catch (error) {
        console.error("Failed to save answer:", error);
      }
    },
    [attemptId, saveAnswer]
  );

  const handleSelectAnswer = useCallback(
    (optionKey: string) => {
      if (!currentQuestion || isReviewMode) return;

      const questionId = currentQuestion._id;
      const existing = answers.get(questionId);

      const newAnswer: LocalUserAnswer = {
        ...existing,
        selectedAnswer: optionKey,
        flagged: existing?.flagged ?? false,
        crossedOut: existing?.crossedOut ?? [],
        timeSpentMs: existing?.timeSpentMs ?? 0,
      };

      setAnswers((prev) => new Map(prev).set(questionId, newAnswer));
      handleSaveAnswer(questionId, newAnswer);
    },
    [currentQuestion, isReviewMode, answers, handleSaveAnswer]
  );

  const handleToggleFlag = useCallback(() => {
    if (!currentQuestion || isReviewMode) return;

    const questionId = currentQuestion._id;
    const existing = answers.get(questionId);

    const newAnswer: LocalUserAnswer = {
      ...existing,
      selectedAnswer: existing?.selectedAnswer,
      flagged: !(existing?.flagged ?? false),
      crossedOut: existing?.crossedOut ?? [],
      timeSpentMs: existing?.timeSpentMs ?? 0,
    };

    setAnswers((prev) => new Map(prev).set(questionId, newAnswer));
    handleSaveAnswer(questionId, newAnswer);
  }, [currentQuestion, isReviewMode, answers, handleSaveAnswer]);

  const handleCrossOut = useCallback(
    (optionKey: string) => {
      if (!currentQuestion || isReviewMode) return;

      const questionId = currentQuestion._id;
      const existing = answers.get(questionId);
      const currentCrossedOut = existing?.crossedOut ?? [];

      const newCrossedOut = currentCrossedOut.includes(optionKey)
        ? currentCrossedOut.filter((k) => k !== optionKey)
        : [...currentCrossedOut, optionKey];

      const newAnswer: LocalUserAnswer = {
        ...existing,
        selectedAnswer: existing?.selectedAnswer,
        flagged: existing?.flagged ?? false,
        crossedOut: newCrossedOut,
        timeSpentMs: existing?.timeSpentMs ?? 0,
      };

      setAnswers((prev) => new Map(prev).set(questionId, newAnswer));
      handleSaveAnswer(questionId, newAnswer);
    },
    [currentQuestion, isReviewMode, answers, handleSaveAnswer]
  );

  const handleNext = useCallback(() => {
    if (currentIndex < questions.length - 1) {
      setCurrentIndex((prev) => prev + 1);
      setShowPassage(false);
    }
  }, [currentIndex, questions.length]);

  const handlePrev = useCallback(() => {
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
      setShowPassage(false);
    }
  }, [currentIndex]);

  const handleSubmit = useCallback(() => {
    if (isReviewMode) {
      onExit();
    } else {
      onComplete();
    }
  }, [isReviewMode, onComplete, onExit]);

  if (!currentQuestion) {
    return (
      <div className="min-h-screen bg-[var(--paper-cream)] flex items-center justify-center">
        <p className="font-body text-[var(--ink-faded)]">Loading questions...</p>
      </div>
    );
  }

  const currentAnswer = answers.get(currentQuestion._id);
  const isReadingWriting = currentQuestion.category === "reading_writing";

  return (
    <div className="min-h-screen flex flex-col bg-[var(--paper-cream)]">
      {/* Header */}
      <header className="exam-header px-4 sm:px-6 py-3 sm:py-4 shadow-md">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <div className="flex items-center gap-2 sm:gap-4">
            <div className="flex items-center gap-2">
              <Leaf className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
              <span className="font-display text-base sm:text-lg font-bold text-white hidden sm:block">
                GreenScore
              </span>
            </div>
            <div className="h-6 w-px bg-white/20 hidden sm:block" />
            <span className="font-body text-xs sm:text-sm text-white/80">
              {currentIndex + 1} / {questions.length}
            </span>
            <span className="font-body text-xs px-2 py-1 bg-white/10 rounded-full text-white/80 hidden md:block">
              {formatDomain(currentQuestion.domain)}
            </span>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {mode === "sat" && (
              <Timer seconds={timeRemaining} isWarning={timeRemaining < 300} />
            )}
            {/* Mobile passage toggle for R&W */}
            {isReadingWriting && (
              <button
                onClick={() => setShowPassage(!showPassage)}
                className={`p-2 rounded-lg transition-colors lg:hidden ${
                  showPassage
                    ? "bg-white/20 text-white"
                    : "hover:bg-white/10 text-white/80"
                }`}
              >
                <BookOpen className="w-5 h-5" />
              </button>
            )}
            <button
              onClick={() => setShowNav(!showNav)}
              className={`p-2 rounded-lg transition-colors ${
                showNav
                  ? "bg-white/20 text-white"
                  : "hover:bg-white/10 text-white/80"
              }`}
            >
              <Grid3X3 className="w-5 h-5" />
            </button>
            <button
              onClick={handleToggleFlag}
              className={`p-2 rounded-lg transition-colors ${
                currentAnswer?.flagged
                  ? "bg-[var(--sunflower)] text-[var(--ink-black)]"
                  : "hover:bg-white/10 text-white/80"
              }`}
            >
              <Flag className="w-5 h-5" />
            </button>
            <button
              onClick={onExit}
              className="p-2 rounded-lg hover:bg-white/10 text-white/80"
            >
              <Home className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Question Navigation Dropdown */}
      {showNav && (
        <div className="px-4 sm:px-6 py-4 bg-[var(--paper-warm)] border-b border-[var(--paper-lines)]">
          <div className="max-w-7xl mx-auto">
            <QuestionNav
              questions={questions}
              answers={answers}
              currentIndex={currentIndex}
              onSelect={(i) => {
                setCurrentIndex(i);
                setShowNav(false);
                setShowPassage(false);
              }}
              onClose={() => setShowNav(false)}
            />
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 flex flex-col lg:flex-row overflow-hidden">
        {/* Passage Panel (for Reading & Writing) - Desktop */}
        {isReadingWriting && (
          <div className="hidden lg:block w-1/2 border-r border-[var(--paper-lines)] overflow-y-auto bg-[var(--paper-cream)]">
            <PassageView passage={currentQuestion.passage ?? null} />
          </div>
        )}

        {/* Mobile Passage Overlay */}
        {isReadingWriting && showPassage && (
          <div className="lg:hidden fixed inset-0 z-40 bg-[var(--paper-cream)] overflow-y-auto pt-16">
            <button
              onClick={() => setShowPassage(false)}
              className="fixed top-20 right-4 z-50 p-2 bg-white rounded-full shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <PassageView passage={currentQuestion.passage ?? null} />
          </div>
        )}

        {/* Question Panel */}
        <div
          className={`flex-1 ${
            isReadingWriting ? "lg:w-1/2" : "max-w-3xl mx-auto w-full"
          } overflow-y-auto p-4 sm:p-6 lg:p-8`}
        >
          <div className="space-y-6 sm:space-y-8">
            {/* Mobile: Show passage button for R&W */}
            {isReadingWriting && !showPassage && (
              <button
                onClick={() => setShowPassage(true)}
                className="lg:hidden w-full card-paper p-4 rounded-xl flex items-center justify-center gap-2 text-[var(--grass-dark)] border-2 border-dashed border-[var(--grass-medium)]"
              >
                <BookOpen className="w-5 h-5" />
                <span className="font-body font-medium">View Passage</span>
              </button>
            )}

            {/* Question Prompt */}
            <div className="question-card p-4 sm:p-6">
              <p className="font-body text-base sm:text-lg text-[var(--ink-black)] leading-relaxed">
                {currentQuestion.prompt}
              </p>
            </div>

            {/* Answer Options */}
            <div className="space-y-2 sm:space-y-3">
              {currentQuestion.options.map((option) => (
                <AnswerOptionButton
                  key={option.key}
                  optionKey={option.key}
                  content={option.content}
                  isSelected={currentAnswer?.selectedAnswer === option.key}
                  isCrossedOut={
                    currentAnswer?.crossedOut?.includes(option.key) ?? false
                  }
                  isCorrect={currentQuestion.correctAnswer === option.key}
                  isReviewMode={isReviewMode}
                  userSelected={currentAnswer?.selectedAnswer === option.key}
                  onSelect={() => handleSelectAnswer(option.key)}
                  onCrossOut={() => handleCrossOut(option.key)}
                />
              ))}
            </div>

            {/* Review Mode: Show Correct Answer */}
            {isReviewMode && (
              <div className="card-paper p-4 sm:p-6 rounded-xl border-2 border-[var(--grass-dark)]">
                <div className="font-body text-sm text-[var(--ink-faded)] mb-2">
                  Correct Answer
                </div>
                <div className="font-display text-xl text-[var(--grass-dark)] font-bold">
                  {currentQuestion.correctAnswer}
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer Navigation */}
      <footer className="bg-[var(--paper-warm)] border-t border-[var(--paper-lines)] px-4 sm:px-6 py-3 sm:py-4">
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          <button
            onClick={handlePrev}
            disabled={currentIndex === 0}
            className="btn-outline-wood flex items-center gap-1 sm:gap-2 disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base px-3 sm:px-4"
          >
            <ChevronLeft className="w-4 h-4" /> <span className="hidden sm:inline">Previous</span>
          </button>

          <div className="flex items-center gap-2 sm:gap-3">
            {currentIndex === questions.length - 1 ? (
              <button
                onClick={handleSubmit}
                className="btn-grass flex items-center gap-1 sm:gap-2 text-sm sm:text-base px-3 sm:px-4"
              >
                <Send className="w-4 h-4" />
                {isReviewMode ? "Exit" : "Submit"}
              </button>
            ) : (
              <button
                onClick={handleNext}
                className="btn-grass flex items-center gap-1 sm:gap-2 text-sm sm:text-base px-3 sm:px-4"
              >
                <span className="hidden sm:inline">Next</span> <ChevronRight className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN PRACTICE PAGE
// ─────────────────────────────────────────────────────────

export default function PracticePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded: isUserLoaded } = useUser();

  const [screen, setScreen] = useState<"onboarding" | "exam" | "results">("onboarding");
  const [mode, setMode] = useState<ExamMode>("practice");
  const [section, setSection] = useState<SectionId>("both");
  const [attemptId, setAttemptId] = useState<Id<"examAttempts"> | null>(null);
  const [visitorId, setVisitorId] = useState<string>("");
  const [localAnswers, setLocalAnswers] = useState<Map<string, LocalUserAnswer>>(new Map());

  useEffect(() => {
    setVisitorId(getVisitorId());
  }, []);

  const initialMode = searchParams.get("mode");
  const initialSection = searchParams.get("section");

  const allQuestions = useQuery(api.questions.getAllQuestions);

  const createAttempt = useMutation(api.attempts.createAttempt);
  const completeAttempt = useMutation(api.attempts.completeAttempt);
  const submitAnswers = useMutation(api.answers.submitAnswers);

  const questions = useMemo(() => {
    if (!allQuestions) return [];

    if (section === "reading_writing") {
      return allQuestions.filter((q) => q.category === "reading_writing");
    } else if (section === "math") {
      return allQuestions.filter((q) => q.category === "math");
    }
    return allQuestions;
  }, [allQuestions, section]);

  const handleStart = useCallback(
    async ({
      mode: newMode,
      section: newSection,
    }: {
      mode: ExamMode;
      section: SectionId;
    }) => {
      setMode(newMode);
      setSection(newSection);
      setLocalAnswers(new Map());

      try {
        const id = await createAttempt({
          visitorId: user?.id ?? visitorId,
          mode: newMode,
        });
        setAttemptId(id);
        setScreen("exam");
      } catch (error) {
        console.error("Failed to create attempt:", error);
      }
    },
    [visitorId, user, createAttempt]
  );

  const handleComplete = useCallback(async () => {
    if (!attemptId) return;

    try {
      await submitAnswers({ attemptId });
      await completeAttempt({ attemptId });
      setScreen("results");
    } catch (error) {
      console.error("Failed to complete attempt:", error);
      setScreen("results");
    }
  }, [attemptId, submitAnswers, completeAttempt]);

  const handleRestart = useCallback(() => {
    setScreen("onboarding");
    setAttemptId(null);
    setLocalAnswers(new Map());
  }, []);

  const handleReview = useCallback(() => {
    setScreen("exam");
  }, []);

  const handleHome = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const handleClose = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const isLoading = allQuestions === undefined;

  // Loading state
  if (!isUserLoaded) {
    return (
      <div className="min-h-screen bg-[var(--paper-cream)] flex items-center justify-center">
        <div className="text-center">
          <Leaf className="w-12 h-12 text-[var(--grass-dark)] mx-auto mb-4 animate-pulse" />
          <p className="font-body text-[var(--ink-faded)]">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      {screen === "onboarding" && (
        <OnboardingModal
          onStart={handleStart}
          isLoading={isLoading}
          onClose={handleClose}
          initialMode={initialMode}
          initialSection={initialSection}
        />
      )}

      {screen === "exam" && attemptId && questions.length > 0 && (
        <ExamScreen
          questions={questions}
          mode={mode}
          onComplete={handleComplete}
          onExit={handleHome}
          attemptId={attemptId}
        />
      )}

      {screen === "results" && (
        <ResultsScreen
          questions={questions}
          answers={localAnswers}
          onRestart={handleRestart}
          onReview={handleReview}
          onHome={handleHome}
        />
      )}

      {screen === "exam" && questions.length === 0 && (
        <div className="min-h-screen bg-[var(--paper-cream)] flex flex-col items-center justify-center gap-4 p-4">
          <AlertCircle className="w-12 h-12 text-[var(--barn-red)]" />
          <p className="font-body text-[var(--ink-faded)] text-center">
            {isLoading
              ? "Loading questions..."
              : "No questions found. Please seed the database first."}
          </p>
          {!isLoading && (
            <button onClick={handleHome} className="btn-outline-wood">
              Go to Dashboard
            </button>
          )}
        </div>
      )}
    </>
  );
}
