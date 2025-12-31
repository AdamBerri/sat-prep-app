// ============================================================================
// SAT APP TYPES
// These types align with Convex schema but are used for frontend state
// ============================================================================

import type { Id } from "../../convex/_generated/dataModel";

// ─────────────────────────────────────────────────────────
// CORE DOMAIN TYPES
// ─────────────────────────────────────────────────────────

export type QuestionCategory = "reading_writing" | "math";
export type QuestionType = "multiple_choice" | "grid_in";
export type AnswerStatus = "empty" | "draft" | "submitted" | "graded";
export type ExamMode = "sat" | "practice" | "endless";
export type AttemptStatus = "in_progress" | "paused" | "completed" | "abandoned";
export type SectionStatus = "locked" | "active" | "submitted";

export type FigureType =
  | "graph"
  | "geometric"
  | "data_display"
  | "diagram"
  | "table";

export type FigurePlacement = "inline" | "sidebar" | "below-passage";

// ─────────────────────────────────────────────────────────
// QUESTION & CONTENT TYPES
// ─────────────────────────────────────────────────────────

export interface AnswerOption {
  _id: Id<"answerOptions">;
  questionId: Id<"questions">;
  key: string; // "A", "B", "C", "D"
  content: string;
  imageId?: Id<"images">;
  imageUrl?: string | null;
  order: number;
}

export interface QuestionFigure {
  imageId: Id<"images">;
  figureType?: FigureType;
  caption?: string;
}

export interface Passage {
  _id: Id<"passages">;
  title?: string;
  author?: string;
  source?: string;
  content: string;
}

export interface PassageFigure {
  _id: Id<"passageFigures">;
  passageId: Id<"passages">;
  imageId: Id<"images">;
  figureNumber: number;
  caption?: string;
  placement: FigurePlacement;
  insertAfterParagraph?: number;
  imageUrl?: string | null;
}

export interface PassageWithFigures extends Passage {
  figures: PassageFigure[];
}

export interface Question {
  _id: Id<"questions">;
  type: QuestionType;
  category: QuestionCategory;
  domain: string;
  skill: string;
  difficulty: number;
  prompt: string;
  passageId?: Id<"passages">;
  passage?: Passage | null;
  lineReference?: {
    start: number;
    end: number;
  };
  figure?: QuestionFigure;
  figureUrl?: string | null;
  correctAnswer: string;
  source?: {
    type: "official_collegeboard" | "official_practice_test" | "custom";
    testNumber?: number;
    year?: number;
  };
  tags: string[];
  options: AnswerOption[];
}

export interface Explanation {
  _id: Id<"explanations">;
  questionId: Id<"questions">;
  correctExplanation: string;
  wrongAnswerExplanations?: {
    A?: string;
    B?: string;
    C?: string;
    D?: string;
  };
  commonMistakes?: CommonMistake[];
  videoUrl?: string;
}

export interface CommonMistake {
  reason: string;
  description: string;
  relatedSkill?: string;
}

// ─────────────────────────────────────────────────────────
// EXAM STRUCTURE TYPES
// ─────────────────────────────────────────────────────────

export interface ExamModule {
  id: string;
  name: string;
  questions: number;
  timeMinutes: number;
}

export interface ExamSectionConfig {
  id: QuestionCategory;
  name: string;
  shortName: string;
  totalQuestions: number;
  totalTimeMinutes: number;
  modules: ExamModule[];
}

export interface SATConfig {
  sections: ExamSectionConfig[];
  breakDurationMinutes: number;
  totalQuestions: number;
  totalTimeMinutes: number;
}

export interface ExamSection {
  _id: Id<"examSections">;
  examId: Id<"exams">;
  name: string;
  type: QuestionCategory;
  order: number;
  timeLimit: number;
  questionIds: Id<"questions">[];
}

export interface Exam {
  _id: Id<"exams">;
  name: string;
  description?: string;
  isOfficial: boolean;
  createdAt: number;
  sections: ExamSection[];
}

// ─────────────────────────────────────────────────────────
// USER ANSWER & PROGRESS TYPES
// ─────────────────────────────────────────────────────────

export interface UserAnswer {
  _id?: Id<"userAnswers">;
  attemptId: Id<"examAttempts">;
  questionId: Id<"questions">;
  selectedAnswer?: string;
  status: AnswerStatus;
  isCorrect?: boolean;
  flagged: boolean;
  crossedOut?: string[];
  selectedMistakeReason?: string;
  firstViewedAt: number;
  lastModifiedAt: number;
  submittedAt?: number;
  timeSpentMs: number;
}

// Local answer state (before syncing to DB)
export interface LocalUserAnswer {
  selectedAnswer?: string;
  flagged: boolean;
  crossedOut: string[];
  timeSpentMs: number;
}

export interface SectionState {
  sectionId: Id<"examSections">;
  status: SectionStatus;
  startedAt?: number;
  submittedAt?: number;
  timeRemainingMs?: number;
}

export interface ExamAttempt {
  _id: Id<"examAttempts">;
  visitorId: string;
  examId?: Id<"exams">;
  questionSetId?: Id<"questionSets">;
  mode: ExamMode;
  currentSectionIndex: number;
  currentQuestionIndex: number;
  sectionStates?: SectionState[];
  status: AttemptStatus;
  startedAt: number;
  lastActiveAt: number;
  completedAt?: number;
}

// ─────────────────────────────────────────────────────────
// SCORE TYPES
// ─────────────────────────────────────────────────────────

export interface DomainScore {
  category: QuestionCategory;
  domain: string;
  correct: number;
  total: number;
  percentage: number;
}

export interface SkillScore {
  category: QuestionCategory;
  domain: string;
  skill: string;
  correct: number;
  total: number;
  percentage: number;
}

export interface ScoreReport {
  _id: Id<"scoreReports">;
  attemptId: Id<"examAttempts">;
  visitorId: string;
  mathRaw: number;
  readingWritingRaw: number;
  mathScaled: number;
  readingWritingScaled: number;
  totalScaled: number;
  domainScores: DomainScore[];
  skillScores: SkillScore[];
  totalTimeMs: number;
  avgTimePerQuestionMs: number;
  generatedAt: number;
}

// ─────────────────────────────────────────────────────────
// UI STATE TYPES
// ─────────────────────────────────────────────────────────

export type OnboardingStep = "welcome" | "goal" | "mode" | "section";
export type GoalId = "first_time" | "improve_score" | "test_ready";
export type ModeId = "endless" | "timed";
export type SectionId = "reading_writing" | "math" | "both";

export interface OnboardingGoal {
  id: GoalId;
  label: string;
  icon: string;
  desc: string;
}

export interface OnboardingMode {
  id: ModeId;
  label: string;
  icon: string;
  desc: string;
  features: string[];
  recommended: boolean;
}

export interface OnboardingSection {
  id: SectionId;
  label: string;
  questions: number;
  time: string;
  icon: string;
}

export interface AppState {
  screen: "landing" | "exam" | "results" | "break";
  mode?: ExamMode;
  section?: SectionId;
  attemptId?: Id<"examAttempts">;
}

export interface ModuleInfo {
  section: ExamSectionConfig;
  module: ExamModule;
  indexInModule: number;
  moduleStartIndex: number;
}

// ─────────────────────────────────────────────────────────
// STATS TYPES
// ─────────────────────────────────────────────────────────

export interface SectionStats {
  correct: number;
  total: number;
}

export interface ResultStats {
  correct: number;
  attempted: number;
  total: number;
  bySection: {
    reading_writing: SectionStats;
    math: SectionStats;
  };
}
