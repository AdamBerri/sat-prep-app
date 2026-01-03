// ─────────────────────────────────────────────────────────
// TRANSITIONS TEMPLATES
// ─────────────────────────────────────────────────────────
// Templates for generating SAT questions that test students' ability
// to choose effective transition words/phrases to connect ideas.

/**
 * Types of logical relationships that transitions express.
 */
export const TRANSITION_RELATIONSHIP_TYPES = [
  "addition", // Adding related information (furthermore, additionally, moreover)
  "contrast", // Showing difference or opposition (however, nevertheless, conversely)
  "cause_effect", // Showing causation (therefore, consequently, as a result)
  "example", // Providing illustration (for example, for instance, specifically)
  "clarification", // Rephrasing or explaining (in other words, that is, namely)
  "temporal", // Showing time relationship (meanwhile, subsequently, previously)
  "emphasis", // Stressing importance (indeed, in fact, notably)
  "concession", // Acknowledging counterpoint (although, admittedly, granted)
  "comparison", // Showing similarity (similarly, likewise, in the same way)
  "conclusion", // Summing up (thus, in conclusion, ultimately)
] as const;

export type TransitionRelationshipType = (typeof TRANSITION_RELATIONSHIP_TYPES)[number];

/**
 * Transition words/phrases organized by relationship type.
 * Based on SAT commonly tested transitions.
 */
export const TRANSITIONS_BY_TYPE: Record<TransitionRelationshipType, string[]> = {
  addition: [
    "Additionally,",
    "Furthermore,",
    "Moreover,",
    "In addition,",
    "Also,",
    "Likewise,",
  ],
  contrast: [
    "However,",
    "Nevertheless,",
    "Nonetheless,",
    "Conversely,",
    "On the other hand,",
    "In contrast,",
    "Yet",
    "Still,",
  ],
  cause_effect: [
    "Therefore,",
    "Consequently,",
    "Thus,",
    "As a result,",
    "Accordingly,",
    "Hence,",
    "For this reason,",
  ],
  example: [
    "For example,",
    "For instance,",
    "Specifically,",
    "To illustrate,",
    "In particular,",
  ],
  clarification: [
    "In other words,",
    "That is,",
    "Namely,",
    "To clarify,",
    "More precisely,",
  ],
  temporal: [
    "Meanwhile,",
    "Subsequently,",
    "Previously,",
    "Afterward,",
    "Eventually,",
    "Initially,",
    "Ultimately,",
  ],
  emphasis: [
    "Indeed,",
    "In fact,",
    "Notably,",
    "Particularly,",
    "Especially,",
  ],
  concession: [
    "Admittedly,",
    "Granted,",
    "To be sure,",
    "Certainly,",
  ],
  comparison: [
    "Similarly,",
    "Likewise,",
    "In the same way,",
    "Equally,",
  ],
  conclusion: [
    "In conclusion,",
    "Ultimately,",
    "Finally,",
    "In summary,",
  ],
};

/**
 * Question format for transitions questions.
 * The blank represents where the transition should go.
 */
export interface TransitionQuestionFormat {
  sentenceBefore: string; // The sentence before the transition
  sentenceAfter: string; // The sentence after the transition
  relationshipType: TransitionRelationshipType;
  correctTransition: string;
  distractorTransitions: string[]; // 3 wrong transitions from different relationship types
}

/**
 * Context scenarios that require specific transition types.
 */
