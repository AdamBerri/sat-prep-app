// ─────────────────────────────────────────────────────────
// READING QUESTION PROMPTS
// ─────────────────────────────────────────────────────────
// Claude prompts for generating passages and questions.
// Includes passage generation and type-specific question prompts.

import {
  type SampledReadingParams,
  type PassageType,
  PASSAGE_TYPE_CHARACTERISTICS,
  READING_DISTRACTOR_STRATEGIES,
  READING_QUESTION_PARAMS,
} from "./readingQuestionTemplates";

/**
 * Reading-only question types that have passage-based prompts.
 * Excludes transitions, cross-text, and grammar types which have their own prompt files.
 */
export type ReadingOnlyQuestionType =
  | "central_ideas"
  | "inferences"
  | "command_of_evidence"
  | "vocabulary_in_context"
  | "text_structure"
  | "rhetorical_synthesis";

// ─────────────────────────────────────────────────────────
// PASSAGE GENERATION PROMPT
// ─────────────────────────────────────────────────────────

/**
 * Claude prompt for generating SAT-style passages.
 */
export const PASSAGE_GENERATION_PROMPT = `You are generating an SAT-style reading passage.

PASSAGE SPECIFICATIONS:
- Type: {passageType}
- Type Description: {passageTypeDescription}
- Voice/Style: {voiceStyle}
- Topic Area: {topicArea}
- Complexity Level: {complexity} (0.0 = accessible/clear, 1.0 = challenging/dense)
- Target Length: {length} words ({lengthCategory})

STRUCTURAL REQUIREMENTS:
1. Write in the style appropriate for {passageType}
2. Use clear paragraph structure (2-4 paragraphs)
3. Each paragraph should have a distinct purpose
4. Vocabulary should match complexity level {complexity}
5. Include at least one sentence that requires inference to understand fully
6. Include at least one vocabulary word used in a context-dependent way
7. Include structural features: {structureHints}

QUALITY GUIDELINES:
- Write like a real excerpt from a book, article, or academic text
- Avoid overly didactic or textbook-style writing
- Include specific details, names, or data where appropriate
- Create natural opportunities for SAT-style questions
- The passage should stand alone as a coherent piece

OUTPUT FORMAT (JSON only, no additional text):
{
  "passage": "Full passage text with clear paragraph breaks (use \\n\\n between paragraphs)",
  "title": "Optional title (null if not appropriate for the type)",
  "author": "Realistic author name (invented)",
  "source": "Realistic publication/source (invented)",
  "paragraphPurposes": ["Purpose of para 1", "Purpose of para 2", ...],
  "testableVocabulary": [
    {
      "word": "word that could be tested",
      "sentenceContext": "The sentence containing this word",
      "contextualMeaning": "What the word means in THIS context",
      "alternativeMeanings": ["Other common meanings that don't fit here"]
    }
  ],
  "keyInferences": [
    "An inference readers could make from the text",
    "Another inference (not explicitly stated)"
  ],
  "mainIdea": "The central idea or main argument of the passage",
  "authorPurpose": "What the author is trying to accomplish"
}

Generate the passage now:`;

// ─────────────────────────────────────────────────────────
// QUESTION TYPE PROMPTS
// ─────────────────────────────────────────────────────────

/**
 * Detailed prompts for generating reading question types.
 * Note: Transitions, cross-text, and grammar types have their own dedicated prompt files.
 */
