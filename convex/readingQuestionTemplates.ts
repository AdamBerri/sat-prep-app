// ─────────────────────────────────────────────────────────
// READING QUESTION TEMPLATES
// ─────────────────────────────────────────────────────────
// Verbalized sampling parameters and distractor strategies
// for SAT reading questions with passages (not charts/data).
// Modeled after readingDataTemplates.ts but for text-only questions.

// ─────────────────────────────────────────────────────────
// QUESTION TYPES
// ─────────────────────────────────────────────────────────

/**
 * SAT Reading question types based on College Board categories.
 * Distribution based on actual SAT patterns.
 */
export const QUESTION_TYPES = [
  "central_ideas", // Main point/purpose (15%)
  "inferences", // What can be inferred (15%)
  "vocabulary_in_context", // Word/phrase meaning (10%)
  "text_structure", // Function of paragraph/sentence (10%)
  "command_of_evidence", // Which quote supports claim (25%)
  "rhetorical_synthesis", // Complete text with evidence (10%)
] as const;

export type QuestionType = (typeof QUESTION_TYPES)[number];

/**
 * Approximate distribution of question types on the SAT.
 * Used for batch generation to match real test proportions.
 */
export const QUESTION_TYPE_DISTRIBUTION: Record<QuestionType, number> = {
  command_of_evidence: 0.25,
  central_ideas: 0.15,
  inferences: 0.15,
  vocabulary_in_context: 0.10,
  text_structure: 0.10,
  rhetorical_synthesis: 0.10,
  // Note: 15% is quantitative evidence, handled by readingDataGeneration.ts
};

// ─────────────────────────────────────────────────────────
// PASSAGE TYPES
// ─────────────────────────────────────────────────────────

export const PASSAGE_TYPES = [
  "literary_narrative", // Fiction excerpts, memoir
  "social_science", // Psychology, sociology, economics
  "natural_science", // Biology, chemistry, physics, ecology
  "humanities", // History, philosophy, arts, culture
] as const;

export type PassageType = (typeof PASSAGE_TYPES)[number];

/**
 * Characteristics for each passage type to guide generation.
 */
export const PASSAGE_TYPE_CHARACTERISTICS: Record<PassageType, {
  description: string;
  voiceOptions: string[];
  topicExamples: string[];
  structureHints: string[];
}> = {
  literary_narrative: {
    description: "Fiction excerpt or personal narrative with literary devices",
    voiceOptions: ["first-person reflective", "third-person limited", "third-person omniscient"],
    topicExamples: [
      "coming-of-age realization",
      "cultural identity exploration",
      "relationship dynamics",
      "confronting adversity",
      "moment of self-discovery",
    ],
    structureHints: [
      "sensory details and imagery",
      "internal monologue",
      "dialogue that reveals character",
      "symbolic objects or settings",
    ],
  },
  social_science: {
    description: "Academic writing about human behavior, society, or economics",
    voiceOptions: ["academic third-person", "journalistic", "research summary"],
    topicExamples: [
      "cognitive psychology study",
      "behavioral economics finding",
      "sociological phenomenon",
      "educational research",
      "demographic trend analysis",
    ],
    structureHints: [
      "claim followed by evidence",
      "study methodology summary",
      "counterargument acknowledgment",
      "implications for practice",
    ],
  },
  natural_science: {
    description: "Scientific research, discovery, or phenomenon explanation",
    voiceOptions: ["research paper summary", "science journalism", "academic explanation"],
    topicExamples: [
      "biological mechanism",
      "ecological relationship",
      "physics discovery",
      "medical research finding",
      "environmental process",
    ],
    structureHints: [
      "hypothesis and evidence",
      "process explanation",
      "cause-effect relationship",
      "scientific method reference",
    ],
  },
  humanities: {
    description: "Historical analysis, philosophical argument, or cultural critique",
    voiceOptions: ["historical narrative", "philosophical argument", "cultural analysis"],
    topicExamples: [
      "historical figure's contribution",
      "philosophical concept",
      "artistic movement",
      "cultural tradition",
      "historical event analysis",
    ],
    structureHints: [
      "thesis with supporting evidence",
      "chronological development",
      "compare/contrast elements",
      "significance/implications",
    ],
  },
};

// ─────────────────────────────────────────────────────────
// QUESTION FOCUS AREAS
// ─────────────────────────────────────────────────────────

/**
 * Specific aspects a question can focus on within its type.
 * This adds another layer of variation to question generation.
 */
export const QUESTION_FOCUS = [
  "author_purpose", // Why did author include X
  "evidence_relationship", // How does quote support claim
  "detail_interpretation", // What does detail suggest
  "structural_analysis", // Function of section/paragraph
  "tone_assessment", // Author's attitude/perspective
  "comparative_elements", // How do elements relate
  "logical_development", // Argument progression
] as const;

export type QuestionFocus = (typeof QUESTION_FOCUS)[number];

// ─────────────────────────────────────────────────────────
// VERBALIZED SAMPLING PARAMETERS
// ─────────────────────────────────────────────────────────

