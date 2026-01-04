// ─────────────────────────────────────────────────────────
// GRAMMAR & CONVENTIONS TEMPLATES (Domain 4)
// ─────────────────────────────────────────────────────────
// Verbalized sampling parameters for Standard English Conventions.
// Uses Gaussian distributions for difficulty factors.
// NO rigid patterns - let Claude generate freely.

// ─────────────────────────────────────────────────────────
// GRAMMAR QUESTION TYPES
// ─────────────────────────────────────────────────────────

export const GRAMMAR_QUESTION_TYPES = [
  "boundaries_between_sentences",
  "boundaries_within_sentences",
  "subject_verb_agreement",
  "pronoun_antecedent_agreement",
  "verb_finiteness",
  "verb_tense_aspect",
  "subject_modifier_placement",
  "genitives_plurals",
] as const;

export type GrammarQuestionType = (typeof GRAMMAR_QUESTION_TYPES)[number];

/**
 * Human-readable descriptions for each grammar skill.
 * Used to guide Claude's generation.
 */
export const GRAMMAR_TYPE_DESCRIPTIONS: Record<GrammarQuestionType, string> = {
  boundaries_between_sentences:
    "Testing sentence boundaries: periods, semicolons, comma splices, run-on sentences. Student must choose correct punctuation to separate independent clauses.",
  boundaries_within_sentences:
    "Testing internal punctuation: series commas, appositives, parentheticals, introductory phrases. Student must choose correct commas or other marks within a sentence.",
  subject_verb_agreement:
    "Testing subject-verb number agreement. Often includes distractors like prepositional phrases, inverted sentences, or collective nouns.",
  pronoun_antecedent_agreement:
    "Testing pronoun-antecedent agreement in number and clarity. Includes singular/plural matching and clear pronoun reference.",
  verb_finiteness:
    "Testing finite verbs vs. verbals (gerunds, participles, infinitives). Student must identify when a complete verb is needed vs. a verbal form.",
  verb_tense_aspect:
    "Testing verb tense consistency and appropriate aspect. Includes past/present/future and perfect aspects.",
  subject_modifier_placement:
    "Testing modifier placement to avoid dangling or misplaced modifiers. The modifier must clearly modify the intended subject.",
  genitives_plurals:
    "Testing possessives vs. plurals, including its/it's, their/there/they're, whose/who's, and apostrophe usage.",
};

// ─────────────────────────────────────────────────────────
// TOPIC CATEGORIES (for variety, not rigidity)
// ─────────────────────────────────────────────────────────

export const GRAMMAR_TOPIC_CATEGORIES = [
  "scientific_research",
  "historical_events",
  "social_studies",
  "environmental_issues",
  "technological_development",
  "cultural_topics",
  "economic_concepts",
  "literary_subjects",
  "psychological_research",
  "artistic_movements",
] as const;

export type GrammarTopicCategory = (typeof GRAMMAR_TOPIC_CATEGORIES)[number];

// ─────────────────────────────────────────────────────────
// VERBALIZED SAMPLING PARAMETERS (Gaussian distributions)
// ─────────────────────────────────────────────────────────

/**
 * Parameters for verbalized sampling to create unique grammar questions.
 * Each uses Gaussian distribution to create natural variation.
 */
export const GRAMMAR_PARAMS = {
  // Sentence complexity: how complex the sentence structure is
  sentenceComplexity: { mean: 0.5, stdDev: 0.2 },

  // Grammar subtlety: how subtle/tricky the grammar issue is
  grammarSubtlety: { mean: 0.5, stdDev: 0.25 },

  // Context clarity: how clear the correct answer is from context
  contextClarity: { mean: 0.5, stdDev: 0.2 },

  // Vocabulary level: difficulty of words used
  vocabularyLevel: { mean: 0.5, stdDev: 0.2 },

  // Distractor plausibility: how plausible wrong answers are
  distractorPlausibility: { mean: 0.5, stdDev: 0.2 },
};