export const QUESTION_TYPE_PROMPTS: Record<ReadingOnlyQuestionType, string> = {
  central_ideas: `You are generating an SAT Central Ideas question.

This question type asks students to identify the main point, central claim, or primary purpose of the passage.

PASSAGE:
{passage}

PASSAGE ANALYSIS:
- Main Idea: {mainIdea}
- Author's Purpose: {authorPurpose}

QUESTION REQUIREMENTS:
1. Question stem should ask about the main idea, central claim, or primary purpose
2. Use stems like:
   - "Which choice best states the main idea of the text?"
   - "What is the primary purpose of the text?"
   - "Which choice best describes the overall structure of the text?"

CORRECT ANSWER REQUIREMENTS:
- Must capture the MAIN point (not a supporting detail)
- Should be specific to this passage (not generic)
- Should encompass the whole passage, not just one part

DISTRACTOR STRATEGIES TO USE:
{distractorInstructions}

Each distractor should:
- Sound plausible and well-written
- Be similar in length/structure to the correct answer
- Test a specific reading error

OUTPUT FORMAT (JSON only):
{
  "questionStem": "Which choice best states...",
  "choices": {
    "A": "Correct answer capturing the main idea",
    "B": "Distractor using strategy 1",
    "C": "Distractor using strategy 2",
    "D": "Distractor using strategy 3"
  },
  "correctAnswer": "A",
  "explanation": "Why A is correct: explains how it captures the main idea",
  "distractorExplanations": {
    "B": "Why wrong + strategy used",
    "C": "Why wrong + strategy used",
    "D": "Why wrong + strategy used"
  }
}`,

  inferences: `You are generating an SAT Inferences question.

This question type asks students to draw conclusions not explicitly stated in the text.

PASSAGE:
{passage}

KEY INFERENCES FROM PASSAGE:
{keyInferences}

QUESTION REQUIREMENTS:
1. Question stem should ask what can be inferred or concluded
2. Use stems like:
   - "Based on the text, it can be inferred that..."
   - "The text most strongly suggests that..."
   - "Which choice is most strongly supported by the text?"

CORRECT ANSWER REQUIREMENTS:
- Must be SUPPORTED by the text but NOT explicitly stated
- Should require connecting ideas from the passage
- Must be a reasonable inference, not a leap

DISTRACTOR STRATEGIES TO USE:
{distractorInstructions}

OUTPUT FORMAT (JSON only):
{
  "questionStem": "Based on the text, it can be inferred that...",
  "choices": {
    "A": "Correct: supported inference",
    "B": "Distractor using strategy 1",
    "C": "Distractor using strategy 2",
    "D": "Distractor using strategy 3"
  },
  "correctAnswer": "A",
  "explanation": "Why A is correct: shows text support for inference",
  "distractorExplanations": {
    "B": "Why wrong + strategy used",
    "C": "Why wrong + strategy used",
    "D": "Why wrong + strategy used"
  }
}`,

  vocabulary_in_context: `You are generating an SAT Vocabulary in Context question.

This question type tests understanding of how a word is used in a specific context.

PASSAGE:
{passage}

TESTABLE VOCABULARY:
{testableVocabulary}

QUESTION REQUIREMENTS:
1. Select a word that has multiple possible meanings
2. Question stem: "As used in the text, '[word]' most nearly means..."
3. The word should be used in a way that might not be its most common meaning

CORRECT ANSWER REQUIREMENTS:
- Must reflect the CONTEXTUAL meaning (not dictionary definition)
- Should be a synonym that works in the sentence
- Test ability to use context clues

DISTRACTOR STRATEGIES TO USE:
{distractorInstructions}

Distractors should:
- Include OTHER valid meanings of the word (that don't fit context)
- Include words that seem related but change the meaning
- All be legitimate words/phrases

OUTPUT FORMAT (JSON only):
{
  "targetWord": "The word being tested",
  "targetSentence": "The sentence from the passage containing this word",
  "questionStem": "As used in the text, '[word]' most nearly means",
  "choices": {
    "A": "Correct: contextual meaning",
    "B": "Wrong: different valid meaning",
    "C": "Wrong: related but incorrect",
    "D": "Wrong: another meaning that doesn't fit"
  },
  "correctAnswer": "A",
  "explanation": "Why A is correct: context clues that support this meaning",
  "distractorExplanations": {
    "B": "Why wrong: this meaning doesn't fit because...",
    "C": "Why wrong: changes the intended meaning...",
    "D": "Why wrong: not supported by context..."
  }
}`,

  text_structure: `You are generating an SAT Text Structure question.

This question type asks about the function or purpose of a specific part of the text.

PASSAGE:
{passage}

PARAGRAPH PURPOSES:
{paragraphPurposes}

QUESTION REQUIREMENTS:
1. Ask about the function of a paragraph, sentence, or section
2. Use stems like:
   - "Which choice best describes the function of the [second paragraph]?"
   - "The author includes [specific detail] primarily to..."
   - "In the context of the passage, [sentence] serves to..."

CORRECT ANSWER REQUIREMENTS:
- Must accurately describe the FUNCTION (not just content)
- Should explain HOW that part relates to the whole
- Common functions: introduce, illustrate, contrast, qualify, conclude

DISTRACTOR STRATEGIES TO USE:
{distractorInstructions}

OUTPUT FORMAT (JSON only):
{
  "targetElement": "The paragraph/sentence being asked about",
  "questionStem": "Which choice best describes the function of...",
  "choices": {
    "A": "Correct: accurate function description",
    "B": "Distractor using strategy 1",
    "C": "Distractor using strategy 2",
    "D": "Distractor using strategy 3"
  },
  "correctAnswer": "A",
  "explanation": "Why A is correct: how this element functions in the passage",
  "distractorExplanations": {
    "B": "Why wrong + strategy used",
    "C": "Why wrong + strategy used",
    "D": "Why wrong + strategy used"
  }
}`,

  command_of_evidence: `You are generating an SAT Command of Evidence question.

This question type asks students to identify which quotation best supports a claim.

PASSAGE:
{passage}

QUESTION REQUIREMENTS:
1. First establish a claim or interpretation about the passage
2. Then ask which quotation BEST supports that claim
3. Use stems like:
   - "Which quotation from the text most effectively illustrates the claim?"
   - "Which choice best supports the idea that [interpretation]?"

STRUCTURE:
- State a claim/interpretation derived from the passage
- Ask for the best supporting quotation
- All choices should be ACTUAL quotes from the passage

CORRECT ANSWER REQUIREMENTS:
- Must be a real quote from the passage
- Must DIRECTLY and CLEARLY support the stated claim
- Should be the MOST effective choice, not just somewhat relevant

DISTRACTOR STRATEGIES TO USE:
{distractorInstructions}

Distractors should:
- Be real quotes from the passage
- Be related to the topic but NOT directly support the claim
- Seem relevant at first glance

OUTPUT FORMAT (JSON only):
{
  "claim": "The claim/interpretation that needs support",
  "questionStem": "Which quotation from the text most effectively [supports/illustrates] the claim that [claim]?",
  "choices": {
    "A": "Correct quote that directly supports the claim",
    "B": "Quote from passage (related but doesn't support)",
    "C": "Quote from passage (wrong scope/paragraph)",
    "D": "Quote from passage (misses the point)"
  },
  "correctAnswer": "A",
  "explanation": "Why A is correct: directly supports because...",
  "distractorExplanations": {
    "B": "Why wrong: related but doesn't support because...",
    "C": "Why wrong: from wrong section...",
    "D": "Why wrong: misses the key aspect..."
  }
}`,

  rhetorical_synthesis: `You are generating an SAT Rhetorical Synthesis question.

This question type asks students to complete a text by adding appropriate evidence or analysis.

PASSAGE:
{passage}

PASSAGE ANALYSIS:
- Main Idea: {mainIdea}
- Author's Purpose: {authorPurpose}

QUESTION REQUIREMENTS:
1. Present the passage with a blank or incomplete thought
2. Ask which choice best completes the text
3. Use stem: "Which choice most effectively completes the text?"

STRUCTURE:
- The passage should end with an incomplete idea
- The correct answer should logically complete the argument/idea
- All choices should be grammatically correct completions

CORRECT ANSWER REQUIREMENTS:
- Must logically and smoothly complete the text
- Must align with the passage's main idea and tone
- Should feel like a natural conclusion

DISTRACTOR STRATEGIES TO USE:
{distractorInstructions}

OUTPUT FORMAT (JSON only):
{
  "passageWithBlank": "Passage text ending with incomplete thought requiring completion...",
  "questionStem": "Which choice most effectively completes the text?",
  "choices": {
    "A": "Correct: natural, logical completion",
    "B": "Distractor using strategy 1",
    "C": "Distractor using strategy 2",
    "D": "Distractor using strategy 3"
  },
  "correctAnswer": "A",
  "explanation": "Why A is correct: completes the argument by...",
  "distractorExplanations": {
    "B": "Why wrong + strategy used",
    "C": "Why wrong + strategy used",
    "D": "Why wrong + strategy used"
  }
}`,
};