/**
 * Parameters for verbalized sampling to create unique questions.
 * Each is sampled to guide question generation.
 */
export const READING_QUESTION_PARAMS = {
  questionTypes: QUESTION_TYPES,
  passageTypes: PASSAGE_TYPES,
  questionFocus: QUESTION_FOCUS,

  // Gaussian distributions for difficulty factors
  passageComplexity: { mean: 0.5, stdDev: 0.2 }, // Lexile/reading level proxy
  inferenceDepth: { mean: 0.5, stdDev: 0.25 }, // 0=explicit, 1=deep inference
  vocabularyLevel: { mean: 0.5, stdDev: 0.2 }, // Word difficulty
  evidenceEvaluation: { mean: 0.5, stdDev: 0.2 }, // Complexity of evidence assessment
  synthesisRequired: { mean: 0.4, stdDev: 0.2 }, // Need to combine multiple parts

  // Passage length options
  passageLengths: ["short", "medium", "long"] as const,
  passageLengthWords: {
    short: { min: 100, max: 150 },
    medium: { min: 150, max: 250 },
    long: { min: 250, max: 350 },
  },
};

export type PassageLength = (typeof READING_QUESTION_PARAMS.passageLengths)[number];

// ─────────────────────────────────────────────────────────
// DISTRACTOR STRATEGIES
// ─────────────────────────────────────────────────────────

/**
 * Strategies for generating plausible but incorrect answer choices.
 * Each describes a common reading comprehension error.
 */
export const READING_DISTRACTOR_STRATEGIES = {
  too_broad:
    "Answer is technically true but too general. It could apply to many passages and doesn't specifically address the question. Missing the precise focus.",

  too_narrow:
    "Answer focuses on a minor detail that's in the passage but misses the main point. True statement, wrong scope.",

  opposite_meaning:
    "Answer reverses the author's actual position or the passage's meaning. Contradicts what the text says.",

  unsupported_inference:
    "Answer makes a reasonable-sounding claim that goes beyond what the text actually supports. Plausible but not evidenced.",

  wrong_scope:
    "Answer references content from the wrong paragraph or applies an idea from one part to a question about another part.",

  misread_tone:
    "Answer misinterprets the author's attitude, confusing approval with criticism, certainty with hesitation, etc.",

  partial_answer:
    "Answer addresses only part of what the question asks. Incomplete even if partially correct.",

  plausible_but_wrong:
    "Answer uses language/phrases from the passage but draws an incorrect conclusion. Sounds right, isn't right.",

  extreme_position:
    "Answer uses absolute language ('always', 'never', 'completely') when the passage is more nuanced.",

  temporal_confusion:
    "Answer confuses sequence of events, or attributes to one time period what belongs to another.",
} as const;

export type DistractorStrategy = keyof typeof READING_DISTRACTOR_STRATEGIES;

/**
 * Effective combinations of distractor strategies for different question types.
 */
export const DISTRACTOR_COMBOS_BY_TYPE: Record<QuestionType, DistractorStrategy[][]> = {
  central_ideas: [
    ["too_broad", "too_narrow", "opposite_meaning"],
    ["partial_answer", "too_narrow", "unsupported_inference"],
    ["extreme_position", "too_broad", "wrong_scope"],
  ],
  inferences: [
    ["unsupported_inference", "opposite_meaning", "too_narrow"],
    ["plausible_but_wrong", "extreme_position", "wrong_scope"],
    ["unsupported_inference", "partial_answer", "too_broad"],
  ],
  vocabulary_in_context: [
    ["plausible_but_wrong", "too_broad", "opposite_meaning"],
    ["wrong_scope", "plausible_but_wrong", "unsupported_inference"],
  ],
  text_structure: [
    ["wrong_scope", "too_narrow", "opposite_meaning"],
    ["partial_answer", "plausible_but_wrong", "too_broad"],
  ],
  command_of_evidence: [
    ["wrong_scope", "partial_answer", "opposite_meaning"],
    ["too_narrow", "unsupported_inference", "plausible_but_wrong"],
    ["wrong_scope", "too_broad", "partial_answer"],
  ],
  rhetorical_synthesis: [
    ["partial_answer", "opposite_meaning", "unsupported_inference"],
    ["plausible_but_wrong", "wrong_scope", "too_narrow"],
  ],
};

// General fallback combos
export const DISTRACTOR_COMBOS: DistractorStrategy[][] = [
  ["too_broad", "too_narrow", "opposite_meaning"],
  ["unsupported_inference", "partial_answer", "plausible_but_wrong"],
  ["wrong_scope", "misread_tone", "extreme_position"],
  ["too_narrow", "plausible_but_wrong", "unsupported_inference"],
  ["opposite_meaning", "wrong_scope", "too_broad"],
];

// ─────────────────────────────────────────────────────────
// SAMPLED PARAMETERS INTERFACE
// ─────────────────────────────────────────────────────────

export interface SampledReadingParams {
  // Question configuration
  questionType: QuestionType;
  questionFocus: QuestionFocus;

