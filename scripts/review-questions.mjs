#!/usr/bin/env node
/**
 * Batch Review Questions Script
 *
 * High-performance local script for reviewing SAT questions using Claude.
 * Runs outside of Convex to avoid timeout limits and enable parallel processing.
 *
 * Usage:
 *   npm run review              # Review up to 25 pending questions
 *   npm run review 50           # Review up to 50 pending questions
 *   npm run review:all          # Review ALL pending questions in batches
 *
 * Features:
 *   - Parallel Claude calls (5 concurrent by default)
 *   - Multimodal image verification for questions with figures
 *   - Bulk database updates (single mutation per batch)
 *   - Rate limit handling with automatic backoff
 *   - Progress tracking in terminal
 */

import Anthropic from "@anthropic-ai/sdk";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";

// ─────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────

const BATCH_SIZE = parseInt(process.argv[2], 10) || 25;
const CONCURRENT_REVIEWS = 5;
const REVIEW_VERSION = "v1-batch";
const RETRY_DELAY_MS = 60000; // 1 minute on rate limit

// ─────────────────────────────────────────────────────────
// CLIENT SETUP
// ─────────────────────────────────────────────────────────

const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("Error: CONVEX_URL or NEXT_PUBLIC_CONVEX_URL environment variable is required");
  console.error("Set it in your .env.local file or export it");
  process.exit(1);
}

const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY;
if (!ANTHROPIC_API_KEY) {
  console.error("Error: ANTHROPIC_API_KEY environment variable is required");
  process.exit(1);
}

const convex = new ConvexHttpClient(CONVEX_URL);
const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function detectMimeType(buffer) {
  const bytes = new Uint8Array(buffer);
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[2] === 0x46 && bytes[3] === 0x46 &&
      bytes[8] === 0x57 && bytes[9] === 0x45 && bytes[10] === 0x42 && bytes[11] === 0x50) {
    return "image/webp";
  }
  return "image/png"; // default
}

async function fetchImageAsBase64(storageId) {
  try {
    const url = await convex.query(api.questionReviewBatch.getImageUrl, { storageId });
    if (!url) return null;

    const response = await fetch(url);
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");
    const mimeType = detectMimeType(buffer);

    return { base64, mimeType };
  } catch (error) {
    console.error(`  Error fetching image: ${error.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// REVIEW PROMPT
// ─────────────────────────────────────────────────────────

function buildReviewPrompt(data) {
  const { question, options, passage } = data;
  const sortedOptions = options;

  let passageSection = "";
  if (passage) {
    passageSection = `
PASSAGE:
Title: ${passage.title || "Untitled"}
Author: ${passage.author || "Unknown"}

${passage.content}

---
`;
  }

  const figureWarning = question.figure
    ? `
NOTE: This question includes a figure/graph (${question.figure.figureType || "unknown"} type).
The image has been provided above for visual inspection.
`
    : "";

  const currentExplanation = data.explanation?.correctExplanation || "No explanation provided";

  return `You are a meticulous SAT question reviewer. Your job is to verify that a generated SAT question is accurate and educationally sound.

${passageSection}
QUESTION:
Category: ${question.category}
Domain: ${question.domain}
Skill: ${question.skill}

Question Stem: ${question.prompt}

Answer Choices:
A) ${sortedOptions.find((o) => o.key === "A")?.content || "N/A"}
B) ${sortedOptions.find((o) => o.key === "B")?.content || "N/A"}
C) ${sortedOptions.find((o) => o.key === "C")?.content || "N/A"}
D) ${sortedOptions.find((o) => o.key === "D")?.content || "N/A"}

Marked Correct Answer: ${question.correctAnswer}

Current Explanation: ${currentExplanation}

${figureWarning}

VERIFICATION TASKS:

1. ANSWER VALIDATION (Critical)
   - Is the marked correct answer (${question.correctAnswer}) actually correct?
   - Work through the problem step-by-step to verify
   - If the answer is WRONG, identify which answer is actually correct

2. DISTRACTOR QUALITY
   - Is each wrong answer plausibly wrong (not obviously wrong)?
   - Does each distractor test a specific misconception or error pattern?
   - Are there any answer choices that could arguably also be correct? (Ambiguity = bad)

3. QUESTION CLARITY
   - Is the question stem clear and unambiguous?
   - Does it test the intended skill (${question.skill})?
