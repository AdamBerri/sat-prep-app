// ─────────────────────────────────────────────────────────
// GRAMMAR & CONVENTIONS TEMPLATES (Domain 4)
// ─────────────────────────────────────────────────────────
// Templates for Standard English Conventions questions:
// - Boundaries (Between Sentences, Within Sentences)
// - Form, Structure, and Sense (6 subskills)

// ═══════════════════════════════════════════════════════════
// BOUNDARIES - BETWEEN SENTENCES
// ═══════════════════════════════════════════════════════════

export const BOUNDARIES_BETWEEN_SENTENCE_TYPES = [
  "comma_splice", // Two independent clauses joined with just comma
  "run_on_sentence", // Two independent clauses with no punctuation
  "correct_period", // Proper sentence boundary with period
  "correct_semicolon", // Related independent clauses with semicolon
] as const;

export type BoundariesBetweenSentenceType = (typeof BOUNDARIES_BETWEEN_SENTENCE_TYPES)[number];

/**
 * Punctuation options for marking sentence boundaries.
 */
export const SENTENCE_BOUNDARY_PUNCTUATION = {
  correct: [
    ". The", // Period starting new sentence
    "; the", // Semicolon joining related clauses
    ". However, the", // Period + transition word
    "—the", // Em dash (less common but valid)
  ],
  comma_splice_error: [
    ", the", // Just comma (wrong!)
    ", and the", // Comma with coordinating conjunction (may be correct or wrong depending on context)
  ],
  run_on_error: [
    " the", // No punctuation (wrong!)
  ],
  unnecessary: [
    "; and the", // Semicolon + conjunction (redundant)
  ],
};

// ═══════════════════════════════════════════════════════════
// BOUNDARIES - WITHIN SENTENCES
// ═══════════════════════════════════════════════════════════

export const BOUNDARIES_WITHIN_SENTENCE_TYPES = [
  "series_commas", // Items in a list
  "appositive", // Nonessential descriptive phrase
  "parenthetical", // Interruptive phrase
  "introductory_phrase", // Phrase at sentence start
  "coordinate_clauses", // Two independent clauses joined with conjunction
  "no_punctuation_needed", // Where students might add unnecessary commas
] as const;

export type BoundariesWithinSentenceType = (typeof BOUNDARIES_WITHIN_SENTENCE_TYPES)[number];

/**
 * Punctuation patterns for within-sentence boundaries.
 */
export const WITHIN_SENTENCE_PUNCTUATION_PATTERNS = {
  series_commas: {
    correct: "A, B, and C",
    errors: ["A B and C", "A, B and, C", "A; B; and C"],
  },
  appositive: {
    correct: "The scientist, a Nobel laureate, discovered",
    errors: ["The scientist, a Nobel laureate discovered", "The scientist a Nobel laureate, discovered"],
  },
  parenthetical: {
    correct: "The results, according to the study, were significant.",
    errors: ["The results according to the study, were significant.", "The results, according to the study were significant."],
  },
  introductory_phrase: {
    correct: "After analyzing the data, the researchers concluded",
    errors: ["After analyzing the data the researchers concluded", "After, analyzing the data the researchers concluded"],
  },
  coordinate_clauses: {
    correct: "The experiment succeeded, and the results were published.",
    errors: ["The experiment succeeded and the results were published.", "The experiment succeeded, the results were published."],
  },
  no_punctuation_needed: {
    correct: "The study that examined climate patterns found",
    errors: ["The study, that examined climate patterns, found", "The study that examined, climate patterns found"],
  },
};

// ═══════════════════════════════════════════════════════════
// FORM, STRUCTURE, AND SENSE - SUBJECT-VERB AGREEMENT
// ═══════════════════════════════════════════════════════════

