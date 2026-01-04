// ─────────────────────────────────────────────────────────
// CROSS-TEXT CONNECTIONS TEMPLATES
// ─────────────────────────────────────────────────────────
// Verbalized sampling parameters for SAT Cross-Text questions.
// Uses Gaussian distributions for difficulty factors.
// NO rigid relationship types - let Claude generate freely.

// ─────────────────────────────────────────────────────────
// RELATIONSHIP TYPES (for reference, not rigidity)
// ─────────────────────────────────────────────────────────

/**
 * Types of relationships between two texts.
 * These are for reference/prompting, NOT to constrain generation.
 */
export const CROSS_TEXT_RELATIONSHIP_TYPES = [
  "supports_extends", // Text 2 provides additional support for Text 1's claim
  "contradicts_challenges", // Text 2 disagrees with or challenges Text 1
  "provides_example", // Text 2 gives a specific example of Text 1's general point
  "explains_mechanism", // Text 2 explains how/why something in Text 1 works
  "compares_contrasts", // Both texts discuss same topic but from different angles
  "cause_effect", // Text 1 describes cause, Text 2 describes effect
  "problem_solution", // Text 1 presents problem, Text 2 presents solution
  "general_specific", // Text 1 is general principle, Text 2 is specific application
] as const;

export type CrossTextRelationshipType = (typeof CROSS_TEXT_RELATIONSHIP_TYPES)[number];

/**
 * Human-readable descriptions for each relationship type.
 */
export const RELATIONSHIP_TYPE_DESCRIPTIONS: Record<CrossTextRelationshipType, string> = {
  supports_extends: "Text 2 provides additional evidence or support for the claim/argument made in Text 1",
  contradicts_challenges: "Text 2 disagrees with, qualifies, or challenges the position in Text 1",
  provides_example: "Text 2 offers a specific instance or illustration of the general point in Text 1",
  explains_mechanism: "Text 2 explains the 'how' or 'why' behind the phenomenon described in Text 1",
  compares_contrasts: "Both texts address the same topic but emphasize different aspects or perspectives",
  cause_effect: "One text describes a cause/action, the other describes the resulting effect/outcome",
  problem_solution: "One text identifies a problem or challenge, the other proposes or describes a solution",
  general_specific: "One text presents a broad principle, the other shows its specific application",
};

// ─────────────────────────────────────────────────────────
// TOPIC CATEGORIES
// ─────────────────────────────────────────────────────────

export const CROSS_TEXT_TOPIC_CATEGORIES = [
  "scientific_research",
  "historical_perspectives",
  "artistic_movements",
  "environmental_issues",
  "technological_impact",
  "social_phenomena",
  "educational_methods",
  "economic_concepts",
  "psychological_research",
  "literary_analysis",
] as const;

export type CrossTextTopicCategory = (typeof CROSS_TEXT_TOPIC_CATEGORIES)[number];

// ─────────────────────────────────────────────────────────
// PASSAGE TYPES
// ─────────────────────────────────────────────────────────

export const PASSAGE_TYPES = [
  "literary_narrative",
  "social_science",
  "natural_science",
  "humanities",
] as const;

export type PassageType = (typeof PASSAGE_TYPES)[number];

// ─────────────────────────────────────────────────────────
// VERBALIZED SAMPLING PARAMETERS (Gaussian distributions)
// ─────────────────────────────────────────────────────────

/**
 * Parameters for verbalized sampling to create unique cross-text questions.
 * Each uses Gaussian distribution to create natural variation.
 */
export const CROSS_TEXT_PARAMS = {
  // Text 1 complexity
  text1Complexity: { mean: 0.5, stdDev: 0.2 },

  // Text 2 complexity
  text2Complexity: { mean: 0.5, stdDev: 0.2 },

  // Relationship subtlety: how obvious the connection between texts is
  relationshipSubtlety: { mean: 0.5, stdDev: 0.25 },

  // Vocabulary level
  vocabularyLevel: { mean: 0.5, stdDev: 0.2 },

  // Argument complexity: how complex the reasoning/argument structure is
  argumentComplexity: { mean: 0.5, stdDev: 0.2 },
};

// ─────────────────────────────────────────────────────────
// DISTRACTOR STRATEGIES
// ─────────────────────────────────────────────────────────

/**
 * Strategies for generating plausible but incorrect cross-text answers.
 */
export const CROSS_TEXT_DISTRACTOR_STRATEGIES = {
  reverses_relationship:
    "States the opposite of the actual relationship (e.g., says 'supports' when it 'challenges').",
  confuses_which_text:
    "Attributes content or position from Text 1 to Text 2 or vice versa.",
  too_extreme:
    "Overstates the relationship using absolute language ('completely refutes', 'proves definitively').",
  superficial_similarity:
    "Notes a surface-level similarity while missing the deeper relationship.",
  partial_truth:
    "Describes one aspect of the relationship correctly but misses the main connection.",
  wrong_scope:
    "Focuses on a minor detail rather than the main relationship between the texts.",
  misread_tone:
    "Misinterprets the tone or attitude of one or both authors.",
  plausible_but_wrong:
    "Sounds reasonable but doesn't accurately describe the specific relationship.",
} as const;