// ─────────────────────────────────────────────────────────
// DISTRACTOR STRATEGIES
// ─────────────────────────────────────────────────────────

/**
 * Strategies for generating plausible but incorrect grammar answers.
 */
export const GRAMMAR_DISTRACTOR_STRATEGIES = {
  wrong_punctuation:
    "Uses incorrect punctuation mark (comma instead of semicolon, period instead of comma, etc.).",
  comma_splice:
    "Incorrectly joins two independent clauses with just a comma.",
  wrong_verb_form:
    "Uses wrong verb form (singular/plural, wrong tense, infinitive instead of gerund).",
  wrong_pronoun:
    "Uses incorrect pronoun (their instead of its, who instead of whom, wrong case).",
  misplaced_modifier:
    "Modifier in wrong position, creating unclear or illogical meaning.",
  wrong_word_form:
    "Uses wrong form of word (possessive instead of plural, its/it's confusion).",
  unnecessary_punctuation:
    "Adds punctuation where none is needed.",
  run_on_sentence:
    "Missing punctuation between independent clauses.",
  wordy_redundant:
    "Unnecessarily wordy or redundant version.",
  plausible_but_wrong:
    "Sounds grammatically acceptable but violates a specific rule.",
} as const;

export type GrammarDistractorStrategy = keyof typeof GRAMMAR_DISTRACTOR_STRATEGIES;

/**
 * Distractor strategy combinations by question type.
 */
export const GRAMMAR_DISTRACTOR_COMBOS: Record<GrammarQuestionType, GrammarDistractorStrategy[][]> = {
  boundaries_between_sentences: [
    ["comma_splice", "run_on_sentence", "wrong_punctuation"],
    ["wrong_punctuation", "comma_splice", "unnecessary_punctuation"],
    ["run_on_sentence", "wrong_punctuation", "plausible_but_wrong"],
  ],
  boundaries_within_sentences: [
    ["wrong_punctuation", "unnecessary_punctuation", "plausible_but_wrong"],
    ["unnecessary_punctuation", "wrong_punctuation", "wordy_redundant"],
    ["missing_punctuation" as GrammarDistractorStrategy, "wrong_punctuation", "plausible_but_wrong"],
  ],
  subject_verb_agreement: [
    ["wrong_verb_form", "plausible_but_wrong", "wordy_redundant"],
    ["wrong_verb_form", "wrong_word_form", "plausible_but_wrong"],
  ],
  pronoun_antecedent_agreement: [
    ["wrong_pronoun", "plausible_but_wrong", "wordy_redundant"],
    ["wrong_pronoun", "wrong_word_form", "plausible_but_wrong"],
  ],
  verb_finiteness: [
    ["wrong_verb_form", "plausible_but_wrong", "wordy_redundant"],
    ["wrong_verb_form", "wrong_word_form", "plausible_but_wrong"],
  ],
  verb_tense_aspect: [
    ["wrong_verb_form", "plausible_but_wrong", "wordy_redundant"],
    ["wrong_verb_form", "plausible_but_wrong", "wrong_word_form"],
  ],
  subject_modifier_placement: [
    ["misplaced_modifier", "plausible_but_wrong", "wordy_redundant"],
    ["misplaced_modifier", "wrong_punctuation", "plausible_but_wrong"],
  ],
  genitives_plurals: [
    ["wrong_word_form", "plausible_but_wrong", "wordy_redundant"],
    ["wrong_word_form", "wrong_pronoun", "plausible_but_wrong"],
  ],
};

// ─────────────────────────────────────────────────────────
// SAMPLED PARAMETERS INTERFACE
// ─────────────────────────────────────────────────────────

export interface SampledGrammarParams {
  questionType: GrammarQuestionType;

  // Difficulty factors (all use Gaussian, none hardcoded to 0.0)
  sentenceComplexity: number; // 0.0-1.0
  grammarSubtlety: number; // 0.0-1.0
  contextClarity: number; // 0.0-1.0
  vocabularyLevel: number; // 0.0-1.0
  distractorPlausibility: number; // 0.0-1.0

