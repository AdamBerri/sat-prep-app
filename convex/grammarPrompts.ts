// ─────────────────────────────────────────────────────────
// GRAMMAR QUESTION PROMPTS (Domain 4)
// ─────────────────────────────────────────────────────────
// Verbalized prompts for SAT Standard English Conventions questions.
// Tells Claude the difficulty levels as percentages.
// NO rigid patterns - let Claude generate creatively.

import {
  type SampledGrammarParams,
  type GrammarQuestionType,
  GRAMMAR_TYPE_DESCRIPTIONS,
  GRAMMAR_DISTRACTOR_STRATEGIES,
  type GrammarDistractorStrategy,
} from "./grammarConventionsTemplates";

// ─────────────────────────────────────────────────────────
// PROMPT BUILDER
// ─────────────────────────────────────────────────────────

/**
 * Build a verbalized prompt for generating a grammar question.
 * Tells Claude the difficulty levels so it can calibrate accordingly.
 */
export function buildGrammarPrompt(params: SampledGrammarParams): string {
  const typeDescription = GRAMMAR_TYPE_DESCRIPTIONS[params.questionType];
  const difficultyProfile = describeDifficulty(params);
  const distractorInstructions = formatDistractorStrategies(params.distractorStrategies);
  const topicDescription = describeTopicCategory(params.topicCategory);

  return `You are an expert SAT question writer creating a ${formatQuestionType(params.questionType)} question.

═══════════════════════════════════════════════════════════════════════════════
REQUIRED GRAMMAR SKILL: ${formatQuestionType(params.questionType)}
Description: ${typeDescription}
═══════════════════════════════════════════════════════════════════════════════

═══════════════════════════════════════════════════════════════════════════════
REQUIRED TOPIC: ${params.topicCategory.replace(/_/g, " ").toUpperCase()}
${topicDescription}
═══════════════════════════════════════════════════════════════════════════════

DIFFICULTY PROFILE (verbalized sampling - use these to calibrate difficulty):
${difficultyProfile}

CREATIVITY REQUIREMENTS - EXTREMELY IMPORTANT:
1. Create a COMPLETELY ORIGINAL sentence about ${params.topicCategory.replace(/_/g, " ")} - never use generic examples
2. Use SPECIFIC names, places, dates, and details:
   - NOT "The scientist discovered..." → "Dr. Yuki Tanaka's 2019 study of hydrothermal vents..."
   - NOT "The artist created..." → "Sculptor Maya Lin's minimalist Vietnam Veterans Memorial..."
   - NOT "The company announced..." → "Patagonia's decision to donate all profits to environmental causes..."
3. BANNED patterns (NEVER use these):
   - "The collection of [things]..."
   - "The group of [people]..."
   - "Many researchers..."
   - "Some experts believe..."
   - "In recent years..."
   - "According to studies..."
4. The sentence should read like an excerpt from The New York Times, Nature, or The Atlantic
5. Include at least ONE specific proper noun (person, place, institution, or work)

STRUCTURAL REQUIREMENTS:
1. The sentence must genuinely test ${formatQuestionType(params.questionType)}
2. Mark the tested portion with [underlined] brackets
3. Include exactly ONE clearly correct answer
4. The grammar issue should emerge naturally from the content

DIFFICULTY CALIBRATION:
- Sentence Complexity: ${(params.sentenceComplexity * 100).toFixed(0)}% means ${describeSentenceComplexity(params.sentenceComplexity)}
- Grammar Subtlety: ${(params.grammarSubtlety * 100).toFixed(0)}% means ${describeGrammarSubtlety(params.grammarSubtlety)}
- Vocabulary Level: ${(params.vocabularyLevel * 100).toFixed(0)}% means ${describeVocabularyLevel(params.vocabularyLevel)}

DISTRACTOR REQUIREMENTS:
Create 3 wrong answer choices using these strategies:
${distractorInstructions}

OUTPUT FORMAT (JSON only, no markdown):
{
  "sentenceWithUnderline": "The complete sentence with [underlined portion] marked where the answer goes",
  "underlinedPortion": "The exact text that appears in the brackets (will be replaced by answer choices)",
  "questionStem": "Which choice completes the text so that it conforms to the conventions of Standard English?",
  "choices": {
    "A": "correct answer text",
    "B": "distractor 1",
    "C": "distractor 2",
    "D": "distractor 3"
  },
  "correctAnswer": "A",
  "explanation": "Clear explanation of why A is correct and why each distractor is wrong",
  "grammarRule": "The specific grammar rule being tested (e.g., 'comma splices create run-on sentences')"
}

CRITICAL REMINDERS:
- The correct answer must be in choice A
- The [underlined] portion in sentenceWithUnderline should match what choice A would replace
- Make the sentence feel natural and academic, not contrived
- Each distractor should represent a genuine student mistake`;
}

