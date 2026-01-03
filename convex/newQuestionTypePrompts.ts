// ─────────────────────────────────────────────────────────
// GENERATION PROMPTS FOR NEW QUESTION TYPES
// ─────────────────────────────────────────────────────────
// LLM prompts for generating the 5 newly added SAT question types:
// 1. Cross-Text Connections
// 2. Transitions
// 3. Boundaries (Between Sentences)
// 4. Boundaries (Within Sentences)
// 5. Form, Structure, and Sense (6 subskills)

import type { SampledCrossTextParams } from "./crossTextTemplates";
import type { SampledTransitionParams } from "./transitionsTemplates";
import type { SampledGrammarParams } from "./grammarConventionsTemplates";

// ═══════════════════════════════════════════════════════════
// CROSS-TEXT CONNECTIONS PROMPT
// ═══════════════════════════════════════════════════════════

export function generateCrossTextConnectionPrompt(params: SampledCrossTextParams): string {
  return `Generate an SAT-style Cross-Text Connections question with the following specifications:

RELATIONSHIP TYPE: ${params.relationshipType}
TOPIC CATEGORY: ${params.topicCategory}
PASSAGE TYPE: ${params.passageType1}
DIFFICULTY: ${params.targetOverallDifficulty.toFixed(2)} (0.0 = easy, 1.0 = hard)

REQUIREMENTS:
1. Create TWO short passages (50-100 words each) on a related topic
2. Text 1 should present an idea, claim, or perspective
3. Text 2 should have a clear relationship to Text 1 (${params.relationshipType})
4. Both texts must be at an appropriate reading level for SAT
5. The relationship should be clear but require careful reading

OUTPUT FORMAT (valid JSON):
{
  "text1": {
    "content": "First passage (50-100 words)",
    "author": "Author name or 'Adapted from [source]'",
    "title": "Optional title"
  },
  "text2": {
    "content": "Second passage (50-100 words)",
    "author": "Author name or 'Adapted from [source]'",
    "title": "Optional title"
  },
  "questionStem": "Which choice best describes the relationship between Text 1 and Text 2?",
  "correctAnswer": "A",
  "choices": {
    "A": "The correct description of the relationship",
    "B": "Distractor using ${params.distractorStrategies[0]} strategy",
    "C": "Distractor using ${params.distractorStrategies[1]} strategy",
    "D": "Distractor using ${params.distractorStrategies[2]} strategy"
  },
  "explanation": "Why answer A is correct and others are wrong"
}

DISTRACTOR STRATEGIES:
- ${params.distractorStrategies[0]}: ${getDistractorDescription(params.distractorStrategies[0])}
- ${params.distractorStrategies[1]}: ${getDistractorDescription(params.distractorStrategies[1])}
- ${params.distractorStrategies[2]}: ${getDistractorDescription(params.distractorStrategies[2])}

Generate a complete, SAT-quality cross-text question now.`;
}

// ═══════════════════════════════════════════════════════════
// TRANSITIONS PROMPT
// ═══════════════════════════════════════════════════════════

export function generateTransitionsPrompt(params: SampledTransitionParams): string {
  return `Generate an SAT-style Transitions question with the following specifications:

RELATIONSHIP TYPE: ${params.relationshipType}
CORRECT TRANSITION: "${params.correctTransition}"
TOPIC CATEGORY: ${params.topicCategory}
DIFFICULTY: ${params.targetOverallDifficulty.toFixed(2)}

REQUIREMENTS:
1. Create a short passage (2-3 sentences) with a logical connection point
2. The blank _____ should be where the transition goes
3. The correct transition must logically connect the ideas
4. Include 3 distractor transitions from different relationship types

OUTPUT FORMAT (valid JSON):
{
  "passageWithBlank": "Sentence before. _____ sentence after transition.",
  "questionStem": "Which choice completes the text with the most logical transition?",
  "correctAnswer": "B",
  "choices": {
    "A": "${params.distractorTransitions[0]}",
    "B": "${params.correctTransition}",
    "C": "${params.distractorTransitions[1]}",
    "D": "${params.distractorTransitions[2]}"
  },
  "explanation": "Why '${params.correctTransition}' is correct: it shows ${params.relationshipType}. Others are wrong because they indicate different relationships.",
  "sentenceBefore": "The complete sentence before the transition",
  "sentenceAfter": "The complete sentence after the transition"
}

CONTEXT: The sentences should clearly require a ${params.relationshipType} relationship.
For example, if cause_effect: Sentence 1 describes a cause, sentence 2 describes the effect.

Generate a complete, SAT-quality transitions question now.`;
}

// ═══════════════════════════════════════════════════════════
// BOUNDARIES BETWEEN SENTENCES PROMPT
// ═══════════════════════════════════════════════════════════

