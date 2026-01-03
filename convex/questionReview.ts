"use node";

import { internalAction, ActionCtx } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { Doc, Id } from "./_generated/dataModel";

// ─────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────

const REVIEW_VERSION = "v1";
const REVIEW_COOLDOWN_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ─────────────────────────────────────────────────────────
// ANTHROPIC CLIENT
// ─────────────────────────────────────────────────────────

function getAnthropicClient() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error("ANTHROPIC_API_KEY environment variable is required");
  }
  return new Anthropic({ apiKey });
}

// ─────────────────────────────────────────────────────────
// IMAGE FETCH HELPER (for multimodal review)
// ─────────────────────────────────────────────────────────

/**
 * Detect image mime type from magic bytes.
 */
function detectImageMimeType(buffer: Buffer): string {
  // Check magic bytes
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4E && buffer[3] === 0x47) {
    return "image/png";
  }
  if (buffer[0] === 0xFF && buffer[1] === 0xD8 && buffer[2] === 0xFF) {
    return "image/jpeg";
  }
  if (buffer[0] === 0x47 && buffer[1] === 0x49 && buffer[2] === 0x46) {
    return "image/gif";
  }
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 &&
      buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) {
    return "image/webp";
  }
  // Default to PNG if unknown
  return "image/png";
}

/**
 * Fetch an image from Convex storage and return as base64.
 * Returns null if the image cannot be fetched.
 */
