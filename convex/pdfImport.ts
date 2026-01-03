"use node";

import { internalAction, action } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import * as fs from "fs";
import * as path from "path";

// ─────────────────────────────────────────────────────────
// PDF IMPORT PIPELINE
// ─────────────────────────────────────────────────────────
// Extracts SAT questions from College Board PDFs using Claude.
// Supports both reading/writing and math sections.

/**
 * Get Anthropic client from environment.
 */
function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required");
  }
  return new Anthropic({ apiKey });
}

// ─────────────────────────────────────────────────────────
// EXTRACTION PROMPTS
// ─────────────────────────────────────────────────────────

const READING_EXTRACTION_PROMPT = `You are extracting SAT Reading and Writing questions from a College Board practice test PDF.

For each question you find, extract the following information in JSON format:

{
  "questions": [
    {
      "sectionNumber": 1,
      "questionNumber": 1,
      "passage": {
        "content": "The full passage text...",
        "title": "Optional title if present",
        "author": "Author name if given",
        "source": "Publication source if given",
        "passageType": "literary_narrative" | "social_science" | "natural_science" | "humanities" | "paired"
      },
      "questionStem": "The question text...",
      "choices": {
        "A": "First choice",
        "B": "Second choice",
        "C": "Third choice",
        "D": "Fourth choice"
      },
      "correctAnswer": "A" | "B" | "C" | "D",
      "questionType": "central_ideas" | "inferences" | "vocabulary_in_context" | "text_structure" | "command_of_evidence" | "rhetorical_synthesis" | "standard_english_conventions" | "expression_of_ideas",
      "domain": "information_and_ideas" | "craft_and_structure" | "expression_of_ideas" | "standard_english_conventions",
      "skill": "More specific skill name"
    }
  ]
}

QUESTION TYPE IDENTIFICATION:
- "central_ideas": Questions asking about main idea, purpose, or central claim
- "inferences": Questions asking what can be inferred or concluded
- "vocabulary_in_context": Questions asking about word meaning in context ("As used in...")
- "text_structure": Questions about paragraph or sentence function
- "command_of_evidence": Questions asking which quote/evidence supports a claim
- "rhetorical_synthesis": Questions about completing sentences with evidence
- "standard_english_conventions": Grammar, punctuation, sentence structure
- "expression_of_ideas": Transitions, organization, style

PASSAGE TYPE IDENTIFICATION:
- "literary_narrative": Fiction, memoir, personal narrative
- "social_science": Psychology, sociology, economics, political science
- "natural_science": Biology, chemistry, physics, earth science
- "humanities": History, philosophy, art, culture
- "paired": Two related passages compared

IMPORTANT RULES:
1. Extract EVERY question you can find
2. Include the COMPLETE passage text for each question
3. If multiple questions share the same passage, include the passage with each question
4. Preserve exact wording of questions and choices
5. If correct answer is not shown, set correctAnswer to "UNKNOWN"
6. Be thorough - don't skip questions

Return ONLY valid JSON, no other text.`;

const MATH_EXTRACTION_PROMPT = `You are extracting SAT Math questions from a College Board practice test PDF.

For each question you find, extract the following information in JSON format:

{
  "questions": [
    {
      "sectionNumber": 3,
      "questionNumber": 1,
      "questionStem": "The question text including any given information...",
      "hasImage": true | false,
      "imageDescription": "Description of any graph, figure, or diagram if present",
      "choices": {
        "A": "First choice",
        "B": "Second choice",
        "C": "Third choice",
        "D": "Fourth choice"
      } | null,
      "isGridIn": true | false,
      "correctAnswer": "A" | "B" | "C" | "D" | "numerical value",
      "questionType": "algebra" | "advanced_math" | "problem_solving" | "geometry_trigonometry",
      "domain": "algebra" | "advanced_math" | "problem_solving_and_data_analysis" | "geometry_and_trigonometry",
      "skill": "Specific skill like 'linear_equations', 'quadratic_functions', etc."
    }
  ]
}

QUESTION TYPE / DOMAIN MAPPING:
- "algebra": Linear equations, systems, inequalities, functions
- "advanced_math": Polynomials, quadratics, exponentials, radicals
- "problem_solving_and_data_analysis": Statistics, probability, ratios, percentages
- "geometry_and_trigonometry": Triangles, circles, coordinate geometry, trig

IMPORTANT RULES:
1. Extract EVERY question you can find
2. For grid-in questions, set isGridIn to true and choices to null
3. Include complete problem setup including any given information
4. Describe images/graphs in imageDescription
5. If correct answer is not shown, set correctAnswer to "UNKNOWN"
6. Be thorough - don't skip questions

Return ONLY valid JSON, no other text.`;