export const TRANSITION_CONTEXT_SCENARIOS: Record<TransitionRelationshipType, {
  description: string;
  exampleBefore: string;
  exampleAfter: string;
}> = {
  addition: {
    description: "Adding related information to support the same point",
    exampleBefore: "The study showed that regular exercise improves cardiovascular health.",
    exampleAfter: "it found that physical activity enhances mental well-being.",
  },
  contrast: {
    description: "Presenting opposing or different information",
    exampleBefore: "Many scientists supported the new theory.",
    exampleAfter: "some researchers remained skeptical of its implications.",
  },
  cause_effect: {
    description: "Showing a result or consequence of prior information",
    exampleBefore: "The drought lasted for three consecutive years.",
    exampleAfter: "crop yields declined by nearly 40 percent.",
  },
  example: {
    description: "Providing a specific instance of a general statement",
    exampleBefore: "The museum features artifacts from various ancient civilizations.",
    exampleAfter: "visitors can see pottery from Mesopotamia and sculptures from Greece.",
  },
  clarification: {
    description: "Restating or explaining in different terms",
    exampleBefore: "The process of photosynthesis converts light energy into chemical energy.",
    exampleAfter: "plants use sunlight to produce glucose.",
  },
  temporal: {
    description: "Indicating time sequence or simultaneous events",
    exampleBefore: "The team analyzed the initial data from the experiment.",
    exampleAfter: "they began preparing for the second phase of research.",
  },
  emphasis: {
    description: "Stressing or highlighting important information",
    exampleBefore: "The discovery had significant implications for climate science.",
    exampleAfter: "it challenged several long-held assumptions about ocean currents.",
  },
  concession: {
    description: "Acknowledging a counterpoint before making a contrasting point",
    exampleBefore: "The new policy has some drawbacks.",
    exampleAfter: "its benefits outweigh the costs.",
  },
  comparison: {
    description: "Showing similarity between two things",
    exampleBefore: "Urban areas experienced rapid population growth.",
    exampleAfter: "suburban regions saw significant demographic increases.",
  },
  conclusion: {
    description: "Summarizing or reaching a final point",
    exampleBefore: "The evidence from multiple studies points in the same direction.",
    exampleAfter: "the hypothesis appears to be well-supported.",
  },
};

/**
 * Generate distractor transitions for a given correct transition type.
 * Returns 3 transitions from different (incorrect) relationship types.
 */
export function generateDistractorTransitions(
  correctType: TransitionRelationshipType
): string[] {
  // Common wrong transition types for each correct type
  const wrongTypeMapping: Record<TransitionRelationshipType, TransitionRelationshipType[]> = {
    addition: ["contrast", "cause_effect", "clarification"],
    contrast: ["addition", "comparison", "cause_effect"],
    cause_effect: ["addition", "contrast", "temporal"],
    example: ["clarification", "cause_effect", "conclusion"],
    clarification: ["example", "cause_effect", "emphasis"],
    temporal: ["cause_effect", "contrast", "addition"],
    emphasis: ["clarification", "addition", "cause_effect"],
    concession: ["addition", "cause_effect", "emphasis"],
    comparison: ["contrast", "addition", "clarification"],
    conclusion: ["addition", "example", "cause_effect"],
  };

  const wrongTypes = wrongTypeMapping[correctType];
  return wrongTypes.map((type) => {
    const transitions = TRANSITIONS_BY_TYPE[type];
    return transitions[Math.floor(Math.random() * transitions.length)];
  });
}

/**
 * Topic categories for transition questions.
 */
export const TRANSITION_TOPIC_CATEGORIES = [
  "scientific_research",
  "historical_events",
  "social_issues",
  "technological_development",
  "environmental_topics",
  "cultural_phenomena",
  "economic_concepts",
  "literary_analysis",
] as const;

export type TransitionTopicCategory = (typeof TRANSITION_TOPIC_CATEGORIES)[number];

/**
 * Sampled parameters for transition question generation.
 */
export interface SampledTransitionParams {
  relationshipType: TransitionRelationshipType;
  topicCategory: TransitionTopicCategory;
  correctTransition: string;
  distractorTransitions: string[];
  sentenceComplexity: number; // 0.0-1.0
  relationshipClarityLevel: number; // 0.0-1.0 (how obvious the relationship is)
  targetOverallDifficulty: number;
}

/**
 * Generate sampled transition parameters.
 */
export function sampleTransitionParams(
  overrides?: Partial<SampledTransitionParams>
): SampledTransitionParams {
  const relationshipType = overrides?.relationshipType ??
    TRANSITION_RELATIONSHIP_TYPES[Math.floor(Math.random() * TRANSITION_RELATIONSHIP_TYPES.length)];

  const topicCategory = overrides?.topicCategory ??
    TRANSITION_TOPIC_CATEGORIES[Math.floor(Math.random() * TRANSITION_TOPIC_CATEGORIES.length)];

  const possibleTransitions = TRANSITIONS_BY_TYPE[relationshipType];
  const correctTransition = overrides?.correctTransition ??
    possibleTransitions[Math.floor(Math.random() * possibleTransitions.length)];

  const distractorTransitions = overrides?.distractorTransitions ??
    generateDistractorTransitions(relationshipType);

  return {
    relationshipType,
    topicCategory,
    correctTransition,
    distractorTransitions,
    sentenceComplexity: overrides?.sentenceComplexity ?? 0.5,
    relationshipClarityLevel: overrides?.relationshipClarityLevel ?? 0.5,
    targetOverallDifficulty: overrides?.targetOverallDifficulty ?? 0.5,
  };
}