export const SUBJECT_VERB_AGREEMENT_PATTERNS = {
  prepositional_phrase_distractor: {
    // Subject separated from verb by prepositional phrase
    subject: "singular",
    intervening: "plural noun",
    example: "The collection of rare books [is/are] valuable.",
    correct: "is",
    distractor: "are",
  },
  inverted_sentence: {
    // Verb comes before subject
    example: "Among the findings [was/were] a surprising pattern.",
    correct: "was",
    distractor: "were",
  },
  compound_subject: {
    // Two subjects joined by "and" (usually plural)
    example: "The hypothesis and its implications [has/have] been widely discussed.",
    correct: "have",
    distractor: "has",
  },
  indefinite_pronoun: {
    // Singular indefinite pronouns: each, either, neither, everyone, someone, anyone, no one
    example: "Each of the experiments [was/were] conducted carefully.",
    correct: "was",
    distractor: "were",
  },
  collective_noun: {
    // Collective nouns can be singular or plural depending on context
    example: "The team [has/have] completed its research.",
    correct: "has", // team acting as unit
    distractor: "have",
  },
};

// ═══════════════════════════════════════════════════════════
// FORM, STRUCTURE, AND SENSE - PRONOUN-ANTECEDENT AGREEMENT
// ═══════════════════════════════════════════════════════════

export const PRONOUN_AGREEMENT_PATTERNS = {
  singular_they: {
    // Indefinite singular vs. plural pronoun
    example: "Each student should bring [their/his or her] notebook.",
    correct: "his or her", // formal SAT style (though "their" is increasingly accepted)
    distractor: "their",
  },
  company_organization: {
    // Companies/organizations are singular "it"
    example: "The company announced [its/their] quarterly results.",
    correct: "its",
    distractor: "their",
  },
  ambiguous_reference: {
    // Pronoun must clearly refer to one antecedent
    example: "When the scientist met with the administrator, [he/the scientist] explained the findings.",
    correct: "the scientist",
    distractor: "he",
  },
};

// ═══════════════════════════════════════════════════════════
// FORM, STRUCTURE, AND SENSE - VERB FINITENESS
// ═══════════════════════════════════════════════════════════

/**
 * Verb finiteness: choosing between finite verbs and verbals
 * (gerunds, participles, infinitives).
 */
export const VERB_FINITENESS_PATTERNS = {
  gerund_vs_finite: {
    example: "The data [suggesting/suggests] a clear trend.",
    correct: "suggests", // finite verb needed
    distractor: "suggesting", // participle (non-finite)
  },
  infinitive_vs_finite: {
    example: "The experiment [to demonstrate/demonstrates] the theory.",
    correct: "demonstrates",
    distractor: "to demonstrate",
  },
  participle_modifier: {
    example: "The results, [being/which are] statistically significant, support the hypothesis.",
    correct: "which are", // complete clause
    distractor: "being", // dangling participle
  },
};

// ═══════════════════════════════════════════════════════════
// FORM, STRUCTURE, AND SENSE - VERB TENSE AND ASPECT
// ═══════════════════════════════════════════════════════════

export const VERB_TENSE_PATTERNS = {
  past_vs_present: {
    context: "historical fact or completed action",
    example: "In 1969, astronauts [landed/land] on the moon.",
    correct: "landed",
    distractor: "land",
  },
  perfect_aspect: {
    context: "action completed before another past action",
    example: "By the time the team arrived, the data [had been/was] analyzed.",
    correct: "had been",
    distractor: "was",
  },
  consistent_tense: {
    context: "maintaining tense consistency",
    example: "The researcher examined the samples and [records/recorded] the results.",
    correct: "recorded",
    distractor: "records",
  },
  future_perfect: {
    context: "action that will be completed by a future time",
    example: "By next year, the project [will have been completed/will complete].",
    correct: "will have been completed",
    distractor: "will complete",
  },
};

// ═══════════════════════════════════════════════════════════
// FORM, STRUCTURE, AND SENSE - SUBJECT-MODIFIER PLACEMENT
// ═══════════════════════════════════════════════════════════

export const MODIFIER_PLACEMENT_PATTERNS = {
  dangling_modifier: {
    incorrect: "Running quickly, the finish line came into view.",
    correct: "Running quickly, the athlete saw the finish line come into view.",
    issue: "modifier doesn't clearly modify intended subject",
  },
  misplaced_modifier: {
    incorrect: "The researcher observed the specimen using a microscope that was contaminated.",
    correct: "Using a microscope, the researcher observed the specimen that was contaminated.",
    issue: "modifier in wrong position creates confusion",
  },
  squinting_modifier: {
    incorrect: "The students who studied frequently scored well.",
    correct: "The students who frequently studied scored well.",
    issue: "modifier could modify words on either side",
  },
};

