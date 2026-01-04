// ─────────────────────────────────────────────────────────
// TRANSITIONS QUESTION PROMPTS
// ─────────────────────────────────────────────────────────
// Verbalized prompts for SAT Transitions questions.
// Tells Claude the difficulty levels as percentages.
// NO hardcoded transition lists - let Claude generate freely.

import {
  type SampledTransitionParams,
  TRANSITIONS_DISTRACTOR_STRATEGIES,
  RELATIONSHIP_TYPE_DESCRIPTIONS,
  type TransitionsDistractorStrategy,
} from "./transitionsTemplates";

// ─────────────────────────────────────────────────────────
// PROMPT BUILDER
// ─────────────────────────────────────────────────────────

/**
 * Build a verbalized prompt for generating a transitions question.
 * Tells Claude the difficulty levels so it can calibrate accordingly.
 */
export function buildTransitionsPrompt(params: SampledTransitionParams): string {
  const difficultyProfile = describeDifficulty(params);
  const distractorInstructions = formatDistractorStrategies(params.distractorStrategies);
  const relationshipDescription = RELATIONSHIP_TYPE_DESCRIPTIONS[params.relationshipType];

  return `You are an expert SAT question writer creating a TRANSITIONS question.

TASK: Create an SAT-style transitions question that tests students' ability to choose
the most effective transition word or phrase to connect ideas logically.

═══════════════════════════════════════════════════════════════════════════════
REQUIRED RELATIONSHIP TYPE: ${params.relationshipType.toUpperCase().replace(/_/g, " ")}
Description: ${relationshipDescription}
═══════════════════════════════════════════════════════════════════════════════

You MUST create a passage where the correct transition expresses THIS specific
relationship type. This is not optional - it ensures variety across questions.

TOPIC CONTEXT: ${params.topicCategory.replace(/_/g, " ")}

DIFFICULTY PROFILE:
${difficultyProfile}

CREATIVITY REQUIREMENTS - VERY IMPORTANT:
1. Do NOT use overused transitions like: however, despite, therefore, furthermore, additionally
2. Choose LESS COMMON but still appropriate transitions for this relationship type
3. The passage topic should be SPECIFIC and INTERESTING, not generic
4. Create a scenario that naturally requires the sampled relationship type

PASSAGE REQUIREMENTS:
1. Write a short passage (2-4 sentences) that genuinely needs a ${params.relationshipType.replace(/_/g, " ")} transition
2. Include a blank _____ where the transition word/phrase belongs
3. The relationship should be CLEAR from context but require the right transition word
4. Make the passage feel like real academic writing, not a contrived example

DIFFICULTY CALIBRATION:
- Relationship Subtlety: ${(params.relationshipSubtlety * 100).toFixed(0)}% - ${describeRelationshipSubtlety(params.relationshipSubtlety)}
- Sentence Complexity: ${(params.sentenceComplexity * 100).toFixed(0)}% - ${describeSentenceComplexity(params.sentenceComplexity)}
- Context Density: ${(params.contextDensity * 100).toFixed(0)}% - ${describeContextDensity(params.contextDensity)}
- Vocabulary Level: ${(params.vocabularyLevel * 100).toFixed(0)}% - ${describeVocabularyLevel(params.vocabularyLevel)}

DISTRACTOR REQUIREMENTS:
Create 3 wrong answer choices using these strategies:
${distractorInstructions}

OUTPUT FORMAT (JSON only, no markdown):
{
  "passageWithBlank": "Complete passage with _____ marking where the transition goes",
  "questionStem": "Which choice completes the text with the most logical transition?",
  "choices": {
    "A": "correct transition (use a LESS COMMON but appropriate word)",
    "B": "distractor 1",
    "C": "distractor 2",
    "D": "distractor 3"
  },
  "correctAnswer": "A",
  "explanation": "Clear explanation of the ${params.relationshipType.replace(/_/g, " ")} relationship and why each distractor doesn't fit"
}

CRITICAL REMINDERS:
- The correct answer must be in choice A
- The relationship type MUST be ${params.relationshipType.replace(/_/g, " ")} - this is required
- AVOID common transitions: however, despite, therefore, furthermore, additionally, moreover
- Choose transitions that are correct but less predictable
- Create FRESH, UNIQUE content - not generic filler passages`;
}

// ─────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────

function describeDifficulty(params: SampledTransitionParams): string {
  return `- Sentence Complexity: ${(params.sentenceComplexity * 100).toFixed(0)}% (0%=simple, 100%=complex syntax)
- Relationship Subtlety: ${(params.relationshipSubtlety * 100).toFixed(0)}% (0%=obvious, 100%=subtle)
- Vocabulary Level: ${(params.vocabularyLevel * 100).toFixed(0)}% (0%=common, 100%=advanced)
- Context Density: ${(params.contextDensity * 100).toFixed(0)}% (0%=sparse, 100%=dense)
- Target Overall: ${(params.targetOverallDifficulty * 100).toFixed(0)}%`;
}

function describeRelationshipSubtlety(level: number): string {
  if (level < 0.3) return "the logical relationship should be fairly obvious from context";
  if (level < 0.5) return "moderate subtlety - requires attention but not tricky";
  if (level < 0.7) return "somewhat subtle - students need to read carefully";
  return "very subtle - the relationship requires careful inference";
}

function describeSentenceComplexity(level: number): string {
  if (level < 0.3) return "simple, straightforward sentences";
  if (level < 0.5) return "moderate complexity with some subordinate clauses";
  if (level < 0.7) return "complex structure with multiple clauses";
  return "highly complex with nested clauses and sophisticated syntax";
}

function describeContextDensity(level: number): string {
  if (level < 0.3) return "sparse context - few clues beyond the immediate sentences";
  if (level < 0.5) return "moderate context that supports the relationship";
  if (level < 0.7) return "dense context with multiple supporting clues";
  return "very dense context that thoroughly establishes the relationship";
}

function describeVocabularyLevel(level: number): string {
  if (level < 0.3) return "use common, everyday words";
  if (level < 0.5) return "use moderately sophisticated vocabulary";
  if (level < 0.7) return "use academic vocabulary appropriate for SAT";
  return "use advanced, challenging vocabulary";
}

function formatDistractorStrategies(
  strategies: [TransitionsDistractorStrategy, TransitionsDistractorStrategy, TransitionsDistractorStrategy]
): string {
  return strategies
    .map((strategy, i) => {
      const description = TRANSITIONS_DISTRACTOR_STRATEGIES[strategy] || strategy;
      return `${i + 1}. ${strategy.replace(/_/g, " ")}: ${description}`;
    })
    .join("\n");
}

/**
 * Get the transitions prompt for a given set of parameters.
 */
export function getTransitionsPrompt(params: SampledTransitionParams): string {
  return buildTransitionsPrompt(params);
}
