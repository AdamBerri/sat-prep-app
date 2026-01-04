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

// ─────────────────────────────────────────────────────────
// DIFFICULTY FACTOR TYPES (for precision difficulty targeting)
// ─────────────────────────────────────────────────────────

export interface MathDifficultyFactors {
  reasoningSteps: number; // 0.0-1.0: Number of logical steps required
  algebraicComplexity: number; // 0.0-1.0: Complexity of algebraic manipulations
  conceptualDepth: number; // 0.0-1.0: Depth of conceptual understanding needed
  computationLoad: number; // 0.0-1.0: Amount of arithmetic/calculation
  multiStepRequired: number; // 0.0-1.0: Degree of multi-step problem solving
}

export interface RWDifficultyFactors {
  passageComplexity: number; // 0.0-1.0: Lexile-like text complexity
  inferenceDepth: number; // 0.0-1.0: How deep the inference chain is
  vocabularyLevel: number; // 0.0-1.0: Difficulty of vocabulary used
  evidenceEvaluation: number; // 0.0-1.0: Complexity of evidence analysis
  synthesisRequired: number; // 0.0-1.0: Degree of information synthesis needed
}

export type DifficultyFactors = MathDifficultyFactors | RWDifficultyFactors;

export interface VerbalizedSamplingParams {
  targetDifficultyDistribution: Array<{
    factor: string;
    mean: number;
    stdDev: number;
  }>;
  sampledValues: Record<string, number>;
}

export interface GenerationMetadata {
  generatedAt: number;
  agentVersion: string;
  promptTemplate: string;
  promptParameters?: Record<string, unknown>;
  verbalizedSampling?: VerbalizedSamplingParams;
  qualityScore?: number;
  humanReviewed?: boolean;
  reviewedAt?: number;
}

export type QuestionSourceType =
  | "official_collegeboard"
  | "official_practice_test"
  | "custom"
  | "agent_generated";

export interface QuestionSource {
  type: QuestionSourceType;
  testNumber?: number;
  year?: number;
  generationBatchId?: string;
}

// Grammar-specific display data (for Standard English Conventions questions)
export interface GrammarData {
  sentenceWithUnderline: string; // Full sentence with [underlined] portion marked
  underlinedPortion: string; // The portion being tested
  grammarRule: string; // The grammar rule being tested
}

