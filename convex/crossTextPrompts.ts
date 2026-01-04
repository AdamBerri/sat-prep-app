// ─────────────────────────────────────────────────────────
// CROSS-TEXT CONNECTIONS PROMPTS
// ─────────────────────────────────────────────────────────
// Verbalized prompts for SAT Cross-Text Connections questions.
// Tells Claude the difficulty levels as percentages.
// NO rigid relationship constraints - let Claude generate freely.

import {
  type SampledCrossTextParams,
  CROSS_TEXT_DISTRACTOR_STRATEGIES,
  RELATIONSHIP_TYPE_DESCRIPTIONS,
  type CrossTextDistractorStrategy,
} from "./crossTextTemplates";

// ─────────────────────────────────────────────────────────
// PROMPT BUILDER
// ─────────────────────────────────────────────────────────

/**
 * Build a verbalized prompt for generating a cross-text question.
 * Tells Claude the difficulty levels so it can calibrate accordingly.
 */
export function buildCrossTextPrompt(params: SampledCrossTextParams): string {
  const difficultyProfile = describeDifficulty(params);
  const distractorInstructions = formatDistractorStrategies(params.distractorStrategies);
  const relationshipDescription = RELATIONSHIP_TYPE_DESCRIPTIONS[params.relationshipType];

  return `You are an expert SAT question writer creating a CROSS-TEXT CONNECTIONS question.

TASK: Create an SAT-style question that tests students' ability to understand the
relationship between two short passages on the same topic.

═══════════════════════════════════════════════════════════════════════════════
REQUIRED RELATIONSHIP TYPE: ${params.relationshipType.toUpperCase().replace(/_/g, " ")}
Description: ${relationshipDescription}
═══════════════════════════════════════════════════════════════════════════════

You MUST create passages where Text 2 has THIS specific relationship to Text 1.
This is not optional - it ensures variety across questions.

TOPIC CONTEXT: ${params.topicCategory.replace(/_/g, " ")}

DIFFICULTY PROFILE:
${difficultyProfile}

CREATIVITY REQUIREMENTS - VERY IMPORTANT:
1. The passages should be about a SPECIFIC, INTERESTING topic (not generic academic filler)
2. Use real-sounding author names and source attributions
3. Both passages should feel like excerpts from actual academic texts
4. The content should be substantive and thought-provoking
5. AVOID canned examples or generic "some researchers believe..." patterns

PASSAGE REQUIREMENTS:
1. Create TWO short passages (50-100 words each) where Text 2 ${params.relationshipType.replace(/_/g, "s ").toLowerCase()} Text 1
2. Both passages should be on ${params.topicCategory.replace(/_/g, " ")} but from different perspectives
3. The ${params.relationshipType.replace(/_/g, " ")} relationship should be clear from careful reading
4. Create a question that asks about this specific relationship

DIFFICULTY CALIBRATION:
- Relationship Subtlety: ${(params.relationshipSubtlety * 100).toFixed(0)}% - ${describeRelationshipSubtlety(params.relationshipSubtlety)}
- Text Complexity: Text 1 = ${(params.text1Complexity * 100).toFixed(0)}%, Text 2 = ${(params.text2Complexity * 100).toFixed(0)}%
- Argument Complexity: ${(params.argumentComplexity * 100).toFixed(0)}% - ${describeArgumentComplexity(params.argumentComplexity)}
- Vocabulary Level: ${(params.vocabularyLevel * 100).toFixed(0)}% - ${describeVocabularyLevel(params.vocabularyLevel)}

DISTRACTOR REQUIREMENTS:
Create 3 wrong answer choices using these strategies:
${distractorInstructions}

OUTPUT FORMAT (JSON only, no markdown):
{
  "text1": {
    "content": "First passage (50-100 words)",
    "author": "Author or source attribution for Text 1",
    "title": "Optional title for Text 1"
  },
  "text2": {
    "content": "Second passage (50-100 words)",
    "author": "Author or source attribution for Text 2",
    "title": "Optional title for Text 2"
  },
  "questionStem": "Based on the texts, how would the author of Text 2 most likely respond to...",
  "choices": {
    "A": "correct description of the ${params.relationshipType.replace(/_/g, " ")} relationship",
    "B": "distractor 1",
    "C": "distractor 2",
    "D": "distractor 3"
  },
  "correctAnswer": "A",
  "explanation": "Clear explanation of the ${params.relationshipType.replace(/_/g, " ")} relationship and why each distractor is wrong"
}

CRITICAL REMINDERS:
- The correct answer must be in choice A
- The relationship type MUST be ${params.relationshipType.replace(/_/g, " ")} - this is required
- Create FRESH, UNIQUE passages with specific, interesting content
- Both passages should feel like real academic writing
- Each distractor should describe a relationship that COULD exist but DOESN'T here`;
}

// ─────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────

function describeDifficulty(params: SampledCrossTextParams): string {
  return `- Text 1 Complexity: ${(params.text1Complexity * 100).toFixed(0)}% (0%=simple, 100%=complex)
- Text 2 Complexity: ${(params.text2Complexity * 100).toFixed(0)}% (0%=simple, 100%=complex)
- Relationship Subtlety: ${(params.relationshipSubtlety * 100).toFixed(0)}% (0%=obvious, 100%=subtle)
- Vocabulary Level: ${(params.vocabularyLevel * 100).toFixed(0)}% (0%=common, 100%=advanced)
- Argument Complexity: ${(params.argumentComplexity * 100).toFixed(0)}% (0%=simple, 100%=nuanced)
- Target Overall: ${(params.targetOverallDifficulty * 100).toFixed(0)}%`;
}

function describeRelationshipSubtlety(level: number): string {
  if (level < 0.3) return "the relationship between texts should be fairly obvious";
  if (level < 0.5) return "moderate subtlety - requires attention but not tricky";
  if (level < 0.7) return "somewhat subtle - students need to read both texts carefully";
  return "very subtle - the relationship requires careful inference and comparison";
}

function describeArgumentComplexity(level: number): string {
  if (level < 0.3) return "simple claims with straightforward reasoning";
  if (level < 0.5) return "moderate complexity with some nuance";
  if (level < 0.7) return "complex arguments with multiple layers";
  return "highly nuanced arguments with qualifications and caveats";
}

function describeVocabularyLevel(level: number): string {
  if (level < 0.3) return "use common, everyday words";
  if (level < 0.5) return "use moderately sophisticated vocabulary";
  if (level < 0.7) return "use academic vocabulary appropriate for SAT";
  return "use advanced, challenging vocabulary";
}

function formatDistractorStrategies(
  strategies: [CrossTextDistractorStrategy, CrossTextDistractorStrategy, CrossTextDistractorStrategy]
): string {
  return strategies
    .map((strategy, i) => {
      const description = CROSS_TEXT_DISTRACTOR_STRATEGIES[strategy] || strategy;
      return `${i + 1}. ${strategy.replace(/_/g, " ")}: ${description}`;
    })
    .join("\n");
}

/**
 * Get the cross-text prompt for a given set of parameters.
 */
export function getCrossTextPrompt(params: SampledCrossTextParams): string {
  return buildCrossTextPrompt(params);
}