export function generateBoundariesBetweenPrompt(params: SampledGrammarParams): string {
  return `Generate an SAT-style sentence boundary/punctuation question with the following specifications:

PATTERN TYPE: ${params.patternType}
TOPIC: ${params.topicCategory}
DIFFICULTY: ${params.targetOverallDifficulty.toFixed(2)}

REQUIREMENTS:
1. Create a sentence or pair of sentences with a punctuation decision point
2. Test student's ability to correctly mark sentence boundaries
3. The underlined portion should include the punctuation decision
4. Focus on common errors: comma splices, run-ons, vs. correct punctuation

OUTPUT FORMAT (valid JSON):
{
  "sentenceWithUnderline": "The experiment succeeded[underlined portion]the results were significant.",
  "underlinedPortion": ", the",
  "questionStem": "Which choice completes the text so that it conforms to the conventions of Standard English?",
  "correctAnswer": "C",
  "choices": {
    "A": ", the",
    "B": " the",
    "C": ". The",
    "D": "; and the"
  },
  "explanation": "Choice C correctly uses a period to separate two independent clauses. A creates a comma splice, B creates a run-on, D uses unnecessary semicolon with conjunction.",
  "grammarRule": "Two independent clauses must be separated by a period, semicolon, or comma + coordinating conjunction"
}

Common patterns to test:
- Comma splice (incorrect): "Clause one, clause two"
- Run-on (incorrect): "Clause one clause two"
- Correct period: "Clause one. Clause two"
- Correct semicolon: "Clause one; clause two"

Generate a complete, SAT-quality boundaries question now.`;
}

// ═══════════════════════════════════════════════════════════
// BOUNDARIES WITHIN SENTENCES PROMPT
// ═══════════════════════════════════════════════════════════

export function generateBoundariesWithinPrompt(params: SampledGrammarParams): string {
  return `Generate an SAT-style within-sentence punctuation question with the following specifications:

PATTERN TYPE: ${params.patternType}
TOPIC: ${params.topicCategory}
DIFFICULTY: ${params.targetOverallDifficulty.toFixed(2)}

REQUIREMENTS:
1. Create a sentence testing punctuation within a sentence (not sentence boundaries)
2. Test: series commas, appositives, parenthetical elements, introductory phrases
3. The underlined portion should include the punctuation decision
4. Include option for "no punctuation needed" if appropriate

OUTPUT FORMAT (valid JSON):
{
  "sentenceWithUnderline": "The study[underlined]which began in 2020[underlined]showed clear results.",
  "underlinedPortion": "—which began in 2020—",
  "questionStem": "Which choice completes the text so that it conforms to the conventions of Standard English?",
  "correctAnswer": "A",
  "choices": {
    "A": "—which began in 2020—",
    "B": ", which began in 2020,",
    "C": " which began in 2020",
    "D": ", which began in 2020"
  },
  "explanation": "Choice A correctly uses em dashes to set off the nonessential appositive. B also works with commas. C and D fail to properly set off the clause.",
  "grammarRule": "Nonessential clauses must be set off with commas, dashes, or parentheses on BOTH sides"
}

Patterns to include:
- Appositive: "The scientist, a Nobel laureate, discovered"
- Series: "A, B, and C"
- Parenthetical: "The results, according to the study, were"
- Introductory: "After the experiment, researchers found"

Generate a complete, SAT-quality punctuation question now.`;
}

// ═══════════════════════════════════════════════════════════
// SUBJECT-VERB AGREEMENT PROMPT
// ═══════════════════════════════════════════════════════════

export function generateSubjectVerbAgreementPrompt(params: SampledGrammarParams): string {
  return `Generate an SAT-style subject-verb agreement question with the following specifications:

PATTERN TYPE: ${params.patternType}
TOPIC: ${params.topicCategory}
DIFFICULTY: ${params.targetOverallDifficulty.toFixed(2)}

REQUIREMENTS:
1. Create a sentence with a subject-verb agreement decision
2. The verb choice should be underlined
3. Test common tricky patterns (prepositional phrase distractor, indefinite pronouns, etc.)

OUTPUT FORMAT (valid JSON):
{
  "sentenceWithUnderline": "The collection of rare books[underlined]valuable to researchers.",
  "underlinedPortion": " is",
  "questionStem": "Which choice completes the text so that it conforms to the conventions of Standard English?",
  "correctAnswer": "B",
  "choices": {
    "A": " are",
    "B": " is",
    "C": " were",
    "D": " being"
  },
  "explanation": "Choice B is correct. The subject is 'collection' (singular), not 'books'. The prepositional phrase 'of rare books' can distract, but doesn't change that the subject is singular.",
  "grammarRule": "The verb must agree with the subject in number. Prepositional phrases between subject and verb do not affect agreement."
}

Common patterns:
- Prepositional phrase: "The collection of books is"
- Inverted: "Among the findings was"
- Indefinite pronoun: "Each of the experiments was"
- Compound subject: "The hypothesis and data are"

Generate a complete, SAT-quality subject-verb agreement question now.`;
}