export type CrossTextDistractorStrategy = keyof typeof CROSS_TEXT_DISTRACTOR_STRATEGIES;

/**
 * Distractor strategy combinations for cross-text questions.
 */
export const CROSS_TEXT_DISTRACTOR_COMBOS: CrossTextDistractorStrategy[][] = [
  ["reverses_relationship", "confuses_which_text", "partial_truth"],
  ["too_extreme", "superficial_similarity", "plausible_but_wrong"],
  ["confuses_which_text", "wrong_scope", "plausible_but_wrong"],
  ["reverses_relationship", "partial_truth", "wrong_scope"],
  ["misread_tone", "too_extreme", "plausible_but_wrong"],
];

// ─────────────────────────────────────────────────────────
// SAMPLED PARAMETERS INTERFACE
// ─────────────────────────────────────────────────────────

export interface SampledCrossTextParams {
  // Difficulty factors (all use Gaussian)
  text1Complexity: number; // 0.0-1.0
  text2Complexity: number; // 0.0-1.0
  relationshipSubtlety: number; // 0.0-1.0
  vocabularyLevel: number; // 0.0-1.0
  argumentComplexity: number; // 0.0-1.0

  // CONTENT DIVERSITY - sampled to force variety
  relationshipType: CrossTextRelationshipType; // The relationship between the two texts
  passageType1: PassageType;
  passageType2: PassageType;
  topicCategory: CrossTextTopicCategory;

  // Distractor strategies
  distractorStrategies: [CrossTextDistractorStrategy, CrossTextDistractorStrategy, CrossTextDistractorStrategy];

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
 * Sample a distractor strategy combination for cross-text.
 */
export function sampleCrossTextDistractorCombo(): [CrossTextDistractorStrategy, CrossTextDistractorStrategy, CrossTextDistractorStrategy] {
  const combo = sampleFrom(CROSS_TEXT_DISTRACTOR_COMBOS);
  return combo as [CrossTextDistractorStrategy, CrossTextDistractorStrategy, CrossTextDistractorStrategy];
}

/**
 * Generate all sampled parameters for a cross-text question.
 * Uses Gaussian distributions for difficulty factors.
 * Randomly samples relationship type, topic, and passage types for content diversity.
 */
export function sampleCrossTextParams(
  overrides?: Partial<SampledCrossTextParams>
): SampledCrossTextParams {
  return {
    // Difficulty factors use Gaussian sampling
    text1Complexity:
      overrides?.text1Complexity ??
      sampleGaussian(CROSS_TEXT_PARAMS.text1Complexity.mean, CROSS_TEXT_PARAMS.text1Complexity.stdDev),

    text2Complexity:
      overrides?.text2Complexity ??
      sampleGaussian(CROSS_TEXT_PARAMS.text2Complexity.mean, CROSS_TEXT_PARAMS.text2Complexity.stdDev),

    relationshipSubtlety:
      overrides?.relationshipSubtlety ??
      sampleGaussian(CROSS_TEXT_PARAMS.relationshipSubtlety.mean, CROSS_TEXT_PARAMS.relationshipSubtlety.stdDev),

    vocabularyLevel:
      overrides?.vocabularyLevel ??
      sampleGaussian(CROSS_TEXT_PARAMS.vocabularyLevel.mean, CROSS_TEXT_PARAMS.vocabularyLevel.stdDev),

    argumentComplexity:
      overrides?.argumentComplexity ??
      sampleGaussian(CROSS_TEXT_PARAMS.argumentComplexity.mean, CROSS_TEXT_PARAMS.argumentComplexity.stdDev),

    // CONTENT DIVERSITY - sample to force variety
    relationshipType:
      overrides?.relationshipType ?? sampleFrom(CROSS_TEXT_RELATIONSHIP_TYPES),

    passageType1:
      overrides?.passageType1 ?? sampleFrom(PASSAGE_TYPES),

    passageType2:
      overrides?.passageType2 ?? sampleFrom(PASSAGE_TYPES),

    topicCategory:
      overrides?.topicCategory ?? sampleFrom(CROSS_TEXT_TOPIC_CATEGORIES),

    distractorStrategies:
      overrides?.distractorStrategies ?? sampleCrossTextDistractorCombo(),

    targetOverallDifficulty:
      overrides?.targetOverallDifficulty ?? sampleGaussian(0.5, 0.15),
  };
}

/**
 * Compute rwDifficulty object from sampled cross-text params.
 */
export function computeCrossTextRwDifficulty(params: SampledCrossTextParams): {
  passageComplexity: number;
  inferenceDepth: number;
  vocabularyLevel: number;
  evidenceEvaluation: number;
  synthesisRequired: number;
} {
  return {
    passageComplexity: (params.text1Complexity + params.text2Complexity) / 2,
    inferenceDepth: params.relationshipSubtlety,
    vocabularyLevel: params.vocabularyLevel,
    evidenceEvaluation: params.argumentComplexity,
    synthesisRequired: params.relationshipSubtlety, // Cross-text requires synthesis
  };
}
