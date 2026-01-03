import { mutation, internalMutation, action } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";
import { ALL_GRAPH_QUESTION_TEMPLATES } from "./graphQuestionTemplates";

// ─────────────────────────────────────────────────────────
// GRAPH QUESTION SEEDING WITH TWO-STAGE PIPELINE
// Stage 1: Claude generates image prompts
// Stage 2: Nano Banana Pro renders images
// ─────────────────────────────────────────────────────────

/**
 * Clear existing graph questions and their images.
 * Run this before re-seeding with new approach.
 */
export const clearGraphQuestions = mutation({
  args: {},
  handler: async (ctx) => {
    // Find all questions with figures
    const graphQuestions = await ctx.db
      .query("questions")
      .filter((q) => q.neq(q.field("figure"), undefined))
      .collect();

    let deletedQuestions = 0;
    let deletedImages = 0;

    for (const question of graphQuestions) {
      // Delete associated answer options
      const options = await ctx.db
        .query("answerOptions")
        .filter((q) => q.eq(q.field("questionId"), question._id))
        .collect();
      for (const opt of options) {
        await ctx.db.delete(opt._id);
      }

      // Delete associated explanations
      const explanations = await ctx.db
        .query("explanations")
        .filter((q) => q.eq(q.field("questionId"), question._id))
        .collect();
      for (const exp of explanations) {
        await ctx.db.delete(exp._id);
      }

      // Delete the image if it exists
      if (question.figure?.imageId) {
        const image = await ctx.db.get(question.figure.imageId);
        if (image) {
          // Delete from storage too
          await ctx.storage.delete(image.storageId);
          await ctx.db.delete(question.figure.imageId);
          deletedImages++;
        }
      }

      // Delete the question
      await ctx.db.delete(question._id);
      deletedQuestions++;
    }

    return {
      message: `Cleared ${deletedQuestions} graph questions and ${deletedImages} images`,
      deletedQuestions,
      deletedImages,
    };
  },
});

/**
 * Seed graph questions using the two-stage pipeline:
 * 1. Claude analyzes questions and generates image prompts
 * 2. Nano Banana Pro renders the images
 *
 * This is the scalable approach for thousands of questions.
 */
export const seedGraphQuestions = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if graph questions already exist
    const existingGraphQuestions = await ctx.db
      .query("questions")
      .filter((q) => q.neq(q.field("figure"), undefined))
      .first();

    if (existingGraphQuestions) {
      return {
        message: "Graph questions already exist. Run clearGraphQuestions first to re-seed.",
        seeded: false,
      };
    }

    // Prepare questions for Claude to generate image prompts
    const questionsForClaude = ALL_GRAPH_QUESTION_TEMPLATES.map((template) => ({
      questionPrompt: template.prompt,
      options: template.options,
      correctAnswer: template.correctAnswer,
      figureType: template.figureType,
      domain: template.domain,
      skill: template.skill,
    }));

    // Schedule the two-stage pipeline action
    await ctx.scheduler.runAfter(
      0,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (internal as any).graphImagePipeline.generateGraphImages,
      { questions: questionsForClaude }
    );

    return {
      message: "Two-stage graph image pipeline started",
      seeded: true,
      pendingQuestions: questionsForClaude.length,
      note: "Stage 1: Claude generating prompts → Stage 2: Nano Banana Pro rendering images",
    };
  },
});

/**
 * Create graph questions after images have been generated.
 * Call this mutation with the results from batchGenerateImages.
 */
