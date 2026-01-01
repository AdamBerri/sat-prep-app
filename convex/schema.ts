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
    difficulty: v.number(), // Legacy 1-3 scale (kept for backward compatibility)

    // NEW: Precision difficulty (0.0-1.0 scale)
    overallDifficulty: v.optional(v.number()),

    // NEW: Math-specific difficulty factors (0.0-1.0 each)
    mathDifficulty: v.optional(
      v.object({
        reasoningSteps: v.number(), // Number of logical steps required
        algebraicComplexity: v.number(), // Complexity of algebraic manipulations
        conceptualDepth: v.number(), // Depth of conceptual understanding needed
        computationLoad: v.number(), // Amount of arithmetic/calculation
        multiStepRequired: v.number(), // Degree of multi-step problem solving
      })
    ),

    // NEW: Reading/Writing-specific difficulty factors (0.0-1.0 each)
    rwDifficulty: v.optional(
      v.object({
        passageComplexity: v.number(), // Lexile-like text complexity
        inferenceDepth: v.number(), // How deep the inference chain is
        vocabularyLevel: v.number(), // Difficulty of vocabulary used
        evidenceEvaluation: v.number(), // Complexity of evidence analysis
        synthesisRequired: v.number(), // Degree of information synthesis needed
      })
    ),

    // NEW: Generation metadata for agent-generated questions
    generationMetadata: v.optional(
      v.object({
        generatedAt: v.number(),
        agentVersion: v.string(),
        promptTemplate: v.string(),
        promptParameters: v.optional(v.any()),
        verbalizedSampling: v.optional(
          v.object({
            targetDifficultyDistribution: v.array(
              v.object({
                factor: v.string(),
                mean: v.number(),
                stdDev: v.number(),
              })
            ),
            sampledValues: v.any(),
          })
        ),
        qualityScore: v.optional(v.number()),
        humanReviewed: v.optional(v.boolean()),
        reviewedAt: v.optional(v.number()),
      })
    ),

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
          v.literal("custom"),
          v.literal("agent_generated") // NEW: For AI-generated questions
        ),
        testNumber: v.optional(v.number()),
        year: v.optional(v.number()),
        generationBatchId: v.optional(v.string()), // NEW: Links to generation batch
      })
    ),
    tags: v.array(v.string()),
  })
    .index("by_category", ["category"])
    .index("by_domain", ["domain"])
    .index("by_skill", ["skill"])
    .index("by_difficulty", ["difficulty"])
    .index("by_passage", ["passageId"])
    // NEW: Composite indexes for efficient difficulty-based queries
    .index("by_category_and_overall_difficulty", ["category", "overallDifficulty"])
    .index("by_category_domain_difficulty", ["category", "domain", "overallDifficulty"]),

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
    section: v.optional(v.union(v.literal("reading_writing"), v.literal("math"))), // Which section user is practicing
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

  // ─────────────────────────────────────────────────────────
  // ENDLESS MODE - SPACED REPETITION
  // ─────────────────────────────────────────────────────────
  questionReviewSchedule: defineTable({
    visitorId: v.string(),
    questionId: v.id("questions"),
    // SM-2 algorithm fields
    easeFactor: v.number(), // Default 2.5, min 1.3
    interval: v.number(), // Days until next review
    repetitions: v.number(), // Consecutive correct answers
    nextReviewAt: v.number(), // Timestamp for next review
    lastReviewedAt: v.number(), // Timestamp of last review
    // Performance history
    totalAttempts: v.number(),
    correctAttempts: v.number(),
  })
    .index("by_visitor", ["visitorId"])
    .index("by_visitor_and_question", ["visitorId", "questionId"])
    .index("by_visitor_and_next_review", ["visitorId", "nextReviewAt"]),

  // ─────────────────────────────────────────────────────────
  // ENDLESS MODE - SKILL MASTERY
  // ─────────────────────────────────────────────────────────
  skillMastery: defineTable({
    visitorId: v.string(),
    category: v.union(v.literal("reading_writing"), v.literal("math")),
    domain: v.string(),
    skill: v.string(),
    // Mastery tracking
    masteryLevel: v.union(
      v.literal("novice"),
      v.literal("beginner"),
      v.literal("intermediate"),
      v.literal("advanced"),
      v.literal("expert")
    ),
    masteryPoints: v.number(), // 0-1000, determines level
    // Stats for calculation
    totalQuestions: v.number(),
    correctAnswers: v.number(),
    currentStreak: v.number(), // Consecutive correct in this skill
    lastPracticedAt: v.number(),
  })
    .index("by_visitor", ["visitorId"])
    .index("by_visitor_and_skill", ["visitorId", "skill"]),

  // ─────────────────────────────────────────────────────────
  // ENDLESS MODE - SESSION STATE
  // ─────────────────────────────────────────────────────────
  endlessSession: defineTable({
    attemptId: v.id("examAttempts"),
    visitorId: v.string(),
    category: v.optional(
      v.union(v.literal("reading_writing"), v.literal("math"))
    ),
    // Domain filtering (e.g., "geometry_and_trigonometry", "algebra")
    domain: v.optional(v.string()),
    // Streak tracking
    currentStreak: v.number(),
    bestStreak: v.number(),
    sessionStreak: v.number(), // Streak within this session only
    // Session stats
    questionsAnswered: v.number(),
    correctAnswers: v.number(),
    // Question history (to avoid repeats in session)
    questionIdsAnswered: v.array(v.id("questions")),
    // Current question pointer
    currentQuestionId: v.optional(v.id("questions")),
    // Timestamps
    startedAt: v.number(),
    lastActiveAt: v.number(),
  })
    .index("by_attempt", ["attemptId"])
    .index("by_visitor", ["visitorId"]),

  // ─────────────────────────────────────────────────────────
  // ENDLESS MODE - DAILY GOALS
  // ─────────────────────────────────────────────────────────
  dailyGoals: defineTable({
    visitorId: v.string(),
    date: v.string(), // YYYY-MM-DD format
    // Goals
    targetQuestions: v.number(), // User-set daily target (default: 10)
    // Progress
    questionsAnswered: v.number(),
    correctAnswers: v.number(),
    timeSpentMs: v.number(),
    // Streak info
    dailyGoalMet: v.boolean(),
  })
    .index("by_visitor", ["visitorId"])
    .index("by_visitor_and_date", ["visitorId", "date"]),

  // ─────────────────────────────────────────────────────────
  // USER PREFERENCES
  // ─────────────────────────────────────────────────────────
  userPreferences: defineTable({
    visitorId: v.string(),
    dailyQuestionTarget: v.number(), // Default: 10
    preferredCategories: v.optional(
      v.array(v.union(v.literal("reading_writing"), v.literal("math")))
    ),
  }).index("by_visitor", ["visitorId"]),

  // ─────────────────────────────────────────────────────────
  // QUESTION GENERATION BATCHES (for agent-generated questions)
  // ─────────────────────────────────────────────────────────
  questionGenerationBatches: defineTable({
    batchId: v.string(), // UUID or similar identifier
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
    status: v.union(
      v.literal("pending"),
      v.literal("in_progress"),
      v.literal("completed"),
      v.literal("failed")
    ),
    // Generation parameters
    agentVersion: v.string(),
    targetCategory: v.union(v.literal("reading_writing"), v.literal("math")),
    targetDomain: v.optional(v.string()),
    targetSkill: v.optional(v.string()),
    targetCount: v.number(),
    // Difficulty targeting (verbalized sampling parameters)
    difficultyTargets: v.object({
      overallDifficultyRange: v.object({
        min: v.number(),
        max: v.number(),
      }),
      factorTargets: v.optional(
        v.array(
          v.object({
            factor: v.string(),
            targetMean: v.number(),
            targetStdDev: v.number(),
          })
        )
      ),
    }),
    // Results
    questionsGenerated: v.number(),
    questionIds: v.array(v.id("questions")),
    errorLog: v.optional(v.array(v.string())),
  })
    .index("by_batch_id", ["batchId"])
    .index("by_status", ["status"])
    .index("by_category", ["targetCategory"])
    .index("by_created_at", ["createdAt"]),

  // ─────────────────────────────────────────────────────────
  // IMAGE GENERATION DLQ (Dead Letter Queue for failed generations)
  // ─────────────────────────────────────────────────────────
  imageGenerationDLQ: defineTable({
    // Original request data
    questionPrompt: v.string(),
    options: v.array(
      v.object({
        key: v.string(),
        content: v.string(),
      })
    ),
    correctAnswer: v.string(),
    figureType: v.union(
      v.literal("graph"),
      v.literal("geometric"),
      v.literal("data_display")
    ),
    domain: v.optional(v.string()),
    skill: v.optional(v.string()),
    imageAltText: v.optional(v.string()),
    // Claude's generated prompt (if Stage 1 succeeded)
    claudePrompt: v.optional(v.string()),
    // Error info
    error: v.string(),
    errorStage: v.union(v.literal("claude"), v.literal("gemini"), v.literal("upload")),
    // Retry tracking
    retryCount: v.number(),
    maxRetries: v.number(),
    lastAttemptAt: v.number(),
    // Status
    status: v.union(
      v.literal("pending"),
      v.literal("retrying"),
      v.literal("succeeded"),
      v.literal("failed_permanently")
    ),
    // Result (if retry succeeded)
    imageId: v.optional(v.id("images")),
    questionId: v.optional(v.id("questions")),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"])
    .index("by_last_attempt", ["lastAttemptAt"]),

  // ─────────────────────────────────────────────────────────
  // DIFFICULTY CALIBRATION (learns actual difficulty from user performance)
  // ─────────────────────────────────────────────────────────
  difficultyCalibration: defineTable({
    questionId: v.id("questions"),
    category: v.union(v.literal("reading_writing"), v.literal("math")),
    // Predicted vs actual difficulty
    predictedDifficulty: v.number(), // What the agent/creator set
    observedDifficulty: v.number(), // Calculated from user performance
    // Factor-level calibration
    factorCalibrations: v.optional(
      v.array(
        v.object({
          factor: v.string(),
          predicted: v.number(),
          observed: v.number(),
        })
      )
    ),
    // Sample size for statistical significance
    sampleSize: v.number(),
    lastUpdatedAt: v.number(),
    confidenceInterval: v.optional(
      v.object({
        lower: v.number(),
        upper: v.number(),
      })
    ),
  })
    .index("by_question", ["questionId"])
    .index("by_category", ["category"])
    .index("by_sample_size", ["sampleSize"]),
});
