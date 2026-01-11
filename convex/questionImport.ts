import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Import Mutation Functions
 *
 * These functions handle importing questions from a JSON export file
 * into production. Handles image uploads and ID remapping.
 */

// Generate upload URL for importing images
export const generateImportUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

// Store an imported image and create the images table record
export const storeImportedImage = mutation({
  args: {
    storageId: v.id("_storage"),
    width: v.number(),
    height: v.number(),
    aspectRatio: v.optional(v.number()),
    altText: v.string(),
    blurhash: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const imageId = await ctx.db.insert("images", {
      storageId: args.storageId,
      width: args.width,
      height: args.height,
      aspectRatio: args.aspectRatio ?? args.width / args.height,
      altText: args.altText,
      blurhash: args.blurhash,
    });
    return imageId;
  },
});

// Import a passage (deduplicates by content hash)
export const importPassage = mutation({
  args: {
    title: v.optional(v.string()),
    author: v.optional(v.string()),
    source: v.optional(v.string()),
    content: v.string(),
    passageType: v.optional(
      v.union(
        v.literal("literary_narrative"),
        v.literal("social_science"),
        v.literal("natural_science"),
        v.literal("humanities")
      )
    ),
    complexity: v.optional(v.number()),
    analyzedFeatures: v.optional(v.any()),
    generationType: v.optional(
      v.union(
        v.literal("official"),
        v.literal("agent_generated"),
        v.literal("curated"),
        v.literal("seeded")
      )
    ),
    usedInQuestionCount: v.optional(v.number()),
    originalId: v.string(),
  },
  handler: async (ctx, args) => {
    // Check if passage with same content already exists (deduplication)
    const allPassages = await ctx.db.query("passages").collect();
    const existing = allPassages.find((p) => p.content === args.content);

    if (existing) {
      return { passageId: existing._id, created: false };
    }

    const passageId = await ctx.db.insert("passages", {
      title: args.title,
      author: args.author,
      source: args.source,
      content: args.content,
      passageType: args.passageType,
      complexity: args.complexity,
      analyzedFeatures: args.analyzedFeatures,
      generationType: args.generationType ?? "agent_generated",
      usedInQuestionCount: args.usedInQuestionCount ?? 0,
    });

    return { passageId, created: true };
  },
});

// Import a passage figure
export const importPassageFigure = mutation({
  args: {
    passageId: v.id("passages"),
    imageId: v.id("images"),
    figureNumber: v.number(),
    caption: v.optional(v.string()),
    placement: v.union(
      v.literal("inline"),
      v.literal("sidebar"),
      v.literal("below-passage")
    ),
    insertAfterParagraph: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const figureId = await ctx.db.insert("passageFigures", {
      passageId: args.passageId,
      imageId: args.imageId,
      figureNumber: args.figureNumber,
      caption: args.caption,
      placement: args.placement,
      insertAfterParagraph: args.insertAfterParagraph,
    });
    return figureId;
  },
});

