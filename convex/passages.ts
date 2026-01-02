import { query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────
// INTERNAL MUTATIONS
// ─────────────────────────────────────────────────────────

/**
 * Create a passage (internal use for generation pipeline).
 */
export const createPassageInternal = internalMutation({
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
    analyzedFeatures: v.optional(
      v.object({
        paragraphPurposes: v.array(v.string()),
        testableVocabulary: v.array(
          v.object({
            word: v.string(),
            contextualMeaning: v.string(),
          })
        ),
        keyInferences: v.array(v.string()),
        mainIdea: v.optional(v.string()),
        authorPurpose: v.optional(v.string()),
      })
    ),
    generationType: v.optional(
      v.union(
        v.literal("official"),
        v.literal("agent_generated"),
        v.literal("curated"),
        v.literal("seeded")
      )
    ),
  },
  handler: async (ctx, args) => {
    const passageId = await ctx.db.insert("passages", {
      title: args.title,
      author: args.author,
      source: args.source,
      content: args.content,
      passageType: args.passageType,
      complexity: args.complexity,
      analyzedFeatures: args.analyzedFeatures,
      generationType: args.generationType ?? "agent_generated",
      usedInQuestionCount: 0,
    });

    return passageId;
  },
});

// ─────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────

// Get a passage by ID
export const getPassage = query({
  args: { passageId: v.id("passages") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.passageId);
  },
});

// Get all passages
export const getAllPassages = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db.query("passages").collect();
  },
});

// Get passage with figures
export const getPassageWithFigures = query({
  args: { passageId: v.id("passages") },
  handler: async (ctx, args) => {
    const passage = await ctx.db.get(args.passageId);
    if (!passage) return null;

    const figures = await ctx.db
      .query("passageFigures")
      .withIndex("by_passage", (q) => q.eq("passageId", args.passageId))
      .collect();

    // Sort by figure number
    figures.sort((a, b) => a.figureNumber - b.figureNumber);

    return {
      ...passage,
      figures,
    };
  },
});
