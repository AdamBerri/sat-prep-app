import { create } from "zustand";
import type { Id } from "../../convex/_generated/dataModel";
import type { ExamMode, SectionId, LocalUserAnswer } from "@/types";

// ─────────────────────────────────────────────────────────
// SESSION PHASE
// ─────────────────────────────────────────────────────────

export type SessionPhase =
  | "idle" // Fresh page load, waiting to check for existing attempt
  | "selecting" // User is choosing section (no pending attempt)
  | "prompting" // User has a pending attempt, showing resume prompt
  | "confirming" // Confirming full test start
  | "active" // In exam, answering questions
  | "completed" // Finished, showing results
  | "reviewing"; // Reviewing answers after completion

// ─────────────────────────────────────────────────────────
// PENDING ATTEMPT (for resume prompt)
// ─────────────────────────────────────────────────────────

export interface PendingAttempt {
  id: Id<"examAttempts">;
  section: SectionId | null;
  mode: ExamMode;
  answeredCount: number;
  startedAt: number;
}

// ─────────────────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────────────────

interface PracticeState {
  // Session lifecycle
  phase: SessionPhase;

  // Active session data (valid when phase is 'active' | 'completed' | 'reviewing')
  attemptId: Id<"examAttempts"> | null;
  mode: ExamMode | null;
  section: SectionId | null;

  // Exam state
  currentQuestionIndex: number;
  answers: Map<string, LocalUserAnswer>;

  // Pending attempt (for resume prompt)
  pendingAttempt: PendingAttempt | null;
}

// ─────────────────────────────────────────────────────────
// ACTIONS
// ─────────────────────────────────────────────────────────

interface PracticeActions {
  // Initialization - called once when Convex query completes
  initialize: (existingAttempt: PendingAttempt | null) => void;

  // Navigation
  showSelector: () => void;
  showConfirmFullTest: () => void;

  // Session lifecycle
  startSection: (section: SectionId) => void;
  startFullTest: () => void;
  sessionCreated: (
    attemptId: Id<"examAttempts">,
    mode: ExamMode,
    section: SectionId | null
  ) => void;
  resumeSession: () => void;
  abandonAndStartFresh: () => void;
  completeSession: () => void;
  enterReview: () => void;

  // Exam actions
  setCurrentQuestion: (index: number) => void;
  setAnswer: (questionId: string, answer: LocalUserAnswer) => void;

  // Reset (for "New Test" button)
  reset: () => void;
}

// ─────────────────────────────────────────────────────────
// INITIAL STATE
// ─────────────────────────────────────────────────────────

const initialState: PracticeState = {
  phase: "idle",
  attemptId: null,
  mode: null,
  section: null,
  currentQuestionIndex: 0,
  answers: new Map(),
  pendingAttempt: null,
};

// ─────────────────────────────────────────────────────────
// STORE
// ─────────────────────────────────────────────────────────

export const usePracticeStore = create<PracticeState & PracticeActions>(
  (set, get) => ({
    ...initialState,

    // ─────────────────────────────────────────────────────
    // INITIALIZATION
    // ─────────────────────────────────────────────────────

    initialize: (existingAttempt) => {
      // Only initialize if we're in idle state
      if (get().phase !== "idle") return;

      if (existingAttempt) {
        // User has an in-progress attempt - show resume prompt
        set({ phase: "prompting", pendingAttempt: existingAttempt });
      } else {
        // No existing attempt - show section selector
        set({ phase: "selecting", pendingAttempt: null });
      }
    },

    // ─────────────────────────────────────────────────────
    // NAVIGATION
    // ─────────────────────────────────────────────────────

    showSelector: () => {
      set({ phase: "selecting" });
    },

    showConfirmFullTest: () => {
      set({ phase: "confirming" });
    },

    // ─────────────────────────────────────────────────────
    // SESSION LIFECYCLE
    // ─────────────────────────────────────────────────────

    startSection: (section) => {
      // Immediately transition to active to prevent query interference
      set({
        phase: "active",
        section,
        mode: "practice",
        currentQuestionIndex: 0,
        answers: new Map(),
        pendingAttempt: null,
      });
    },

    startFullTest: () => {
      // Immediately transition to active
      set({
        phase: "active",
        section: null,
        mode: "sat",
        currentQuestionIndex: 0,
        answers: new Map(),
        pendingAttempt: null,
      });
    },

    sessionCreated: (attemptId, mode, section) => {
      // Called after Convex mutation succeeds
      set({ attemptId, mode, section });
    },

    resumeSession: () => {
      const { pendingAttempt } = get();
      if (!pendingAttempt) return;

      set({
        phase: "active",
        attemptId: pendingAttempt.id,
        mode: pendingAttempt.mode,
        section: pendingAttempt.section,
        pendingAttempt: null,
      });
    },

    abandonAndStartFresh: () => {
      // User chose to abandon pending attempt and start fresh
      set({
        phase: "selecting",
        pendingAttempt: null,
      });
    },

    completeSession: () => {
      set({ phase: "completed" });
    },

    enterReview: () => {
      set({ phase: "reviewing" });
    },

    // ─────────────────────────────────────────────────────
    // EXAM ACTIONS
    // ─────────────────────────────────────────────────────

    setCurrentQuestion: (index) => {
      set({ currentQuestionIndex: index });
    },

    setAnswer: (questionId, answer) => {
      const answers = new Map(get().answers);
      answers.set(questionId, answer);
      set({ answers });
    },

    // ─────────────────────────────────────────────────────
    // RESET
    // ─────────────────────────────────────────────────────

    reset: () => {
      // Reset to idle so we re-check for existing attempts
      set(initialState);
    },
  })
);

// ─────────────────────────────────────────────────────────
// SELECTORS
// ─────────────────────────────────────────────────────────

// Whether we should query Convex for existing attempts
// Only true when in 'idle' phase
export const useNeedsAttemptCheck = () =>
  usePracticeStore((state) => state.phase === "idle");

// Derived screen for rendering
export const useScreen = () =>
  usePracticeStore((state): ScreenType => {
    switch (state.phase) {
      case "idle":
        return "loading";
      case "selecting":
        return "selector";
      case "prompting":
        return "resume";
      case "confirming":
        return "confirm-full-test";
      case "active":
      case "reviewing":
        return "exam";
      case "completed":
        return "results";
    }
  });

export type ScreenType =
  | "loading"
  | "selector"
  | "resume"
  | "confirm-full-test"
  | "exam"
  | "results";