${question.figure ? `
4. IMAGE VERIFICATION (Critical for questions with figures)
   - LABELS: Are all point/vertex labels (A, B, C, etc.) unique and correctly placed?
   - NO DUPLICATES: Check that no label appears twice on the diagram
   - GRAPH ACCURACY: Does the graph/diagram match the equation or values described in the question?
   - TEXT ALIGNMENT: Does the image accurately represent what the question stem describes?
   - VISUAL CLARITY: Is the image clear, complete, and properly rendered?
   - DATA ACCURACY: For charts/tables, do the visual values match the described values?

   IMAGE-SPECIFIC ISSUES to report (if found):
   - "image_label_error": Duplicate labels, missing labels, or misplaced labels
   - "image_text_mismatch": Image doesn't match what the question describes
   - "image_quality_issue": Blurry, incomplete, or malformed image
   - "image_data_mismatch": Graph/chart data doesn't match described values
` : ""}
IMPORTANT: Respond with ONLY a JSON object, no other text.

{
  "answerIsCorrect": true or false,
  "actualCorrectAnswer": "A", "B", "C", or "D" (only include if different from marked),
  "verificationReasoning": "Step-by-step explanation of how you verified the answer",
  "confidenceScore": 0.0 to 1.0,
  "correctExplanation": "Detailed explanation of why the correct answer is right",
  "wrongAnswerExplanations": {
    "A": "Why A is wrong (or skip if A is correct)",
    "B": "Why B is wrong (or skip if B is correct)",
    "C": "Why C is wrong (or skip if C is correct)",
    "D": "Why D is wrong (or skip if D is correct)"
  },
  "commonMistakes": [
    {
      "reason": "short_identifier (e.g., misread_question, calculation_error, partial_answer)",
      "description": "Did you choose [X] because you [specific mistake]?",
      "relatedSkill": "skill_name"
    }
  ],
  "issues": [
    {"type": "answer_wrong|ambiguous|unclear|too_easy|too_hard|image_label_error|image_text_mismatch|image_quality_issue|image_data_mismatch", "description": "..."}
  ],
  "recommendedAction": "verify" or "needs_revision" or "reject",
  "reviewNotes": "Any additional notes for human review"
}`;
}

// ─────────────────────────────────────────────────────────
// SINGLE QUESTION REVIEW
// ─────────────────────────────────────────────────────────

async function reviewQuestion(data, imageData) {
  const prompt = buildReviewPrompt(data);

  let messageContent;
  if (imageData) {
    messageContent = [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: imageData.mimeType,
          data: imageData.base64,
        },
      },
      {
        type: "text",
        text: prompt,
      },
    ];
  } else {
    messageContent = prompt;
  }

  const response = await anthropic.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 2000,
    messages: [{ role: "user", content: messageContent }],
  });

  const textBlock = response.content.find((b) => b.type === "text");
  if (!textBlock) {
    throw new Error("Claude returned no text response");
  }

  const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error("Claude response did not contain valid JSON");
  }

  const reviewResult = JSON.parse(jsonMatch[0]);

  // Determine review status
  let reviewStatus;
  if (reviewResult.recommendedAction === "verify" && reviewResult.answerIsCorrect) {
    reviewStatus = "verified";
  } else if (reviewResult.recommendedAction === "reject") {
    reviewStatus = "rejected";
  } else {
    reviewStatus = "needs_revision";
  }

  // Check if answer was corrected
  const newCorrectAnswer =
    !reviewResult.answerIsCorrect && reviewResult.actualCorrectAnswer
      ? reviewResult.actualCorrectAnswer
      : undefined;

  // If we corrected the answer and have high confidence, mark as verified
  if (newCorrectAnswer && reviewResult.confidenceScore >= 0.8) {
    reviewStatus = "verified";
  }

  return {
    questionId: data.question._id,
    reviewStatus,
    newCorrectAnswer,
    reviewMetadata: {
      reviewVersion: REVIEW_VERSION,
      answerValidated: reviewResult.answerIsCorrect || !!newCorrectAnswer,
      originalCorrectAnswer: newCorrectAnswer ? data.question.correctAnswer : undefined,
      confidenceScore: reviewResult.confidenceScore,
      reviewNotes: reviewResult.reviewNotes,
    },
    explanation: {
      correctExplanation: reviewResult.correctExplanation,
      wrongAnswerExplanations: reviewResult.wrongAnswerExplanations || {},
      commonMistakes: reviewResult.commonMistakes,
    },
  };
}

// ─────────────────────────────────────────────────────────
// BATCH REVIEW WITH RATE LIMIT HANDLING
// ─────────────────────────────────────────────────────────

async function reviewWithRetry(data, imageData, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      return await reviewQuestion(data, imageData);
    } catch (error) {
      const isRateLimit = error.status === 429 ||
        error.message?.includes("rate") ||
        error.message?.includes("429");

      if (isRateLimit && attempt < retries) {
        console.log(`  Rate limited, waiting ${RETRY_DELAY_MS / 1000}s...`);
        await sleep(RETRY_DELAY_MS);
        continue;
      }

      throw error;
    }
  }
}

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║            SAT Question Batch Review System                ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("");

  // 1. Fetch pending questions
  console.log(`Fetching up to ${BATCH_SIZE} pending questions...`);
  const pending = await convex.query(api.questionReviewBatch.getPendingQuestionsForBatch, {
    limit: BATCH_SIZE,
  });

  if (pending.length === 0) {
    console.log("No pending questions to review.");
    return;
  }

  console.log(`Found ${pending.length} questions to review`);
  console.log("");

  // 2. Pre-fetch images for questions with figures
  console.log("Pre-fetching images for questions with figures...");
  const imageMap = new Map();
  const questionsWithImages = pending.filter((p) => p.image?.storageId);

  if (questionsWithImages.length > 0) {
    console.log(`  Fetching ${questionsWithImages.length} images...`);
    const imagePromises = questionsWithImages.map(async (p) => {
      const imageData = await fetchImageAsBase64(p.image.storageId);
      if (imageData) {
        imageMap.set(p.question._id, imageData);
      }
    });
    await Promise.all(imagePromises);
    console.log(`  Successfully fetched ${imageMap.size} images`);
  } else {
    console.log("  No images to fetch");
  }
  console.log("");

  // 3. Review in parallel batches
  console.log(`Reviewing ${pending.length} questions (${CONCURRENT_REVIEWS} concurrent)...`);
  console.log("");

  const results = [];
  const errors = [];

  for (let i = 0; i < pending.length; i += CONCURRENT_REVIEWS) {
    const batch = pending.slice(i, i + CONCURRENT_REVIEWS);
    const batchNum = Math.floor(i / CONCURRENT_REVIEWS) + 1;
    const totalBatches = Math.ceil(pending.length / CONCURRENT_REVIEWS);

    console.log(`Batch ${batchNum}/${totalBatches}:`);

    const batchResults = await Promise.allSettled(
      batch.map(async (data) => {
        const imageData = imageMap.get(data.question._id);
        return await reviewWithRetry(data, imageData);
      })
    );

    for (let j = 0; j < batchResults.length; j++) {
      const result = batchResults[j];
      const questionId = batch[j].question._id;

      if (result.status === "fulfilled") {
        results.push(result.value);
        const status = result.value.reviewStatus;
        const symbol = status === "verified" ? "✓" : status === "needs_revision" ? "!" : "✗";
        console.log(`  ${symbol} ${questionId} → ${status}`);
      } else {
        errors.push({ questionId, error: result.reason.message });
        console.log(`  ✗ ${questionId} → ERROR: ${result.reason.message}`);
      }
    }

    // Brief pause between batches to avoid rate limits
    if (i + CONCURRENT_REVIEWS < pending.length) {
      await sleep(1000);
    }
  }

  console.log("");

  // 4. Bulk update database
  if (results.length > 0) {
    console.log(`Updating database with ${results.length} results...`);
    try {
      const updateResult = await convex.mutation(api.questionReviewBatch.bulkUpdateReviewResults, {
        results,
      });
      console.log(`  Updated: ${updateResult.updated} questions`);
      console.log(`  Explanations created: ${updateResult.explanationsCreated}`);
      console.log(`  Explanations updated: ${updateResult.explanationsUpdated}`);
    } catch (error) {
      console.error(`  Database update failed: ${error.message}`);
    }
  }

  console.log("");

  // 5. Summary
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("                          SUMMARY                              ");
  console.log("═══════════════════════════════════════════════════════════════");

  const verified = results.filter((r) => r.reviewStatus === "verified").length;
  const needsRevision = results.filter((r) => r.reviewStatus === "needs_revision").length;
  const rejected = results.filter((r) => r.reviewStatus === "rejected").length;
  const answersCorrected = results.filter((r) => r.newCorrectAnswer).length;

  console.log(`  Total reviewed:    ${results.length}`);
  console.log(`  Verified:          ${verified}`);
  console.log(`  Needs revision:    ${needsRevision}`);
  console.log(`  Rejected:          ${rejected}`);
  console.log(`  Answers corrected: ${answersCorrected}`);
  console.log(`  Errors:            ${errors.length}`);
  console.log("");

  if (errors.length > 0) {
    console.log("Errors:");
    errors.forEach((e) => console.log(`  - ${e.questionId}: ${e.error}`));
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
