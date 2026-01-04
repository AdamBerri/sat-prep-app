// ─────────────────────────────────────────────────────────
// TRANSITIONS TEMPLATES
// ─────────────────────────────────────────────────────────
// Verbalized sampling parameters for SAT Transitions questions.
// Uses Gaussian distributions for difficulty factors.
// NO hardcoded transition word lists - let Claude generate freely.

// ─────────────────────────────────────────────────────────
// RELATIONSHIP TYPES (for reference, not rigidity)
// ─────────────────────────────────────────────────────────

/**
 * Types of logical relationships that transitions express.
 * These are for reference/prompting, NOT to constrain generation.
 */
export const TRANSITION_RELATIONSHIP_TYPES = [
  "addition", // Adding related information
  "contrast", // Showing difference or opposition
  "cause_effect", // Showing causation
  "example", // Providing illustration
  "clarification", // Rephrasing or explaining
  "temporal", // Showing time relationship
  "emphasis", // Stressing importance
  "concession", // Acknowledging counterpoint
  "comparison", // Showing similarity
  "conclusion", // Summing up
] as const;

export type TransitionRelationshipType = (typeof TRANSITION_RELATIONSHIP_TYPES)[number];

/**
 * Human-readable descriptions for each relationship type.
 */
export const RELATIONSHIP_TYPE_DESCRIPTIONS: Record<TransitionRelationshipType, string> = {
  addition: "Adding related information to support the same point (furthermore, additionally, moreover)",
  contrast: "Presenting opposing or different information (however, nevertheless, conversely)",
  cause_effect: "Showing a result or consequence of prior information (therefore, consequently, thus)",
  example: "Providing a specific instance of a general statement (for example, for instance, specifically)",
  clarification: "Restating or explaining in different terms (in other words, that is, namely)",
  temporal: "Indicating time sequence or simultaneous events (meanwhile, subsequently, previously)",
  emphasis: "Stressing or highlighting important information (indeed, in fact, notably)",
  concession: "Acknowledging a counterpoint before making a contrasting point (admittedly, granted)",
  comparison: "Showing similarity between two things (similarly, likewise, in the same way)",
  conclusion: "Summarizing or reaching a final point (thus, in conclusion, ultimately)",
};

// ─────────────────────────────────────────────────────────
// TOPIC CATEGORIES
// ─────────────────────────────────────────────────────────

export const TRANSITION_TOPIC_CATEGORIES = [
  "scientific_research",
  "historical_events",
  "social_issues",
  "technological_development",
  "environmental_topics",
  "cultural_phenomena",
  "economic_concepts",
  "literary_analysis",
  "psychological_research",
  "artistic_movements",
] as const;

export type TransitionTopicCategory = (typeof TRANSITION_TOPIC_CATEGORIES)[number];

// ─────────────────────────────────────────────────────────
// VERBALIZED SAMPLING PARAMETERS (Gaussian distributions)
// ─────────────────────────────────────────────────────────

/**
 * Parameters for verbalized sampling to create unique transitions questions.
 * Each uses Gaussian distribution to create natural variation.
 */
export const TRANSITIONS_PARAMS = {
  // Sentence complexity: how complex the sentences around the transition are
  sentenceComplexity: { mean: 0.5, stdDev: 0.2 },

  // Relationship subtlety: how obvious the logical relationship is
  relationshipSubtlety: { mean: 0.5, stdDev: 0.25 },

  // Vocabulary level: difficulty of words used
  vocabularyLevel: { mean: 0.5, stdDev: 0.2 },

  // Context density: how much context helps/hinders determining the transition
  contextDensity: { mean: 0.5, stdDev: 0.2 },

  // Passage length factor
  passageLength: { mean: 0.5, stdDev: 0.15 },
};

// ─────────────────────────────────────────────────────────
// DISTRACTOR STRATEGIES
// ─────────────────────────────────────────────────────────

/**
 * Strategies for generating plausible but incorrect transition choices.
 */
export const TRANSITIONS_DISTRACTOR_STRATEGIES = {
  wrong_relationship:
    "Uses a transition indicating the wrong logical relationship (e.g., contrast instead of addition).",
  opposite_meaning:
    "Uses a transition that indicates the opposite relationship (e.g., 'however' when 'furthermore' is needed).",
  too_strong:
    "Uses an overly emphatic or absolute transition for a subtle relationship.",
  too_weak:
    "Uses a weak or vague transition when a stronger connection is needed.",
  wrong_register:
    "Uses a transition that's too informal or formal for the context.",
  redundant:
    "Uses a transition that repeats information already expressed in the passage.",
  plausible_but_wrong:
    "Uses a common transition that sounds acceptable but doesn't fit the specific logical relationship.",
} as const;

export type TransitionsDistractorStrategy = keyof typeof TRANSITIONS_DISTRACTOR_STRATEGIES;

