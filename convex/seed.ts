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

/**
 * Delete questions created in the last N minutes.
 * Also deletes related answerOptions, explanations, and images.
 */
export const deleteRecentQuestions = mutation({
  args: {
    minutesAgo: v.number(), // Delete questions created in the last N minutes
    dryRun: v.optional(v.boolean()), // If true, just count without deleting
  },
  handler: async (ctx, args) => {
    const cutoffTime = Date.now() - args.minutesAgo * 60 * 1000;

    // Find all questions created after cutoff
    const allQuestions = await ctx.db.query("questions").collect();
    const recentQuestions = allQuestions.filter(
      (q) => q._creationTime > cutoffTime
    );

    if (args.dryRun) {
      return {
        message: `Would delete ${recentQuestions.length} questions created in the last ${args.minutesAgo} minutes`,
        count: recentQuestions.length,
        questionIds: recentQuestions.map((q) => q._id),
      };
    }

    let deletedQuestions = 0;
    let deletedOptions = 0;
    let deletedExplanations = 0;
    let deletedImages = 0;

    for (const question of recentQuestions) {
      // Delete answer options
      const options = await ctx.db
        .query("answerOptions")
        .withIndex("by_question", (q) => q.eq("questionId", question._id))
        .collect();
      for (const opt of options) {
        await ctx.db.delete(opt._id);
        deletedOptions++;
      }

      // Delete explanations
      const explanations = await ctx.db
        .query("explanations")
        .withIndex("by_question", (q) => q.eq("questionId", question._id))
        .collect();
      for (const exp of explanations) {
        await ctx.db.delete(exp._id);
        deletedExplanations++;
      }

      // Delete image if exists
      if (question.figure?.imageId) {
        const image = await ctx.db.get(question.figure.imageId);
        if (image) {
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
      message: `Deleted ${deletedQuestions} questions from the last ${args.minutesAgo} minutes`,
      deletedQuestions,
      deletedOptions,
      deletedExplanations,
      deletedImages,
    };
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

// ─────────────────────────────────────────────────────────
// AI-GENERATED MATH QUESTIONS
// ─────────────────────────────────────────────────────────

/**
 * Test action to generate a single math question.
 * This is a public action for testing the pipeline.
 */
export const testGenerateMathQuestion = action({
  args: {
    domain: v.optional(
      v.union(
        v.literal("algebra"),
        v.literal("advanced_math"),
        v.literal("problem_solving"),
        v.literal("geometry_trig")
      )
    ),
    skill: v.optional(v.string()),
  },
  handler: async (ctx, args): Promise<unknown> => {
    console.log(`Testing math question generation...`);
    if (args.domain) console.log(`  Domain: ${args.domain}`);
    if (args.skill) console.log(`  Skill: ${args.skill}`);

    const result = await ctx.runAction(
      internal.mathQuestionGeneration.generateMathQuestion,
      {
        domain: args.domain,
        skill: args.skill,
        batchId: "test-batch",
      }
    );

    return result;
  },
});

/**
 * Batch generate math questions.
 */
export const batchGenerateMathQuestions = action({
  args: {
    count: v.number(),
    domains: v.optional(
      v.array(
        v.union(
          v.literal("algebra"),
          v.literal("advanced_math"),
          v.literal("problem_solving"),
          v.literal("geometry_trig")
        )
      )
    ),
    skills: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args): Promise<unknown> => {
    console.log(`Batch generating ${args.count} math questions...`);

    const result = await ctx.runAction(
      internal.mathQuestionGeneration.batchGenerateMathQuestions,
      {
        count: args.count,
        domains: args.domains,
        skills: args.skills,
      }
    );

    return result;
  },
});

// ─────────────────────────────────────────────────────────
// CROSS-TEXT QUESTIONS
// ─────────────────────────────────────────────────────────

/**
 * Test action to generate a single cross-text question.
 * This is a public action for testing the pipeline.
 */
export const testGenerateCrossTextQuestion = action({
  args: {
    targetDifficulty: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<unknown> => {
    console.log(`Testing cross-text question generation...`);

    const result = await ctx.runAction(
      internal.crossTextQuestionGeneration.generateCrossTextQuestion,
      {
        targetDifficulty: args.targetDifficulty,
        batchId: "test-batch",
      }
    );

    return result;
  },
});

/**
 * Batch generate cross-text questions.
 */
export const batchGenerateCrossTextQuestions = action({
  args: {
    count: v.number(),
  },
  handler: async (ctx, args): Promise<unknown> => {
    console.log(`Batch generating ${args.count} cross-text questions...`);

    const result = await ctx.runAction(
      internal.crossTextQuestionGeneration.batchGenerateCrossTextQuestions,
      {
        count: args.count,
      }
    );

    return result;
  },
});

// ─────────────────────────────────────────────────────────
// TRANSITIONS QUESTIONS
// ─────────────────────────────────────────────────────────

/**
 * Test action to generate a single transitions question.
 * This is a public action for testing the pipeline.
 */
export const testGenerateTransitionsQuestion = action({
  args: {
    targetDifficulty: v.optional(v.number()),
  },
  handler: async (ctx, args): Promise<unknown> => {
    console.log(`Testing transitions question generation...`);

    const result = await ctx.runAction(
      internal.transitionsQuestionGeneration.generateTransitionsQuestion,
      {
        targetDifficulty: args.targetDifficulty,
        batchId: "test-batch",
      }
    );

    return result;
  },
});

/**
 * Batch generate transitions questions.
 */
export const batchGenerateTransitionsQuestions = action({
  args: {
    count: v.number(),
  },
  handler: async (ctx, args): Promise<unknown> => {
    console.log(`Batch generating ${args.count} transitions questions...`);

    const result = await ctx.runAction(
      internal.transitionsQuestionGeneration.batchGenerateTransitionsQuestions,
      {
        count: args.count,
      }
    );

    return result;
  },
});

// ─────────────────────────────────────────────────────────
// GRAMMAR QUESTIONS (Standard English Conventions)
// ─────────────────────────────────────────────────────────

/**
 * Test action to generate a single grammar question.
 * This is a public action for testing the pipeline.
 */
export const testGenerateGrammarQuestion = action({
  args: {
    questionType: v.optional(
      v.union(
        v.literal("boundaries_between_sentences"),
        v.literal("boundaries_within_sentences"),
        v.literal("subject_verb_agreement"),
        v.literal("pronoun_antecedent_agreement"),
        v.literal("verb_finiteness"),
        v.literal("verb_tense_aspect"),
        v.literal("subject_modifier_placement"),
        v.literal("genitives_plurals")
      )
    ),
  },
  handler: async (ctx, args): Promise<unknown> => {
    // Default to boundaries_between_sentences if not specified
    const questionType = args.questionType ?? "boundaries_between_sentences";
    console.log(`Testing grammar question generation...`);
    console.log(`  Question type: ${questionType}`);

    const result = await ctx.runAction(
      internal.grammarQuestionGeneration.generateGrammarQuestion,
      {
        questionType,
        batchId: "test-batch",
      }
    );

    return result;
  },
});

/**
 * Batch generate grammar questions.
 */
export const batchGenerateGrammarQuestions = action({
  args: {
    count: v.number(),
    questionTypes: v.optional(
      v.array(
        v.union(
          v.literal("boundaries_between_sentences"),
          v.literal("boundaries_within_sentences"),
          v.literal("subject_verb_agreement"),
          v.literal("pronoun_antecedent_agreement"),
          v.literal("verb_finiteness"),
          v.literal("verb_tense_aspect"),
          v.literal("subject_modifier_placement"),
          v.literal("genitives_plurals")
        )
      )
    ),
  },
  handler: async (ctx, args): Promise<unknown> => {
    console.log(`Batch generating ${args.count} grammar questions...`);

    const result = await ctx.runAction(
      internal.grammarQuestionGeneration.batchGenerateGrammarQuestions,
      {
        count: args.count,
        questionTypes: args.questionTypes,
      }
    );

    return result;
  },
});

// ─────────────────────────────────────────────────────────
// MASTER BATCH GENERATOR - ALL QUESTION TYPES
// ─────────────────────────────────────────────────────────

/**
 * Generate questions across ALL 16 SAT Reading/Writing question types.
 * This is the master batch generator for comprehensive question generation.
 *
 * Distribution follows official SAT proportions:
 * - Domain 1 (Information & Ideas): central_ideas, inferences, command_of_evidence
 * - Domain 2 (Craft & Structure): vocabulary_in_context, text_structure, cross_text_connections
 * - Domain 3 (Expression of Ideas): rhetorical_synthesis, transitions
 * - Domain 4 (Standard English Conventions): 8 grammar subtypes
 */
export const generateAllQuestionTypes = action({
  args: {
    countPerType: v.number(), // How many of each type to generate
    skipTypes: v.optional(v.array(v.string())), // Types to skip
  },
  handler: async (ctx, args): Promise<unknown> => {
    const startTime = Date.now();
    const batchId = `master-${Date.now()}`;
    const skipTypes = new Set(args.skipTypes || []);

    console.log(`\n${"═".repeat(60)}`);
    console.log(`MASTER BATCH GENERATION - ${args.countPerType} of each type`);
    console.log(`Batch ID: ${batchId}`);
    console.log(`${"═".repeat(60)}\n`);

    const results: {
      domain: string;
      type: string;
      requested: number;
      successful: number;
      failed: number;
      duration: number;
    }[] = [];

    // ─────────────────────────────────────────────────────
    // DOMAIN 1: Information and Ideas (Reading)
    // ─────────────────────────────────────────────────────
    const readingTypes = [
      "central_ideas",
      "inferences",
      "command_of_evidence",
      "vocabulary_in_context",
      "text_structure",
      "rhetorical_synthesis",
    ] as const;

    const readingTypesToGenerate = readingTypes.filter(t => !skipTypes.has(t));

    if (readingTypesToGenerate.length > 0) {
      console.log(`\n[READING QUESTIONS] Generating ${args.countPerType} each of ${readingTypesToGenerate.length} types...`);
      const readingStart = Date.now();

      const readingResult = await ctx.runAction(
        internal.readingQuestionGeneration.batchGenerateReadingQuestions,
        {
          count: args.countPerType * readingTypesToGenerate.length,
          questionTypes: readingTypesToGenerate as unknown as ("central_ideas" | "inferences" | "vocabulary_in_context" | "text_structure" | "command_of_evidence" | "rhetorical_synthesis")[],
          batchId,
        }
      );

      const readingDuration = (Date.now() - readingStart) / 1000;

      // Group results by type
      for (const type of readingTypesToGenerate) {
        const typeResults = readingResult.results.filter((r: { questionType: string }) => r.questionType === type);
        results.push({
          domain: type === "vocabulary_in_context" || type === "text_structure" ? "craft_and_structure" :
                  type === "rhetorical_synthesis" ? "expression_of_ideas" : "information_and_ideas",
          type,
          requested: args.countPerType,
          successful: typeResults.filter((r: { success: boolean }) => r.success).length,
          failed: typeResults.filter((r: { success: boolean }) => !r.success).length,
          duration: readingDuration / readingTypesToGenerate.length,
        });
      }
    }

    // ─────────────────────────────────────────────────────
    // DOMAIN 2: Cross-Text Connections
    // ─────────────────────────────────────────────────────
    if (!skipTypes.has("cross_text_connections")) {
      console.log(`\n[CROSS-TEXT] Generating ${args.countPerType} questions...`);
      const crossTextStart = Date.now();

      const crossTextResult = await ctx.runAction(
        internal.crossTextQuestionGeneration.batchGenerateCrossTextQuestions,
        {
          count: args.countPerType,
          batchId,
        }
      );

      results.push({
        domain: "craft_and_structure",
        type: "cross_text_connections",
        requested: args.countPerType,
        successful: crossTextResult.successful,
        failed: crossTextResult.failed,
        duration: (Date.now() - crossTextStart) / 1000,
      });
    }

    // ─────────────────────────────────────────────────────
    // DOMAIN 3: Transitions
    // ─────────────────────────────────────────────────────
    if (!skipTypes.has("transitions")) {
      console.log(`\n[TRANSITIONS] Generating ${args.countPerType} questions...`);
      const transitionsStart = Date.now();

      const transitionsResult = await ctx.runAction(
        internal.transitionsQuestionGeneration.batchGenerateTransitionsQuestions,
        {
          count: args.countPerType,
          batchId,
        }
      );

      results.push({
        domain: "expression_of_ideas",
        type: "transitions",
        requested: args.countPerType,
        successful: transitionsResult.successful,
        failed: transitionsResult.failed,
        duration: (Date.now() - transitionsStart) / 1000,
      });
    }

    // ─────────────────────────────────────────────────────
    // DOMAIN 4: Standard English Conventions (Grammar)
    // ─────────────────────────────────────────────────────
    const grammarTypes = [
      "boundaries_between_sentences",
      "boundaries_within_sentences",
      "subject_verb_agreement",
      "pronoun_antecedent_agreement",
      "verb_finiteness",
      "verb_tense_aspect",
      "subject_modifier_placement",
      "genitives_plurals",
    ] as const;

    const grammarTypesToGenerate = grammarTypes.filter(t => !skipTypes.has(t));

    if (grammarTypesToGenerate.length > 0) {
      console.log(`\n[GRAMMAR] Generating ${args.countPerType} each of ${grammarTypesToGenerate.length} types...`);
      const grammarStart = Date.now();

      const grammarResult = await ctx.runAction(
        internal.grammarQuestionGeneration.batchGenerateGrammarQuestions,
        {
          count: args.countPerType * grammarTypesToGenerate.length,
          questionTypes: grammarTypesToGenerate as unknown as ("boundaries_between_sentences" | "boundaries_within_sentences" | "subject_verb_agreement" | "pronoun_antecedent_agreement" | "verb_finiteness" | "verb_tense_aspect" | "subject_modifier_placement" | "genitives_plurals")[],
          batchId,
        }
      );

      const grammarDuration = (Date.now() - grammarStart) / 1000;

      // Group results by type
      for (const type of grammarTypesToGenerate) {
        const typeResults = grammarResult.results.filter((r: { questionType: string }) => r.questionType === type);
        results.push({
          domain: "standard_english_conventions",
          type,
          requested: args.countPerType,
          successful: typeResults.filter((r: { success: boolean }) => r.success).length,
          failed: typeResults.filter((r: { success: boolean }) => !r.success).length,
          duration: grammarDuration / grammarTypesToGenerate.length,
        });
      }
    }

    // ─────────────────────────────────────────────────────
    // SUMMARY
    // ─────────────────────────────────────────────────────
    const totalDuration = (Date.now() - startTime) / 1000;
    const totalRequested = results.reduce((sum, r) => sum + r.requested, 0);
    const totalSuccessful = results.reduce((sum, r) => sum + r.successful, 0);
    const totalFailed = results.reduce((sum, r) => sum + r.failed, 0);

    console.log(`\n${"═".repeat(60)}`);
    console.log(`MASTER BATCH COMPLETE`);
    console.log(`${"═".repeat(60)}`);
    console.log(`Total Duration: ${totalDuration.toFixed(1)}s`);
    console.log(`Total Requested: ${totalRequested}`);
    console.log(`Total Successful: ${totalSuccessful} (${((totalSuccessful/totalRequested)*100).toFixed(1)}%)`);
    console.log(`Total Failed: ${totalFailed}`);
    console.log(`${"═".repeat(60)}\n`);

    // Print per-domain summary
    const domains = ["information_and_ideas", "craft_and_structure", "expression_of_ideas", "standard_english_conventions"];
    for (const domain of domains) {
      const domainResults = results.filter(r => r.domain === domain);
      if (domainResults.length > 0) {
        const domainSuccessful = domainResults.reduce((sum, r) => sum + r.successful, 0);
        const domainTotal = domainResults.reduce((sum, r) => sum + r.requested, 0);
        console.log(`  ${domain}: ${domainSuccessful}/${domainTotal}`);
      }
    }

    return {
      batchId,
      totalDuration: totalDuration.toFixed(1) + "s",
      summary: {
        requested: totalRequested,
        successful: totalSuccessful,
        failed: totalFailed,
        successRate: ((totalSuccessful/totalRequested)*100).toFixed(1) + "%",
      },
      byType: results,
    };
  },
});