const ANSWER_KEY_EXTRACTION_PROMPT = `You are extracting answer keys from a College Board SAT practice test answer key PDF.

Extract all correct answers and match them to their question numbers. Return JSON format:

{
  "answers": [
    {
      "sectionNumber": 1,
      "questionNumber": 1,
      "correctAnswer": "A" | "B" | "C" | "D" | "numerical value",
      "officialExplanation": "Explanation text if available"
    }
  ]
}

IMPORTANT:
1. Extract answers for ALL sections
2. Include the explanation if the PDF provides one
3. For grid-in (student-produced response) questions, include the numerical answer
4. Be thorough - don't miss any answers

Return ONLY valid JSON, no other text.`;

// ─────────────────────────────────────────────────────────
// EXTRACTION FUNCTIONS
// ─────────────────────────────────────────────────────────

interface ExtractedQuestion {
  sectionNumber: number;
  questionNumber: number;
  passage?: {
    content: string;
    title?: string;
    author?: string;
    source?: string;
    passageType?: string;
  };
  questionStem: string;
  choices: { A: string; B: string; C: string; D: string } | null;
  correctAnswer: string;
  questionType: string;
  domain: string;
  skill: string;
  hasImage?: boolean;
  imageDescription?: string;
  isGridIn?: boolean;
}

interface ExtractedAnswer {
  sectionNumber: number;
  questionNumber: number;
  correctAnswer: string;
  officialExplanation?: string;
}

/**
 * Extract questions from PDF using Claude's vision.
 */
async function extractQuestionsFromPdf(
  anthropic: Anthropic,
  pdfBase64: string,
  category: "reading_writing" | "math"
): Promise<ExtractedQuestion[]> {
  const prompt =
    category === "reading_writing"
      ? READING_EXTRACTION_PROMPT
      : MATH_EXTRACTION_PROMPT;

  console.log(`Extracting ${category} questions from PDF...`);

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 8000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          {
            type: "text",
            text: prompt,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text response");
  }

  // Parse JSON
  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Claude response did not contain valid JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.questions || [];
}

/**
 * Extract answers from answer key PDF.
 */
