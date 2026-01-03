import { mutation, query, internalMutation, internalQuery } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────
// OFFICIAL QUESTIONS (Imported from College Board PDFs)
// ─────────────────────────────────────────────────────────
// Stores questions extracted from official SAT practice tests.
// Used as few-shot examples for AI generation.

const passageTypeValidator = v.union(
  v.literal("literary_narrative"),
  v.literal("social_science"),
  v.literal("natural_science"),
  v.literal("humanities"),
  v.literal("paired")
);

const passageValidator = v.object({
  content: v.string(),
  title: v.optional(v.string()),
  author: v.optional(v.string()),
  source: v.optional(v.string()),
  passageType: v.optional(passageTypeValidator),
});

const sourceValidator = v.object({
  pdfName: v.string(),
  testNumber: v.optional(v.number()),
  sectionNumber: v.number(),
  questionNumber: v.number(),
  year: v.optional(v.number()),
});

const choicesValidator = v.object({
  A: v.string(),
  B: v.string(),
  C: v.string(),
  D: v.string(),
});

const analysisMetadataValidator = v.object({
  distractorStrategies: v.optional(v.array(v.string())),
  keyInferences: v.optional(v.array(v.string())),
  vocabularyTested: v.optional(v.array(v.string())),
  difficultyEstimate: v.optional(v.number()),
});

// ─────────────────────────────────────────────────────────
// IMPORT MUTATIONS
// ─────────────────────────────────────────────────────────

/**
 * Import a single official question.
 * Used by the PDF import pipeline.
 */
export const importOfficialQuestion = internalMutation({
  args: {
    source: sourceValidator,
    category: v.union(v.literal("reading_writing"), v.literal("math")),
    questionType: v.string(),
    domain: v.string(),
    skill: v.string(),
    passage: v.optional(passageValidator),
    questionStem: v.string(),
    choices: choicesValidator,
    correctAnswer: v.string(),
    officialExplanation: v.optional(v.string()),
    analysisMetadata: v.optional(analysisMetadataValidator),
    importBatchId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check for duplicate
    const existing = await ctx.db
      .query("officialQuestions")
      .withIndex("by_source", (q) =>
        q
          .eq("source.pdfName", args.source.pdfName)
          .eq("source.questionNumber", args.source.questionNumber)
      )
      .first();

    if (existing) {
      console.log(
        `Skipping duplicate: ${args.source.pdfName} Q${args.source.questionNumber}`
      );
      return { skipped: true, id: existing._id };
    }

    const id = await ctx.db.insert("officialQuestions", {
      source: args.source,
      category: args.category,
      questionType: args.questionType,
      domain: args.domain,
      skill: args.skill,
      passage: args.passage,
      questionStem: args.questionStem,
      choices: args.choices,
      correctAnswer: args.correctAnswer,
      officialExplanation: args.officialExplanation,
      analysisMetadata: args.analysisMetadata,
      importedAt: Date.now(),
      importBatchId: args.importBatchId,
    });

    return { skipped: false, id };
  },
});

/**
 * Batch import official questions.
 */
export const batchImportOfficialQuestions = internalMutation({
  args: {
    questions: v.array(
      v.object({
        source: sourceValidator,
        category: v.union(v.literal("reading_writing"), v.literal("math")),
        questionType: v.string(),
        domain: v.string(),
        skill: v.string(),
        passage: v.optional(passageValidator),
        questionStem: v.string(),
        choices: choicesValidator,
        correctAnswer: v.string(),
        officialExplanation: v.optional(v.string()),
        analysisMetadata: v.optional(analysisMetadataValidator),
      })
    ),
    importBatchId: v.string(),
  },
  handler: async (ctx, args) => {
    const results = {
      imported: 0,
      skipped: 0,
      ids: [] as string[],
    };

    for (const question of args.questions) {
      // Check for duplicate
      const existing = await ctx.db
        .query("officialQuestions")
        .withIndex("by_source", (q) =>
          q
            .eq("source.pdfName", question.source.pdfName)
            .eq("source.questionNumber", question.source.questionNumber)
        )
        .first();

      if (existing) {
        results.skipped++;
        continue;
      }

      const id = await ctx.db.insert("officialQuestions", {
        ...question,
        importedAt: Date.now(),
        importBatchId: args.importBatchId,
      });

      results.imported++;
      results.ids.push(id);
    }

    return results;
  },
});

