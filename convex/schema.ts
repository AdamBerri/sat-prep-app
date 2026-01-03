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
    stripeCustomerId: v.optional(v.string()), // Link to Stripe customer
    createdAt: v.number(),
    lastActiveAt: v.number(),
  })
    .index("by_external_id", ["externalId"])
    .index("by_email", ["email"])
    .index("by_stripe_customer_id", ["stripeCustomerId"]),

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
    // NEW: For agent-generated passages
    passageType: v.optional(
      v.union(
        v.literal("literary_narrative"),
        v.literal("social_science"),
        v.literal("natural_science"),
        v.literal("humanities")
      )
    ),
    complexity: v.optional(v.number()), // 0.0-1.0
    analyzedFeatures: v.optional(
      v.object({
        paragraphPurposes: v.array(v.string()),
        testableVocabulary: v.array(
          v.object({
            word: v.string(),
            contextualMeaning: v.string(),
          })
        ),
        keyInferences: v.array(v.string()),
        mainIdea: v.optional(v.string()),
        authorPurpose: v.optional(v.string()),
      })
    ),
    // NEW: Track official vs generated
    generationType: v.optional(
      v.union(
        v.literal("official"),
        v.literal("agent_generated"),
        v.literal("curated"),
        v.literal("seeded")
      )
    ),
    usedInQuestionCount: v.optional(v.number()),
  }).index("by_passage_type", ["passageType"]),

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

    // ─────────────────────────────────────────────────────────
    // REVIEW STATUS (for LLM verification before showing to students)
    // ─────────────────────────────────────────────────────────
    reviewStatus: v.optional(
      v.union(
        v.literal("pending"), // Generated, not yet reviewed
        v.literal("verified"), // Passed review, ready for students
        v.literal("needs_revision"), // Review found issues
        v.literal("rejected"), // Failed review, don't show
        v.literal("flagged_high_error") // Verified but flagged due to high student error rate
      )
    ),
    lastReviewedAt: v.optional(v.number()),
    reviewMetadata: v.optional(
      v.object({
        reviewVersion: v.string(),
        answerValidated: v.boolean(),
        originalCorrectAnswer: v.optional(v.string()), // If answer was corrected
        confidenceScore: v.number(),
        reviewNotes: v.optional(v.string()),
      })
    ),

    // ─────────────────────────────────────────────────────────
    // IMPROVEMENT HISTORY (tracks all auto-improvements made to question)
    // ─────────────────────────────────────────────────────────
    improvementHistory: v.optional(
      v.array(
        v.object({
          improvedAt: v.number(),
          improvementType: v.string(), // "answer_choice", "question_stem", "correct_answer"
          fieldChanged: v.string(), // "prompt", "optionA", "optionB", etc.
          originalValue: v.string(),
          newValue: v.string(),
          reason: v.string(),
        })
      )
    ),
  })
    .index("by_category", ["category"])
    .index("by_domain", ["domain"])
    .index("by_skill", ["skill"])
    .index("by_difficulty", ["difficulty"])
    .index("by_passage", ["passageId"])
    // NEW: Composite indexes for efficient difficulty-based queries
    .index("by_category_and_overall_difficulty", ["category", "overallDifficulty"])
    .index("by_category_domain_difficulty", ["category", "domain", "overallDifficulty"])
    // Review status indexes
    .index("by_review_status", ["reviewStatus"])
    .index("by_category_review_status", ["category", "reviewStatus"]),

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
  // READING DATA DLQ (Dead Letter Queue for reading data question failures)
  // ─────────────────────────────────────────────────────────
  readingDataDLQ: defineTable({
    // Data type
    dataType: v.union(
      v.literal("bar_chart"),
      v.literal("line_graph"),
      v.literal("data_table")
    ),
    // Sampled parameters
    sampledParams: v.object({
      claimType: v.string(),
      claimStrength: v.number(),
      targetDataPoint: v.string(),
      questionPosition: v.string(),
      distractorStrategies: v.array(v.string()),
      domain: v.string(),
    }),
    // Generated data (if Stage 1 succeeded)
    chartData: v.optional(v.any()),
    // Batch info
    batchId: v.optional(v.string()),
    // Error info
    error: v.string(),
    errorStage: v.union(
      v.literal("data_generation"),
      v.literal("image_generation"),
      v.literal("question_generation"),
      v.literal("storage")
    ),
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
    .index("by_batch_id", ["batchId"]),

  // ─────────────────────────────────────────────────────────
  // READING QUESTION DLQ (Dead Letter Queue for reading question failures)
  // ─────────────────────────────────────────────────────────
  readingQuestionDLQ: defineTable({
    // Question type
    questionType: v.union(
      v.literal("central_ideas"),
      v.literal("inferences"),
      v.literal("vocabulary_in_context"),
      v.literal("text_structure"),
      v.literal("command_of_evidence"),
      v.literal("rhetorical_synthesis")
    ),
    // Passage type
    passageType: v.union(
      v.literal("literary_narrative"),
      v.literal("social_science"),
      v.literal("natural_science"),
      v.literal("humanities")
    ),
    // Sampled parameters
    sampledParams: v.object({
      questionType: v.string(),
      questionFocus: v.string(),
      passageType: v.string(),
      passageLength: v.string(),
      passageComplexity: v.number(),
      inferenceDepth: v.number(),
      vocabularyLevel: v.number(),
      evidenceEvaluation: v.number(),
      synthesisRequired: v.number(),
      distractorStrategies: v.array(v.string()),
      targetOverallDifficulty: v.number(),
    }),
    // Generated passage data (if Stage 1 succeeded)
    passageData: v.optional(
      v.object({
        passage: v.string(),
        title: v.optional(v.union(v.string(), v.null())),
        author: v.string(),
        mainIdea: v.string(),
      })
    ),
    // Batch info
    batchId: v.optional(v.string()),
    // Error info
    error: v.string(),
    errorStage: v.union(
      v.literal("passage_generation"),
      v.literal("question_generation"),
      v.literal("storage")
    ),
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
    passageId: v.optional(v.id("passages")),
    questionId: v.optional(v.id("questions")),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"])
    .index("by_batch_id", ["batchId"]),

  // ─────────────────────────────────────────────────────────
  // MATH QUESTION DLQ (Dead Letter Queue for math question failures)
  // ─────────────────────────────────────────────────────────
  mathQuestionDLQ: defineTable({
    // Domain and skill
    domain: v.union(
      v.literal("algebra"),
      v.literal("advanced_math"),
      v.literal("problem_solving"),
      v.literal("geometry_trig")
    ),
    skill: v.string(),
    // Sampled parameters
    sampledParams: v.object({
      domain: v.string(),
      skill: v.string(),
      contextType: v.string(),
      figureType: v.string(),
      reasoningSteps: v.number(),
      algebraicComplexity: v.number(),
      conceptualDepth: v.number(),
      computationLoad: v.number(),
      multiStepRequired: v.number(),
      wordProblemComplexity: v.number(),
      distractorStrategies: v.array(v.string()),
      targetOverallDifficulty: v.number(),
    }),
    // Generated problem data (if problem generation succeeded)
    problemData: v.optional(
      v.object({
        problemText: v.string(),
        correctAnswer: v.string(),
        solutionSteps: v.array(v.string()),
      })
    ),
    // Batch info
    batchId: v.optional(v.string()),
    // Error info
    error: v.string(),
    errorStage: v.union(
      v.literal("problem_generation"),
      v.literal("figure_generation"),
      v.literal("question_generation"),
      v.literal("storage")
    ),
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
    .index("by_batch_id", ["batchId"]),

  // ─────────────────────────────────────────────────────────
  // QUESTION PERFORMANCE STATS (for tracking student error rates per question)
  // ─────────────────────────────────────────────────────────
  questionPerformanceStats: defineTable({
    questionId: v.id("questions"),
    totalAttempts: v.number(),
    correctAttempts: v.number(),
    errorRate: v.number(), // Computed: 1 - (correct/total)
    answerDistribution: v.object({
      A: v.number(),
      B: v.number(),
      C: v.number(),
      D: v.number(),
    }),
    mostCommonWrongAnswer: v.optional(v.string()),
    flaggedForReview: v.boolean(),
    flagReason: v.optional(v.string()),
    lastUpdatedAt: v.number(),
  })
    .index("by_question", ["questionId"])
    .index("by_error_rate", ["errorRate"])
    .index("by_flagged", ["flaggedForReview"]),

  // ─────────────────────────────────────────────────────────
  // QUESTION REVIEW DLQ (Dead Letter Queue for failed review attempts)
  // ─────────────────────────────────────────────────────────
  questionReviewDLQ: defineTable({
    questionId: v.id("questions"),
    reviewType: v.union(
      v.literal("initial_verification"),
      v.literal("high_error_rate_recheck")
    ),
    error: v.string(),
    retryCount: v.number(),
    maxRetries: v.number(),
    lastAttemptAt: v.number(),
    status: v.union(
      v.literal("pending"),
      v.literal("retrying"),
      v.literal("succeeded"),
      v.literal("failed_permanently")
    ),
    createdAt: v.number(),
  })
    .index("by_status", ["status"])
    .index("by_question", ["questionId"])
    .index("by_created_at", ["createdAt"]),

  // ─────────────────────────────────────────────────────────
  // GAMIFICATION - USER ACHIEVEMENTS
  // ─────────────────────────────────────────────────────────
  userAchievements: defineTable({
    visitorId: v.string(),
    achievementId: v.string(), // e.g., "streak_5", "questions_100"
    category: v.union(
      v.literal("streak"),
      v.literal("questions"),
      v.literal("accuracy"),
      v.literal("domain_mastery"),
      v.literal("daily_challenge"),
      v.literal("special")
    ),
    unlockedAt: v.number(),
  })
    .index("by_visitor", ["visitorId"])
    .index("by_visitor_and_achievement", ["visitorId", "achievementId"]),

  // ─────────────────────────────────────────────────────────
  // GAMIFICATION - DAILY CHALLENGES
  // ─────────────────────────────────────────────────────────
  dailyChallenges: defineTable({
    visitorId: v.string(),
    date: v.string(), // YYYY-MM-DD format
    challenges: v.array(
      v.object({
        id: v.string(), // e.g., "streak_5_in_session"
        type: v.union(
          v.literal("streak"),
          v.literal("questions"),
          v.literal("hard_questions"),
          v.literal("domain_variety"),
          v.literal("accuracy"),
          v.literal("speed")
        ),
        description: v.string(),
        target: v.number(),
        current: v.number(),
        completed: v.boolean(),
        reward: v.object({
          type: v.union(v.literal("points"), v.literal("badge")),
          value: v.union(v.number(), v.string()),
        }),
      })
    ),
    allCompleted: v.boolean(),
    bonusClaimed: v.boolean(),
  })
    .index("by_visitor", ["visitorId"])
    .index("by_visitor_and_date", ["visitorId", "date"]),

  // ─────────────────────────────────────────────────────────
  // GAMIFICATION - USER SETTINGS
  // ─────────────────────────────────────────────────────────
  userGamificationSettings: defineTable({
    visitorId: v.string(),
    soundEnabled: v.boolean(),
    soundVolume: v.number(), // 0.0 - 1.0
    confettiEnabled: v.boolean(),
  }).index("by_visitor", ["visitorId"]),

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

  // ─────────────────────────────────────────────────────────
  // TUTORING SYSTEM
  // ─────────────────────────────────────────────────────────

  // Tutors table (supports future multi-tutor)
  tutors: defineTable({
    userId: v.optional(v.string()), // Links to Clerk user ID if tutor uses the platform
    name: v.string(),
    email: v.string(),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    sessionPrice: v.number(), // In cents ($300 = 30000)
    sessionDurationMinutes: v.number(), // 90 for 1.5 hours
    zoomPersonalMeetingUrl: v.optional(v.string()),
    isActive: v.boolean(),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_user_id", ["userId"])
    .index("by_active", ["isActive"]),

  // Specific bookable time slots
  tutoringSlots: defineTable({
    tutorId: v.id("tutors"),
    startTime: v.number(), // Unix timestamp
    endTime: v.number(), // Unix timestamp
    status: v.union(
      v.literal("available"),
      v.literal("pending"), // Payment in progress
      v.literal("booked"),
      v.literal("completed"),
      v.literal("cancelled")
    ),
    pendingExpiry: v.optional(v.number()), // When pending slot becomes available again
  })
    .index("by_tutor", ["tutorId"])
    .index("by_tutor_and_status", ["tutorId", "status"])
    .index("by_start_time", ["startTime"])
    .index("by_tutor_and_start", ["tutorId", "startTime"])
    .index("by_status", ["status"]),

  // Bookings (the actual reservation)
  tutoringBookings: defineTable({
    slotId: v.id("tutoringSlots"),
    tutorId: v.id("tutors"),
    studentId: v.string(), // Clerk user ID
    studentEmail: v.string(),
    studentName: v.optional(v.string()),
    // Payment
    stripeCheckoutSessionId: v.optional(v.string()),
    stripePaymentIntentId: v.optional(v.string()),
    amountPaid: v.number(), // In cents
    paymentStatus: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    // Session details
    zoomLink: v.optional(v.string()),
    notes: v.optional(v.string()), // Student's notes/goals for session
    // Status
    status: v.union(
      v.literal("pending_payment"),
      v.literal("confirmed"),
      v.literal("completed"),
      v.literal("cancelled"),
      v.literal("no_show")
    ),
    // Timestamps
    createdAt: v.number(),
    confirmedAt: v.optional(v.number()),
    cancelledAt: v.optional(v.number()),
  })
    .index("by_student", ["studentId"])
    .index("by_tutor", ["tutorId"])
    .index("by_slot", ["slotId"])
    .index("by_stripe_session", ["stripeCheckoutSessionId"])
    .index("by_status", ["status"])
    .index("by_student_and_status", ["studentId", "status"]),

  // ─────────────────────────────────────────────────────────
  // SUBSCRIPTIONS
  // ─────────────────────────────────────────────────────────
  subscriptions: defineTable({
    userId: v.string(), // Clerk user ID
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    plan: v.union(
      v.literal("monthly"),
      v.literal("three_month"),
      v.literal("annual")
    ),
    status: v.union(
      v.literal("active"),
      v.literal("past_due"),
      v.literal("canceled"),
      v.literal("incomplete"),
      v.literal("incomplete_expired"),
      v.literal("trialing"),
      v.literal("unpaid"),
      v.literal("paused")
    ),
    currentPeriodStart: v.number(), // Unix timestamp (ms)
    currentPeriodEnd: v.number(), // Unix timestamp (ms)
    cancelAtPeriodEnd: v.boolean(), // True if user canceled but still has access
    trialStart: v.optional(v.number()),
    trialEnd: v.optional(v.number()),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_user_id", ["userId"])
    .index("by_stripe_subscription_id", ["stripeSubscriptionId"])
    .index("by_stripe_customer_id", ["stripeCustomerId"])
    .index("by_status", ["status"]),

  // ─────────────────────────────────────────────────────────
  // OFFICIAL QUESTIONS (Imported from College Board PDFs)
  // ─────────────────────────────────────────────────────────
  officialQuestions: defineTable({
    // Source info
    source: v.object({
      pdfName: v.string(), // e.g., "SAT Practice Test 1"
      testNumber: v.optional(v.number()),
      sectionNumber: v.number(),
      questionNumber: v.number(),
      year: v.optional(v.number()),
    }),
    // Question classification
    category: v.union(v.literal("reading_writing"), v.literal("math")),
    questionType: v.string(), // e.g., "central_ideas", "inferences", etc.
    domain: v.string(),
    skill: v.string(),
    // Passage (for reading questions)
    passage: v.optional(
      v.object({
        content: v.string(),
        title: v.optional(v.string()),
        author: v.optional(v.string()),
        source: v.optional(v.string()),
        passageType: v.optional(
          v.union(
            v.literal("literary_narrative"),
            v.literal("social_science"),
            v.literal("natural_science"),
            v.literal("humanities"),
            v.literal("paired")
          )
        ),
      })
    ),
    // Question content
    questionStem: v.string(),
    choices: v.object({
      A: v.string(),
      B: v.string(),
      C: v.string(),
      D: v.string(),
    }),
    correctAnswer: v.string(),
    // Official explanation if available
    officialExplanation: v.optional(v.string()),
    // Analysis metadata (added by Claude during import)
    analysisMetadata: v.optional(
      v.object({
        distractorStrategies: v.optional(v.array(v.string())),
        keyInferences: v.optional(v.array(v.string())),
        vocabularyTested: v.optional(v.array(v.string())),
        difficultyEstimate: v.optional(v.number()),
      })
    ),
    // Import tracking
    importedAt: v.number(),
    importBatchId: v.optional(v.string()),
    // Whether this has been converted to a playable question
    convertedToQuestionId: v.optional(v.id("questions")),
  })
    .index("by_category", ["category"])
    .index("by_question_type", ["questionType"])
    .index("by_source", ["source.pdfName", "source.questionNumber"])
    .index("by_import_batch", ["importBatchId"]),

  // ─────────────────────────────────────────────────────────
  // PDF TEST PRODUCTS
  // ─────────────────────────────────────────────────────────
  pdfTests: defineTable({
    name: v.string(), // "Full-Length Practice Test #1"
    description: v.string(),
    testNumber: v.number(), // 1, 2, 3... for ordering
    // PDF file storage
    pdfStorageId: v.id("_storage"), // Test PDF
    answerKeyStorageId: v.id("_storage"), // Answer key PDF
    // Metadata
    questionCount: v.number(), // 98 for full SAT
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
      v.literal("mixed")
    ),
    previewImageStorageId: v.optional(v.id("_storage")), // Cover/preview image
    isActive: v.boolean(), // Can be purchased
    createdAt: v.number(),
  })
    .index("by_test_number", ["testNumber"])
    .index("by_active", ["isActive"]),

  // ─────────────────────────────────────────────────────────
  // PDF PURCHASES
  // ─────────────────────────────────────────────────────────
  pdfPurchases: defineTable({
    userId: v.string(), // Clerk user ID
    // What they bought
    purchaseType: v.union(v.literal("single"), v.literal("bundle")),
    testIds: v.array(v.id("pdfTests")), // Which test(s) they have access to
    // Payment
    amountPaid: v.number(), // In cents
    stripeCheckoutSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
    paymentStatus: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    // Tracking
    downloadCount: v.number(),
    lastDownloadedAt: v.optional(v.number()),
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_stripe_session", ["stripeCheckoutSessionId"])
    .index("by_status", ["paymentStatus"]),
});