// ═══════════════════════════════════════════════════════════
// ADDITIONAL FORM/STRUCTURE/SENSE PROMPTS
// ═══════════════════════════════════════════════════════════

export function generatePronounAgreementPrompt(params: SampledGrammarParams): string {
  return `Generate an SAT-style pronoun-antecedent agreement question.

PATTERN: ${params.patternType}
TOPIC: ${params.topicCategory}
DIFFICULTY: ${params.targetOverallDifficulty.toFixed(2)}

Test pronoun agreement patterns:
- Singular indefinite pronouns (each, everyone) take singular pronouns
- Companies/organizations take "it/its" (not they/their)
- Ambiguous pronoun references must be clarified

Output valid JSON with sentence, underlined portion, choices, correct answer, and explanation.`;
}

export function generateVerbFinitenessPrompt(params: SampledGrammarParams): string {
  return `Generate an SAT-style verb finiteness question (finite verb vs. gerund/participle/infinitive).

PATTERN: ${params.patternType}
DIFFICULTY: ${params.targetOverallDifficulty.toFixed(2)}

Test patterns like:
- "The data suggests" (finite) vs. "The data suggesting" (non-finite participle)
- "The experiment demonstrates" vs. "to demonstrate"

Output valid JSON with sentence, choices, correct answer, and explanation.`;
}

export function generateVerbTensePrompt(params: SampledGrammarParams): string {
  return `Generate an SAT-style verb tense and aspect question.

PATTERN: ${params.patternType}
DIFFICULTY: ${params.targetOverallDifficulty.toFixed(2)}

Test patterns:
- Past vs. present for historical facts
- Perfect aspect for prior completed actions
- Tense consistency within passage

Output valid JSON with sentence, choices, correct answer, and explanation.`;
}

export function generateModifierPlacementPrompt(params: SampledGrammarParams): string {
  return `Generate an SAT-style modifier placement question.

PATTERN: ${params.patternType}
DIFFICULTY: ${params.targetOverallDifficulty.toFixed(2)}

Test dangling or misplaced modifiers:
- "Running quickly, the finish line..." (WRONG - dangling)
- "Running quickly, the athlete saw..." (CORRECT)

Output valid JSON with sentence options, correct answer, and explanation.`;
}

export function generateGenitivesPluralsPrompt(params: SampledGrammarParams): string {
  return `Generate an SAT-style genitives/plurals question (its/it's, their/there/they're, etc.).

PATTERN: ${params.patternType}
DIFFICULTY: ${params.targetOverallDifficulty.toFixed(2)}

Test common confusions:
- its (possessive) vs. it's (it is)
- their (possessive) vs. there (location) vs. they're (they are)
- whose (possessive) vs. who's (who is)

Output valid JSON with sentence, choices, correct answer, and explanation.`;
}

// ═══════════════════════════════════════════════════════════
// HELPER FUNCTIONS
// ═══════════════════════════════════════════════════════════

function getDistractorDescription(strategy: string): string {
  const descriptions: Record<string, string> = {
    reverses_relationship: "States opposite of actual relationship",
    confuses_which_text: "Attributes content to wrong text",
    partial_truth: "Describes one aspect but misses main relationship",
    wrong_transition: "Uses transition indicating wrong logical relationship",
    wrong_punctuation: "Uses incorrect punctuation mark",
    comma_splice: "Incorrectly joins independent clauses with comma",
    wrong_verb_form: "Uses wrong verb form (number, tense, etc.)",
    wrong_pronoun: "Uses incorrect pronoun",
    misplaced_modifier: "Places modifier in wrong position",
    wrong_word_form: "Uses wrong form (possessive/plural/contraction)",
  };
  return descriptions[strategy] || "Common error pattern";
}

// Export prompt generator mapping
export const PROMPT_GENERATORS = {
  cross_text_connections: generateCrossTextConnectionPrompt,
  transitions: generateTransitionsPrompt,
  boundaries_between_sentences: generateBoundariesBetweenPrompt,
  boundaries_within_sentences: generateBoundariesWithinPrompt,
  subject_verb_agreement: generateSubjectVerbAgreementPrompt,
  pronoun_antecedent_agreement: generatePronounAgreementPrompt,
  verb_finiteness: generateVerbFinitenessPrompt,
  verb_tense_aspect: generateVerbTensePrompt,
  subject_modifier_placement: generateModifierPlacementPrompt,
  genitives_plurals: generateGenitivesPluralsPrompt,
};