// ─────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────

/**
 * Get official questions by type (for few-shot examples).
 */
export const getByQuestionType = query({
  args: {
    questionType: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 3;

    return await ctx.db
      .query("officialQuestions")
      .withIndex("by_question_type", (q) =>
        q.eq("questionType", args.questionType)
      )
      .take(limit);
  },
});

/**
 * Get official questions by category.
 */
export const getByCategory = query({
  args: {
    category: v.union(v.literal("reading_writing"), v.literal("math")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 10;

    return await ctx.db
      .query("officialQuestions")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .take(limit);
  },
});

/**
 * Get random official questions for few-shot examples (internal).
 */
export const getRandomExamples = internalQuery({
  args: {
    questionType: v.string(),
    count: v.number(),
  },
  handler: async (ctx, args) => {
    // Get all questions of this type
    const allQuestions = await ctx.db
      .query("officialQuestions")
      .withIndex("by_question_type", (q) =>
        q.eq("questionType", args.questionType)
      )
      .collect();

    if (allQuestions.length === 0) {
      return [];
    }

    // Shuffle and take requested count
    const shuffled = allQuestions.sort(() => Math.random() - 0.5);
    return shuffled.slice(0, args.count);
  },
});

/**
 * Get stats on imported questions.
 */
export const getImportStats = query({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("officialQuestions").collect();

    const stats = {
      total: all.length,
      byCategory: {
        reading_writing: all.filter((q) => q.category === "reading_writing")
          .length,
        math: all.filter((q) => q.category === "math").length,
      },
      byQuestionType: {} as Record<string, number>,
      bySource: {} as Record<string, number>,
    };

    // Count by question type
    for (const q of all) {
      stats.byQuestionType[q.questionType] =
        (stats.byQuestionType[q.questionType] ?? 0) + 1;
      stats.bySource[q.source.pdfName] =
        (stats.bySource[q.source.pdfName] ?? 0) + 1;
    }

    return stats;
  },
});

/**
 * Get all questions from a specific PDF.
 */
export const getByPdf = query({
  args: {
    pdfName: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("officialQuestions")
      .filter((q) => q.eq(q.field("source.pdfName"), args.pdfName))
      .collect();
  },
});

/**
 * Get a single question by source info.
 */
export const getBySource = query({
  args: {
    pdfName: v.string(),
    questionNumber: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("officialQuestions")
      .withIndex("by_source", (q) =>
        q.eq("source.pdfName", args.pdfName).eq("source.questionNumber", args.questionNumber)
      )
      .first();
  },
});

// ─────────────────────────────────────────────────────────
// ADMIN MUTATIONS
// ─────────────────────────────────────────────────────────

/**
 * Delete all questions from a specific import batch.
 */
export const deleteImportBatch = mutation({
  args: {
    importBatchId: v.string(),
  },
  handler: async (ctx, args) => {
    const questions = await ctx.db
      .query("officialQuestions")
      .withIndex("by_import_batch", (q) =>
        q.eq("importBatchId", args.importBatchId)
      )
      .collect();

    for (const q of questions) {
      await ctx.db.delete(q._id);
    }

    return { deleted: questions.length };
  },
});

/**
 * Clear all official questions.
 */
export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const all = await ctx.db.query("officialQuestions").collect();

    for (const q of all) {
      await ctx.db.delete(q._id);
    }

    return { deleted: all.length };
  },
});