// ─────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────

function formatQuestionType(type: GrammarQuestionType): string {
  return type.replace(/_/g, " ").toUpperCase();
}

function describeDifficulty(params: SampledGrammarParams): string {
  return `- Sentence Complexity: ${(params.sentenceComplexity * 100).toFixed(0)}% (0%=simple, 100%=complex syntax)
- Grammar Subtlety: ${(params.grammarSubtlety * 100).toFixed(0)}% (0%=obvious error, 100%=subtle/tricky)
- Context Clarity: ${(params.contextClarity * 100).toFixed(0)}% (0%=unclear, 100%=context makes answer obvious)
- Vocabulary Level: ${(params.vocabularyLevel * 100).toFixed(0)}% (0%=common words, 100%=advanced vocabulary)
- Distractor Plausibility: ${(params.distractorPlausibility * 100).toFixed(0)}% (0%=clearly wrong, 100%=very tempting)
- Target Overall: ${(params.targetOverallDifficulty * 100).toFixed(0)}%`;
}

function describeSentenceComplexity(level: number): string {
  if (level < 0.3) return "simple, straightforward sentence structure";
  if (level < 0.5) return "moderate complexity with some subordinate clauses";
  if (level < 0.7) return "complex structure with multiple clauses or embedded phrases";
  return "highly complex with nested clauses, interrupting phrases, or unusual syntax";
}

function describeGrammarSubtlety(level: number): string {
  if (level < 0.3) return "the grammar issue should be fairly obvious";
  if (level < 0.5) return "moderate difficulty - requires attention but not tricky";
  if (level < 0.7) return "subtle issue that careful readers will catch";
  return "very subtle - even strong students might miss this";
}

function describeVocabularyLevel(level: number): string {
  if (level < 0.3) return "use common, everyday words";
  if (level < 0.5) return "use moderately sophisticated vocabulary";
  if (level < 0.7) return "use academic vocabulary appropriate for SAT";
  return "use advanced, challenging vocabulary";
}

function describeTopicCategory(category: string): string {
  const descriptions: Record<string, string> = {
    scientific_research: "Write about a specific scientific discovery, experiment, or researcher. Include lab names, publication venues, or research institutions.",
    historical_events: "Write about a specific historical event, figure, or period. Include dates, places, and proper names.",
    social_studies: "Write about sociology, anthropology, or social movements. Reference specific studies, researchers, or communities.",
    environmental_issues: "Write about climate, conservation, or ecology. Reference specific locations, species, or environmental initiatives.",
    technological_development: "Write about innovation, computing, or engineering. Reference specific companies, inventors, or technologies.",
    cultural_topics: "Write about traditions, customs, or cultural phenomena. Reference specific cultures, rituals, or cultural figures.",
    economic_concepts: "Write about markets, trade, or economic policy. Reference specific economists, companies, or economic events.",
    literary_subjects: "Write about literature, authors, or literary movements. Reference specific works, authors, or literary techniques.",
    psychological_research: "Write about psychology studies, cognitive science, or mental health. Reference specific researchers or experiments.",
    artistic_movements: "Write about art, music, or creative expression. Reference specific artists, works, or movements.",
  };
  return descriptions[category] || "Write about an interesting, specific topic with proper nouns and concrete details.";
}

function formatDistractorStrategies(
  strategies: [GrammarDistractorStrategy, GrammarDistractorStrategy, GrammarDistractorStrategy]
): string {
  return strategies
    .map((strategy, i) => {
      const description = GRAMMAR_DISTRACTOR_STRATEGIES[strategy] || strategy;
      return `${i + 1}. ${strategy.replace(/_/g, " ")}: ${description}`;
    })
    .join("\n");
}

// ─────────────────────────────────────────────────────────
// QUESTION-TYPE SPECIFIC PROMPTS
// ─────────────────────────────────────────────────────────

/**
 * Build a prompt specifically for sentence boundary questions.
 */
export function buildBoundariesBetweenPrompt(params: SampledGrammarParams): string {
  return buildGrammarPrompt(params) + `

ADDITIONAL GUIDANCE FOR SENTENCE BOUNDARIES:
- Create two independent clauses that could logically be connected
- The [underlined] portion should be where punctuation/connection goes between the clauses
- Options should include correct punctuation (period, semicolon) vs. comma splices or run-ons
- Consider: Does the relationship between clauses call for contrast, continuation, or cause-effect?`;
}