  // Passage configuration
  passageType: PassageType;
  passageLength: PassageLength;
  passageComplexity: number; // 0.0-1.0

  // Difficulty factors
  inferenceDepth: number; // 0.0-1.0
  vocabularyLevel: number; // 0.0-1.0
  evidenceEvaluation: number; // 0.0-1.0
  synthesisRequired: number; // 0.0-1.0

  // Distractor strategy triplet
  distractorStrategies: [DistractorStrategy, DistractorStrategy, DistractorStrategy];

  // Overall target
  targetOverallDifficulty: number; // 0.0-1.0
}

// ─────────────────────────────────────────────────────────
// SAMPLING UTILITIES
// ─────────────────────────────────────────────────────────

/**
 * Sample from a Gaussian distribution, clamped to [0, 1].
 */
export function sampleGaussian(mean: number, stdDev: number): number {
  // Box-Muller transform
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const value = mean + z * stdDev;
  return Math.max(0, Math.min(1, value));
}

/**
 * Sample uniformly from an array.
 */
export function sampleFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Sample a distractor strategy combination for a question type.
 */
export function sampleDistractorCombo(
  questionType: QuestionType
): [DistractorStrategy, DistractorStrategy, DistractorStrategy] {
  const typeSpecificCombos = DISTRACTOR_COMBOS_BY_TYPE[questionType];
  const combo = sampleFrom(typeSpecificCombos || DISTRACTOR_COMBOS);
  return combo as [DistractorStrategy, DistractorStrategy, DistractorStrategy];
}

/**
 * Sample a question type weighted by SAT distribution.
 */
export function sampleQuestionTypeWeighted(): QuestionType {
  const rand = Math.random();
  let cumulative = 0;

  for (const [type, weight] of Object.entries(QUESTION_TYPE_DISTRIBUTION)) {
    cumulative += weight;
    if (rand < cumulative) {
      return type as QuestionType;
    }
  }

  // Fallback
  return sampleFrom(QUESTION_TYPES);
}

/**
 * Generate all sampled parameters for a reading question.
 */
export function sampleReadingQuestionParams(
  overrides?: Partial<SampledReadingParams>
): SampledReadingParams {
  const questionType = overrides?.questionType ?? sampleQuestionTypeWeighted();

  return {
    questionType,
    questionFocus: overrides?.questionFocus ?? sampleFrom(QUESTION_FOCUS),
    passageType: overrides?.passageType ?? sampleFrom(PASSAGE_TYPES),
    passageLength: overrides?.passageLength ?? sampleFrom(READING_QUESTION_PARAMS.passageLengths),
    passageComplexity:
      overrides?.passageComplexity ??
      sampleGaussian(
        READING_QUESTION_PARAMS.passageComplexity.mean,
        READING_QUESTION_PARAMS.passageComplexity.stdDev
      ),
    inferenceDepth:
      overrides?.inferenceDepth ??
      sampleGaussian(
        READING_QUESTION_PARAMS.inferenceDepth.mean,
        READING_QUESTION_PARAMS.inferenceDepth.stdDev
      ),
    vocabularyLevel:
      overrides?.vocabularyLevel ??
      sampleGaussian(
        READING_QUESTION_PARAMS.vocabularyLevel.mean,
        READING_QUESTION_PARAMS.vocabularyLevel.stdDev
      ),
    evidenceEvaluation:
      overrides?.evidenceEvaluation ??
      sampleGaussian(
        READING_QUESTION_PARAMS.evidenceEvaluation.mean,
        READING_QUESTION_PARAMS.evidenceEvaluation.stdDev
      ),
    synthesisRequired:
      overrides?.synthesisRequired ??
      sampleGaussian(
        READING_QUESTION_PARAMS.synthesisRequired.mean,
        READING_QUESTION_PARAMS.synthesisRequired.stdDev
      ),
    distractorStrategies:
      overrides?.distractorStrategies ?? sampleDistractorCombo(questionType),
    targetOverallDifficulty:
      overrides?.targetOverallDifficulty ?? sampleGaussian(0.5, 0.15),
  };
}

/**
 * Compute rwDifficulty object from sampled params.
 */
export function computeRwDifficulty(params: SampledReadingParams): {
  passageComplexity: number;
  inferenceDepth: number;
  vocabularyLevel: number;
  evidenceEvaluation: number;
  synthesisRequired: number;
} {
  return {
    passageComplexity: params.passageComplexity,
    inferenceDepth: params.inferenceDepth,
    vocabularyLevel: params.vocabularyLevel,
    evidenceEvaluation: params.evidenceEvaluation,
    synthesisRequired: params.synthesisRequired,
  };
}

/**
 * Compute overall difficulty from rwDifficulty factors.
 */
export function computeOverallDifficulty(params: SampledReadingParams): number {
  const factors = [
    params.passageComplexity,
    params.inferenceDepth,
    params.vocabularyLevel,
    params.evidenceEvaluation,
    params.synthesisRequired,
  ];
  return factors.reduce((sum, f) => sum + f, 0) / factors.length;
}
