import { query } from "./_generated/server";
import { v } from "convex/values";

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
