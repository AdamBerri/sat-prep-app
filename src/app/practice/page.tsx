"use client";

import { useState, useEffect, useCallback, useMemo, Suspense } from "react";
import { useQuery, useMutation } from "convex/react";
import { useUser } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import type {
  Question,
  ExamMode,
  SectionId,
  LocalUserAnswer,
} from "@/types";
import {
  SAT_CONFIG,
  SECTIONS,
  formatTime,
  formatDomain,
} from "@/lib/constants";
import { MathText } from "@/components/MathText";
import { QuestionFigure } from "@/components/QuestionFigure";
import { getVisitorId } from "@/lib/visitor";
import {
  usePracticeStore,
  useNeedsAttemptCheck,
  useScreen,
  type PendingAttempt,
} from "@/stores/practiceStore";
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
  Calculator,
  PlayCircle,
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
  passage2,
  figure,
  questionSkill,
}: {
  passage: { title?: string; author?: string; content: string } | null;
  passage2?: { title?: string; author?: string; content: string } | null;
  figure?: {
    imageId: Id<"images">;
    figureType?: "graph" | "geometric" | "data_display" | "diagram" | "table";
    caption?: string;
  } | null;
  questionSkill?: string;
}) {
  const hasPassage = passage !== null;
  const hasPassage2 = passage2 !== null && passage2 !== undefined;
  const hasFigure = figure !== null && figure !== undefined;
  const isCrossText = questionSkill === "cross_text_connections" && hasPassage2;
  const isTransitions = questionSkill === "transitions" && hasPassage;
  const isGrammar = questionSkill?.includes("boundaries") ||
                    questionSkill?.includes("verb") ||
                    questionSkill?.includes("pronoun") ||
                    questionSkill?.includes("modifier") ||
                    questionSkill?.includes("genitives");

  // Grammar questions don't need passages
  if (isGrammar) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--ink-faded)] gap-4 p-8">
        <BookOpen className="w-12 h-12 opacity-30" />
        <p className="text-center">This grammar question tests Standard English Conventions.</p>
        <p className="text-sm text-center">Read the sentence carefully and choose the correct option.</p>
      </div>
    );
  }

  // Nothing to show
  if (!hasPassage && !hasFigure) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--ink-faded)] gap-4 p-8">
        <BookOpen className="w-12 h-12 opacity-30" />
        <p>No passage for this question</p>
      </div>
    );
  }

  const paragraphs = passage?.content.split("\n\n") ?? [];

  // Helper function to render passage content with blank highlighting for transitions
  const renderPassageContent = (content: string, isTransitionPassage: boolean) => {
    if (!isTransitionPassage) {
      return content.split("\n\n").map((para, i) => (
        <p
          key={i}
          className="font-body text-[var(--ink-black)] leading-relaxed text-base"
        >
          {para}
        </p>
      ));
    }

    // For transitions, highlight the blank
    const parts = content.split("_____");
    return (
      <div className="font-body text-[var(--ink-black)] leading-relaxed text-base">
        {parts.map((part, i) => (
          <span key={i}>
            {part}
            {i < parts.length - 1 && (
              <span className="inline-block px-3 py-1 bg-[var(--sky-light)] border-2 border-dashed border-[var(--sky-medium)] rounded text-[var(--sky-dark)] font-bold">
                _____
              </span>
            )}
          </span>
        ))}
      </div>
    );
  };

  return (
    <div className="p-6 sm:p-8 bg-[var(--paper-cream)] min-h-full">
      {/* Figure Display (for data interpretation questions) */}
      {hasFigure && (
        <div className="mb-6">
          <QuestionFigure
            imageId={figure.imageId}
            figureType={figure.figureType}
            caption={figure.caption}
            className="w-full"
          />
        </div>
      )}

      {/* Cross-Text: Display TWO passages */}
      {isCrossText && hasPassage && hasPassage2 ? (
        <div className="space-y-8">
          {/* Text 1 */}
          <div className="border-l-4 border-[var(--grass-medium)] pl-4">
            <div className="font-display text-sm font-bold text-[var(--grass-dark)] mb-2">
              Text 1
            </div>
            {passage.title && (
              <h3 className="font-display text-lg font-bold text-[var(--ink-black)] mb-1">
                {passage.title}
              </h3>
            )}
            {passage.author && (
              <p className="font-body text-sm text-[var(--ink-faded)] mb-4 italic">
                — {passage.author}
              </p>
            )}
            <div className="space-y-3">
              {passage.content.split("\n\n").map((para, i) => (
                <p
                  key={i}
                  className="font-body text-[var(--ink-black)] leading-relaxed text-base"
                >
                  {para}
                </p>
              ))}
            </div>
          </div>

          {/* Text 2 */}
          <div className="border-l-4 border-[var(--sky-medium)] pl-4">
            <div className="font-display text-sm font-bold text-[var(--sky-dark)] mb-2">
              Text 2
            </div>
            {passage2.title && (
              <h3 className="font-display text-lg font-bold text-[var(--ink-black)] mb-1">
                {passage2.title}
              </h3>
            )}
            {passage2.author && (
              <p className="font-body text-sm text-[var(--ink-faded)] mb-4 italic">
                — {passage2.author}
              </p>
            )}
            <div className="space-y-3">
              {passage2.content.split("\n\n").map((para, i) => (
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
      ) : (
        /* Regular Passage Display (or Transitions with blank) */
        hasPassage && (
          <div>
            {passage.title && !isTransitions && (
              <h3 className="font-display text-xl font-bold text-[var(--ink-black)] mb-1">
                {passage.title}
              </h3>
            )}
            {passage.author && !isTransitions && (
              <p className="font-body text-sm text-[var(--ink-faded)] mb-6 italic">
                — {passage.author}
              </p>
            )}
            <div className="space-y-5">
              {renderPassageContent(passage.content, isTransitions)}
            </div>
          </div>
        )
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// GRAMMAR SENTENCE HELPER
// ─────────────────────────────────────────────────────────

function renderGrammarSentence(sentence: string): React.ReactNode {
  const parts = sentence.split(/\[([^\]]+)\]/);
  return parts.map((part, i) => {
    if (i % 2 === 1) {
      return (
        <span
          key={i}
          className="underline decoration-2 decoration-blue-500 underline-offset-4 font-medium bg-blue-50 px-1 rounded"
        >
          {part}
        </span>
      );
    }
    return <span key={i}>{part}</span>;
  });
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
          <MathText text={content} />
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
// RESUME PROMPT (for returning users with in-progress session)
// ─────────────────────────────────────────────────────────

function ResumePrompt({
  attempt,
  onContinue,
  onStartFresh,
  onClose,
}: {
  attempt: {
    section?: "reading_writing" | "math";
    mode: string;
    answeredCount: number;
    startedAt: number;
  };
  onContinue: () => void;
  onStartFresh: () => void;
  onClose: () => void;
}) {
  const sectionLabel = attempt.section === "math" ? "Math" :
                       attempt.section === "reading_writing" ? "Reading & Writing" :
                       "Full SAT Test";

  const totalQuestions = attempt.section === "math" ? 44 :
                         attempt.section === "reading_writing" ? 54 : 98;

  const timeAgo = getTimeAgo(attempt.startedAt);

  return (
    <div className="min-h-screen bg-[var(--paper-cream)] flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[var(--paper-aged)] text-[var(--ink-faded)]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="card-paper p-6 sm:p-8 rounded-2xl border-2 border-[var(--grass-medium)]">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-14 h-14 bg-gradient-to-br from-[var(--grass-light)] to-[var(--grass-dark)] rounded-xl flex items-center justify-center">
              <PlayCircle className="w-7 h-7 text-white" />
            </div>
            <div>
              <h2 className="font-display text-xl font-bold text-[var(--ink-black)]">
                Resume Your Session
              </h2>
              <p className="font-body text-sm text-[var(--ink-faded)]">
                You have an in-progress session
              </p>
            </div>
          </div>

          <div className="bg-[var(--paper-warm)] rounded-xl p-4 mb-6">
            <div className="flex items-center gap-3 mb-2">
              {attempt.section === "math" ? (
                <Calculator className="w-5 h-5 text-[var(--grass-dark)]" />
              ) : (
                <BookOpen className="w-5 h-5 text-[var(--grass-dark)]" />
              )}
              <span className="font-display font-semibold text-[var(--ink-black)]">
                {sectionLabel}
              </span>
            </div>
            <div className="font-body text-sm text-[var(--ink-faded)] space-y-1">
              <p>{attempt.answeredCount} of {totalQuestions} questions answered</p>
              <p>Started {timeAgo}</p>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            <button
              onClick={onContinue}
              className="btn-grass flex-1 flex items-center justify-center gap-2"
            >
              <PlayCircle className="w-4 h-4" />
              Continue
            </button>
            <button
              onClick={onStartFresh}
              className="btn-outline-wood flex-1 flex items-center justify-center gap-2"
            >
              Start Fresh
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function getTimeAgo(timestamp: number): string {
  const now = Date.now();
  const diffMs = now - timestamp;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMins / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) return `${diffDays} day${diffDays > 1 ? "s" : ""} ago`;
  if (diffHours > 0) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffMins > 0) return `${diffMins} minute${diffMins > 1 ? "s" : ""} ago`;
  return "just now";
}

// ─────────────────────────────────────────────────────────
// SESSION SELECTOR (main practice selection screen)
// ─────────────────────────────────────────────────────────

function SessionSelector({
  onSelectSection,
  onSelectFullTest,
  onClose,
  isLoading,
}: {
  onSelectSection: (section: SectionId) => void;
  onSelectFullTest: () => void;
  onClose: () => void;
  isLoading: boolean;
}) {
  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: 'radial-gradient(ellipse at center, var(--paper-cream) 0%, var(--paper-warm) 70%, var(--paper-aged) 100%)'
      }}
    >
      <div className="max-w-lg w-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-lg hover:bg-[var(--paper-aged)] text-[var(--ink-faded)]"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-gradient-to-br from-[var(--grass-light)] to-[var(--grass-dark)] rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Leaf className="w-8 h-8 text-white" />
          </div>
          <h1 className="font-display text-2xl font-bold text-[var(--ink-black)]">
            What do you want to practice?
          </h1>
        </div>

        {/* Section Cards */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          {SECTIONS.map((section) => (
            <button
              key={section.id}
              onClick={() => onSelectSection(section.id)}
              disabled={isLoading}
              className="practice-card p-6 rounded-xl text-center group"
            >
              <div className="practice-icon w-12 h-12 bg-[var(--grass-light)]/30 rounded-xl flex items-center justify-center mx-auto mb-3 group-hover:bg-[var(--grass-light)]/50 transition-colors">
                {section.id === "math" ? (
                  <Calculator className="w-6 h-6 text-[var(--grass-dark)]" />
                ) : (
                  <BookOpen className="w-6 h-6 text-[var(--grass-dark)]" />
                )}
              </div>
              <h3 className="font-display font-semibold text-[var(--ink-black)] mb-1">
                {section.label}
              </h3>
              <p className="font-body text-sm text-[var(--ink-faded)]">
                {section.questions} questions
              </p>
              <ChevronRight className="practice-chevron w-5 h-5 text-[var(--grass-dark)] mx-auto mt-2" />
            </button>
          ))}
        </div>

        {/* Full Test Option */}
        <button
          onClick={onSelectFullTest}
          disabled={isLoading}
          className="practice-card w-full p-4 rounded-xl flex items-center gap-4 group"
        >
          <div className="practice-icon w-12 h-12 bg-[var(--wood-light)]/30 rounded-xl flex items-center justify-center">
            <Clock className="w-6 h-6 text-[var(--wood-dark)]" />
          </div>
          <div className="text-left flex-1">
            <h3 className="font-display font-semibold text-[var(--ink-black)]">
              Full SAT Test
            </h3>
            <p className="font-body text-sm text-[var(--ink-faded)]">
              98 questions &bull; 2h 14min &bull; Timed
            </p>
          </div>
          <ChevronRight className="w-5 h-5 text-[var(--ink-faded)] group-hover:text-[var(--wood-dark)] transition-colors" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// FULL TEST CONFIRMATION MODAL
// ─────────────────────────────────────────────────────────

function FullTestConfirmation({
  onConfirm,
  onCancel,
  isLoading,
}: {
  onConfirm: () => void;
  onCancel: () => void;
  isLoading: boolean;
}) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="card-paper max-w-md w-full p-6 sm:p-8 rounded-2xl">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[var(--wood-light)]/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Clock className="w-8 h-8 text-[var(--wood-dark)]" />
          </div>
          <h2 className="font-display text-2xl font-bold text-[var(--ink-black)] mb-2">
            Ready for the full test?
          </h2>
          <p className="font-body text-[var(--ink-faded)]">
            This simulates real SAT conditions
          </p>
        </div>

        <div className="bg-[var(--paper-warm)] rounded-xl p-4 mb-6 space-y-2">
          <div className="flex items-center gap-3 font-body text-sm text-[var(--ink-black)]">
            <span className="w-2 h-2 bg-[var(--grass-dark)] rounded-full" />
            98 questions total
          </div>
          <div className="flex items-center gap-3 font-body text-sm text-[var(--ink-black)]">
            <span className="w-2 h-2 bg-[var(--grass-dark)] rounded-full" />
            2 hours 14 minutes timed
          </div>
          <div className="flex items-center gap-3 font-body text-sm text-[var(--ink-black)]">
            <span className="w-2 h-2 bg-[var(--grass-dark)] rounded-full" />
            Reading & Writing first, then Math
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <button
            onClick={onCancel}
            className="btn-outline-wood flex-1"
            disabled={isLoading}
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="btn-grass flex-1 flex items-center justify-center gap-2"
            disabled={isLoading}
          >
            {isLoading ? "Starting..." : "Start Full Test"}
          </button>
        </div>
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
            Great effort! Here&apos;s how you did.
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
            <Link href="/dashboard" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <Leaf className="w-5 sm:w-6 h-5 sm:h-6 text-white" />
              <span className="font-display text-base sm:text-lg font-bold text-white hidden sm:block">
                the1600Club
              </span>
            </Link>
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
        {/* Passage/Figure Panel (for Reading & Writing) - Desktop */}
        {isReadingWriting && (
          <div className="hidden lg:block w-1/2 border-r border-[var(--paper-lines)] overflow-y-auto bg-[var(--paper-cream)]">
            <PassageView
              passage={currentQuestion.passage ?? null}
              passage2={currentQuestion.passage2 ?? null}
              figure={currentQuestion.figure}
              questionSkill={currentQuestion.skill}
            />
          </div>
        )}

        {/* Mobile Passage/Figure Overlay */}
        {isReadingWriting && showPassage && (
          <div className="lg:hidden fixed inset-0 z-40 bg-[var(--paper-cream)] overflow-y-auto pt-16">
            <button
              onClick={() => setShowPassage(false)}
              className="fixed top-20 right-4 z-50 p-2 bg-white rounded-full shadow-lg"
            >
              <X className="w-5 h-5" />
            </button>
            <PassageView
              passage={currentQuestion.passage ?? null}
              passage2={currentQuestion.passage2 ?? null}
              figure={currentQuestion.figure}
              questionSkill={currentQuestion.skill}
            />
          </div>
        )}

        {/* Question Panel */}
        <div
          className={`flex-1 ${
            isReadingWriting ? "lg:w-1/2" : "max-w-3xl mx-auto w-full"
          } overflow-y-auto p-4 sm:p-6 lg:p-8`}
        >
          <div className="space-y-6 sm:space-y-8">
            {/* Mobile: Show passage/figure button for R&W */}
            {isReadingWriting && !showPassage && (
              <button
                onClick={() => setShowPassage(true)}
                className="lg:hidden w-full card-paper p-4 rounded-xl flex items-center justify-center gap-2 text-[var(--grass-dark)] border-2 border-dashed border-[var(--grass-medium)]"
              >
                <BookOpen className="w-5 h-5" />
                <span className="font-body font-medium">
                  {currentQuestion.passage && currentQuestion.figure
                    ? "View Passage & Figure"
                    : currentQuestion.figure
                      ? "View Figure"
                      : "View Passage"}
                </span>
              </button>
            )}

            {/* Question Figure (for Math questions only - R&W figures shown in left panel) */}
            {!isReadingWriting && currentQuestion.figure && (
              <div className="mb-4">
                <QuestionFigure
                  imageId={currentQuestion.figure.imageId}
                  figureType={currentQuestion.figure.figureType}
                  caption={currentQuestion.figure.caption}
                  className="max-w-md mx-auto"
                />
              </div>
            )}

            {/* Question Prompt */}
            <div className="question-card p-4 sm:p-6">
              <div className="font-body text-base sm:text-lg text-[var(--ink-black)] leading-relaxed">
                {currentQuestion.grammarData?.sentenceWithUnderline ? (
                  // Grammar question: render sentence with underlined portion highlighted
                  <div className="space-y-4">
                    <p className="font-body text-lg text-[var(--ink-black)] leading-relaxed">
                      {renderGrammarSentence(currentQuestion.grammarData.sentenceWithUnderline)}
                    </p>
                    <p className="font-body text-base text-[var(--ink-faded)]">
                      {currentQuestion.prompt}
                    </p>
                  </div>
                ) : (
                  <MathText text={currentQuestion.prompt} />
                )}
              </div>
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

// Wrapper component to handle Suspense for useSearchParams
export default function PracticePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--paper-cream)] flex items-center justify-center">
          <div className="text-center">
            <Leaf className="w-12 h-12 text-[var(--grass-dark)] mx-auto mb-4 animate-pulse" />
            <p className="font-body text-[var(--ink-faded)]">Loading...</p>
          </div>
        </div>
      }
    >
      <PracticePageContent />
    </Suspense>
  );
}

function PracticePageContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user, isLoaded: isUserLoaded } = useUser();

  // Zustand store state and actions
  const phase = usePracticeStore((s) => s.phase);
  const attemptId = usePracticeStore((s) => s.attemptId);
  const mode = usePracticeStore((s) => s.mode);
  const section = usePracticeStore((s) => s.section);
  const pendingAttempt = usePracticeStore((s) => s.pendingAttempt);
  const answers = usePracticeStore((s) => s.answers);

  const initialize = usePracticeStore((s) => s.initialize);
  const showSelector = usePracticeStore((s) => s.showSelector);
  const showConfirmFullTest = usePracticeStore((s) => s.showConfirmFullTest);
  const startSection = usePracticeStore((s) => s.startSection);
  const startFullTest = usePracticeStore((s) => s.startFullTest);
  const sessionCreated = usePracticeStore((s) => s.sessionCreated);
  const resumeSession = usePracticeStore((s) => s.resumeSession);
  const abandonAndStartFresh = usePracticeStore((s) => s.abandonAndStartFresh);
  const completeSession = usePracticeStore((s) => s.completeSession);
  const enterReview = usePracticeStore((s) => s.enterReview);
  const reset = usePracticeStore((s) => s.reset);

  // Derived selectors
  const needsAttemptCheck = useNeedsAttemptCheck();
  const screen = useScreen();

  const [visitorId, setVisitorId] = useState<string>("");
  const [isStarting, setIsStarting] = useState(false);

  useEffect(() => {
    setVisitorId(getVisitorId());
  }, []);

  const urlMode = searchParams.get("mode");
  const urlSection = searchParams.get("section");

  // CRITICAL: Only query when in 'idle' phase - prevents interference during active session
  const currentAttempt = useQuery(
    api.attempts.getCurrentAttempt,
    needsAttemptCheck && visitorId ? { visitorId: user?.id ?? visitorId } : "skip"
  );

  const allQuestions = useQuery(api.questions.getAllQuestions);

  const createAttempt = useMutation(api.attempts.createAttempt);
  const completeAttemptMutation = useMutation(api.attempts.completeAttempt);
  const abandonAttempt = useMutation(api.attempts.abandonAttempt);
  const submitAnswers = useMutation(api.answers.submitAnswers);

  // Initialize store once when data is ready (only in idle phase)
  useEffect(() => {
    if (phase !== "idle") return;
    if (!isUserLoaded) return;
    if (currentAttempt === undefined) return; // Still loading

    // Handle URL params for direct navigation
    if (urlSection === "math" || urlSection === "reading_writing") {
      // Will start section via the handleStartSection flow
      initialize(null);
      return;
    }

    if (urlMode === "timed" || urlMode === "sat") {
      initialize(null);
      showConfirmFullTest();
      return;
    }

    // Initialize with existing attempt (or null)
    const pending: PendingAttempt | null = currentAttempt
      ? {
          id: currentAttempt._id,
          section: currentAttempt.section ?? null,
          mode: currentAttempt.mode as ExamMode,
          answeredCount: currentAttempt.answeredCount,
          startedAt: currentAttempt.startedAt,
        }
      : null;

    initialize(pending);
  }, [phase, isUserLoaded, currentAttempt, urlMode, urlSection, initialize, showConfirmFullTest]);

  // Handle URL-based section start after initialization
  useEffect(() => {
    if (phase !== "selecting") return;
    if (urlSection === "math" || urlSection === "reading_writing") {
      handleStartSection(urlSection as SectionId);
    }
  }, [phase, urlSection]);

  const questions = useMemo(() => {
    if (!allQuestions) return [];

    if (section === "reading_writing") {
      return allQuestions.filter((q) => q.category === "reading_writing");
    } else if (section === "math") {
      return allQuestions.filter((q) => q.category === "math");
    }
    return allQuestions;
  }, [allQuestions, section]);

  const handleStartSection = useCallback(
    async (selectedSection: SectionId) => {
      if (isStarting) return;
      setIsStarting(true);

      // Immediately transition to active phase to prevent query interference
      startSection(selectedSection);

      try {
        const id = await createAttempt({
          visitorId: user?.id ?? visitorId,
          mode: "practice",
          section: selectedSection,
        });
        sessionCreated(id, "practice", selectedSection);
      } catch (error) {
        console.error("Failed to create attempt:", error);
        // Revert to selector on error
        showSelector();
      } finally {
        setIsStarting(false);
      }
    },
    [visitorId, user, createAttempt, isStarting, startSection, sessionCreated, showSelector]
  );

  const handleStartFullTest = useCallback(async () => {
    if (isStarting) return;
    setIsStarting(true);

    // Immediately transition to active phase
    startFullTest();

    try {
      const id = await createAttempt({
        visitorId: user?.id ?? visitorId,
        mode: "sat",
      });
      sessionCreated(id, "sat", null);
    } catch (error) {
      console.error("Failed to create attempt:", error);
      showSelector();
    } finally {
      setIsStarting(false);
    }
  }, [visitorId, user, createAttempt, isStarting, startFullTest, sessionCreated, showSelector]);

  const handleResume = useCallback(() => {
    resumeSession();
  }, [resumeSession]);

  const handleStartFresh = useCallback(async () => {
    if (pendingAttempt) {
      try {
        await abandonAttempt({ attemptId: pendingAttempt.id });
      } catch (error) {
        console.error("Failed to abandon attempt:", error);
      }
    }
    abandonAndStartFresh();
  }, [pendingAttempt, abandonAttempt, abandonAndStartFresh]);

  const handleComplete = useCallback(async () => {
    if (!attemptId) return;

    try {
      await submitAnswers({ attemptId });
      await completeAttemptMutation({ attemptId });
      completeSession();
    } catch (error) {
      console.error("Failed to complete attempt:", error);
      completeSession();
    }
  }, [attemptId, submitAnswers, completeAttemptMutation, completeSession]);

  const handleRestart = useCallback(() => {
    reset();
  }, [reset]);

  const handleReview = useCallback(() => {
    enterReview();
  }, [enterReview]);

  const handleHome = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  const isLoading = allQuestions === undefined;

  // Render based on derived screen
  switch (screen) {
    case "loading":
      return (
        <div className="min-h-screen bg-[var(--paper-cream)] flex items-center justify-center">
          <div className="text-center">
            <Leaf className="w-12 h-12 text-[var(--grass-dark)] mx-auto mb-4 animate-pulse" />
            <p className="font-body text-[var(--ink-faded)]">Loading...</p>
          </div>
        </div>
      );

    case "selector":
      return (
        <SessionSelector
          onSelectSection={handleStartSection}
          onSelectFullTest={showConfirmFullTest}
          onClose={handleHome}
          isLoading={isLoading || isStarting}
        />
      );

    case "resume":
      return pendingAttempt ? (
        <ResumePrompt
          attempt={{
            section: pendingAttempt.section ?? undefined,
            mode: pendingAttempt.mode,
            answeredCount: pendingAttempt.answeredCount,
            startedAt: pendingAttempt.startedAt,
          }}
          onContinue={handleResume}
          onStartFresh={handleStartFresh}
          onClose={handleHome}
        />
      ) : null;

    case "confirm-full-test":
      return (
        <FullTestConfirmation
          onConfirm={handleStartFullTest}
          onCancel={showSelector}
          isLoading={isStarting}
        />
      );

    case "exam":
      if (questions.length === 0) {
        return (
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
        );
      }

      if (!attemptId || !mode) {
        return (
          <div className="min-h-screen bg-[var(--paper-cream)] flex items-center justify-center">
            <div className="text-center">
              <Leaf className="w-12 h-12 text-[var(--grass-dark)] mx-auto mb-4 animate-pulse" />
              <p className="font-body text-[var(--ink-faded)]">Starting session...</p>
            </div>
          </div>
        );
      }

      return (
        <ExamScreen
          questions={questions}
          mode={mode}
          onComplete={handleComplete}
          onExit={handleHome}
          attemptId={attemptId}
        />
      );

    case "results":
      return (
        <ResultsScreen
          questions={questions}
          answers={answers}
          onRestart={handleRestart}
          onReview={handleReview}
          onHome={handleHome}
        />
      );

    default:
      return null;
  }
}
