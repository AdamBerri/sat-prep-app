"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState } from "react";
import {
  XCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Filter,
  BookOpen,
  Calculator,
  Clock,
  Target,
  TrendingUp,
  RefreshCw,
  Lightbulb,
  AlertCircle,
} from "lucide-react";
import Link from "next/link";

type Category = "reading_writing" | "math" | undefined;

export default function WrongAnswersPage() {
  const { user } = useUser();
  const [category, setCategory] = useState<Category>(undefined);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);

  const wrongAnswersData = useQuery(api.progressTracking.getWrongAnswers, {
    visitorId: user?.id ?? "",
    category,
    limit: 50,
  });

  const wrongAnswersCount = useQuery(api.progressTracking.getWrongAnswersCount, {
    visitorId: user?.id ?? "",
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-[var(--ink-black)]">
          Wrong Answers Review
        </h1>
        <p className="font-body text-[var(--ink-faded)] mt-1">
          Learn from your mistakes - review and practice questions you got wrong
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card-paper p-5 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[var(--barn-red)]/10 rounded-lg flex items-center justify-center">
              <XCircle className="w-5 h-5 text-[var(--barn-red)]" />
            </div>
          </div>
          <div className="font-display text-2xl font-bold text-[var(--ink-black)]">
            {wrongAnswersCount?.totalWrongQuestions ?? 0}
          </div>
          <div className="font-body text-sm text-[var(--ink-faded)]">
            Questions to Review
          </div>
        </div>

        <div className="card-paper p-5 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[var(--grass-light)]/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[var(--grass-dark)]" />
            </div>
          </div>
          <div className="font-display text-2xl font-bold text-[var(--grass-dark)]">
            {wrongAnswersCount?.improvedCount ?? 0}
          </div>
          <div className="font-body text-sm text-[var(--ink-faded)]">
            Questions Improved
          </div>
        </div>

        <div className="card-paper p-5 rounded-xl">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-[var(--sunflower)]/20 rounded-lg flex items-center justify-center">
              <RefreshCw className="w-5 h-5 text-orange-500" />
            </div>
          </div>
          <div className="font-display text-2xl font-bold text-[var(--ink-black)]">
            {wrongAnswersCount?.needsReviewCount ?? 0}
          </div>
          <div className="font-body text-sm text-[var(--ink-faded)]">
            Needs Practice
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="card-paper p-4 rounded-xl flex flex-wrap gap-3 items-center">
        <Filter className="w-4 h-4 text-[var(--ink-faded)]" />
        <span className="font-body text-sm text-[var(--ink-faded)]">Filter:</span>
        <button
          onClick={() => setCategory(undefined)}
          className={`px-3 py-1.5 rounded-lg font-body text-sm transition-colors ${
            category === undefined
              ? "bg-[var(--grass-dark)] text-white"
              : "bg-[var(--paper-lines)] text-[var(--ink-faded)] hover:bg-[var(--grass-light)]/30"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setCategory("reading_writing")}
          className={`px-3 py-1.5 rounded-lg font-body text-sm flex items-center gap-2 transition-colors ${
            category === "reading_writing"
              ? "bg-[var(--grass-dark)] text-white"
              : "bg-[var(--paper-lines)] text-[var(--ink-faded)] hover:bg-[var(--grass-light)]/30"
          }`}
        >
          <BookOpen className="w-4 h-4" />
          Reading & Writing
        </button>
        <button
          onClick={() => setCategory("math")}
          className={`px-3 py-1.5 rounded-lg font-body text-sm flex items-center gap-2 transition-colors ${
            category === "math"
              ? "bg-[var(--grass-dark)] text-white"
              : "bg-[var(--paper-lines)] text-[var(--ink-faded)] hover:bg-[var(--grass-light)]/30"
          }`}
        >
          <Calculator className="w-4 h-4" />
          Math
        </button>
      </div>

      {/* Wrong Answers List */}
      <div className="space-y-4">
        {wrongAnswersData === undefined ? (
          // Loading state
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-paper p-6 rounded-xl animate-pulse">
                <div className="h-4 bg-[var(--paper-lines)] rounded w-3/4 mb-3" />
                <div className="h-4 bg-[var(--paper-lines)] rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : wrongAnswersData.wrongAnswers.length === 0 ? (
          // Empty state
          <div className="card-paper p-12 rounded-xl text-center">
            <CheckCircle2 className="w-16 h-16 text-[var(--grass-dark)] mx-auto mb-4 opacity-50" />
            <h3 className="font-display text-xl font-bold text-[var(--ink-black)] mb-2">
              No Wrong Answers Yet!
            </h3>
            <p className="font-body text-[var(--ink-faded)] mb-6">
              {category
                ? `You haven't gotten any ${
                    category === "reading_writing" ? "Reading & Writing" : "Math"
                  } questions wrong yet.`
                : "Keep practicing to see questions to review here."}
            </p>
            <Link href="/endless" className="btn-grass inline-flex items-center gap-2">
              <Target className="w-4 h-4" />
              Start Practicing
            </Link>
          </div>
        ) : (
          // Questions list
          wrongAnswersData.wrongAnswers.map((item: WrongAnswerItem) => (
            <WrongAnswerCard
              key={item.answerId}
              item={item}
              isExpanded={expandedQuestion === item.answerId}
              onToggle={() =>
                setExpandedQuestion(
                  expandedQuestion === item.answerId ? null : item.answerId
                )
              }
            />
          ))
        )}
      </div>

      {/* Pagination info */}
      {wrongAnswersData && wrongAnswersData.total > 0 && (
        <div className="text-center font-body text-sm text-[var(--ink-faded)]">
          Showing {wrongAnswersData.wrongAnswers.length} of {wrongAnswersData.total}{" "}
          questions
        </div>
      )}
    </div>
  );
}

interface WrongAnswerItem {
  answerId: string;
  questionId: string;
  selectedAnswer?: string;
  correctAnswer: string;
  submittedAt?: number;
  timeSpentMs: number;
  category: string;
  domain: string;
  skill: string;
  difficulty: number;
  prompt: string;
  options: { key: string; content: string }[];
  mode?: string;
  hasImproved: boolean;
  totalAttempts: number;
  explanation?: {
    correctExplanation: string;
    wrongAnswerExplanations?: {
      A?: string;
      B?: string;
      C?: string;
      D?: string;
    };
    commonMistakes?: Array<{
      reason: string;
      description: string;
      relatedSkill?: string;
    }>;
  } | null;
}

function WrongAnswerCard({
  item,
  isExpanded,
  onToggle,
}: {
  item: WrongAnswerItem;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const submittedDate = item.submittedAt
    ? new Date(item.submittedAt).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
      })
    : "Unknown date";

  const modeLabel =
    item.mode === "endless"
      ? "Endless Mode"
      : item.mode === "sat"
      ? "Full SAT"
      : item.mode === "practice"
      ? "Practice"
      : "Practice";

  return (
    <div className="card-paper rounded-xl overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-start gap-4 text-left hover:bg-[var(--paper-lines)]/30 transition-colors"
      >
        {/* Status indicator */}
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            item.hasImproved
              ? "bg-[var(--grass-light)]/20"
              : "bg-[var(--barn-red)]/10"
          }`}
        >
          {item.hasImproved ? (
            <CheckCircle2 className="w-5 h-5 text-[var(--grass-dark)]" />
          ) : (
            <XCircle className="w-5 h-5 text-[var(--barn-red)]" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="font-body text-[var(--ink-black)] line-clamp-2">
            {item.prompt}
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--paper-lines)] rounded text-xs font-body text-[var(--ink-faded)]">
              {item.category === "reading_writing" ? (
                <BookOpen className="w-3 h-3" />
              ) : (
                <Calculator className="w-3 h-3" />
              )}
              {formatDomainName(item.domain)}
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[var(--paper-lines)] rounded text-xs font-body text-[var(--ink-faded)]">
              <Clock className="w-3 h-3" />
              {submittedDate}
            </span>
            <span className="px-2 py-0.5 bg-[var(--paper-lines)] rounded text-xs font-body text-[var(--ink-faded)]">
              {modeLabel}
            </span>
            {item.hasImproved && (
              <span className="px-2 py-0.5 bg-[var(--grass-light)]/30 text-[var(--grass-dark)] rounded text-xs font-body font-medium">
                Improved!
              </span>
            )}
          </div>
        </div>

        {/* Answer summary */}
        <div className="flex items-center gap-3 flex-shrink-0">
          <div className="text-right">
            <div className="flex items-center gap-2">
              <span className="font-body text-sm text-[var(--barn-red)]">
                Your: {item.selectedAnswer ?? "?"}
              </span>
              <span className="font-body text-sm text-[var(--ink-faded)]">|</span>
              <span className="font-body text-sm text-[var(--grass-dark)]">
                Correct: {item.correctAnswer}
              </span>
            </div>
          </div>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[var(--ink-faded)]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[var(--ink-faded)]" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-[var(--paper-lines)] p-5 bg-[var(--paper-lines)]/10">
          <div className="space-y-4">
            {/* Full question */}
            <div>
              <h4 className="font-display font-semibold text-[var(--ink-black)] mb-2">
                Question
              </h4>
              <p className="font-body text-[var(--ink-black)]">{item.prompt}</p>
            </div>

            {/* Answer options */}
            <div>
              <h4 className="font-display font-semibold text-[var(--ink-black)] mb-2">
                Answer Choices
              </h4>
              <div className="space-y-2">
                {item.options.map((option) => {
                  const isCorrect = option.key === item.correctAnswer;
                  const isSelected = option.key === item.selectedAnswer;
                  return (
                    <div
                      key={option.key}
                      className={`p-3 rounded-lg border-2 ${
                        isCorrect
                          ? "border-[var(--grass-dark)] bg-[var(--grass-light)]/10"
                          : isSelected
                          ? "border-[var(--barn-red)] bg-[var(--barn-red)]/5"
                          : "border-[var(--paper-lines)] bg-white"
                      }`}
                    >
                      <div className="flex items-start gap-3">
                        <span
                          className={`font-display font-bold ${
                            isCorrect
                              ? "text-[var(--grass-dark)]"
                              : isSelected
                              ? "text-[var(--barn-red)]"
                              : "text-[var(--ink-faded)]"
                          }`}
                        >
                          {option.key})
                        </span>
                        <span className="font-body text-[var(--ink-black)]">
                          {option.content}
                        </span>
                        {isCorrect && (
                          <CheckCircle2 className="w-5 h-5 text-[var(--grass-dark)] ml-auto flex-shrink-0" />
                        )}
                        {isSelected && !isCorrect && (
                          <XCircle className="w-5 h-5 text-[var(--barn-red)] ml-auto flex-shrink-0" />
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Explanation */}
            {item.explanation && (
              <div className="space-y-4">
                {/* Why the correct answer is right */}
                <div className="bg-[var(--grass-light)]/10 border border-[var(--grass-medium)]/30 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <Lightbulb className="w-5 h-5 text-[var(--grass-dark)] flex-shrink-0 mt-0.5" />
                    <div>
                      <h5 className="font-display font-semibold text-[var(--grass-dark)] mb-1">
                        Why {item.correctAnswer} is correct
                      </h5>
                      <p className="font-body text-sm text-[var(--ink-black)]">
                        {item.explanation.correctExplanation}
                      </p>
                    </div>
                  </div>
                </div>

                {/* Why your answer was wrong */}
                {item.selectedAnswer &&
                  item.selectedAnswer !== item.correctAnswer &&
                  item.explanation.wrongAnswerExplanations?.[
                    item.selectedAnswer as "A" | "B" | "C" | "D"
                  ] && (
                    <div className="bg-[var(--barn-red)]/5 border border-[var(--barn-red)]/20 rounded-xl p-4">
                      <div className="flex items-start gap-3">
                        <AlertCircle className="w-5 h-5 text-[var(--barn-red)] flex-shrink-0 mt-0.5" />
                        <div>
                          <h5 className="font-display font-semibold text-[var(--barn-red)] mb-1">
                            Why {item.selectedAnswer} is incorrect
                          </h5>
                          <p className="font-body text-sm text-[var(--ink-black)]">
                            {
                              item.explanation.wrongAnswerExplanations[
                                item.selectedAnswer as "A" | "B" | "C" | "D"
                              ]
                            }
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                {/* Common mistakes */}
                {item.explanation.commonMistakes &&
                  item.explanation.commonMistakes.length > 0 && (
                    <div className="bg-[var(--sunflower)]/10 border border-[var(--sunflower)]/30 rounded-xl p-4">
                      <h5 className="font-display font-semibold text-[var(--ink-black)] mb-2 flex items-center gap-2">
                        <Target className="w-4 h-4 text-orange-500" />
                        Common Mistakes
                      </h5>
                      <ul className="space-y-2">
                        {item.explanation.commonMistakes.map((mistake, idx) => (
                          <li
                            key={idx}
                            className="font-body text-sm text-[var(--ink-black)]"
                          >
                            {mistake.description}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
              </div>
            )}

            {/* No explanation available */}
            {!item.explanation && (
              <div className="bg-[var(--paper-aged)] rounded-xl p-4 text-center">
                <p className="font-body text-sm text-[var(--ink-faded)]">
                  No explanation available yet. This question is pending review.
                </p>
              </div>
            )}

            {/* Stats */}
            <div className="flex flex-wrap gap-4 pt-2 text-sm font-body text-[var(--ink-faded)]">
              <span>Attempts: {item.totalAttempts}</span>
              <span>
                Time spent: {Math.round(item.timeSpentMs / 1000)}s
              </span>
              <span>Skill: {formatSkillName(item.skill)}</span>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-2">
              <Link
                href="/endless"
                className="btn-grass text-sm flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" />
                Practice Similar
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function formatDomainName(domain: string): string {
  const names: Record<string, string> = {
    craft_and_structure: "Craft & Structure",
    information_and_ideas: "Information & Ideas",
    standard_english_conventions: "Standard English",
    expression_of_ideas: "Expression of Ideas",
    algebra: "Algebra",
    advanced_math: "Advanced Math",
    problem_solving: "Problem Solving",
    geometry_and_trig: "Geometry & Trig",
  };
  return names[domain] || domain.replace(/_/g, " ");
}

function formatSkillName(skill: string): string {
  return skill
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
