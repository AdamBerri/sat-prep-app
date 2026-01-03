"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { Doc } from "./_generated/dataModel";

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

  const figureWarning = question.figure
    ? `
WARNING: This question includes a figure/graph. Pay special attention to:
- Whether the marked answer aligns with what the figure should show
- Potential mismatches between question and visual representation
Figure Type: ${question.figure.figureType || "unknown"}
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
    {"type": "answer_wrong|ambiguous|unclear|too_easy|too_hard", "description": "..."}
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
      v.literal("high_error_rate_recheck")
    ),
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

      console.log(`  Calling Claude for review...`);

      // Call Claude for review
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