// ═══════════════════════════════════════════════════════════
// FORM, STRUCTURE, AND SENSE - GENITIVES AND PLURALS
// ═══════════════════════════════════════════════════════════

export const GENITIVES_PLURALS_PATTERNS = {
  its_vs_its: {
    possessive: "The theory has its limitations.",
    contraction: "It's important to note the limitations.",
    error_example: "The theory has it's limitations.", // WRONG
  },
  their_there_theyre: {
    possessive: "The scientists published their findings.",
    location: "The lab is over there.",
    contraction: "They're conducting further research.",
    error_examples: [
      "The scientists published there findings.", // WRONG
      "Their conducting further research.", // WRONG
    ],
  },
  whose_vs_whos: {
    possessive: "The researcher whose study was published...",
    contraction: "Who's leading the project?",
  },
  plural_vs_possessive: {
    plural: "The experiments were successful.",
    possessive: "The experiment's results were significant.",
    error: "The experiments' were successful.", // WRONG - plural doesn't need apostrophe
  },
};

// ═══════════════════════════════════════════════════════════
// SAMPLING FUNCTIONS
// ═══════════════════════════════════════════════════════════

export interface SampledGrammarParams {
  questionType:
    | "boundaries_between_sentences"
    | "boundaries_within_sentences"
    | "subject_verb_agreement"
    | "pronoun_antecedent_agreement"
    | "verb_finiteness"
    | "verb_tense_aspect"
    | "subject_modifier_placement"
    | "genitives_plurals";
  patternType: string; // Specific pattern within the question type
  sentenceComplexity: number; // 0.0-1.0
  contextClarity: number; // 0.0-1.0 (how clear the correct answer is from context)
  targetOverallDifficulty: number;
  topicCategory: string;
}

/**
 * Topic categories for grammar questions.
 */
export const GRAMMAR_TOPIC_CATEGORIES = [
  "scientific_research",
  "historical_events",
  "social_studies",
  "environmental_issues",
  "technological_development",
  "cultural_topics",
  "economic_concepts",
  "literary_subjects",
] as const;

/**
 * Sample grammar question parameters.
 */
export function sampleGrammarParams(
  questionType: SampledGrammarParams["questionType"],
  overrides?: Partial<SampledGrammarParams>
): SampledGrammarParams {
  // Pattern types for each question type
  const patternOptions: Record<SampledGrammarParams["questionType"], string[]> = {
    boundaries_between_sentences: ["comma_splice", "run_on_sentence", "correct_period", "correct_semicolon"],
    boundaries_within_sentences: ["series_commas", "appositive", "parenthetical", "introductory_phrase"],
    subject_verb_agreement: ["prepositional_phrase_distractor", "inverted_sentence", "compound_subject", "indefinite_pronoun"],
    pronoun_antecedent_agreement: ["singular_they", "company_organization", "ambiguous_reference"],
    verb_finiteness: ["gerund_vs_finite", "infinitive_vs_finite", "participle_modifier"],
    verb_tense_aspect: ["past_vs_present", "perfect_aspect", "consistent_tense", "future_perfect"],
    subject_modifier_placement: ["dangling_modifier", "misplaced_modifier", "squinting_modifier"],
    genitives_plurals: ["its_vs_its", "their_there_theyre", "whose_vs_whos", "plural_vs_possessive"],
  };

  const patterns = patternOptions[questionType];
  const patternType = overrides?.patternType ?? patterns[Math.floor(Math.random() * patterns.length)];

  const topicCategories = [...GRAMMAR_TOPIC_CATEGORIES];
  const topicCategory = overrides?.topicCategory ??
    topicCategories[Math.floor(Math.random() * topicCategories.length)];

  return {
    questionType,
    patternType,
    sentenceComplexity: overrides?.sentenceComplexity ?? 0.5,
    contextClarity: overrides?.contextClarity ?? 0.5,
    targetOverallDifficulty: overrides?.targetOverallDifficulty ?? 0.5,
    topicCategory,
  };
}