/**
 * Distractor strategy combinations for transitions questions.
 */
export const TRANSITIONS_DISTRACTOR_COMBOS: TransitionsDistractorStrategy[][] = [
  ["wrong_relationship", "opposite_meaning", "plausible_but_wrong"],
  ["opposite_meaning", "too_strong", "plausible_but_wrong"],
  ["wrong_relationship", "too_weak", "redundant"],
  ["too_strong", "too_weak", "plausible_but_wrong"],
  ["opposite_meaning", "wrong_register", "plausible_but_wrong"],
];

// ─────────────────────────────────────────────────────────
// SAMPLED PARAMETERS INTERFACE
// ─────────────────────────────────────────────────────────

export interface SampledTransitionParams {
  // Difficulty factors (all use Gaussian)
  sentenceComplexity: number; // 0.0-1.0
  relationshipSubtlety: number; // 0.0-1.0
  vocabularyLevel: number; // 0.0-1.0
  contextDensity: number; // 0.0-1.0
  passageLength: number; // 0.0-1.0

  // CONTENT DIVERSITY - sampled to force variety
  relationshipType: TransitionRelationshipType; // Which logical relationship to test
  topicCategory: TransitionTopicCategory;

  // Distractor strategies
  distractorStrategies: [TransitionsDistractorStrategy, TransitionsDistractorStrategy, TransitionsDistractorStrategy];

  // Target overall difficulty
  targetOverallDifficulty: number;
}

// ─────────────────────────────────────────────────────────
// SAMPLING UTILITIES
// ─────────────────────────────────────────────────────────

/**
 * Sample from a Gaussian distribution, clamped to [0, 1].
 */
export function sampleGaussian(mean: number, stdDev: number): number {
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
 * Sample a distractor strategy combination for transitions.
 */
export function sampleTransitionsDistractorCombo(): [TransitionsDistractorStrategy, TransitionsDistractorStrategy, TransitionsDistractorStrategy] {
  const combo = sampleFrom(TRANSITIONS_DISTRACTOR_COMBOS);
  return combo as [TransitionsDistractorStrategy, TransitionsDistractorStrategy, TransitionsDistractorStrategy];
}

/**
 * Generate all sampled parameters for a transitions question.
 * Uses Gaussian distributions for difficulty factors.
 * Randomly samples relationship type and topic for content diversity.
 */
export function sampleTransitionParams(
  overrides?: Partial<SampledTransitionParams>
): SampledTransitionParams {
  return {
    // Difficulty factors use Gaussian sampling
    sentenceComplexity:
      overrides?.sentenceComplexity ??
      sampleGaussian(TRANSITIONS_PARAMS.sentenceComplexity.mean, TRANSITIONS_PARAMS.sentenceComplexity.stdDev),

    relationshipSubtlety:
      overrides?.relationshipSubtlety ??
      sampleGaussian(TRANSITIONS_PARAMS.relationshipSubtlety.mean, TRANSITIONS_PARAMS.relationshipSubtlety.stdDev),

    vocabularyLevel:
      overrides?.vocabularyLevel ??
      sampleGaussian(TRANSITIONS_PARAMS.vocabularyLevel.mean, TRANSITIONS_PARAMS.vocabularyLevel.stdDev),

    contextDensity:
      overrides?.contextDensity ??
      sampleGaussian(TRANSITIONS_PARAMS.contextDensity.mean, TRANSITIONS_PARAMS.contextDensity.stdDev),

    passageLength:
      overrides?.passageLength ??
      sampleGaussian(TRANSITIONS_PARAMS.passageLength.mean, TRANSITIONS_PARAMS.passageLength.stdDev),

    // CONTENT DIVERSITY - sample relationship type to force variety
    relationshipType:
      overrides?.relationshipType ?? sampleFrom(TRANSITION_RELATIONSHIP_TYPES),

    topicCategory:
      overrides?.topicCategory ?? sampleFrom(TRANSITION_TOPIC_CATEGORIES),

    distractorStrategies:
      overrides?.distractorStrategies ?? sampleTransitionsDistractorCombo(),

    targetOverallDifficulty:
      overrides?.targetOverallDifficulty ?? sampleGaussian(0.5, 0.15),
  };
}

/**
 * Compute rwDifficulty object from sampled transitions params.
 */
export function computeTransitionsRwDifficulty(params: SampledTransitionParams): {
  passageComplexity: number;
  inferenceDepth: number;
  vocabularyLevel: number;
  evidenceEvaluation: number;
  synthesisRequired: number;
} {
  return {
    passageComplexity: params.sentenceComplexity,
    inferenceDepth: params.relationshipSubtlety,
    vocabularyLevel: params.vocabularyLevel,
    evidenceEvaluation: params.contextDensity,
    synthesisRequired: params.passageLength,
  };
}