// ─────────────────────────────────────────────────────────
// PROMPT BUILDERS
// ─────────────────────────────────────────────────────────

/**
 * Build the passage generation prompt with sampled parameters.
 */
export function buildPassageGenerationPrompt(params: SampledReadingParams): string {
  const typeCharacteristics = PASSAGE_TYPE_CHARACTERISTICS[params.passageType];
  const lengthRange = READING_QUESTION_PARAMS.passageLengthWords[params.passageLength];

  return PASSAGE_GENERATION_PROMPT
    .replace("{passageType}", params.passageType)
    .replace("{passageTypeDescription}", typeCharacteristics.description)
    .replace("{voiceStyle}", typeCharacteristics.voiceOptions[Math.floor(Math.random() * typeCharacteristics.voiceOptions.length)])
    .replace("{topicArea}", typeCharacteristics.topicExamples[Math.floor(Math.random() * typeCharacteristics.topicExamples.length)])
    .replace("{complexity}", params.passageComplexity.toFixed(2))
    .replace("{length}", `${lengthRange.min}-${lengthRange.max}`)
    .replace("{lengthCategory}", params.passageLength)
    .replace("{structureHints}", typeCharacteristics.structureHints.slice(0, 2).join(", "));
}

/**
 * Build distractor instructions from strategies.
 */
