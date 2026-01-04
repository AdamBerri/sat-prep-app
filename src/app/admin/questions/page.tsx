"use client";

import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useState, useEffect, useMemo } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Filter,
  BookOpen,
  Calculator,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  CheckCircle,
  XCircle,
  Clock,
  AlertTriangle,
  Flag,
  Lightbulb,
  AlertCircle,
  BarChart3,
  SortAsc,
  SortDesc,
  X,
} from "lucide-react";
import { Id } from "../../../../convex/_generated/dataModel";
import { MathText } from "@/components/MathText";

type Category = "reading_writing" | "math" | undefined;
type ReviewStatus =
  | "pending"
  | "verified"
  | "needs_revision"
  | "rejected"
  | "flagged_high_error"
  | undefined;
type SortBy = "createdAt" | "errorRate" | "difficulty" | "totalAttempts";
type SortOrder = "asc" | "desc";

interface QuestionWithDetails {
  _id: Id<"questions">;
  _creationTime: number;
  type: "multiple_choice" | "grid_in";
  category: "reading_writing" | "math";
  domain: string;
  skill: string;
  difficulty: number;
  overallDifficulty?: number;
  prompt: string;
  correctAnswer: string;
  reviewStatus?: string;
  figure?: {
    imageId: Id<"images">;
    figureType?: string;
    caption?: string;
  };
  figureUrl: string | null;
  options: Array<{
    _id: Id<"answerOptions">;
    key: string;
    content: string;
    order: number;
    imageUrl: string | null;
  }>;
  explanation: {
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
  passage: {
    content: string;
    title?: string;
    author?: string;
  } | null;
  passage2: {
    content: string;
    title?: string;
    author?: string;
  } | null;
  grammarData?: {
    sentenceWithUnderline: string;
    underlinedPortion: string;
    grammarRule: string;
  };
  stats: {
    totalAttempts: number;
    correctAttempts: number;
    errorRate: number;
    answerDistribution: {
      A: number;
      B: number;
      C: number;
      D: number;
    };
    mostCommonWrongAnswer?: string;
    flaggedForReview: boolean;
  } | null;
  source?: {
    type: string;
    testNumber?: number;
    year?: number;
  };
  generationMetadata?: {
    generatedAt: number;
    agentVersion: string;
  };
}

export default function AdminQuestionsPage() {
  const searchParams = useSearchParams();
  const router = useRouter();

  // Initialize filters from URL params
  const [filters, setFilters] = useState({
    category: (searchParams.get("category") as Category) || undefined,
    domain: searchParams.get("domain") || undefined,
    skill: searchParams.get("skill") || undefined,
    reviewStatus: (searchParams.get("reviewStatus") as ReviewStatus) || undefined,
    hasImage: searchParams.get("hasImage") === "true" ? true : undefined,
    searchQuery: searchParams.get("q") || "",
    sortBy: (searchParams.get("sortBy") as SortBy) || "createdAt",
    sortOrder: (searchParams.get("sortOrder") as SortOrder) || "desc",
  });

  const [debouncedSearch, setDebouncedSearch] = useState(filters.searchQuery);
  const [expandedQuestion, setExpandedQuestion] = useState<string | null>(null);
  const [cursor, setCursor] = useState<number | undefined>(undefined);
  const [allQuestions, setAllQuestions] = useState<QuestionWithDetails[]>([]);

  // Debounce search
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(filters.searchQuery), 300);
    return () => clearTimeout(timer);
  }, [filters.searchQuery]);

  // Reset pagination when filters change
  useEffect(() => {
    setCursor(undefined);
    setAllQuestions([]);
  }, [
    filters.category,
    filters.domain,
    filters.skill,
    filters.reviewStatus,
    filters.hasImage,
    debouncedSearch,
    filters.sortBy,
    filters.sortOrder,
  ]);

  // Fetch filter options
  const filterOptions = useQuery(api.admin.getFilterOptions);

  // Fetch questions
  const questionsData = useQuery(api.admin.listQuestionsForAdmin, {
    cursor,
    limit: 25,
    category: filters.category,
    domain: filters.domain,
    skill: filters.skill,
    reviewStatus: filters.reviewStatus,
    hasImage: filters.hasImage,
    searchQuery: debouncedSearch || undefined,
    sortBy: filters.sortBy,
    sortOrder: filters.sortOrder,
  });

  // Append new questions when data arrives
  useEffect(() => {
    if (questionsData?.questions) {
      if (cursor === undefined) {
        setAllQuestions(questionsData.questions as QuestionWithDetails[]);
      } else {
        setAllQuestions((prev) => [
          ...prev,
          ...(questionsData.questions as QuestionWithDetails[]),
        ]);
      }
    }
  }, [questionsData, cursor]);

  // Get skills for selected domain
  const availableSkills = useMemo(() => {
    if (!filterOptions || !filters.domain) return filterOptions?.skills || [];
    return filterOptions.domainToSkills[filters.domain] || [];
  }, [filterOptions, filters.domain]);

  const updateFilter = <K extends keyof typeof filters>(
    key: K,
    value: (typeof filters)[K]
  ) => {
    setFilters((prev) => {
      const newFilters = { ...prev, [key]: value };
      // Reset skill when domain changes
      if (key === "domain") {
        newFilters.skill = undefined;
      }
      return newFilters;
    });
  };

  const clearFilters = () => {
    setFilters({
      category: undefined,
      domain: undefined,
      skill: undefined,
      reviewStatus: undefined,
      hasImage: undefined,
      searchQuery: "",
      sortBy: "createdAt",
      sortOrder: "desc",
    });
  };

  const hasActiveFilters =
    filters.category ||
    filters.domain ||
    filters.skill ||
    filters.reviewStatus ||
    filters.hasImage !== undefined ||
    filters.searchQuery;

  const loadMore = () => {
    if (questionsData?.nextCursor !== null) {
      setCursor(questionsData?.nextCursor ?? undefined);
    }
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-[var(--ink-black)]">
          Question Browser
        </h1>
        <p className="font-body text-[var(--ink-faded)] mt-1">
          Search and review all questions in the database
        </p>
      </div>

      {/* Search and Filters */}
      <div className="card-paper p-4 rounded-xl space-y-4">
        {/* Search bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[var(--ink-faded)]" />
          <input
            type="text"
            placeholder="Search question prompts..."
            value={filters.searchQuery}
            onChange={(e) => updateFilter("searchQuery", e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-[var(--paper-lines)]/50 rounded-xl font-body text-[var(--ink-black)] placeholder:text-[var(--ink-faded)] focus:outline-none focus:ring-2 focus:ring-[var(--grass-dark)]/30"
          />
        </div>

        {/* Filter row */}
        <div className="flex flex-wrap gap-3 items-center">
          <Filter className="w-4 h-4 text-[var(--ink-faded)]" />

          {/* Category toggle */}
          <div className="flex gap-1 bg-[var(--paper-lines)]/50 rounded-lg p-1">
            <button
              onClick={() => updateFilter("category", undefined)}
              className={`px-3 py-1.5 rounded-md font-body text-sm transition-colors ${
                filters.category === undefined
                  ? "bg-white text-[var(--ink-black)] shadow-sm"
                  : "text-[var(--ink-faded)] hover:text-[var(--ink-black)]"
              }`}
            >
              All
            </button>
            <button
              onClick={() => updateFilter("category", "reading_writing")}
              className={`px-3 py-1.5 rounded-md font-body text-sm flex items-center gap-1.5 transition-colors ${
                filters.category === "reading_writing"
                  ? "bg-white text-[var(--ink-black)] shadow-sm"
                  : "text-[var(--ink-faded)] hover:text-[var(--ink-black)]"
              }`}
            >
              <BookOpen className="w-4 h-4" />
              R&W
            </button>
            <button
              onClick={() => updateFilter("category", "math")}
              className={`px-3 py-1.5 rounded-md font-body text-sm flex items-center gap-1.5 transition-colors ${
                filters.category === "math"
                  ? "bg-white text-[var(--ink-black)] shadow-sm"
                  : "text-[var(--ink-faded)] hover:text-[var(--ink-black)]"
              }`}
            >
              <Calculator className="w-4 h-4" />
              Math
            </button>
          </div>

          {/* Domain dropdown */}
          <select
            value={filters.domain || ""}
            onChange={(e) => updateFilter("domain", e.target.value || undefined)}
            className="px-3 py-1.5 bg-[var(--paper-lines)]/50 rounded-lg font-body text-sm text-[var(--ink-black)] focus:outline-none focus:ring-2 focus:ring-[var(--grass-dark)]/30"
          >
            <option value="">All Domains</option>
            {filterOptions?.domains.map((d: string) => (
              <option key={d} value={d}>
                {d.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          {/* Skill dropdown */}
          <select
            value={filters.skill || ""}
            onChange={(e) => updateFilter("skill", e.target.value || undefined)}
            className="px-3 py-1.5 bg-[var(--paper-lines)]/50 rounded-lg font-body text-sm text-[var(--ink-black)] focus:outline-none focus:ring-2 focus:ring-[var(--grass-dark)]/30"
          >
            <option value="">All Skills</option>
            {availableSkills.map((s: string) => (
              <option key={s} value={s}>
                {s.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          {/* Review status dropdown */}
          <select
            value={filters.reviewStatus || ""}
            onChange={(e) =>
              updateFilter("reviewStatus", (e.target.value as ReviewStatus) || undefined)
            }
            className="px-3 py-1.5 bg-[var(--paper-lines)]/50 rounded-lg font-body text-sm text-[var(--ink-black)] focus:outline-none focus:ring-2 focus:ring-[var(--grass-dark)]/30"
          >
            <option value="">All Statuses</option>
            <option value="verified">Verified</option>
            <option value="pending">Pending</option>
            <option value="needs_revision">Needs Revision</option>
            <option value="rejected">Rejected</option>
            <option value="flagged_high_error">Flagged</option>
          </select>

          {/* Has image toggle */}
          <button
            onClick={() =>
              updateFilter(
                "hasImage",
                filters.hasImage === true ? undefined : true
              )
            }
            className={`px-3 py-1.5 rounded-lg font-body text-sm flex items-center gap-1.5 transition-colors ${
              filters.hasImage === true
                ? "bg-orange-100 text-orange-700"
                : "bg-[var(--paper-lines)]/50 text-[var(--ink-faded)] hover:text-[var(--ink-black)]"
            }`}
          >
            <ImageIcon className="w-4 h-4" />
            With Image
          </button>

          {/* Clear filters */}
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="px-3 py-1.5 rounded-lg font-body text-sm text-[var(--barn-red)] hover:bg-red-50 flex items-center gap-1.5"
            >
              <X className="w-4 h-4" />
              Clear
            </button>
          )}

          {/* Spacer */}
          <div className="flex-1" />

          {/* Sort controls */}
          <select
            value={filters.sortBy}
            onChange={(e) => updateFilter("sortBy", e.target.value as SortBy)}
            className="px-3 py-1.5 bg-[var(--paper-lines)]/50 rounded-lg font-body text-sm text-[var(--ink-black)] focus:outline-none"
          >
            <option value="createdAt">Created</option>
            <option value="difficulty">Difficulty</option>
            <option value="errorRate">Error Rate</option>
            <option value="totalAttempts">Attempts</option>
          </select>

          <button
            onClick={() =>
              updateFilter("sortOrder", filters.sortOrder === "asc" ? "desc" : "asc")
            }
            className="p-1.5 bg-[var(--paper-lines)]/50 rounded-lg text-[var(--ink-faded)] hover:text-[var(--ink-black)]"
          >
            {filters.sortOrder === "asc" ? (
              <SortAsc className="w-5 h-5" />
            ) : (
              <SortDesc className="w-5 h-5" />
            )}
          </button>
        </div>
      </div>

      {/* Results count */}
      <div className="flex items-center justify-between">
        <p className="font-body text-sm text-[var(--ink-faded)]">
          Showing {allQuestions.length} of {questionsData?.total ?? 0} questions
        </p>
      </div>

      {/* Questions list */}
      <div className="space-y-4">
        {questionsData === undefined ? (
          // Loading state
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="card-paper p-6 rounded-xl animate-pulse">
                <div className="h-4 bg-slate-200 rounded w-3/4 mb-3" />
                <div className="h-4 bg-slate-200 rounded w-1/2" />
              </div>
            ))}
          </div>
        ) : allQuestions.length === 0 ? (
          // Empty state
          <div className="card-paper p-12 rounded-xl text-center">
            <Search className="w-16 h-16 text-[var(--ink-faded)] mx-auto mb-4 opacity-50" />
            <h3 className="font-display text-xl font-bold text-[var(--ink-black)] mb-2">
              No Questions Found
            </h3>
            <p className="font-body text-[var(--ink-faded)]">
              Try adjusting your search or filters.
            </p>
          </div>
        ) : (
          // Questions list
          allQuestions.map((question) => (
            <QuestionCard
              key={question._id}
              question={question}
              isExpanded={expandedQuestion === question._id}
              onToggle={() =>
                setExpandedQuestion(
                  expandedQuestion === question._id ? null : question._id
                )
              }
            />
          ))
        )}
      </div>

      {/* Load more */}
      {questionsData?.nextCursor !== null && allQuestions.length > 0 && (
        <div className="text-center">
          <button
            onClick={loadMore}
            className="btn-grass"
            disabled={questionsData === undefined}
          >
            Load More
          </button>
        </div>
      )}
    </div>
  );
}

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

function QuestionCard({
  question,
  isExpanded,
  onToggle,
}: {
  question: QuestionWithDetails;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const reviewStatusConfig: Record<
    string,
    { icon: typeof CheckCircle; color: string; bg: string }
  > = {
    verified: {
      icon: CheckCircle,
      color: "text-[var(--grass-dark)]",
      bg: "bg-[var(--grass-light)]/20",
    },
    pending: {
      icon: Clock,
      color: "text-yellow-600",
      bg: "bg-yellow-100",
    },
    needs_revision: {
      icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-100",
    },
    rejected: {
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-100",
    },
    flagged_high_error: {
      icon: Flag,
      color: "text-red-600",
      bg: "bg-red-100",
    },
  };

  const statusConfig = question.reviewStatus
    ? reviewStatusConfig[question.reviewStatus]
    : null;
  const StatusIcon = statusConfig?.icon || Clock;

  return (
    <div className="card-paper rounded-xl overflow-hidden">
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="w-full p-5 flex items-start gap-4 text-left hover:bg-[var(--paper-lines)]/30 transition-colors"
      >
        {/* Category indicator */}
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 ${
            question.category === "reading_writing"
              ? "bg-purple-100 text-purple-600"
              : "bg-blue-100 text-blue-600"
          }`}
        >
          {question.category === "reading_writing" ? (
            <BookOpen className="w-5 h-5" />
          ) : (
            <Calculator className="w-5 h-5" />
          )}
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="font-body text-[var(--ink-black)] line-clamp-2">
            <MathText text={question.prompt} />
          </div>
          <div className="flex flex-wrap gap-2 mt-2">
            {/* Domain badge */}
            <span className="px-2 py-0.5 bg-[var(--paper-lines)] rounded text-xs font-body text-[var(--ink-faded)] capitalize">
              {question.domain.replace(/_/g, " ")}
            </span>
            {/* Skill badge */}
            <span className="px-2 py-0.5 bg-[var(--paper-lines)] rounded text-xs font-body text-[var(--ink-faded)] capitalize">
              {question.skill.replace(/_/g, " ")}
            </span>
            {/* Difficulty */}
            <span className="px-2 py-0.5 bg-[var(--paper-lines)] rounded text-xs font-body text-[var(--ink-faded)]">
              Diff: {((question.overallDifficulty ?? question.difficulty / 3) * 100).toFixed(0)}%
            </span>
            {/* Has image indicator */}
            {question.figureUrl && (
              <span className="px-2 py-0.5 bg-orange-100 text-orange-600 rounded text-xs font-body flex items-center gap-1">
                <ImageIcon className="w-3 h-3" />
                Image
              </span>
            )}
            {/* Review status */}
            {statusConfig && (
              <span
                className={`px-2 py-0.5 rounded text-xs font-body flex items-center gap-1 ${statusConfig.bg} ${statusConfig.color}`}
              >
                <StatusIcon className="w-3 h-3" />
                {question.reviewStatus?.replace(/_/g, " ")}
              </span>
            )}
            {/* Error rate if high */}
            {question.stats && question.stats.errorRate > 0.5 && (
              <span className="px-2 py-0.5 bg-red-100 text-red-600 rounded text-xs font-body">
                {(question.stats.errorRate * 100).toFixed(0)}% error
              </span>
            )}
          </div>
        </div>

        {/* Figure thumbnail */}
        {question.figureUrl && (
          <div className="flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden bg-slate-100">
            <img
              src={question.figureUrl}
              alt="Question figure"
              className="w-full h-full object-contain"
            />
          </div>
        )}

        {/* Expand/collapse */}
        <div className="flex-shrink-0 text-[var(--ink-faded)]">
          {isExpanded ? (
            <ChevronUp className="w-5 h-5" />
          ) : (
            <ChevronDown className="w-5 h-5" />
          )}
        </div>
      </button>

      {/* Expanded content */}
      {isExpanded && (
        <div className="border-t border-[var(--paper-lines)] p-5 bg-[var(--paper-lines)]/10 space-y-6">
          {/* Figure (full size) */}
          {question.figureUrl && (
            <div>
              <h4 className="font-display font-semibold text-[var(--ink-black)] mb-2 flex items-center gap-2">
                <ImageIcon className="w-4 h-4" />
                Figure
              </h4>
              <div className="bg-white rounded-xl p-4 border border-[var(--paper-lines)]">
                <img
                  src={question.figureUrl}
                  alt={question.figure?.caption || "Question figure"}
                  className="max-w-full max-h-96 mx-auto"
                />
                {question.figure?.caption && (
                  <p className="text-center font-body text-sm text-[var(--ink-faded)] mt-2">
                    {question.figure.caption}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Grammar Sentence (if grammar question) */}
          {question.grammarData && (
            <div>
              <h4 className="font-display font-semibold text-[var(--ink-black)] mb-2">
                Sentence
              </h4>
              <div className="bg-white rounded-xl p-4 border border-[var(--paper-lines)]">
                <p className="font-body text-[var(--ink-black)]">
                  {renderGrammarSentence(question.grammarData.sentenceWithUnderline)}
                </p>
                <p className="font-body text-xs text-[var(--ink-faded)] mt-2">
                  Grammar rule: {question.grammarData.grammarRule.replace(/_/g, " ")}
                </p>
              </div>
            </div>
          )}

          {/* Passage(s) for reading questions */}
          {(question.passage || question.passage2) && (
            <div>
              <h4 className="font-display font-semibold text-[var(--ink-black)] mb-2">
                {question.passage2 ? "Passages" : "Passage"}
              </h4>

              {question.passage2 ? (
                // Cross-text: Two passages
                <div className="space-y-4">
                  {/* Text 1 */}
                  <div className="bg-white rounded-xl p-4 border-l-4 border-green-500">
                    <div className="font-display text-sm font-bold text-green-700 mb-2">
                      Text 1
                    </div>
                    {question.passage?.title && (
                      <h5 className="font-display font-semibold text-[var(--ink-black)] mb-1">
                        {question.passage.title}
                      </h5>
                    )}
                    <p className="font-body text-sm text-[var(--ink-black)] whitespace-pre-wrap">
                      {question.passage?.content}
                    </p>
                    {question.passage?.author && (
                      <p className="font-body text-xs text-[var(--ink-faded)] mt-2">
                        — {question.passage.author}
                      </p>
                    )}
                  </div>

                  {/* Text 2 */}
                  <div className="bg-white rounded-xl p-4 border-l-4 border-blue-500">
                    <div className="font-display text-sm font-bold text-blue-700 mb-2">
                      Text 2
                    </div>
                    {question.passage2?.title && (
                      <h5 className="font-display font-semibold text-[var(--ink-black)] mb-1">
                        {question.passage2.title}
                      </h5>
                    )}
                    <p className="font-body text-sm text-[var(--ink-black)] whitespace-pre-wrap">
                      {question.passage2?.content}
                    </p>
                    {question.passage2?.author && (
                      <p className="font-body text-xs text-[var(--ink-faded)] mt-2">
                        — {question.passage2.author}
                      </p>
                    )}
                  </div>
                </div>
              ) : (
                // Single passage
                <div className="bg-white rounded-xl p-4 border border-[var(--paper-lines)] max-h-48 overflow-y-auto">
                  {question.passage?.title && (
                    <h5 className="font-display font-semibold text-[var(--ink-black)] mb-1">
                      {question.passage.title}
                    </h5>
                  )}
                  <p className="font-body text-sm text-[var(--ink-black)] whitespace-pre-wrap">
                    {question.passage?.content}
                  </p>
                  {question.passage?.author && (
                    <p className="font-body text-xs text-[var(--ink-faded)] mt-2">
                      — {question.passage.author}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Full question */}
          <div>
            <h4 className="font-display font-semibold text-[var(--ink-black)] mb-2">
              Question
            </h4>
            <p className="font-body text-[var(--ink-black)]">
              <MathText text={question.prompt} />
            </p>
          </div>

          {/* Answer options */}
          <div>
            <h4 className="font-display font-semibold text-[var(--ink-black)] mb-2">
              Answer Choices
            </h4>
            <div className="space-y-2">
              {question.options.map((option) => {
                const isCorrect = option.key === question.correctAnswer;
                return (
                  <div
                    key={option._id}
                    className={`p-3 rounded-lg border-2 ${
                      isCorrect
                        ? "border-[var(--grass-dark)] bg-[var(--grass-light)]/10"
                        : "border-[var(--paper-lines)] bg-white"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <span
                        className={`font-display font-bold ${
                          isCorrect
                            ? "text-[var(--grass-dark)]"
                            : "text-[var(--ink-faded)]"
                        }`}
                      >
                        {option.key})
                      </span>
                      <div className="flex-1">
                        <span className="font-body text-[var(--ink-black)]">
                          <MathText text={option.content} />
                        </span>
                        {option.imageUrl && (
                          <div className="mt-2">
                            <img
                              src={option.imageUrl}
                              alt={`Option ${option.key}`}
                              className="max-w-xs rounded-lg"
                            />
                          </div>
                        )}
                      </div>
                      {isCorrect && (
                        <CheckCircle className="w-5 h-5 text-[var(--grass-dark)] flex-shrink-0" />
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Explanations */}
          {question.explanation && (
            <div className="space-y-4">
              {/* Correct explanation */}
              <div className="bg-[var(--grass-light)]/10 border border-[var(--grass-medium)]/30 rounded-xl p-4">
                <div className="flex items-start gap-3">
                  <Lightbulb className="w-5 h-5 text-[var(--grass-dark)] flex-shrink-0 mt-0.5" />
                  <div>
                    <h5 className="font-display font-semibold text-[var(--grass-dark)] mb-1">
                      Why {question.correctAnswer} is correct
                    </h5>
                    <p className="font-body text-sm text-[var(--ink-black)]">
                      <MathText text={question.explanation.correctExplanation} />
                    </p>
                  </div>
                </div>
              </div>

              {/* Wrong answer explanations */}
              {question.explanation.wrongAnswerExplanations && (
                <div className="grid sm:grid-cols-2 gap-3">
                  {(["A", "B", "C", "D"] as const).map((key) => {
                    if (key === question.correctAnswer) return null;
                    const explanation =
                      question.explanation?.wrongAnswerExplanations?.[key];
                    if (!explanation) return null;
                    return (
                      <div
                        key={key}
                        className="bg-red-50 border border-red-100 rounded-xl p-3"
                      >
                        <div className="flex items-start gap-2">
                          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                          <div>
                            <h6 className="font-display font-semibold text-red-600 text-sm mb-1">
                              Why {key} is wrong
                            </h6>
                            <p className="font-body text-xs text-[var(--ink-black)]">
                              <MathText text={explanation} />
                            </p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Performance stats */}
          {question.stats && question.stats.totalAttempts > 0 && (
            <div>
              <h4 className="font-display font-semibold text-[var(--ink-black)] mb-3 flex items-center gap-2">
                <BarChart3 className="w-4 h-4" />
                Performance Stats
              </h4>
              <div className="grid sm:grid-cols-3 gap-4">
                <div className="bg-white rounded-xl p-4 border border-[var(--paper-lines)]">
                  <div className="font-display text-2xl font-bold text-[var(--ink-black)]">
                    {question.stats.totalAttempts}
                  </div>
                  <div className="font-body text-sm text-[var(--ink-faded)]">
                    Total Attempts
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-[var(--paper-lines)]">
                  <div
                    className={`font-display text-2xl font-bold ${
                      question.stats.errorRate > 0.5
                        ? "text-[var(--barn-red)]"
                        : "text-[var(--grass-dark)]"
                    }`}
                  >
                    {(question.stats.errorRate * 100).toFixed(1)}%
                  </div>
                  <div className="font-body text-sm text-[var(--ink-faded)]">
                    Error Rate
                  </div>
                </div>
                <div className="bg-white rounded-xl p-4 border border-[var(--paper-lines)]">
                  <div className="font-display text-2xl font-bold text-[var(--ink-black)]">
                    {question.stats.mostCommonWrongAnswer || "—"}
                  </div>
                  <div className="font-body text-sm text-[var(--ink-faded)]">
                    Most Common Wrong
                  </div>
                </div>
              </div>

              {/* Answer distribution bar */}
              <div className="mt-4 bg-white rounded-xl p-4 border border-[var(--paper-lines)]">
                <div className="font-body text-sm text-[var(--ink-faded)] mb-2">
                  Answer Distribution
                </div>
                <div className="flex gap-2 h-8">
                  {(["A", "B", "C", "D"] as const).map((key) => {
                    const count = question.stats?.answerDistribution[key] || 0;
                    const total = question.stats?.totalAttempts || 1;
                    const percent = (count / total) * 100;
                    const isCorrect = key === question.correctAnswer;
                    return (
                      <div
                        key={key}
                        className="flex-1 flex flex-col items-center"
                      >
                        <div
                          className={`w-full rounded ${
                            isCorrect ? "bg-[var(--grass-dark)]" : "bg-slate-300"
                          }`}
                          style={{ height: `${Math.max(percent, 5)}%` }}
                        />
                        <span className="font-body text-xs text-[var(--ink-faded)] mt-1">
                          {key}: {percent.toFixed(0)}%
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Metadata */}
          <div className="pt-4 border-t border-[var(--paper-lines)]">
            <div className="flex flex-wrap gap-4 text-xs font-body text-[var(--ink-faded)]">
              <span>ID: {question._id}</span>
              <span>Type: {question.type}</span>
              {question.source?.type && (
                <span>Source: {question.source.type.replace(/_/g, " ")}</span>
              )}
              {question.generationMetadata && (
                <span>
                  Generated:{" "}
                  {new Date(question.generationMetadata.generatedAt).toLocaleDateString()}
                </span>
              )}
              <span>
                Created:{" "}
                {new Date(question._creationTime).toLocaleDateString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
