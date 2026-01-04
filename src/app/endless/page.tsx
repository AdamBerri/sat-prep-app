"use client";

import { useState, useEffect, useCallback, Suspense } from "react";
import { useQuery, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import type { Id } from "../../../convex/_generated/dataModel";
import { MathText } from "@/components/MathText";
import { QuestionFigure } from "@/components/QuestionFigure";
import { getVisitorId } from "@/lib/visitor";
import { formatDomain } from "@/lib/constants";
import { GamificationProvider, useGamification } from "@/context/GamificationContext";
import { DailyChallenges } from "@/components/gamification/DailyChallenges";
import { SettingsPanel, SettingsButton } from "@/components/gamification/SettingsPanel";
import { AchievementModal } from "@/components/gamification/AchievementModal";
import { getStreakMilestone } from "@/lib/achievements";
import {
  Flame,
  Target,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  BookOpen,
  X,
  Home,
  CheckCircle2,
  XCircle,
  Zap,
  Trophy,
  Calculator,
  Leaf,
  TrendingUp,
  Award,
  Lightbulb,
  AlertCircle,
} from "lucide-react";

// ─────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────

type ScreenState = "selector" | "domain-selector" | "resume" | "playing" | "feedback" | "summary";
type Category = "reading_writing" | "math" | undefined;
type MasteryLevel = "novice" | "beginner" | "intermediate" | "advanced" | "expert";

interface FeedbackState {
  isCorrect: boolean;
  correctAnswer: string;
  selectedAnswer: string;
  currentStreak: number;
  pointChange: number;
  masteryLevel: MasteryLevel;
  questionId: string;
  visitorId: string;
  attemptId: string;
}

// ─────────────────────────────────────────────────────────
// DOMAIN CONFIGURATION
// ─────────────────────────────────────────────────────────

const MATH_DOMAINS = [
  { id: "algebra", label: "Algebra", description: "Linear equations, inequalities, functions" },
  { id: "advanced_math", label: "Advanced Math", description: "Quadratics, polynomials, exponentials" },
  { id: "problem_solving", label: "Problem Solving", description: "Ratios, percentages, data analysis" },
  { id: "geometry_and_trigonometry", label: "Geometry & Trig", description: "Shapes, angles, trig functions" },
];

const RW_DOMAINS = [
  { id: "craft_and_structure", label: "Craft & Structure", description: "Text structure, word choice, purpose" },
  { id: "information_and_ideas", label: "Information & Ideas", description: "Main ideas, details, inferences" },
  { id: "standard_english_conventions", label: "Grammar & Usage", description: "Punctuation, syntax, conventions" },
  { id: "expression_of_ideas", label: "Expression of Ideas", description: "Transitions, organization, style" },
];

// ─────────────────────────────────────────────────────────
// GRAMMAR SENTENCE RENDERER
// ─────────────────────────────────────────────────────────

/**
 * Render a grammar sentence with [underlined] portions styled.
 * The pattern is: "Text before [underlined portion] text after"
 */
function renderGrammarSentence(sentence: string): React.ReactNode {
  // Split by [bracketed] content
  const parts = sentence.split(/\[([^\]]+)\]/);

  return parts.map((part, i) => {
    // Odd indices are the bracketed (underlined) portions
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
// MASTERY BADGE
// ─────────────────────────────────────────────────────────

const MASTERY_CONFIG: Record<MasteryLevel, { label: string; color: string; bg: string }> = {
  novice: { label: "Novice", color: "text-gray-600", bg: "bg-gray-100" },
  beginner: { label: "Beginner", color: "text-blue-600", bg: "bg-blue-100" },
  intermediate: { label: "Intermediate", color: "text-green-600", bg: "bg-green-100" },
  advanced: { label: "Advanced", color: "text-purple-600", bg: "bg-purple-100" },
  expert: { label: "Expert", color: "text-amber-600", bg: "bg-amber-100" },
};

function MasteryBadge({ level, points }: { level: MasteryLevel; points: number }) {
  const config = MASTERY_CONFIG[level];
  const thresholds = { novice: 0, beginner: 100, intermediate: 300, advanced: 600, expert: 900 };
  const nextThresholds = { novice: 100, beginner: 300, intermediate: 600, advanced: 900, expert: 1000 };

  const current = thresholds[level];
  const next = nextThresholds[level];
  const progress = ((points - current) / (next - current)) * 100;

  return (
    <div className={`px-3 py-1.5 rounded-lg ${config.bg} flex items-center gap-2`}>
      <TrendingUp className={`w-4 h-4 ${config.color}`} />
      <span className={`text-sm font-medium ${config.color}`}>{config.label}</span>
      <div className="w-16 h-1.5 bg-white/50 rounded-full overflow-hidden">
        <div
          className={`h-full ${config.bg.replace('100', '400')} rounded-full transition-all`}
          style={{ width: `${Math.min(100, progress)}%` }}
        />
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// STREAK DISPLAY
// ─────────────────────────────────────────────────────────

function StreakDisplay({ current, best, animate }: { current: number; best: number; animate: boolean }) {
  const isMilestone = getStreakMilestone(current) !== null;

  return (
    <div className="flex items-center gap-4">
      <div className={`flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--sunflower)]/20 border border-[var(--sunflower)]/30 ${animate ? 'celebration-pulse' : ''}`}>
        <Flame className={`w-5 h-5 ${current > 0 ? 'text-orange-500' : 'text-gray-400'} ${isMilestone ? 'streak-fire' : ''}`} />
        <span className={`font-display text-xl font-bold text-[var(--ink-black)] ${animate ? 'score-animate' : ''}`}>{current}</span>
      </div>
      {best > 0 && (
        <div className="flex items-center gap-1.5 text-sm text-[var(--ink-faded)]">
          <Trophy className="w-4 h-4" />
          <span>Best: {best}</span>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// DAILY GOAL WIDGET
// ─────────────────────────────────────────────────────────

function DailyGoalWidget({
  current,
  target,
  goalMet
}: {
  current: number;
  target: number;
  goalMet: boolean;
}) {
  const progress = Math.min(100, (current / target) * 100);
  const circumference = 2 * Math.PI * 18;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <div className="flex items-center gap-3">
      <div className="relative w-12 h-12">
        <svg className="w-12 h-12 transform -rotate-90">
          <circle
            cx="24"
            cy="24"
            r="18"
            fill="none"
            stroke="var(--paper-lines)"
            strokeWidth="4"
          />
          <circle
            cx="24"
            cy="24"
            r="18"
            fill="none"
            stroke={goalMet ? "var(--grass-medium)" : "var(--sky-blue)"}
            strokeWidth="4"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            className="transition-all duration-500"
          />
        </svg>
        {goalMet && (
          <CheckCircle2 className="absolute inset-0 m-auto w-5 h-5 text-[var(--grass-medium)]" />
        )}
        {!goalMet && (
          <Target className="absolute inset-0 m-auto w-5 h-5 text-[var(--sky-blue)]" />
        )}
      </div>
      <div>
        <p className="text-sm font-medium text-[var(--ink-black)]">
          {current}/{target} today
        </p>
        <p className="text-xs text-[var(--ink-faded)]">
          {goalMet ? "Goal met!" : `${target - current} to go`}
        </p>
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
// CATEGORY SELECTOR
// ─────────────────────────────────────────────────────────

function CategorySelector({
  onSelect
}: {
  onSelect: (category: Category) => void;
}) {
  return (
    <div className="min-h-screen bg-[var(--paper-cream)] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--sunflower)]/20 text-[var(--ink-black)]">
            <Flame className="w-5 h-5 text-orange-500" />
            <span className="font-body font-medium">Endless Mode</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--ink-black)]">
            Practice Without Limits
          </h1>
          <p className="font-body text-[var(--ink-faded)] max-w-md mx-auto">
            Adaptive questions that target your weaknesses. Build streaks, level up skills, and achieve mastery.
          </p>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          <button
            onClick={() => onSelect("reading_writing")}
            className="card-paper p-6 rounded-xl hover:shadow-lg transition-all group text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--grass-light)]/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <BookOpen className="w-6 h-6 text-[var(--grass-dark)]" />
            </div>
            <h3 className="font-display text-lg font-bold text-[var(--ink-black)] mb-1">
              Reading & Writing
            </h3>
            <p className="font-body text-sm text-[var(--ink-faded)]">
              Passages, vocabulary, grammar
            </p>
          </button>

          <button
            onClick={() => onSelect("math")}
            className="card-paper p-6 rounded-xl hover:shadow-lg transition-all group text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--sky-blue)]/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Calculator className="w-6 h-6 text-[var(--sky-blue)]" />
            </div>
            <h3 className="font-display text-lg font-bold text-[var(--ink-black)] mb-1">
              Math
            </h3>
            <p className="font-body text-sm text-[var(--ink-faded)]">
              Algebra, geometry, problem solving
            </p>
          </button>

          <button
            onClick={() => onSelect(undefined)}
            className="card-paper p-6 rounded-xl hover:shadow-lg transition-all group text-left"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--sunflower)]/30 flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-[var(--sunflower)]" />
            </div>
            <h3 className="font-display text-lg font-bold text-[var(--ink-black)] mb-1">
              Mixed Practice
            </h3>
            <p className="font-body text-sm text-[var(--ink-faded)]">
              All subjects combined
            </p>
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// DOMAIN SELECTOR
// ─────────────────────────────────────────────────────────

function DomainSelector({
  category,
  onSelect,
  onBack,
}: {
  category: Category;
  onSelect: (domain: string | undefined) => void;
  onBack: () => void;
}) {
  const domains = category === "math" ? MATH_DOMAINS : RW_DOMAINS;
  const categoryLabel = category === "math" ? "Math" : "Reading & Writing";
  const categoryIcon = category === "math" ? Calculator : BookOpen;
  const CategoryIcon = categoryIcon;

  return (
    <div className="min-h-screen bg-[var(--paper-cream)] flex items-center justify-center p-4">
      <div className="max-w-2xl w-full space-y-8">
        <div className="text-center space-y-4">
          <button
            onClick={onBack}
            className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-[var(--ink-faded)] hover:text-[var(--ink-black)] hover:bg-[var(--paper-aged)] transition-colors text-sm"
          >
            <ChevronRight className="w-4 h-4 rotate-180" />
            Back
          </button>
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[var(--sky-blue)]/20 text-[var(--ink-black)]">
            <CategoryIcon className="w-5 h-5 text-[var(--sky-blue)]" />
            <span className="font-body font-medium">{categoryLabel}</span>
          </div>
          <h1 className="font-display text-3xl sm:text-4xl font-bold text-[var(--ink-black)]">
            Choose a Topic
          </h1>
          <p className="font-body text-[var(--ink-faded)] max-w-md mx-auto">
            Focus on a specific area or practice all topics
          </p>
        </div>

        <div className="space-y-3">
          {/* All topics option */}
          <button
            onClick={() => onSelect(undefined)}
            className="w-full card-paper p-5 rounded-xl hover:shadow-lg transition-all group text-left flex items-center gap-4 border-2 border-transparent hover:border-[var(--grass-medium)]"
          >
            <div className="w-12 h-12 rounded-xl bg-[var(--sunflower)]/30 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Zap className="w-6 h-6 text-[var(--sunflower)]" />
            </div>
            <div className="flex-1">
              <h3 className="font-display text-lg font-bold text-[var(--ink-black)]">
                All {categoryLabel} Topics
              </h3>
              <p className="font-body text-sm text-[var(--ink-faded)]">
                Practice everything, adaptive selection
              </p>
            </div>
            <ChevronRight className="w-5 h-5 text-[var(--ink-faded)] group-hover:text-[var(--grass-dark)]" />
          </button>

          {/* Individual domain options */}
          {domains.map((domain) => (
            <button
              key={domain.id}
              onClick={() => onSelect(domain.id)}
              className="w-full card-paper p-5 rounded-xl hover:shadow-lg transition-all group text-left flex items-center gap-4 border-2 border-transparent hover:border-[var(--grass-medium)]"
            >
              <div className="w-12 h-12 rounded-xl bg-[var(--grass-light)]/30 flex items-center justify-center group-hover:scale-110 transition-transform">
                <Target className="w-6 h-6 text-[var(--grass-dark)]" />
              </div>
              <div className="flex-1">
                <h3 className="font-display text-lg font-bold text-[var(--ink-black)]">
                  {domain.label}
                </h3>
                <p className="font-body text-sm text-[var(--ink-faded)]">
                  {domain.description}
                </p>
              </div>
              <ChevronRight className="w-5 h-5 text-[var(--ink-faded)] group-hover:text-[var(--grass-dark)]" />
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// RESUME PROMPT
// ─────────────────────────────────────────────────────────

function ResumePrompt({
  questionsAnswered,
  currentStreak,
  onResume,
  onStartFresh,
}: {
  questionsAnswered: number;
  currentStreak: number;
  onResume: () => void;
  onStartFresh: () => void;
}) {
  return (
    <div className="min-h-screen bg-[var(--paper-cream)] flex items-center justify-center p-4">
      <div className="card-paper max-w-md w-full p-8 rounded-xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--grass-light)]/30 flex items-center justify-center mx-auto">
          <Leaf className="w-8 h-8 text-[var(--grass-dark)]" />
        </div>

        <div>
          <h2 className="font-display text-2xl font-bold text-[var(--ink-black)] mb-2">
            Continue Session?
          </h2>
          <p className="font-body text-[var(--ink-faded)]">
            You have an endless session in progress
          </p>
        </div>

        <div className="flex justify-center gap-6 py-4">
          <div className="text-center">
            <p className="font-display text-3xl font-bold text-[var(--ink-black)]">
              {questionsAnswered}
            </p>
            <p className="text-sm text-[var(--ink-faded)]">Questions</p>
          </div>
          <div className="text-center">
            <p className="font-display text-3xl font-bold text-orange-500">
              {currentStreak}
            </p>
            <p className="text-sm text-[var(--ink-faded)]">Streak</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onResume}
            className="w-full py-3 px-6 bg-[var(--grass-dark)] text-white rounded-xl font-body font-medium hover:bg-[var(--grass-medium)] transition-colors"
          >
            Continue
          </button>
          <button
            onClick={onStartFresh}
            className="w-full py-3 px-6 bg-white text-[var(--ink-black)] rounded-xl font-body font-medium border border-[var(--paper-lines)] hover:bg-[var(--paper-aged)] transition-colors"
          >
            Start Fresh
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// FEEDBACK SCREEN
// ─────────────────────────────────────────────────────────

function FeedbackScreen({
  feedback,
  onNext,
}: {
  feedback: FeedbackState;
  onNext: () => void;
}) {
  const [showPreviousAttempts, setShowPreviousAttempts] = useState(false);
  const [showExplanation, setShowExplanation] = useState(!feedback.isCorrect); // Auto-expand for wrong answers

  // Query for previous attempts on this question
  const previousAttempts = useQuery(api.progressTracking.getPreviousAttempts, {
    visitorId: feedback.visitorId,
    questionId: feedback.questionId as Id<"questions">,
    excludeAttemptId: feedback.attemptId as Id<"examAttempts">,
  });

  // Query for explanation
  const explanation = useQuery(api.progressTracking.getQuestionExplanation, {
    questionId: feedback.questionId as Id<"questions">,
  });

  // Check if user improved (got it right now, was wrong before)
  const hasImproved = feedback.isCorrect && previousAttempts?.hasWrongAttempt;
  const hasPreviousAttempts = previousAttempts && previousAttempts.totalAttempts > 0;
  const hasExplanation = explanation && (explanation.correctExplanation || explanation.wrongAnswerExplanations);

  // Get the wrong answer explanation for user's selected answer
  const wrongAnswerExplanation = !feedback.isCorrect && explanation?.wrongAnswerExplanations
    ? explanation.wrongAnswerExplanations[feedback.selectedAnswer as keyof typeof explanation.wrongAnswerExplanations]
    : null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="card-paper max-w-md w-full p-6 sm:p-8 rounded-xl space-y-5 text-center animate-in fade-in zoom-in duration-200 my-4">
        <div className={`w-16 h-16 sm:w-20 sm:h-20 rounded-full flex items-center justify-center mx-auto ${
          feedback.isCorrect ? 'bg-green-100' : 'bg-red-100'
        }`}>
          {feedback.isCorrect ? (
            <CheckCircle2 className="w-8 h-8 sm:w-10 sm:h-10 text-green-600" />
          ) : (
            <XCircle className="w-8 h-8 sm:w-10 sm:h-10 text-red-500" />
          )}
        </div>

        <div>
          <h2 className={`font-display text-xl sm:text-2xl font-bold mb-2 ${
            feedback.isCorrect ? 'text-green-600' : 'text-red-500'
          }`}>
            {feedback.isCorrect ? 'Correct!' : 'Incorrect'}
          </h2>
          {!feedback.isCorrect && (
            <p className="font-body text-[var(--ink-faded)]">
              The correct answer was <span className="font-bold text-[var(--ink-black)]">{feedback.correctAnswer}</span>
            </p>
          )}
        </div>

        {/* Improvement celebration */}
        {hasImproved && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
            <div className="flex items-center justify-center gap-2 text-green-600">
              <TrendingUp className="w-5 h-5" />
              <span className="font-body font-bold">You improved!</span>
            </div>
            <p className="text-sm text-green-600/80">
              You got this question wrong before, but now you got it right!
            </p>
          </div>
        )}

        {feedback.isCorrect && feedback.currentStreak > 1 && (
          <div className="flex items-center justify-center gap-2 text-orange-500">
            <Flame className="w-5 h-5" />
            <span className="font-body font-bold">{feedback.currentStreak} streak!</span>
          </div>
        )}

        <div className="flex items-center justify-center gap-2">
          <span className={`text-sm font-medium ${feedback.pointChange >= 0 ? 'text-green-600' : 'text-red-500'}`}>
            {feedback.pointChange >= 0 ? '+' : ''}{feedback.pointChange} mastery points
          </span>
        </div>

        {/* Explanation section */}
        {hasExplanation && (
          <div className="space-y-3">
            <button
              onClick={() => setShowExplanation(!showExplanation)}
              className="text-sm text-[var(--sky-blue)] hover:underline flex items-center justify-center gap-1 mx-auto"
            >
              {showExplanation ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide explanation
                </>
              ) : (
                <>
                  <Lightbulb className="w-4 h-4" />
                  Show explanation
                </>
              )}
            </button>

            {showExplanation && (
              <div className="space-y-3 text-left">
                {/* Why the correct answer is correct */}
                {explanation?.correctExplanation && (
                  <div className="bg-green-50 border border-green-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <Lightbulb className="w-4 h-4 text-green-600 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-green-700 uppercase tracking-wide mb-1">
                          Why {feedback.correctAnswer} is correct
                        </p>
                        <p className="text-sm text-green-800 leading-relaxed">
                          {explanation.correctExplanation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Why user's answer was wrong (only for incorrect answers) */}
                {!feedback.isCorrect && wrongAnswerExplanation && (
                  <div className="bg-red-50 border border-red-200 rounded-xl p-4 space-y-2">
                    <div className="flex items-start gap-2">
                      <AlertCircle className="w-4 h-4 text-red-500 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-xs font-medium text-red-700 uppercase tracking-wide mb-1">
                          Why {feedback.selectedAnswer} is incorrect
                        </p>
                        <p className="text-sm text-red-800 leading-relaxed">
                          {wrongAnswerExplanation}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Common mistakes */}
                {!feedback.isCorrect && explanation?.commonMistakes && explanation.commonMistakes.length > 0 && (
                  <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 space-y-2">
                    <p className="text-xs font-medium text-amber-700 uppercase tracking-wide">
                      Common Mistake
                    </p>
                    <p className="text-sm text-amber-800 leading-relaxed">
                      {explanation.commonMistakes[0].description}
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* See what I chose last time - only show when correct and has previous attempts */}
        {feedback.isCorrect && hasPreviousAttempts && (
          <div className="space-y-3">
            <button
              onClick={() => setShowPreviousAttempts(!showPreviousAttempts)}
              className="text-sm text-[var(--grass-dark)] hover:underline flex items-center justify-center gap-1 mx-auto"
            >
              {showPreviousAttempts ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Hide previous attempts
                </>
              ) : (
                <>
                  <ChevronDown className="w-4 h-4" />
                  See what I chose last time
                </>
              )}
            </button>

            {showPreviousAttempts && previousAttempts && (
              <div className="bg-[var(--paper-aged)] rounded-xl p-4 text-left space-y-2">
                <p className="text-xs text-[var(--ink-faded)] font-medium uppercase tracking-wide">
                  Previous Attempts
                </p>
                <div className="space-y-2">
                  {previousAttempts.attempts.map((attempt: { selectedAnswer?: string; isCorrect?: boolean; submittedAt?: number }, index: number) => (
                    <div
                      key={index}
                      className={`flex items-center justify-between p-2 rounded-lg ${
                        attempt.isCorrect
                          ? 'bg-green-50 border border-green-200'
                          : 'bg-red-50 border border-red-200'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        {attempt.isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-green-600" />
                        ) : (
                          <XCircle className="w-4 h-4 text-red-500" />
                        )}
                        <span className="text-sm font-medium">
                          Chose: {attempt.selectedAnswer}
                        </span>
                      </div>
                      <span className="text-xs text-[var(--ink-faded)]">
                        {attempt.submittedAt
                          ? new Date(attempt.submittedAt).toLocaleDateString('en-US', {
                              month: 'short',
                              day: 'numeric',
                            })
                          : ''}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        <button
          onClick={onNext}
          className="w-full py-3 px-6 bg-[var(--grass-dark)] text-white rounded-xl font-body font-medium hover:bg-[var(--grass-medium)] transition-colors flex items-center justify-center gap-2"
        >
          Next Question
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// SESSION SUMMARY
// ─────────────────────────────────────────────────────────

function SessionSummary({
  questionsAnswered,
  correctAnswers,
  accuracy,
  bestStreak,
  onContinue,
  onExit,
}: {
  questionsAnswered: number;
  correctAnswers: number;
  accuracy: number;
  bestStreak: number;
  onContinue: () => void;
  onExit: () => void;
}) {
  return (
    <div className="min-h-screen bg-[var(--paper-cream)] flex items-center justify-center p-4">
      <div className="card-paper max-w-md w-full p-8 rounded-xl space-y-6 text-center">
        <div className="w-16 h-16 rounded-full bg-[var(--sunflower)]/30 flex items-center justify-center mx-auto">
          <Trophy className="w-8 h-8 text-[var(--sunflower)]" />
        </div>

        <div>
          <h2 className="font-display text-2xl font-bold text-[var(--ink-black)] mb-2">
            Great Session!
          </h2>
          <p className="font-body text-[var(--ink-faded)]">
            Here's how you did
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4 py-4">
          <div className="card-paper p-4 rounded-xl">
            <p className="font-display text-3xl font-bold text-[var(--ink-black)]">
              {questionsAnswered}
            </p>
            <p className="text-sm text-[var(--ink-faded)]">Questions</p>
          </div>
          <div className="card-paper p-4 rounded-xl">
            <p className="font-display text-3xl font-bold text-[var(--grass-dark)]">
              {accuracy}%
            </p>
            <p className="text-sm text-[var(--ink-faded)]">Accuracy</p>
          </div>
          <div className="card-paper p-4 rounded-xl">
            <p className="font-display text-3xl font-bold text-[var(--grass-medium)]">
              {correctAnswers}
            </p>
            <p className="text-sm text-[var(--ink-faded)]">Correct</p>
          </div>
          <div className="card-paper p-4 rounded-xl">
            <p className="font-display text-3xl font-bold text-orange-500">
              {bestStreak}
            </p>
            <p className="text-sm text-[var(--ink-faded)]">Best Streak</p>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onContinue}
            className="w-full py-3 px-6 bg-[var(--grass-dark)] text-white rounded-xl font-body font-medium hover:bg-[var(--grass-medium)] transition-colors"
          >
            Keep Going
          </button>
          <button
            onClick={onExit}
            className="w-full py-3 px-6 bg-white text-[var(--ink-black)] rounded-xl font-body font-medium border border-[var(--paper-lines)] hover:bg-[var(--paper-aged)] transition-colors flex items-center justify-center gap-2"
          >
            <Home className="w-4 h-4" />
            Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// PLAYING SCREEN
// ─────────────────────────────────────────────────────────

function PlayingScreen({
  attemptId,
  visitorId,
  onEnd,
}: {
  attemptId: Id<"examAttempts">;
  visitorId: string;
  onEnd: () => void;
}) {
  const router = useRouter();
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [showPassage, setShowPassage] = useState(false);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);
  const [questionStartTime, setQuestionStartTime] = useState(Date.now());
  const [streakAnimate, setStreakAnimate] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [domainsThisSession, setDomainsThisSession] = useState<Set<string>>(new Set());

  // Gamification context
  const {
    celebrateCorrectAnswer,
    celebrateWrongAnswer,
    checkAchievements,
    updateChallenges,
    unlockedAchievementIds,
  } = useGamification();

  // Real-time queries
  const sessionState = useQuery(api.endless.getEndlessSessionState, { attemptId });
  const currentQuestion = useQuery(api.endless.getCurrentEndlessQuestion, { attemptId });
  const dailyProgress = useQuery(api.endless.getDailyGoalProgress, { visitorId });

  // Mutations
  const submitAnswer = useMutation(api.endless.submitEndlessAnswer);

  // Reset state when question changes
  useEffect(() => {
    if (currentQuestion?.question._id) {
      setSelectedAnswer(null);
      setQuestionStartTime(Date.now());
    }
  }, [currentQuestion?.question._id]);

  const handleSelectAnswer = useCallback((key: string) => {
    setSelectedAnswer(key);
  }, []);

  const handleSubmit = useCallback(async () => {
    if (!selectedAnswer || !currentQuestion) return;

    const timeSpentMs = Date.now() - questionStartTime;

    const result = await submitAnswer({
      attemptId,
      questionId: currentQuestion.question._id,
      selectedAnswer,
      timeSpentMs,
      visitorId,
    });

    // Track domain for daily challenges
    const newDomains = new Set(domainsThisSession);
    newDomains.add(currentQuestion.question.domain);
    setDomainsThisSession(newDomains);

    // Show streak animation if streak increased
    if (result.isCorrect && result.currentStreak > 1) {
      setStreakAnimate(true);
      setTimeout(() => setStreakAnimate(false), 500);
    }

    // Trigger celebrations
    const isLevelUp = !!(currentQuestion.mastery && result.masteryLevel !== currentQuestion.mastery.level);
    if (result.isCorrect) {
      celebrateCorrectAnswer(result.currentStreak, isLevelUp);
    } else {
      celebrateWrongAnswer();
    }

    // Update daily challenges
    const challengeUpdates: Array<{
      type: "streak" | "questions" | "hard_questions" | "domain_variety" | "accuracy" | "speed";
      value: number;
      isAbsolute?: boolean;
    }> = [
      { type: "questions", value: 1 },
      { type: "streak", value: result.currentStreak },
      { type: "domain_variety", value: newDomains.size, isAbsolute: true },
    ];

    // Check for hard questions (difficulty >= 3)
    if (result.isCorrect && currentQuestion.question.difficulty >= 3) {
      challengeUpdates.push({ type: "hard_questions", value: 1 });
    }

    // Check for speed (answered in under 2 minutes)
    if (timeSpentMs < 120000) {
      challengeUpdates.push({ type: "speed", value: 1 });
    }

    updateChallenges(challengeUpdates);

    // Check for achievements
    checkAchievements({
      currentStreak: result.currentStreak,
      totalQuestions: sessionState?.questionsAnswered ? sessionState.questionsAnswered + 1 : 1,
      sessionQuestions: sessionState?.questionsAnswered ? sessionState.questionsAnswered + 1 : 1,
      sessionCorrect: result.isCorrect
        ? (sessionState?.correctAnswers ?? 0) + 1
        : sessionState?.correctAnswers ?? 0,
      masteryLevel: result.masteryLevel,
      domain: currentQuestion.question.domain,
      category: currentQuestion.question.category,
    });

    setFeedback({
      isCorrect: result.isCorrect,
      correctAnswer: result.correctAnswer,
      selectedAnswer,
      currentStreak: result.currentStreak,
      pointChange: result.pointChange,
      masteryLevel: result.masteryLevel as MasteryLevel,
      questionId: currentQuestion.question._id,
      visitorId,
      attemptId: attemptId as string,
    });
  }, [
    selectedAnswer,
    currentQuestion,
    attemptId,
    visitorId,
    questionStartTime,
    submitAnswer,
    domainsThisSession,
    sessionState,
    celebrateCorrectAnswer,
    celebrateWrongAnswer,
    updateChallenges,
    checkAchievements,
  ]);

  const handleNextQuestion = useCallback(() => {
    setFeedback(null);
    setSelectedAnswer(null);
  }, []);

  if (!sessionState || !currentQuestion || !dailyProgress) {
    return (
      <div className="min-h-screen bg-[var(--paper-cream)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--ink-faded)]">Loading...</div>
      </div>
    );
  }

  const { question, passage, passage2, mastery } = currentQuestion;
  const isReadingWriting = question.category === "reading_writing";

  return (
    <div className="min-h-screen bg-[var(--paper-cream)] flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-10 bg-white/80 backdrop-blur-sm border-b border-[var(--paper-lines)]">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <StreakDisplay
            current={sessionState.currentStreak}
            best={sessionState.bestStreak}
            animate={streakAnimate}
          />

          {/* Center section - Daily Goal + Challenges */}
          <div className="hidden sm:flex items-center gap-4">
            <DailyGoalWidget
              current={dailyProgress.questionsAnswered}
              target={dailyProgress.target}
              goalMet={dailyProgress.goalMet}
            />
            <div className="w-48">
              <DailyChallenges visitorId={visitorId} compact />
            </div>
          </div>

          {/* Mobile daily goal only */}
          <div className="sm:hidden">
            <DailyGoalWidget
              current={dailyProgress.questionsAnswered}
              target={dailyProgress.target}
              goalMet={dailyProgress.goalMet}
            />
          </div>

          {/* Right section - Actions */}
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAchievements(true)}
              className="p-2 rounded-lg hover:bg-[var(--paper-aged)] text-[var(--ink-faded)] transition-colors"
              title="View Achievements"
            >
              <Award className="w-5 h-5" />
            </button>
            <SettingsButton onClick={() => setShowSettings(true)} />
            <button
              onClick={onEnd}
              className="p-2 rounded-lg hover:bg-[var(--paper-aged)] text-[var(--ink-faded)] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      </header>

      {/* Settings Panel */}
      <SettingsPanel
        visitorId={visitorId}
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
      />

      {/* Achievements Modal */}
      <AchievementModal
        isOpen={showAchievements}
        onClose={() => setShowAchievements(false)}
        unlockedIds={unlockedAchievementIds}
      />

      {/* Main content */}
      <div className="flex-1 flex flex-col lg:flex-row">
        {/* Passage/Figure panel (desktop) */}
        {isReadingWriting && (
          <div className="hidden lg:block lg:w-1/2 border-r border-[var(--paper-lines)] overflow-y-auto">
            <PassageView passage={passage} passage2={passage2} figure={question.figure} questionSkill={question.skill} />
          </div>
        )}

        {/* Question panel */}
        <div className={`flex-1 p-4 sm:p-8 overflow-y-auto ${isReadingWriting ? 'lg:w-1/2' : ''}`}>
          <div className="max-w-2xl mx-auto space-y-6">
            {/* Question info */}
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`px-3 py-1 rounded-full text-sm font-medium ${
                  question.category === 'math'
                    ? 'bg-[var(--sky-blue)]/20 text-[var(--sky-blue)]'
                    : 'bg-[var(--grass-light)]/30 text-[var(--grass-dark)]'
                }`}>
                  {formatDomain(question.domain)}
                </span>
                <span className="text-sm text-[var(--ink-faded)]">
                  {question.skill.replace(/_/g, ' ')}
                </span>
              </div>

              {mastery && (
                <MasteryBadge level={mastery.level as MasteryLevel} points={mastery.points} />
              )}
            </div>

            {/* Mobile passage/figure toggle */}
            {isReadingWriting && (
              <button
                onClick={() => setShowPassage(!showPassage)}
                className="lg:hidden w-full py-3 px-4 bg-white rounded-xl border border-[var(--paper-lines)] flex items-center justify-center gap-2 text-[var(--ink-faded)] hover:bg-[var(--paper-aged)] transition-colors"
              >
                <BookOpen className="w-4 h-4" />
                {showPassage
                  ? 'Hide'
                  : passage && question.figure
                    ? 'View Passage & Figure'
                    : question.figure
                      ? 'View Figure'
                      : 'View Passage'}
              </button>
            )}

            {/* Mobile passage/figure modal */}
            {isReadingWriting && showPassage && (
              <div className="lg:hidden fixed inset-0 z-50 bg-black/50 flex items-end">
                <div className="w-full max-h-[80vh] bg-white rounded-t-2xl overflow-hidden">
                  <div className="sticky top-0 bg-white border-b border-[var(--paper-lines)] p-4 flex items-center justify-between">
                    <h3 className="font-display font-bold">
                      {passage && question.figure ? 'Passage & Figure' : question.figure ? 'Figure' : 'Passage'}
                    </h3>
                    <button onClick={() => setShowPassage(false)}>
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                  <div className="overflow-y-auto max-h-[calc(80vh-60px)]">
                    <PassageView passage={passage} passage2={passage2} figure={question.figure} questionSkill={question.skill} />
                  </div>
                </div>
              </div>
            )}

            {/* Question Figure (for Math questions only - R&W figures shown in left panel) */}
            {!isReadingWriting && question.figure && (
              <div className="mb-4">
                <QuestionFigure
                  imageId={question.figure.imageId}
                  figureType={question.figure.figureType}
                  caption={question.figure.caption}
                  className="max-w-md mx-auto"
                />
              </div>
            )}

            {/* Question prompt */}
            <div className="card-paper p-6 rounded-xl">
              {question.grammarData?.sentenceWithUnderline ? (
                // Grammar question: render sentence with underlined portion highlighted
                <div className="space-y-4">
                  <p className="font-body text-lg text-[var(--ink-black)] leading-relaxed">
                    {renderGrammarSentence(question.grammarData.sentenceWithUnderline)}
                  </p>
                  <p className="font-body text-base text-[var(--ink-faded)]">
                    {question.prompt}
                  </p>
                </div>
              ) : (
                <p className="font-body text-lg text-[var(--ink-black)] leading-relaxed">
                  <MathText text={question.prompt} />
                </p>
              )}
            </div>

            {/* Answer options */}
            <div className="space-y-3">
              {question.options.map((option: { key: string; content: string }) => {
                const isSelected = selectedAnswer === option.key;

                return (
                  <button
                    key={option.key}
                    onClick={() => handleSelectAnswer(option.key)}
                    className={`w-full p-4 rounded-xl border-2 text-left transition-all flex items-start gap-4 ${
                      isSelected
                        ? 'border-[var(--grass-dark)] bg-[var(--grass-light)]/20'
                        : 'border-[var(--paper-lines)] bg-white hover:border-[var(--grass-light)] hover:bg-[var(--grass-light)]/10'
                    }`}
                  >
                    <span className={`w-8 h-8 rounded-lg flex items-center justify-center font-display font-bold text-sm flex-shrink-0 ${
                      isSelected
                        ? 'bg-[var(--grass-dark)] text-white'
                        : 'bg-[var(--paper-aged)] text-[var(--ink-faded)]'
                    }`}>
                      {option.key}
                    </span>
                    <span className="font-body text-[var(--ink-black)] pt-1">
                      <MathText text={option.content} />
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!selectedAnswer}
              className={`w-full py-4 rounded-xl font-body font-medium text-lg transition-all flex items-center justify-center gap-2 ${
                selectedAnswer
                  ? 'bg-[var(--grass-dark)] text-white hover:bg-[var(--grass-medium)]'
                  : 'bg-[var(--paper-aged)] text-[var(--ink-faded)] cursor-not-allowed'
              }`}
            >
              Submit Answer
              <ChevronRight className="w-5 h-5" />
            </button>

            {/* Stats bar */}
            <div className="flex items-center justify-center gap-6 text-sm text-[var(--ink-faded)]">
              <span>{sessionState.questionsAnswered} answered</span>
              <span>{sessionState.accuracy}% accuracy</span>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback modal */}
      {feedback && (
        <FeedbackScreen feedback={feedback} onNext={handleNextQuestion} />
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// MAIN ENDLESS PAGE
// ─────────────────────────────────────────────────────────

function EndlessPageContent() {
  const router = useRouter();
  const [screen, setScreen] = useState<ScreenState>("selector");
  const [selectedCategory, setSelectedCategory] = useState<Category>(undefined);
  const [selectedDomain, setSelectedDomain] = useState<string | undefined>(undefined);
  const [attemptId, setAttemptId] = useState<Id<"examAttempts"> | null>(null);
  const [visitorId, setVisitorId] = useState<string>("loading");
  const [summaryData, setSummaryData] = useState<{
    questionsAnswered: number;
    correctAnswers: number;
    accuracy: number;
    bestStreak: number;
  } | null>(null);

  // Mutations
  const startSession = useMutation(api.endless.startEndlessSession);
  const endSession = useMutation(api.endless.endEndlessSession);

  // Check for existing session
  const existingAttempt = useQuery(
    api.endless.getCurrentEndlessAttempt,
    visitorId !== "loading" ? { visitorId } : "skip"
  );

  // Initialize visitor ID
  useEffect(() => {
    setVisitorId(getVisitorId());
  }, []);

  // Check for existing session on load
  useEffect(() => {
    if (existingAttempt?.attempt && existingAttempt?.session && screen === "selector") {
      setAttemptId(existingAttempt.attempt._id);
      setScreen("resume");
    }
  }, [existingAttempt, screen]);

  const startNewSession = useCallback(async (category: Category, domain: string | undefined) => {
    const result = await startSession({
      visitorId,
      category,
      domain,
    });

    setAttemptId(result.attemptId);

    if (result.isResumed) {
      setScreen("resume");
    } else {
      setScreen("playing");
    }
  }, [visitorId, startSession]);

  const handleSelectCategory = useCallback(async (category: Category) => {
    setSelectedCategory(category);

    if (category === undefined) {
      // Mixed practice - skip domain selection, start immediately
      await startNewSession(undefined, undefined);
    } else {
      // Go to domain selector for specific category
      setScreen("domain-selector");
    }
  }, [startNewSession]);

  const handleSelectDomain = useCallback(async (domain: string | undefined) => {
    setSelectedDomain(domain);
    await startNewSession(selectedCategory, domain);
  }, [selectedCategory, startNewSession]);

  const handleResume = useCallback(() => {
    setScreen("playing");
  }, []);

  const handleStartFresh = useCallback(async () => {
    if (attemptId) {
      await endSession({ attemptId });
    }

    // Start new session
    const result = await startSession({
      visitorId,
      category: selectedCategory,
      domain: selectedDomain,
    });

    setAttemptId(result.attemptId);
    setScreen("playing");
  }, [attemptId, visitorId, selectedCategory, selectedDomain, endSession, startSession]);

  const handleEndSession = useCallback(async () => {
    if (!attemptId) return;

    const result = await endSession({ attemptId });

    if (result) {
      setSummaryData({
        questionsAnswered: result.questionsAnswered,
        correctAnswers: result.correctAnswers,
        accuracy: result.accuracy,
        bestStreak: result.bestStreak,
      });
    }

    setScreen("summary");
  }, [attemptId, endSession]);

  const handleContinue = useCallback(async () => {
    // Start a new session
    const result = await startSession({
      visitorId,
      category: selectedCategory,
      domain: selectedDomain,
    });

    setAttemptId(result.attemptId);
    setSummaryData(null);
    setScreen("playing");
  }, [visitorId, selectedCategory, selectedDomain, startSession]);

  const handleBackToCategory = useCallback(() => {
    setScreen("selector");
    setSelectedCategory(undefined);
    setSelectedDomain(undefined);
  }, []);

  const handleExit = useCallback(() => {
    router.push("/dashboard");
  }, [router]);

  if (visitorId === "loading") {
    return (
      <div className="min-h-screen bg-[var(--paper-cream)] flex items-center justify-center">
        <div className="animate-pulse text-[var(--ink-faded)]">Loading...</div>
      </div>
    );
  }

  switch (screen) {
    case "selector":
      return <CategorySelector onSelect={handleSelectCategory} />;

    case "domain-selector":
      return (
        <DomainSelector
          category={selectedCategory}
          onSelect={handleSelectDomain}
          onBack={handleBackToCategory}
        />
      );

    case "resume":
      return (
        <ResumePrompt
          questionsAnswered={existingAttempt?.session?.questionsAnswered ?? 0}
          currentStreak={existingAttempt?.session?.currentStreak ?? 0}
          onResume={handleResume}
          onStartFresh={handleStartFresh}
        />
      );

    case "playing":
      if (!attemptId) return null;
      return (
        <GamificationProvider visitorId={visitorId}>
          <PlayingScreen
            attemptId={attemptId}
            visitorId={visitorId}
            onEnd={handleEndSession}
          />
        </GamificationProvider>
      );

    case "summary":
      if (!summaryData) return null;
      return (
        <SessionSummary
          {...summaryData}
          onContinue={handleContinue}
          onExit={handleExit}
        />
      );

    default:
      return null;
  }
}

export default function EndlessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--paper-cream)] flex items-center justify-center">
          <div className="animate-pulse text-[var(--ink-faded)]">Loading...</div>
        </div>
      }
    >
      <EndlessPageContent />
    </Suspense>
  );
}