export const createGraphQuestionsWithImages = internalMutation({
  args: {
    imageResults: v.array(
      v.object({
        questionIndex: v.number(),
        imageId: v.optional(v.string()),
        error: v.optional(v.string()),
        claudePrompt: v.optional(v.string()), // Store Claude's generated prompt for reference
      })
    ),
  },
  handler: async (ctx, args) => {
    const templates = ALL_GRAPH_QUESTION_TEMPLATES;
    const createdQuestions: string[] = [];
    const errors: string[] = [];

    for (const result of args.imageResults) {
      if (result.error || !result.imageId) {
        errors.push(
          `Question ${result.questionIndex}: ${result.error || "No imageId"}`
        );
        continue;
      }

      const template = templates[result.questionIndex];
      if (!template) {
        errors.push(`Question ${result.questionIndex}: Template not found`);
        continue;
      }

      // Create the question with figure reference
      const questionId = await ctx.db.insert("questions", {
        type: "multiple_choice" as const,
        category: "math" as const,
        domain: template.domain,
        skill: template.skill,
        difficulty: 2,
        prompt: template.prompt,
        figure: {
          imageId: result.imageId as Id<"images">,
          figureType: template.figureType,
          caption: template.imageAltText,
        },
        correctAnswer: template.correctAnswer,
        tags: [template.domain, template.skill, "has_figure", template.figureType],
      });

      // Insert answer options
      for (let j = 0; j < template.options.length; j++) {
        const option = template.options[j];
        await ctx.db.insert("answerOptions", {
          questionId,
          key: option.key,
          content: option.content,
          order: j,
        });
      }

      // Insert explanation
      await ctx.db.insert("explanations", {
        questionId,
        correctExplanation: template.explanation,
        wrongAnswerExplanations: {},
        commonMistakes: [],
      });

      createdQuestions.push(questionId.toString());
    }

    return {
      created: createdQuestions.length,
      errors: errors.length,
      errorDetails: errors,
    };
  },
});

/**
 * Manually create a single graph question with a pre-generated image.
 * Useful for testing or adding individual questions.
 */
export const createSingleGraphQuestion = mutation({
  args: {
    templateIndex: v.number(),
    imageId: v.id("images"),
  },
  handler: async (ctx, args) => {
    const template = ALL_GRAPH_QUESTION_TEMPLATES[args.templateIndex];
    if (!template) {
      throw new Error(`Template index ${args.templateIndex} not found`);
    }

    // Create the question
    const questionId = await ctx.db.insert("questions", {
      type: "multiple_choice" as const,
      category: "math" as const,
      domain: template.domain,
      skill: template.skill,
      difficulty: 2,
      prompt: template.prompt,
      figure: {
        imageId: args.imageId,
        figureType: template.figureType,
        caption: template.imageAltText,
      },
      correctAnswer: template.correctAnswer,
      tags: [template.domain, template.skill, "has_figure", template.figureType],
    });

    // Insert answer options
    for (let j = 0; j < template.options.length; j++) {
      const option = template.options[j];
      await ctx.db.insert("answerOptions", {
        questionId,
        key: option.key,
        content: option.content,
        order: j,
      });
    }

    // Insert explanation
    await ctx.db.insert("explanations", {
      questionId,
      correctExplanation: template.explanation,
      wrongAnswerExplanations: {},
      commonMistakes: [],
    });

    return { questionId };
  },
});

// Clear all data (for development)
export const clearDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete in order to respect foreign key relationships
    const tables = [
      "scoreReports",
      "userAnswers",
      "highlights",
      "examAttempts",
      "explanations",
      "answerOptions",
      "questions",
      "passageFigures",
      "passages",
      "images",
      "examSections",
      "exams",
      "questionSets",
      "users",
    ] as const;

    let totalDeleted = 0;

    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
        totalDeleted++;
      }
    }

    return { message: `Deleted ${totalDeleted} documents` };
  },
});

// ─────────────────────────────────────────────────────────
// TEST: GENERATE READING DATA QUESTION
// ─────────────────────────────────────────────────────────

/**
 * Test action to generate a single reading data question.
 * This is a public action for testing the pipeline.
 */
export const testGenerateReadingDataQuestion = action({
  args: {
    dataType: v.union(
      v.literal("bar_chart"),
      v.literal("line_graph"),
      v.literal("data_table")
    ),
  },
  handler: async (ctx, args): Promise<unknown> => {
    console.log(`Testing reading data question generation: ${args.dataType}`);

    const result = await ctx.runAction(
      internal.readingDataGeneration.generateReadingDataQuestion,
      {
        dataType: args.dataType,
        batchId: "test-batch",
      }
    );

    return result;
  },
});

