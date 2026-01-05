import { query } from "./_generated/server";
import { v } from "convex/values";
import { Doc, Id } from "./_generated/dataModel";

/**
 * Export Query Functions
 *
 * These functions fetch verified questions with all related data
 * for exporting from dev to production.
 */

// Get all verified questions with related data for export
export const getVerifiedQuestionsForExport = query({
  args: {
    limit: v.optional(v.number()),
    offset: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Get verified questions using the existing index
    const allVerified = await ctx.db
      .query("questions")
      .withIndex("by_review_status", (q) => q.eq("reviewStatus", "verified"))
      .collect();

    // Apply pagination
    const start = args.offset ?? 0;
    const limit = args.limit ?? 100;
    const questions = allVerified.slice(start, start + limit);

    // Fetch all related data for each question
    const results = await Promise.all(
      questions.map(async (question) => {
        // Fetch answer options
        const options = await ctx.db
          .query("answerOptions")
          .withIndex("by_question", (q) => q.eq("questionId", question._id))
          .collect();

        // Fetch passage if exists
        const passage = question.passageId
          ? await ctx.db.get(question.passageId)
          : null;

        // Fetch explanation
        const explanation = await ctx.db
          .query("explanations")
          .withIndex("by_question", (q) => q.eq("questionId", question._id))
          .first();

        // Fetch image if exists
        const image = question.figure?.imageId
          ? await ctx.db.get(question.figure.imageId)
          : null;

        // Get image URL for downloading
        let imageUrl = null;
        if (image) {
          imageUrl = await ctx.storage.getUrl(image.storageId);
        }

        // Handle passage2 for cross-text questions
        let passage2 = null;
        let passage2Id = null;
        if (
          question.skill === "cross_text_connections" &&
          question.tags?.length
        ) {
          const passage2Tag = question.tags.find((tag: string) =>
            tag.startsWith("passage2:")
          );
          if (passage2Tag) {
            passage2Id = passage2Tag.replace("passage2:", "");
            try {
              passage2 = await ctx.db.get(passage2Id as any);
            } catch {
              // passage2 might not exist
            }
          }
        }

        // Fetch passage figures if passage exists
        let passageFigures: any[] = [];
        if (passage) {
          passageFigures = await ctx.db
            .query("passageFigures")
            .withIndex("by_passage", (q) => q.eq("passageId", passage._id))
            .collect();

          // Get URLs for passage figure images
          passageFigures = await Promise.all(
            passageFigures.map(async (pf) => {
              const pfImage = (await ctx.db.get(pf.imageId)) as Doc<"images"> | null;
              let pfImageUrl = null;
              if (pfImage) {
                pfImageUrl = await ctx.storage.getUrl(pfImage.storageId);
              }
              return {
                ...pf,
                image: pfImage,
                imageUrl: pfImageUrl,
              };
            })
          );
        }

        // Fetch option images if any
        const optionsWithImages = await Promise.all(
          options.map(async (opt) => {
            if (opt.imageId) {
              const optImage = (await ctx.db.get(opt.imageId)) as Doc<"images"> | null;
              let optImageUrl = null;
              if (optImage) {
                optImageUrl = await ctx.storage.getUrl(optImage.storageId);
              }
              return {
                ...opt,
                image: optImage,
                imageUrl: optImageUrl,
              };
            }
            return { ...opt, image: null, imageUrl: null };
          })
        );

        return {
          question,
          options: optionsWithImages.sort((a, b) => a.order - b.order),
          passage,
          passage2,
          passage2Id,
          passageFigures,
          explanation,
          image,
          imageUrl,
        };
      })
    );

    return {
      questions: results,
      total: allVerified.length,
      hasMore: start + limit < allVerified.length,
      nextOffset: start + limit < allVerified.length ? start + limit : null,
    };
  },
});

// Get export statistics
export const getExportStats = query({
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

    const byDomain: Record<string, number> = {};
    for (const q of verified) {
      byDomain[q.domain] = (byDomain[q.domain] || 0) + 1;
    }

    // Count questions with figures
    const withFigures = verified.filter((q) => q.figure?.imageId).length;

    // Count questions with passages
    const withPassages = verified.filter((q) => q.passageId).length;

    return {
      totalVerified: verified.length,
      byCategory,
      byDomain,
      withFigures,
      withPassages,
    };
  },
});