export function buildDistractorInstructions(
  strategies: [string, string, string]
): string {
  return strategies
    .map(
      (strategy, i) =>
        `- Choice ${["B", "C", "D"][i]} (${strategy}): ${READING_DISTRACTOR_STRATEGIES[strategy as keyof typeof READING_DISTRACTOR_STRATEGIES]}`
    )
    .join("\n");
}

/**
 * Build the question generation prompt for a specific type.
 */
export function buildQuestionGenerationPrompt(
  questionType: ReadingOnlyQuestionType,
  passage: string,
  passageAnalysis: {
    mainIdea: string;
    authorPurpose: string;
    paragraphPurposes: string[];
    keyInferences: string[];
    testableVocabulary: Array<{
      word: string;
      sentenceContext: string;
      contextualMeaning: string;
      alternativeMeanings: string[];
    }>;
  },
  distractorStrategies: [string, string, string]
): string {
  const basePrompt = QUESTION_TYPE_PROMPTS[questionType];
  const distractorInstructions = buildDistractorInstructions(distractorStrategies);

  return basePrompt
    .replace("{passage}", passage)
    .replace("{mainIdea}", passageAnalysis.mainIdea)
    .replace("{authorPurpose}", passageAnalysis.authorPurpose)
    .replace("{paragraphPurposes}", passageAnalysis.paragraphPurposes.map((p, i) => `Paragraph ${i + 1}: ${p}`).join("\n"))
    .replace("{keyInferences}", passageAnalysis.keyInferences.map((inf, i) => `${i + 1}. ${inf}`).join("\n"))
    .replace("{testableVocabulary}", JSON.stringify(passageAnalysis.testableVocabulary, null, 2))
    .replace("{distractorInstructions}", distractorInstructions);
}

// ─────────────────────────────────────────────────────────
// FEW-SHOT EXAMPLE PROMPT
// ─────────────────────────────────────────────────────────

/**
 * Prompt for when we have official examples to guide generation.
 */
export const FEW_SHOT_PROMPT_TEMPLATE = `You are generating an SAT Reading question. Study these official examples first, then generate a new question following the same patterns.

OFFICIAL EXAMPLES (from College Board):
{officialExamples}

Based on these examples, generate a NEW {questionType} question for this passage:

{passageAndInstructions}`;

/**
 * Build a few-shot prompt with official examples.
 */
export function buildFewShotPrompt(
  officialExamples: Array<{
    passage: string;
    questionStem: string;
    choices: { A: string; B: string; C: string; D: string };
    correctAnswer: string;
  }>,
  questionType: ReadingOnlyQuestionType,
  passageAndInstructions: string
): string {
  const examplesText = officialExamples
    .map(
      (ex, i) => `
Example ${i + 1}:
Passage: ${ex.passage.substring(0, 200)}...
Question: ${ex.questionStem}
A) ${ex.choices.A}
B) ${ex.choices.B}
C) ${ex.choices.C}
D) ${ex.choices.D}
Correct: ${ex.correctAnswer}
`
    )
    .join("\n---\n");

  return FEW_SHOT_PROMPT_TEMPLATE
    .replace("{officialExamples}", examplesText)
    .replace("{questionType}", questionType)
    .replace("{passageAndInstructions}", passageAndInstructions);
}