async function fetchImageAsBase64(
  ctx: ActionCtx,
  imageId: Id<"images">
): Promise<{ base64: string; mimeType: string } | null> {
  try {
    // Get the image document
    const image = await ctx.runQuery(internal.questionReviewMutations.getImageById, {
      imageId,
    });
    if (!image?.storageId) {
      console.log(`  Image ${imageId} not found or has no storageId`);
      return null;
    }

    // Fetch the blob from storage
    const blob = await ctx.storage.get(image.storageId);
    if (!blob) {
      console.log(`  Could not fetch blob for image ${imageId}`);
      return null;
    }

    // Convert to base64
    const arrayBuffer = await blob.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    const base64 = buffer.toString("base64");

    // Detect actual mime type from magic bytes
    const mimeType = detectImageMimeType(buffer);

    return { base64, mimeType };
  } catch (error) {
    console.log(`  Error fetching image: ${error}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// REVIEW PROMPT TEMPLATES
// ─────────────────────────────────────────────────────────

function buildReviewPrompt(
  question: Doc<"questions">,
  options: Doc<"answerOptions">[],
  passage: Doc<"passages"> | null,
  existingExplanation: Doc<"explanations"> | null
): string {
  const sortedOptions = options.sort((a, b) => a.order - b.order);

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

  // Image verification section - only text warning if no image provided
  // When image IS provided, we use multimodal verification instead
  const figureWarning = question.figure
    ? `
NOTE: This question includes a figure/graph (${question.figure.figureType || "unknown"} type).
The image has been provided above for visual inspection.
`
    : "";

  const currentExplanation = existingExplanation?.correctExplanation || "No explanation provided";

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
${
  question.figure
    ? `
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
`
    : ""
}
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
// REVIEW RESPONSE INTERFACE
// ─────────────────────────────────────────────────────────

interface ReviewResponse {
  answerIsCorrect: boolean;
  actualCorrectAnswer?: string;
  verificationReasoning: string;
  confidenceScore: number;
  correctExplanation: string;
  wrongAnswerExplanations: {
    A?: string;
    B?: string;
    C?: string;
    D?: string;
  };
  commonMistakes: Array<{
    reason: string;
    description: string;
    relatedSkill?: string;
  }>;
  issues: Array<{
    type: string;
    description: string;
  }>;
  recommendedAction: "verify" | "needs_revision" | "reject";
  reviewNotes?: string;
}

// ─────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────

function shouldReviewQuestion(question: Doc<"questions">): boolean {
  // Never reviewed = always review
  if (!question.lastReviewedAt) return true;

  // Already verified and within cooldown = skip
  if (question.reviewStatus === "verified") {
    const timeSinceReview = Date.now() - question.lastReviewedAt;
    if (timeSinceReview < REVIEW_COOLDOWN_MS) return false;
  }

  // Flagged for high error rate = always re-review
  if (question.reviewStatus === "flagged_high_error") return true;

  // Needs revision = waiting for manual fix, don't auto-review
  if (question.reviewStatus === "needs_revision") return false;

  // Rejected = don't review again
  if (question.reviewStatus === "rejected") return false;

  // Pending = review
  if (question.reviewStatus === "pending") return true;

  return false;
}

// ─────────────────────────────────────────────────────────
// CORE REVIEW ACTION
// ─────────────────────────────────────────────────────────

/**
 * Review a single question using Claude.
 * Validates the answer, generates explanations, and updates the database.
 */
export const reviewSingleQuestion = internalAction({
  args: {
    questionId: v.id("questions"),
    reviewType: v.union(
      v.literal("initial_verification"),
      v.literal("high_error_rate_recheck"),
      v.literal("post_improvement_verification")
    ),
    skipAutoImprove: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    console.log(`\nReviewing question ${args.questionId}...`);

    const anthropic = getAnthropicClient();

    // Fetch question data
    const question = await ctx.runQuery(internal.questionReviewMutations.getQuestionForReview, {
      questionId: args.questionId,
    });

    if (!question) {
      console.log(`  Question ${args.questionId} not found`);
      return { success: false, error: "Question not found" };
    }

    // Check if should skip review
    if (!shouldReviewQuestion(question.question)) {
      console.log(`  Skipping review (recently reviewed or in invalid state)`);
      return { success: false, error: "Question should not be reviewed" };
    }

    try {
      // Build review prompt
      const prompt = buildReviewPrompt(
        question.question,
        question.options,
        question.passage,
        question.explanation
      );

      // Check if question has a figure and fetch image for multimodal review
      let imageData: { base64: string; mimeType: string } | null = null;
      if (question.question.figure?.imageId) {
        console.log(`  Fetching image for multimodal review...`);
        imageData = await fetchImageAsBase64(ctx, question.question.figure.imageId);
        if (imageData) {
          console.log(`  Image fetched successfully (${imageData.mimeType})`);
        } else {
          console.log(`  Could not fetch image, proceeding with text-only review`);
        }
      }

      console.log(`  Calling Claude for review...${imageData ? " (with image)" : ""}`);

      // Build message content - multimodal if we have an image
      type MessageContent = Anthropic.MessageCreateParams["messages"][number]["content"];
      let messageContent: MessageContent;

      if (imageData) {
        // Multimodal: image + text
        messageContent = [
          {
            type: "image" as const,
            source: {
              type: "base64" as const,
              media_type: imageData.mimeType as "image/png" | "image/jpeg" | "image/gif" | "image/webp",
              data: imageData.base64,
            },
          },
          {
            type: "text" as const,
            text: prompt,
          },
        ];
      } else {
        // Text-only
        messageContent = prompt;
      }

      // Call Claude for review
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: messageContent }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("Claude returned no text response");
      }

      // Parse JSON response
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Claude response did not contain valid JSON");
      }

      const reviewResult = JSON.parse(jsonMatch[0]) as ReviewResponse;

      console.log(`  Review result:`);
      console.log(`    Answer correct: ${reviewResult.answerIsCorrect}`);
      console.log(`    Confidence: ${reviewResult.confidenceScore}`);
      console.log(`    Action: ${reviewResult.recommendedAction}`);

      // Determine review status
      let reviewStatus: "verified" | "needs_revision" | "rejected";
      if (reviewResult.recommendedAction === "verify" && reviewResult.answerIsCorrect) {
        reviewStatus = "verified";
      } else if (reviewResult.recommendedAction === "reject") {
        reviewStatus = "rejected";
      } else {
        reviewStatus = "needs_revision";
      }

      // If answer was wrong, correct it
      const originalAnswer = question.question.correctAnswer;
      const newCorrectAnswer =
        !reviewResult.answerIsCorrect && reviewResult.actualCorrectAnswer
          ? reviewResult.actualCorrectAnswer
          : undefined;

      if (newCorrectAnswer) {
        console.log(`  Correcting answer: ${originalAnswer} -> ${newCorrectAnswer}`);
        // If we corrected the answer and it's now valid, mark as verified
        if (reviewResult.confidenceScore >= 0.8) {
          reviewStatus = "verified";
        }
      }

      // ─────────────────────────────────────────────────────────
      // AUTO-IMPROVEMENT: If issues are fixable, improve and re-verify
      // ─────────────────────────────────────────────────────────
      if (
        reviewStatus === "needs_revision" &&
        reviewResult.issues &&
        reviewResult.issues.length > 0 &&
        !args.skipAutoImprove &&
        args.reviewType !== "post_improvement_verification"
      ) {
        // Filter to auto-fixable issues
        const autoFixableIssues = reviewResult.issues.filter(isAutoFixable);

        if (autoFixableIssues.length > 0) {
          console.log(`  Found ${autoFixableIssues.length} auto-fixable issues, attempting improvement...`);

          // Attempt auto-improvement
          const improveResult = await improveQuestion(ctx, {
            questionId: args.questionId,
            issues: autoFixableIssues,
          });

          if (improveResult.success) {
            console.log(`  Improvement successful, re-verifying...`);

            // Re-verify the improved question
            const reVerifyResult = await reviewSingleQuestion(ctx, {
              questionId: args.questionId,
              reviewType: "post_improvement_verification",
              skipAutoImprove: true, // Prevent infinite loops
            });

            return {
              ...reVerifyResult,
              autoImproved: true,
              improvementsApplied: improveResult.improvementsApplied,
            };
          } else {
            console.log(`  Improvement failed: ${improveResult.error}`);
            // Continue with original needs_revision status
          }
        }
      }

      // Update question review status
      await ctx.runMutation(internal.questionReviewMutations.updateQuestionReviewStatus, {
        questionId: args.questionId,
        reviewStatus,
        reviewMetadata: {
          reviewVersion: REVIEW_VERSION,
          answerValidated: reviewResult.answerIsCorrect || !!newCorrectAnswer,
          originalCorrectAnswer: newCorrectAnswer ? originalAnswer : undefined,
          confidenceScore: reviewResult.confidenceScore,
          reviewNotes: reviewResult.reviewNotes,
        },
        newCorrectAnswer,
      });

      // Update explanations
      await ctx.runMutation(internal.questionReviewMutations.updateQuestionExplanations, {
        questionId: args.questionId,
        correctExplanation: reviewResult.correctExplanation,
        wrongAnswerExplanations: reviewResult.wrongAnswerExplanations,
        commonMistakes: reviewResult.commonMistakes,
      });

      console.log(`  Review complete: ${reviewStatus}`);

      return {
        success: true,
        reviewStatus,
        answerCorrected: !!newCorrectAnswer,
        confidenceScore: reviewResult.confidenceScore,
        autoImproved: false,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`  Review failed: ${errorMsg}`);

      // Add to DLQ for retry
      await ctx.runMutation(internal.questionReviewMutations.addToReviewDLQ, {
        questionId: args.questionId,
        reviewType: args.reviewType,
        error: errorMsg,
      });

      return { success: false, error: errorMsg };
    }
  },
});

// ─────────────────────────────────────────────────────────
// IMPROVEMENT PROMPT TEMPLATE
// ─────────────────────────────────────────────────────────

function buildImprovementPrompt(
  question: Doc<"questions">,
  options: Doc<"answerOptions">[],
  passage: Doc<"passages"> | null,
  issues: Array<{ type: string; description: string }>
): string {
  const sortedOptions = options.sort((a, b) => a.order - b.order);

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

  const issuesList = issues
    .map((issue, i) => `${i + 1}. ${issue.type}: ${issue.description}`)
    .join("\n");

  return `You are an expert SAT question editor. A question has been flagged with issues that need fixing.

${passageSection}
ORIGINAL QUESTION:
Category: ${question.category}
Domain: ${question.domain}
Skill: ${question.skill}

Question Stem: ${question.prompt}

Answer Choices:
A) ${sortedOptions.find((o) => o.key === "A")?.content || "N/A"}
B) ${sortedOptions.find((o) => o.key === "B")?.content || "N/A"}
C) ${sortedOptions.find((o) => o.key === "C")?.content || "N/A"}
D) ${sortedOptions.find((o) => o.key === "D")?.content || "N/A"}