  // Topic for variety
  topicCategory: GrammarTopicCategory;

  // Distractor strategies
  distractorStrategies: [GrammarDistractorStrategy, GrammarDistractorStrategy, GrammarDistractorStrategy];

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
 * Sample a distractor strategy combination for a grammar question type.
 */
export function sampleGrammarDistractorCombo(
  questionType: GrammarQuestionType
): [GrammarDistractorStrategy, GrammarDistractorStrategy, GrammarDistractorStrategy] {
  const combos = GRAMMAR_DISTRACTOR_COMBOS[questionType];
  const combo = sampleFrom(combos);
  return combo as [GrammarDistractorStrategy, GrammarDistractorStrategy, GrammarDistractorStrategy];
}

/**
 * Generate all sampled parameters for a grammar question.
 * Uses Gaussian distributions for all difficulty factors.
 */
export function sampleGrammarParams(
  questionType: GrammarQuestionType,
  overrides?: Partial<SampledGrammarParams>
): SampledGrammarParams {
  return {
    questionType,

    // All factors use Gaussian sampling
    sentenceComplexity:
      overrides?.sentenceComplexity ??
      sampleGaussian(GRAMMAR_PARAMS.sentenceComplexity.mean, GRAMMAR_PARAMS.sentenceComplexity.stdDev),

    grammarSubtlety:
      overrides?.grammarSubtlety ??
      sampleGaussian(GRAMMAR_PARAMS.grammarSubtlety.mean, GRAMMAR_PARAMS.grammarSubtlety.stdDev),

    contextClarity:
      overrides?.contextClarity ??
      sampleGaussian(GRAMMAR_PARAMS.contextClarity.mean, GRAMMAR_PARAMS.contextClarity.stdDev),

    vocabularyLevel:
      overrides?.vocabularyLevel ??
      sampleGaussian(GRAMMAR_PARAMS.vocabularyLevel.mean, GRAMMAR_PARAMS.vocabularyLevel.stdDev),

    distractorPlausibility:
      overrides?.distractorPlausibility ??
      sampleGaussian(GRAMMAR_PARAMS.distractorPlausibility.mean, GRAMMAR_PARAMS.distractorPlausibility.stdDev),

    topicCategory:
      overrides?.topicCategory ?? sampleFrom(GRAMMAR_TOPIC_CATEGORIES),

    distractorStrategies:
      overrides?.distractorStrategies ?? sampleGrammarDistractorCombo(questionType),

    targetOverallDifficulty:
      overrides?.targetOverallDifficulty ?? sampleGaussian(0.5, 0.15),
  };
}

/**
 * Compute rwDifficulty object from sampled grammar params.
 * Maps grammar-specific factors to the standard rwDifficulty structure.
 * CRITICAL: All factors should have meaningful values, not 0.0!
 */
export function computeGrammarRwDifficulty(params: SampledGrammarParams): {
  passageComplexity: number;
  inferenceDepth: number;
  vocabularyLevel: number;
  evidenceEvaluation: number;
  synthesisRequired: number;
} {
  return {
    passageComplexity: params.sentenceComplexity,
    inferenceDepth: params.grammarSubtlety, // NOT 0.0
    vocabularyLevel: params.vocabularyLevel,
    evidenceEvaluation: params.contextClarity, // NOT 0.0
    synthesisRequired: params.distractorPlausibility, // NOT 0.0
  };
}

/**
 * Compute overall difficulty from grammar params.
 */
export function computeGrammarOverallDifficulty(params: SampledGrammarParams): number {
  const factors = [
    params.sentenceComplexity,
    params.grammarSubtlety,
    params.contextClarity,
    params.vocabularyLevel,
    params.distractorPlausibility,
  ];
  return factors.reduce((sum, f) => sum + f, 0) / factors.length;
}