/**
 * Build a prompt specifically for within-sentence punctuation questions.
 */
export function buildBoundariesWithinPrompt(params: SampledGrammarParams): string {
  return buildGrammarPrompt(params) + `

ADDITIONAL GUIDANCE FOR WITHIN-SENTENCE PUNCTUATION:
- Focus on: series commas, appositives, parenthetical phrases, introductory elements
- The [underlined] portion should contain the area where punctuation is tested
- Include cases where NO punctuation is needed (restrictive clauses, essential modifiers)`;
}

/**
 * Build a prompt specifically for subject-verb agreement questions.
 */
export function buildSubjectVerbPrompt(params: SampledGrammarParams): string {
  return buildGrammarPrompt(params) + `

ADDITIONAL GUIDANCE FOR SUBJECT-VERB AGREEMENT:
- Consider including: prepositional phrases between subject and verb, inverted sentences, compound subjects
- The [underlined] portion should be the verb (or subject+verb area)
- Create scenarios where the subject number isn't immediately obvious`;
}

/**
 * Build a prompt specifically for pronoun-antecedent agreement questions.
 */
export function buildPronounAgreementPrompt(params: SampledGrammarParams): string {
  return buildGrammarPrompt(params) + `

ADDITIONAL GUIDANCE FOR PRONOUN AGREEMENT:
- Focus on: singular/plural matching, clear pronoun reference, collective noun pronouns
- The [underlined] portion should include the pronoun in question
- Create scenarios where the antecedent number might be ambiguous`;
}

/**
 * Build a prompt specifically for verb finiteness questions.
 */
export function buildVerbFinitenessPrompt(params: SampledGrammarParams): string {
  return buildGrammarPrompt(params) + `

ADDITIONAL GUIDANCE FOR VERB FINITENESS:
- Test: finite verbs vs. gerunds, participles, infinitives
- The [underlined] portion should be where the verb form choice occurs
- Create sentences where students might confuse a verbal for a complete verb`;
}

/**
 * Build a prompt specifically for verb tense/aspect questions.
 */
export function buildVerbTensePrompt(params: SampledGrammarParams): string {
  return buildGrammarPrompt(params) + `

ADDITIONAL GUIDANCE FOR VERB TENSE AND ASPECT:
- Focus on: tense consistency, perfect aspects, sequence of events
- The [underlined] portion should contain the verb being tested
- Create context that clearly establishes when events happen`;
}

/**
 * Build a prompt specifically for modifier placement questions.
 */
export function buildModifierPlacementPrompt(params: SampledGrammarParams): string {
  return buildGrammarPrompt(params) + `

ADDITIONAL GUIDANCE FOR MODIFIER PLACEMENT:
- Test: dangling modifiers, misplaced modifiers, squinting modifiers
- The [underlined] portion may be the modifier itself or the word it should modify
- Create sentences where placement genuinely affects meaning or clarity`;
}

/**
 * Build a prompt specifically for genitives/plurals questions.
 */
export function buildGenitivesPluralsPrompt(params: SampledGrammarParams): string {
  return buildGrammarPrompt(params) + `

ADDITIONAL GUIDANCE FOR POSSESSIVES AND PLURALS:
- Test: its/it's, their/there/they're, whose/who's, apostrophe usage
- The [underlined] portion should be the word form being tested
- Create contexts where the meaning requires possessive or plural specifically`;
}

// ─────────────────────────────────────────────────────────
// PROMPT GENERATOR MAP
// ─────────────────────────────────────────────────────────

/**
 * Map of question types to their specialized prompt builders.
 */
export const GRAMMAR_PROMPT_BUILDERS: Record<
  GrammarQuestionType,
  (params: SampledGrammarParams) => string
> = {
  boundaries_between_sentences: buildBoundariesBetweenPrompt,
  boundaries_within_sentences: buildBoundariesWithinPrompt,
  subject_verb_agreement: buildSubjectVerbPrompt,
  pronoun_antecedent_agreement: buildPronounAgreementPrompt,
  verb_finiteness: buildVerbFinitenessPrompt,
  verb_tense_aspect: buildVerbTensePrompt,
  subject_modifier_placement: buildModifierPlacementPrompt,
  genitives_plurals: buildGenitivesPluralsPrompt,
};

/**
 * Get the appropriate prompt for a grammar question type.
 */
export function getGrammarPrompt(params: SampledGrammarParams): string {
  const builder = GRAMMAR_PROMPT_BUILDERS[params.questionType];
  return builder(params);
}