Current Correct Answer: ${question.correctAnswer}

ISSUES FOUND:
${issuesList}

YOUR TASK:
Fix the issues while maintaining:
- SAT style and difficulty level
- The same skill being tested (${question.skill})
- Valid question structure with exactly one correct answer
- Plausible distractors that test specific misconceptions

For each fix:
- If an answer choice is obviously wrong or irrelevant, rewrite it to be a plausible distractor
- If the question stem is unclear, clarify it while keeping the same intent
- If the correct answer is wrong, identify and set the actual correct answer
- Make minimal changes - only fix what's broken

IMPORTANT: Respond with ONLY a JSON object, no other text.

{
  "improvements": [
    {
      "field": "prompt" | "optionA" | "optionB" | "optionC" | "optionD" | "correctAnswer",
      "newValue": "the improved text (or A/B/C/D for correctAnswer)",
      "reason": "why this change fixes the issue"
    }
  ],
  "newCorrectAnswer": "A" | "B" | "C" | "D",
  "verificationNotes": "Brief explanation confirming the improved question is now valid with exactly one correct answer"
}`;
}

// ─────────────────────────────────────────────────────────
// IMPROVEMENT RESPONSE INTERFACE
// ─────────────────────────────────────────────────────────

interface ImprovementResponse {
  improvements: Array<{
    field: "prompt" | "optionA" | "optionB" | "optionC" | "optionD" | "correctAnswer";
    newValue: string;
    reason: string;
  }>;
  newCorrectAnswer: string;
  verificationNotes: string;
}

// ─────────────────────────────────────────────────────────
// IMPROVEMENT ACTION
// ─────────────────────────────────────────────────────────

/**
 * Improve a question that has fixable issues.
 * Rewrites answer choices, question stem, or corrects the answer.
 */
export const improveQuestion = internalAction({
  args: {
    questionId: v.id("questions"),
    issues: v.array(
      v.object({
        type: v.string(),
        description: v.string(),
      })
    ),
  },
  handler: async (ctx, args) => {
    console.log(`\nImproving question ${args.questionId}...`);
    console.log(`  Issues to fix: ${args.issues.length}`);

    const anthropic = getAnthropicClient();

    // Fetch question data
    const questionData = await ctx.runQuery(
      internal.questionReviewMutations.getQuestionForReview,
      { questionId: args.questionId }
    );

    if (!questionData) {
      console.log(`  Question ${args.questionId} not found`);
      return { success: false, error: "Question not found" };
    }

    try {
      // Build improvement prompt
      const prompt = buildImprovementPrompt(
        questionData.question,
        questionData.options,
        questionData.passage,
        args.issues
      );

      console.log(`  Calling Claude for improvements...`);

      // Call Claude for improvements
      const response = await anthropic.messages.create({
        model: "claude-sonnet-4-20250514",
        max_tokens: 2000,
        messages: [{ role: "user", content: prompt }],
      });

      const textBlock = response.content.find((b) => b.type === "text");
      if (!textBlock || textBlock.type !== "text") {
        throw new Error("Claude returned no text response");
      }

      // Parse JSON response
      const jsonMatch = textBlock.text.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error("Claude response did not contain valid JSON");
      }

      const improvementResult = JSON.parse(jsonMatch[0]) as ImprovementResponse;

      console.log(`  Improvements generated: ${improvementResult.improvements.length}`);

      // Apply each improvement
      for (const improvement of improvementResult.improvements) {
        console.log(`  Applying: ${improvement.field} - ${improvement.reason}`);

        if (improvement.field === "prompt") {
          await ctx.runMutation(
            internal.questionReviewMutations.updateQuestionStem,
            {
              questionId: args.questionId,
              newPrompt: improvement.newValue,
              reason: improvement.reason,
            }
          );
        } else if (improvement.field === "correctAnswer") {
          await ctx.runMutation(
            internal.questionReviewMutations.updateCorrectAnswer,
            {
              questionId: args.questionId,
              newCorrectAnswer: improvement.newValue,
              reason: improvement.reason,
            }
          );
        } else if (improvement.field.startsWith("option")) {
          const optionKey = improvement.field.replace("option", ""); // "A", "B", "C", "D"
          await ctx.runMutation(
            internal.questionReviewMutations.updateAnswerOption,
            {
              questionId: args.questionId,
              optionKey,
              newContent: improvement.newValue,
              reason: improvement.reason,
            }
          );
        }
      }

      // Update correct answer if changed
      if (
        improvementResult.newCorrectAnswer &&
        improvementResult.newCorrectAnswer !== questionData.question.correctAnswer
      ) {
        const alreadyUpdated = improvementResult.improvements.some(
          (i) => i.field === "correctAnswer"
        );
        if (!alreadyUpdated) {
          await ctx.runMutation(
            internal.questionReviewMutations.updateCorrectAnswer,
            {
              questionId: args.questionId,
              newCorrectAnswer: improvementResult.newCorrectAnswer,
              reason: "Corrected during improvement process",
            }
          );
        }
      }

      console.log(`  Improvements applied successfully`);

      return {
        success: true,
        improvementsApplied: improvementResult.improvements.length,
        verificationNotes: improvementResult.verificationNotes,
      };
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : "Unknown error";
      console.error(`  Improvement failed: ${errorMsg}`);
      return { success: false, error: errorMsg };
    }
  },
});

// ─────────────────────────────────────────────────────────
// AUTO-FIXABLE ISSUE TYPES
// ─────────────────────────────────────────────────────────

const AUTO_FIXABLE_ISSUE_TYPES = [
  "answer_wrong",
  "poor_distractor",
  "unclear_choice",
  "unclear_stem",
  "ambiguous",
  "too_easy",
];

function isAutoFixable(issue: { type: string; description: string }): boolean {
  return AUTO_FIXABLE_ISSUE_TYPES.some(
    (fixableType) =>
      issue.type.toLowerCase().includes(fixableType) ||
      fixableType.includes(issue.type.toLowerCase())
  );
}

/**
 * Batch review unverified questions.
 */
export const reviewUnverifiedQuestions = internalAction({
  args: {
    limit: v.optional(v.number()),
    category: v.optional(v.union(v.literal("reading_writing"), v.literal("math"))),
    prioritizeGraphing: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    console.log(`\nStarting batch review of up to ${limit} unverified questions...`);

    // Get unverified questions
    const questions = await ctx.runQuery(
      internal.questionReviewMutations.getUnverifiedQuestions,
      {
        limit,
        category: args.category,
        prioritizeGraphing: args.prioritizeGraphing ?? true,
      }
    );

    console.log(`  Found ${questions.length} questions to review`);

    const results: Array<{
      questionId: string;
      success: boolean;
      reviewStatus?: string;
      error?: string;
    }> = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];
      console.log(`\n[${i + 1}/${questions.length}] Reviewing ${q._id}...`);

      const result = await reviewSingleQuestion(ctx, {
        questionId: q._id,
        reviewType: "initial_verification",
      });

      results.push({
        questionId: q._id.toString(),
        success: result.success,
        reviewStatus: result.reviewStatus,
        error: result.error,
      });

      // Rate limiting
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    const successful = results.filter((r) => r.success).length;
    console.log(`\nBatch review complete: ${successful}/${questions.length} successful`);

    return { total: questions.length, successful, results };
  },
});