async function extractAnswersFromPdf(
  anthropic: Anthropic,
  pdfBase64: string
): Promise<ExtractedAnswer[]> {
  console.log("Extracting answers from answer key PDF...");

  const response = await anthropic.messages.create({
    model: "claude-sonnet-4-20250514",
    max_tokens: 4000,
    messages: [
      {
        role: "user",
        content: [
          {
            type: "document",
            source: {
              type: "base64",
              media_type: "application/pdf",
              data: pdfBase64,
            },
          },
          {
            type: "text",
            text: ANSWER_KEY_EXTRACTION_PROMPT,
          },
        ],
      },
    ],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock || textBlock.type !== "text") {
    throw new Error("Claude returned no text response");
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Claude response did not contain valid JSON");
  }

  const parsed = JSON.parse(jsonMatch[0]);
  return parsed.answers || [];
}

/**
 * Merge questions with their answers.
 */
function mergeQuestionsWithAnswers(
  questions: ExtractedQuestion[],
  answers: ExtractedAnswer[]
): ExtractedQuestion[] {
  const answerMap = new Map<string, ExtractedAnswer>();

  for (const answer of answers) {
    const key = `${answer.sectionNumber}-${answer.questionNumber}`;
    answerMap.set(key, answer);
  }

  return questions.map((q) => {
    const key = `${q.sectionNumber}-${q.questionNumber}`;
    const answer = answerMap.get(key);

    if (answer && q.correctAnswer === "UNKNOWN") {
      return {
        ...q,
        correctAnswer: answer.correctAnswer,
      };
    }

    return q;
  });
}

// ─────────────────────────────────────────────────────────
// MAIN IMPORT ACTION
// ─────────────────────────────────────────────────────────

/**
 * Import questions from a PDF file path.
 * For local development/testing.
 */
export const importFromLocalPdf = internalAction({
  args: {
    pdfPath: v.string(),
    answerKeyPath: v.optional(v.string()),
    pdfName: v.string(),
    testNumber: v.optional(v.number()),
    year: v.optional(v.number()),
    category: v.union(v.literal("reading_writing"), v.literal("math")),
  },
  handler: async (ctx, args) => {
    console.log(`\nImporting from PDF: ${args.pdfPath}`);
    console.log(`  Category: ${args.category}`);

    const anthropic = getAnthropicClient();
    const batchId = `import-${Date.now()}`;

    // Read PDF file
    const pdfBuffer = fs.readFileSync(args.pdfPath);
    const pdfBase64 = pdfBuffer.toString("base64");

    // Extract questions
    let questions = await extractQuestionsFromPdf(
      anthropic,
      pdfBase64,
      args.category
    );

    console.log(`  Extracted ${questions.length} questions`);

    // If answer key provided, merge answers
    if (args.answerKeyPath) {
      console.log(`  Processing answer key: ${args.answerKeyPath}`);
      const answerPdfBuffer = fs.readFileSync(args.answerKeyPath);
      const answerPdfBase64 = answerPdfBuffer.toString("base64");

      const answers = await extractAnswersFromPdf(anthropic, answerPdfBase64);
      console.log(`  Extracted ${answers.length} answers`);

      questions = mergeQuestionsWithAnswers(questions, answers);
    }

    // Import to database
    let imported = 0;
    let skipped = 0;

    for (const q of questions) {
      const result = await ctx.runMutation(
        internal.officialQuestions.importOfficialQuestion,
        {
          source: {
            pdfName: args.pdfName,
            testNumber: args.testNumber,
            sectionNumber: q.sectionNumber,
            questionNumber: q.questionNumber,
            year: args.year,
          },
          category: args.category,
          questionType: q.questionType,
          domain: q.domain,
          skill: q.skill,
          passage: q.passage
            ? {
                content: q.passage.content,
                title: q.passage.title,
                author: q.passage.author,
                source: q.passage.source,
                passageType: q.passage.passageType as
                  | "literary_narrative"
                  | "social_science"
                  | "natural_science"
                  | "humanities"
                  | "paired"
                  | undefined,
              }
            : undefined,
          questionStem: q.questionStem,
          choices: q.choices ?? { A: "", B: "", C: "", D: "" },
          correctAnswer: q.correctAnswer,
          importBatchId: batchId,
        }
      );

      if (result.skipped) {
        skipped++;
      } else {
        imported++;
      }
    }

    console.log(`\n  Import complete:`);
    console.log(`    Imported: ${imported}`);
    console.log(`    Skipped (duplicates): ${skipped}`);
    console.log(`    Batch ID: ${batchId}`);

    return {
      batchId,
      totalExtracted: questions.length,
      imported,
      skipped,
    };
  },
});

/**
 * Import questions from base64-encoded PDF data.
 * For web uploads or API calls.
 */
export const importFromPdfData = internalAction({
  args: {
    pdfBase64: v.string(),
    answerKeyBase64: v.optional(v.string()),
    pdfName: v.string(),
    testNumber: v.optional(v.number()),
    year: v.optional(v.number()),
    category: v.union(v.literal("reading_writing"), v.literal("math")),
  },
  handler: async (ctx, args) => {
    console.log(`\nImporting from PDF data: ${args.pdfName}`);
    console.log(`  Category: ${args.category}`);

    const anthropic = getAnthropicClient();
    const batchId = `import-${Date.now()}`;

    // Extract questions
    let questions = await extractQuestionsFromPdf(
      anthropic,
      args.pdfBase64,
      args.category
    );

    console.log(`  Extracted ${questions.length} questions`);

    // If answer key provided, merge answers
    if (args.answerKeyBase64) {
      console.log(`  Processing answer key...`);
      const answers = await extractAnswersFromPdf(
        anthropic,
        args.answerKeyBase64
      );
      console.log(`  Extracted ${answers.length} answers`);

      questions = mergeQuestionsWithAnswers(questions, answers);
    }

    // Import to database
    let imported = 0;
    let skipped = 0;

    for (const q of questions) {
      const result = await ctx.runMutation(
        internal.officialQuestions.importOfficialQuestion,
        {
          source: {
            pdfName: args.pdfName,
            testNumber: args.testNumber,
            sectionNumber: q.sectionNumber,
            questionNumber: q.questionNumber,
            year: args.year,
          },
          category: args.category,
          questionType: q.questionType,
          domain: q.domain,
          skill: q.skill,
          passage: q.passage
            ? {
                content: q.passage.content,
                title: q.passage.title,
                author: q.passage.author,
                source: q.passage.source,
                passageType: q.passage.passageType as
                  | "literary_narrative"
                  | "social_science"
                  | "natural_science"
                  | "humanities"
                  | "paired"
                  | undefined,
              }
            : undefined,
          questionStem: q.questionStem,
          choices: q.choices ?? { A: "", B: "", C: "", D: "" },
          correctAnswer: q.correctAnswer,
          importBatchId: batchId,
        }
      );

      if (result.skipped) {
        skipped++;
      } else {
        imported++;
      }
    }

    console.log(`\n  Import complete:`);
    console.log(`    Imported: ${imported}`);
    console.log(`    Skipped (duplicates): ${skipped}`);

    return {
      batchId,
      totalExtracted: questions.length,
      imported,
      skipped,
    };
  },
});

/**
 * Analyze imported questions to add metadata.
 * Runs Claude analysis on questions to identify distractor strategies etc.
 */
export const analyzeImportedQuestions = internalAction({
  args: {
    importBatchId: v.string(),
  },
  handler: async (ctx, args) => {
    console.log(`\nAnalyzing imported questions from batch: ${args.importBatchId}`);

    const anthropic = getAnthropicClient();

    // Get questions from this batch
    // Note: We'd need to add a query for this, for now just log
    console.log("Analysis feature coming soon...");

    return { analyzed: 0 };
  },
});

// ─────────────────────────────────────────────────────────
// TEST ACTION
// ─────────────────────────────────────────────────────────

/**
 * Test the import with a small PDF.
 */
export const testImport = action({
  args: {
    pdfPath: v.string(),
    category: v.union(v.literal("reading_writing"), v.literal("math")),
  },
  handler: async (ctx, args) => {
    console.log(`\nTest extraction from: ${args.pdfPath}`);

    const anthropic = getAnthropicClient();

    // Read PDF file
    const pdfBuffer = fs.readFileSync(args.pdfPath);
    const pdfBase64 = pdfBuffer.toString("base64");

    // Extract questions (don't save to DB)
    const questions = await extractQuestionsFromPdf(
      anthropic,
      pdfBase64,
      args.category
    );

    console.log(`\nExtracted ${questions.length} questions:`);
    for (const q of questions.slice(0, 3)) {
      console.log(`  Q${q.questionNumber}: ${q.questionStem.slice(0, 50)}...`);
      console.log(`    Type: ${q.questionType}, Answer: ${q.correctAnswer}`);
    }

    if (questions.length > 3) {
      console.log(`  ... and ${questions.length - 3} more`);
    }

    return {
      success: true,
      questionsFound: questions.length,
      preview: questions.slice(0, 3),
    };
  },
});