// ─────────────────────────────────────────────────────────
// TEST: GENERATE READING QUESTION (PASSAGE-BASED)
// ─────────────────────────────────────────────────────────

/**
 * Test action to generate a single reading question (passage-based).
 * This is a public action for testing the pipeline.
 */
export const testGenerateReadingQuestion = action({
  args: {
    questionType: v.optional(
      v.union(
        v.literal("central_ideas"),
        v.literal("inferences"),
        v.literal("vocabulary_in_context"),
        v.literal("text_structure"),
        v.literal("command_of_evidence"),
        v.literal("rhetorical_synthesis")
      )
    ),
    passageType: v.optional(
      v.union(
        v.literal("literary_narrative"),
        v.literal("social_science"),
        v.literal("natural_science"),
        v.literal("humanities")
      )
    ),
  },
  handler: async (ctx, args): Promise<unknown> => {
    console.log(`Testing reading question generation...`);
    if (args.questionType) console.log(`  Question type: ${args.questionType}`);
    if (args.passageType) console.log(`  Passage type: ${args.passageType}`);

    const result = await ctx.runAction(
      internal.readingQuestionGeneration.generateReadingQuestion,
      {
        questionType: args.questionType,
        passageType: args.passageType,
        batchId: "test-batch",
      }
    );

    return result;
  },
});

/**
 * Batch generate reading questions (passage-based).
 */
export const batchGenerateReadingQuestions = action({
  args: {
    count: v.number(),
    questionTypes: v.optional(
      v.array(
        v.union(
          v.literal("central_ideas"),
          v.literal("inferences"),
          v.literal("vocabulary_in_context"),
          v.literal("text_structure"),
          v.literal("command_of_evidence"),
          v.literal("rhetorical_synthesis")
        )
      )
    ),
    passageTypes: v.optional(
      v.array(
        v.union(
          v.literal("literary_narrative"),
          v.literal("social_science"),
          v.literal("natural_science"),
          v.literal("humanities")
        )
      )
    ),
  },
  handler: async (ctx, args): Promise<unknown> => {
    console.log(`Batch generating ${args.count} reading questions...`);

    const result = await ctx.runAction(
      internal.readingQuestionGeneration.batchGenerateReadingQuestions,
      {
        count: args.count,
        questionTypes: args.questionTypes,
        passageTypes: args.passageTypes,
      }
    );

    return result;
  },
});

// ─────────────────────────────────────────────────────────
// PDF IMPORT ACTIONS
// ─────────────────────────────────────────────────────────

/**
 * Import official questions from a local PDF file.
 */
export const importOfficialPdf = action({
  args: {
    pdfPath: v.string(),
    answerKeyPath: v.optional(v.string()),
    pdfName: v.string(),
    testNumber: v.optional(v.number()),
    year: v.optional(v.number()),
    category: v.union(v.literal("reading_writing"), v.literal("math")),
  },
  handler: async (ctx, args): Promise<unknown> => {
    console.log(`Importing official questions from PDF: ${args.pdfPath}`);

    const result = await ctx.runAction(internal.pdfImport.importFromLocalPdf, {
      pdfPath: args.pdfPath,
      answerKeyPath: args.answerKeyPath,
      pdfName: args.pdfName,
      testNumber: args.testNumber,
      year: args.year,
      category: args.category,
    });

    return result;
  },
});

/**
 * Get statistics on imported official questions.
 */
export const getOfficialQuestionStats = action({
  args: {},
  handler: async (ctx): Promise<unknown> => {
    const stats = await ctx.runQuery(
      internal.officialQuestions.getImportStats as unknown as Parameters<typeof ctx.runQuery>[0],
      {}
    );
    return stats;
  },
});