// Import a complete question with all related data
export const importQuestion = mutation({
  args: {
    // Question fields
    type: v.union(v.literal("multiple_choice"), v.literal("grid_in")),
    category: v.union(v.literal("reading_writing"), v.literal("math")),
    domain: v.string(),
    skill: v.string(),
    difficulty: v.number(),
    overallDifficulty: v.optional(v.number()),
    mathDifficulty: v.optional(v.any()),
    rwDifficulty: v.optional(v.any()),
    prompt: v.string(),
    correctAnswer: v.string(),
    tags: v.array(v.string()),
    source: v.optional(v.any()),
    generationMetadata: v.optional(v.any()),
    grammarData: v.optional(v.any()),
    lineReference: v.optional(v.any()),
    reviewStatus: v.optional(
      v.union(
        v.literal("pending"),
        v.literal("verified"),
        v.literal("needs_revision"),
        v.literal("rejected"),
        v.literal("flagged_high_error")
      )
    ),
    reviewMetadata: v.optional(v.any()),
    improvementHistory: v.optional(v.any()),

    // Related IDs (already remapped to prod)
    passageId: v.optional(v.id("passages")),
    passage2Id: v.optional(v.id("passages")),

    // Figure (imageId should be pre-created in prod)
    figure: v.optional(
      v.object({
        imageId: v.id("images"),
        figureType: v.optional(
          v.union(
            v.literal("graph"),
            v.literal("geometric"),
            v.literal("data_display"),
            v.literal("diagram"),
            v.literal("table")
          )
        ),
        caption: v.optional(v.string()),
      })
    ),

    // Answer options
    options: v.array(
      v.object({
        key: v.string(),
        content: v.string(),
        order: v.number(),
        imageId: v.optional(v.id("images")),
      })
    ),

    // Explanation
    explanation: v.optional(
      v.object({
        correctExplanation: v.string(),
        wrongAnswerExplanations: v.optional(v.any()),
        commonMistakes: v.optional(v.any()),
        videoUrl: v.optional(v.string()),
      })
    ),

    // Original ID for tracking
    originalQuestionId: v.string(),
  },
  handler: async (ctx, args) => {
    // Update tags for passage2 if it exists
    let tags = [...args.tags];
    if (args.passage2Id) {
      // Remove old passage2 tag and add new one with remapped ID
      tags = tags.filter((t) => !t.startsWith("passage2:"));
      tags.push(`passage2:${args.passage2Id}`);
    }

    // Create the question
    const questionId = await ctx.db.insert("questions", {
      type: args.type,
      category: args.category,
      domain: args.domain,
      skill: args.skill,
      difficulty: args.difficulty,
      overallDifficulty: args.overallDifficulty,
      mathDifficulty: args.mathDifficulty,
      rwDifficulty: args.rwDifficulty,
      prompt: args.prompt,
      passageId: args.passageId,
      lineReference: args.lineReference,
      figure: args.figure,
      correctAnswer: args.correctAnswer,
      source: args.source,
      generationMetadata: args.generationMetadata,
      grammarData: args.grammarData,
      tags,
      reviewStatus: args.reviewStatus || "pending",
      reviewMetadata: args.reviewMetadata,
      lastReviewedAt: Date.now(),
      improvementHistory: args.improvementHistory,
    });

    // Create answer options
    for (const option of args.options) {
      await ctx.db.insert("answerOptions", {
        questionId,
        key: option.key,
        content: option.content,
        order: option.order,
        imageId: option.imageId,
      });
    }

    // Create explanation if provided
    if (args.explanation) {
      await ctx.db.insert("explanations", {
        questionId,
        correctExplanation: args.explanation.correctExplanation,
        wrongAnswerExplanations: args.explanation.wrongAnswerExplanations,
        commonMistakes: args.explanation.commonMistakes,
        videoUrl: args.explanation.videoUrl,
      });
    }

    return { questionId, originalQuestionId: args.originalQuestionId };
  },
});

// Update a question's passageId (for repairing broken links)
export const updateQuestionPassageId = mutation({
  args: {
    questionId: v.id("questions"),
    passageId: v.id("passages"),
  },
  handler: async (ctx, args) => {
    // Verify the passage exists
    const passage = await ctx.db.get(args.passageId);
    if (!passage) {
      throw new Error(`Passage ${args.passageId} not found`);
    }

    // Update the question
    await ctx.db.patch(args.questionId, {
      passageId: args.passageId,
    });

    return { success: true };
  },
});

// Get import stats for production
export const getImportStats = query({
  args: {},
  handler: async (ctx) => {
    const verified = await ctx.db
      .query("questions")
      .withIndex("by_review_status", (q) => q.eq("reviewStatus", "verified"))
      .collect();

    const byCategory = {
      reading_writing: verified.filter((q) => q.category === "reading_writing")
        .length,
      math: verified.filter((q) => q.category === "math").length,
    };

    const passages = await ctx.db.query("passages").collect();
    const images = await ctx.db.query("images").collect();

    return {
      totalVerified: verified.length,
      byCategory,
      totalPassages: passages.length,
      totalImages: images.length,
    };
  },
});

// Check if a question with the same prompt already exists (for deduplication)
export const checkQuestionExists = query({
  args: {
    prompt: v.string(),
  },
  handler: async (ctx, args) => {
    const questions = await ctx.db.query("questions").collect();
    const existing = questions.find((q) => q.prompt === args.prompt);
    return existing ? { exists: true, questionId: existing._id } : { exists: false };
  },
});
