import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ─────────────────────────────────────────────────────────
  // USERS
  // ─────────────────────────────────────────────────────────
  users: defineTable({
    externalId: v.string(),
    provider: v.string(),
    email: v.string(),
    name: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    targetScore: v.optional(v.number()),
    testDate: v.optional(v.number()),
    createdAt: v.number(),
    lastActiveAt: v.number(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_email", ["email"]),

  // ─────────────────────────────────────────────────────────
  // IMAGES
  // ─────────────────────────────────────────────────────────
  images: defineTable({
    storageId: v.id("_storage"),
    storageIdSmall: v.optional(v.id("_storage")),
    storageIdThumbnail: v.optional(v.id("_storage")),
    width: v.number(),
    height: v.number(),
    aspectRatio: v.number(),
    altText: v.string(),
    blurhash: v.optional(v.string()),
  }),

  // ─────────────────────────────────────────────────────────
  // PASSAGES
  // ─────────────────────────────────────────────────────────
  passages: defineTable({
    title: v.optional(v.string()),
    author: v.optional(v.string()),
    source: v.optional(v.string()),
    content: v.string(),
  }),

  passageFigures: defineTable({
    passageId: v.id("passages"),
    imageId: v.id("images"),
    figureNumber: v.number(),
    caption: v.optional(v.string()),
    placement: v.union(
      v.literal("inline"),
      v.literal("sidebar"),
      v.literal("below-passage")
    ),
    insertAfterParagraph: v.optional(v.number()),
  }).index("by_passage", ["passageId"]),

  // ─────────────────────────────────────────────────────────
  // QUESTIONS
  // ─────────────────────────────────────────────────────────
  questions: defineTable({
    type: v.union(v.literal("multiple_choice"), v.literal("grid_in")),
    category: v.union(v.literal("reading_writing"), v.literal("math")),
    domain: v.string(),
    skill: v.string(),
    difficulty: v.number(),
    prompt: v.string(),
    passageId: v.optional(v.id("passages")),
    lineReference: v.optional(
      v.object({
        start: v.number(),
        end: v.number(),
      })
    ),
    figure: v.optional(
      v.object({
        imageId: v.id("images"),
        figureType: v.optional(
          v.union(
            v.literal("graph"),
            v.literal("geometric"),
            v.literal("data_display"),
            v.literal("diagram"),
            v.literal("table")
          )
        ),
        caption: v.optional(v.string()),
      })
    ),
    correctAnswer: v.string(),
    source: v.optional(
      v.object({
        type: v.union(
          v.literal("official_collegeboard"),
          v.literal("official_practice_test"),
          v.literal("custom")
        ),
        testNumber: v.optional(v.number()),
        year: v.optional(v.number()),
      })
    ),
    tags: v.array(v.string()),
  })
    .index("by_category", ["category"])
    .index("by_domain", ["domain"])
    .index("by_skill", ["skill"])
    .index("by_difficulty", ["difficulty"])
    .index("by_passage", ["passageId"]),

  // ─────────────────────────────────────────────────────────
  // ANSWER OPTIONS
  // ─────────────────────────────────────────────────────────
  answerOptions: defineTable({
    questionId: v.id("questions"),
    key: v.string(),
    content: v.string(),
    imageId: v.optional(v.id("images")),
    order: v.number(),
  }).index("by_question", ["questionId"]),

  // ─────────────────────────────────────────────────────────
  // EXPLANATIONS
  // ─────────────────────────────────────────────────────────
  explanations: defineTable({
    questionId: v.id("questions"),
    correctExplanation: v.string(),
    wrongAnswerExplanations: v.optional(
      v.object({
        A: v.optional(v.string()),
        B: v.optional(v.string()),
        C: v.optional(v.string()),
        D: v.optional(v.string()),
      })
    ),
    commonMistakes: v.optional(
      v.array(
        v.object({
          reason: v.string(),
          description: v.string(),
          relatedSkill: v.optional(v.string()),
        })
      )
    ),
    videoUrl: v.optional(v.string()),
  }).index("by_question", ["questionId"]),

  // ─────────────────────────────────────────────────────────
  // EXAMS
  // ─────────────────────────────────────────────────────────
  exams: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    isOfficial: v.boolean(),
    createdAt: v.number(),
  }),

  examSections: defineTable({
    examId: v.id("exams"),
    name: v.string(),
    type: v.union(v.literal("reading_writing"), v.literal("math")),
    order: v.number(),
    timeLimit: v.number(),
    questionIds: v.array(v.id("questions")),
  }).index("by_exam", ["examId"]),

  // ─────────────────────────────────────────────────────────
  // QUESTION SETS
  // ─────────────────────────────────────────────────────────
  questionSets: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    creatorId: v.id("users"),
    creatorType: v.union(
      v.literal("user"),
      v.literal("admin"),
      v.literal("agent"),
      v.literal("system")
    ),
    questionIds: v.array(v.id("questions")),
    timeLimit: v.optional(v.number()),
    isPublic: v.boolean(),
    generationCriteria: v.optional(
      v.object({
        targetSkills: v.optional(v.array(v.string())),
        difficulty: v.optional(v.number()),
        questionCount: v.optional(v.number()),
        focusOnWeakAreas: v.optional(v.boolean()),
      })
    ),
    createdAt: v.number(),
  })
    .index("by_creator", ["creatorId"])
    .index("by_public", ["isPublic"]),

  // ─────────────────────────────────────────────────────────
  // EXAM ATTEMPTS
  // ─────────────────────────────────────────────────────────
  examAttempts: defineTable({
    visitorId: v.string(), // For anonymous users before auth
    examId: v.optional(v.id("exams")),
    questionSetId: v.optional(v.id("questionSets")),
    mode: v.union(v.literal("sat"), v.literal("practice"), v.literal("endless")),
    currentSectionIndex: v.number(),
    currentQuestionIndex: v.number(),
    sectionStates: v.optional(
      v.array(
        v.object({
          sectionId: v.id("examSections"),
          status: v.union(
            v.literal("locked"),
            v.literal("active"),
            v.literal("submitted")
          ),
          startedAt: v.optional(v.number()),
          submittedAt: v.optional(v.number()),
          timeRemainingMs: v.optional(v.number()),
        })
      )
    ),
    status: v.union(
      v.literal("in_progress"),
      v.literal("paused"),
      v.literal("completed"),
      v.literal("abandoned")
    ),
    startedAt: v.number(),
    lastActiveAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_visitor", ["visitorId"])
    .index("by_visitor_and_status", ["visitorId", "status"]),

  // ─────────────────────────────────────────────────────────
  // USER ANSWERS
  // ─────────────────────────────────────────────────────────
  userAnswers: defineTable({
    attemptId: v.id("examAttempts"),
    questionId: v.id("questions"),
    visitorId: v.string(), // For aggregating user stats
    selectedAnswer: v.optional(v.string()),
    status: v.union(
      v.literal("empty"),
      v.literal("draft"),
      v.literal("submitted"),
      v.literal("graded")
    ),
    isCorrect: v.optional(v.boolean()),
    flagged: v.boolean(),
    crossedOut: v.optional(v.array(v.string())),
    selectedMistakeReason: v.optional(v.string()),
    firstViewedAt: v.number(),
    lastModifiedAt: v.number(),
    submittedAt: v.optional(v.number()),
    timeSpentMs: v.number(),
  })
    .index("by_attempt", ["attemptId"])
    .index("by_attempt_and_question", ["attemptId", "questionId"])
    .index("by_visitor", ["visitorId"]),

  // ─────────────────────────────────────────────────────────
  // HIGHLIGHTS
  // ─────────────────────────────────────────────────────────
  highlights: defineTable({
    attemptId: v.id("examAttempts"),
    passageId: v.id("passages"),
    startOffset: v.number(),
    endOffset: v.number(),
    paragraphIndex: v.optional(v.number()),
    color: v.optional(v.string()),
  }).index("by_attempt_and_passage", ["attemptId", "passageId"]),

  // ─────────────────────────────────────────────────────────
  // SCORE REPORTS
  // ─────────────────────────────────────────────────────────
  scoreReports: defineTable({
    attemptId: v.id("examAttempts"),
    visitorId: v.string(),
    mathRaw: v.number(),
    readingWritingRaw: v.number(),
    mathScaled: v.number(),
    readingWritingScaled: v.number(),
    totalScaled: v.number(),
    domainScores: v.array(
      v.object({
        category: v.union(v.literal("reading_writing"), v.literal("math")),
        domain: v.string(),
        correct: v.number(),
        total: v.number(),
        percentage: v.number(),
      })
    ),
    skillScores: v.array(
      v.object({
        category: v.union(v.literal("reading_writing"), v.literal("math")),
        domain: v.string(),
        skill: v.string(),
        correct: v.number(),
        total: v.number(),
        percentage: v.number(),
      })
    ),
    totalTimeMs: v.number(),
    avgTimePerQuestionMs: v.number(),
    generatedAt: v.number(),
  })
    .index("by_visitor", ["visitorId"])
    .index("by_attempt", ["attemptId"]),

  // ─────────────────────────────────────────────────────────
  // SCORE CONVERSIONS
  // ─────────────────────────────────────────────────────────
  scoreConversions: defineTable({
    examId: v.optional(v.id("exams")),
    section: v.union(v.literal("math"), v.literal("reading_writing")),
    table: v.any(),
  }).index("by_exam", ["examId"]),
});