export interface Question {
  _id: Id<"questions">;
  type: QuestionType;
  category: QuestionCategory;
  domain: string;
  skill: string;
  difficulty: number; // Legacy 1-3 scale
  overallDifficulty?: number; // 0.0-1.0 precision scale
  mathDifficulty?: MathDifficultyFactors;
  rwDifficulty?: RWDifficultyFactors;
  generationMetadata?: GenerationMetadata;
  prompt: string;
  grammarData?: GrammarData; // For grammar/conventions questions
  passageId?: Id<"passages">;
  passage?: Passage | null;
  passage2?: Passage | null; // For cross-text questions
  lineReference?: {
    start: number;
    end: number;
  };
  figure?: QuestionFigure;
  figureUrl?: string | null;
  correctAnswer: string;
  source?: QuestionSource;
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

export type SectionId = "reading_writing" | "math";

export interface PracticeSection {
  id: SectionId;
  label: string;
  questions: number;
  time: string;
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

// ─────────────────────────────────────────────────────────
// ENDLESS MODE TYPES
// ─────────────────────────────────────────────────────────

export type MasteryLevel = "novice" | "beginner" | "intermediate" | "advanced" | "expert";

export interface SkillMastery {
  _id: Id<"skillMastery">;
  visitorId: string;
  category: QuestionCategory;
  domain: string;
  skill: string;
  masteryLevel: MasteryLevel;
  masteryPoints: number;
  totalQuestions: number;
  correctAnswers: number;
  currentStreak: number;
  lastPracticedAt: number;
}

export interface EndlessSession {
  _id: Id<"endlessSession">;
  attemptId: Id<"examAttempts">;
  visitorId: string;
  category?: QuestionCategory;
  currentStreak: number;
  bestStreak: number;
  sessionStreak: number;
  questionsAnswered: number;
  correctAnswers: number;
  questionIdsAnswered: Id<"questions">[];
  currentQuestionId?: Id<"questions">;
  startedAt: number;
  lastActiveAt: number;
}

export interface QuestionReviewSchedule {
  _id: Id<"questionReviewSchedule">;
  visitorId: string;
  questionId: Id<"questions">;
  easeFactor: number;
  interval: number;
  repetitions: number;
  nextReviewAt: number;
  lastReviewedAt: number;
  totalAttempts: number;
  correctAttempts: number;
}

export interface DailyGoal {
  _id: Id<"dailyGoals">;
  visitorId: string;
  date: string;
  targetQuestions: number;
  questionsAnswered: number;
  correctAnswers: number;
  timeSpentMs: number;
  dailyGoalMet: boolean;
}

export interface UserPreferences {
  _id: Id<"userPreferences">;
  visitorId: string;
  dailyQuestionTarget: number;
  preferredCategories?: QuestionCategory[];
}

export interface StreakStats {
  currentStreak: number;
  bestStreak: number;
  totalSessions: number;
}

export interface DailyGoalProgress {
  questionsAnswered: number;
  target: number;
  progress: number;
  goalMet: boolean;
  correctAnswers: number;
  accuracy: number;
}

export interface EndlessAnswerResult {
  isCorrect: boolean;
  correctAnswer: string;
  nextQuestionId: Id<"questions"> | null;
  currentStreak: number;
  sessionStreak: number;
  bestStreak: number;
  masteryLevel: MasteryLevel;
  masteryPoints: number;
  pointChange: number;
}

// ─────────────────────────────────────────────────────────
// DIFFICULTY QUERY TYPES (for endless mode at scale)
// ─────────────────────────────────────────────────────────

export interface DifficultyRange {
  min: number;
  max: number;
}

export interface DifficultyQueryParams {
  category: QuestionCategory;
  overallDifficultyRange?: DifficultyRange;
  domain?: string;
  skill?: string;
  factorFilters?: Array<{
    factor: keyof MathDifficultyFactors | keyof RWDifficultyFactors;
    range: DifficultyRange;
  }>;
  excludeQuestionIds?: Id<"questions">[];
  limit?: number;
  cursor?: string;
}

export interface PaginatedQuestionsResult {
  questions: Question[];
  nextCursor?: string;
  hasMore: boolean;
  totalEstimate?: number;
}

// ─────────────────────────────────────────────────────────
// QUESTION GENERATION BATCH TYPES
// ─────────────────────────────────────────────────────────

export type GenerationBatchStatus = "pending" | "in_progress" | "completed" | "failed";

export interface DifficultyTargets {
  overallDifficultyRange: DifficultyRange;
  factorTargets?: Array<{
    factor: string;
    targetMean: number;
    targetStdDev: number;
  }>;
}

export interface QuestionGenerationBatch {
  _id: Id<"questionGenerationBatches">;
  batchId: string;
  createdAt: number;
  completedAt?: number;
  status: GenerationBatchStatus;
  agentVersion: string;
  targetCategory: QuestionCategory;
  targetDomain?: string;
  targetSkill?: string;
  targetCount: number;
  difficultyTargets: DifficultyTargets;
  questionsGenerated: number;
  questionIds: Id<"questions">[];
  errorLog?: string[];
}

export interface DifficultyCalibration {
  _id: Id<"difficultyCalibration">;
  questionId: Id<"questions">;
  category: QuestionCategory;
  predictedDifficulty: number;
  observedDifficulty: number;
  factorCalibrations?: Array<{
    factor: string;
    predicted: number;
    observed: number;
  }>;
  sampleSize: number;
  lastUpdatedAt: number;
  confidenceInterval?: {
    lower: number;
    upper: number;
  };
}
