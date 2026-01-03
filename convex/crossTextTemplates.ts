// ─────────────────────────────────────────────────────────
// CROSS-TEXT CONNECTIONS TEMPLATES
// ─────────────────────────────────────────────────────────
// Templates for generating SAT questions that test students' ability
// to draw connections between two related short texts.

export const CROSS_TEXT_RELATIONSHIP_TYPES = [
  "supports_extends", // Text 2 provides additional support for Text 1's claim
  "contradicts_challenges", // Text 2 disagrees with or challenges Text 1
  "provides_example", // Text 2 gives a specific example of Text 1's general point
  "explains_mechanism", // Text 2 explains how/why something in Text 1 works
  "compares_contrasts", // Both texts discuss same topic but from different angles
  "cause_effect", // Text 1 describes cause, Text 2 describes effect (or vice versa)
  "problem_solution", // Text 1 presents problem, Text 2 presents solution
  "general_specific", // Text 1 is general principle, Text 2 is specific application
] as const;

export type CrossTextRelationshipType = (typeof CROSS_TEXT_RELATIONSHIP_TYPES)[number];

/**
 * Question stems for cross-text connection questions.
 * Based on official SAT patterns.
 */
export const CROSS_TEXT_QUESTION_STEMS: Record<CrossTextRelationshipType, string[]> = {
  supports_extends: [
    "Based on the texts, how would the author of Text 2 most likely respond to the claim in Text 1?",
    "Which choice best describes the relationship between Text 1 and Text 2?",
    "How does Text 2 relate to Text 1?",
  ],
  contradicts_challenges: [
    "Based on the texts, how would the author of Text 2 most likely respond to the argument made in Text 1?",
    "Which choice best describes a key difference between the texts?",
    "How would the author of Text 2 most likely view the claim in Text 1?",
  ],
  provides_example: [
    "Which choice best describes the relationship between the texts?",
    "How does Text 2 relate to the point made in Text 1?",
    "Based on the texts, what is the relationship between the general principle in Text 1 and the example in Text 2?",
  ],
  explains_mechanism: [
    "How does Text 2 build on Text 1?",
    "Which choice best describes the relationship between Text 1 and Text 2?",
    "Based on the texts, how does Text 2 relate to the phenomenon described in Text 1?",
  ],
  compares_contrasts: [
    "Both texts discuss [TOPIC]. What is one difference between the perspectives presented in the two texts?",
    "Which choice best describes a main difference between the texts?",
    "What do the texts suggest about different approaches to [TOPIC]?",
  ],
  cause_effect: [
    "Which choice best describes the relationship between Text 1 and Text 2?",
    "How do the texts relate to each other in terms of causation?",
    "Based on the texts, what can be inferred about the relationship between the event in Text 1 and the outcome in Text 2?",
  ],
  problem_solution: [
    "How does Text 2 relate to the issue raised in Text 1?",
    "Which choice best describes how Text 2 responds to the problem in Text 1?",
    "Based on the texts, what is the relationship between the challenge described in Text 1 and the approach in Text 2?",
  ],
  general_specific: [
    "Which choice best describes the relationship between the texts?",
    "How does the specific case in Text 2 relate to the general principle in Text 1?",
    "Based on the texts, how does Text 2 illustrate the concept presented in Text 1?",
  ],
};

/**
 * Passage length targets for cross-text questions.
 * Each text should be short (50-100 words).
 */
export const CROSS_TEXT_PASSAGE_LENGTH = {
  text1: { min: 50, max: 100 },
  text2: { min: 50, max: 100 },
};

/**
 * Distractor strategies specific to cross-text questions.
 */
export const CROSS_TEXT_DISTRACTOR_PATTERNS = {
  reverses_relationship: "States opposite of actual relationship (support vs. challenge)",
  confuses_which_text: "Attributes content from Text 1 to Text 2 or vice versa",
  too_extreme: "Overstates the relationship or uses absolute language",
  superficial_similarity: "Notes surface-level similarity while missing key relationship",
  partial_truth: "Describes one aspect correctly but misses main relationship",
  wrong_scope: "Focuses on minor detail rather than main relationship",
} as const;

/**
 * Topic categories that work well for cross-text questions.
 */
export const CROSS_TEXT_TOPIC_CATEGORIES = [
  "scientific_research", // Two studies on related topics
  "historical_perspectives", // Two views on same historical event/figure
  "artistic_movements", // Two descriptions/interpretations
  "environmental_issues", // Different aspects or solutions
  "technological_impact", // Problem and innovation, or two perspectives
  "social_phenomena", // Theory and example, or contrasting views
  "educational_methods", // Different approaches or general vs. specific
  "economic_concepts", // Principle and application
] as const;

export type CrossTextTopicCategory = (typeof CROSS_TEXT_TOPIC_CATEGORIES)[number];

/**
 * Sampled parameters for cross-text question generation.
 */
export interface SampledCrossTextParams {
  relationshipType: CrossTextRelationshipType;
  topicCategory: CrossTextTopicCategory;
  passageType1: "literary_narrative" | "social_science" | "natural_science" | "humanities";
  passageType2: "literary_narrative" | "social_science" | "natural_science" | "humanities";
  text1Complexity: number; // 0.0-1.0
  text2Complexity: number; // 0.0-1.0
  relationshipComplexity: number; // 0.0-1.0 (how obvious the connection is)
  distractorStrategies: [string, string, string];
  targetOverallDifficulty: number;
}

/**
 * Generate sample cross-text parameters.
 */
export function sampleCrossTextParams(
  overrides?: Partial<SampledCrossTextParams>
): SampledCrossTextParams {
  const relationshipType = overrides?.relationshipType ??
    CROSS_TEXT_RELATIONSHIP_TYPES[Math.floor(Math.random() * CROSS_TEXT_RELATIONSHIP_TYPES.length)];

  const topicCategory = overrides?.topicCategory ??
    CROSS_TEXT_TOPIC_CATEGORIES[Math.floor(Math.random() * CROSS_TEXT_TOPIC_CATEGORIES.length)];

  const passageTypes = ["social_science", "natural_science", "humanities"] as const;
  const passageType1 = overrides?.passageType1 ??
    passageTypes[Math.floor(Math.random() * passageTypes.length)];
  const passageType2 = overrides?.passageType2 ?? passageType1; // Usually same type

  return {
    relationshipType,
    topicCategory,
    passageType1,
    passageType2,
    text1Complexity: overrides?.text1Complexity ?? 0.5,
    text2Complexity: overrides?.text2Complexity ?? 0.5,
    relationshipComplexity: overrides?.relationshipComplexity ?? 0.5,
    distractorStrategies: overrides?.distractorStrategies ?? [
      "reverses_relationship",
      "confuses_which_text",
      "partial_truth",
    ],
    targetOverallDifficulty: overrides?.targetOverallDifficulty ?? 0.5,
  };
}
