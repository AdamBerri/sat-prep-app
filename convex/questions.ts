import { query } from "./_generated/server";
import { v } from "convex/values";

// Get all questions with their options (for exam)
export const getQuestionsByCategory = query({
  args: {
    category: v.union(v.literal("reading_writing"), v.literal("math")),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    let questionsQuery = ctx.db
      .query("questions")
      .withIndex("by_category", (q) => q.eq("category", args.category));

    const questions = await questionsQuery.collect();
    const limitedQuestions = args.limit ? questions.slice(0, args.limit) : questions;

    // Get options for each question
    const questionsWithOptions = await Promise.all(
      limitedQuestions.map(async (question) => {
        const options = await ctx.db
          .query("answerOptions")
          .withIndex("by_question", (q) => q.eq("questionId", question._id))
          .collect();

        // Sort options by order
        options.sort((a, b) => a.order - b.order);

        return {
          ...question,
          options,
        };
      })
    );

    return questionsWithOptions;
  },
});

// Get a single question by ID with all related data
export const getQuestion = query({
  args: { questionId: v.id("questions") },
  handler: async (ctx, args) => {
    const question = await ctx.db.get(args.questionId);
    if (!question) return null;

    // Get options
    const options = await ctx.db
      .query("answerOptions")
      .withIndex("by_question", (q) => q.eq("questionId", question._id))
      .collect();
    options.sort((a, b) => a.order - b.order);

    // Get passage if exists
    let passage = null;
    if (question.passageId) {
      passage = await ctx.db.get(question.passageId);
    }

    // Get explanation
    const explanation = await ctx.db
      .query("explanations")
      .withIndex("by_question", (q) => q.eq("questionId", question._id))
      .first();

    return {
      ...question,
      options,
      passage,
      explanation,
    };
  },
});

// Get questions for a practice session
export const getQuestionsForPractice = query({
  args: {
    category: v.optional(v.union(v.literal("reading_writing"), v.literal("math"))),
    count: v.number(),
  },
  handler: async (ctx, args) => {
    let questions;

    if (args.category) {
      const category = args.category;
      questions = await ctx.db
        .query("questions")
        .withIndex("by_category", (q) => q.eq("category", category))
        .collect();
    } else {
      questions = await ctx.db.query("questions").collect();
    }

    // Shuffle and limit
    const shuffled = questions.sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, args.count);

    // Get options and passages for each
    const questionsWithData = await Promise.all(
      selected.map(async (question) => {
        const options = await ctx.db
          .query("answerOptions")
          .withIndex("by_question", (q) => q.eq("questionId", question._id))
          .collect();
        options.sort((a, b) => a.order - b.order);

        let passage = null;
        if (question.passageId) {
          passage = await ctx.db.get(question.passageId);
        }

        return {
          ...question,
          options,
          passage,
        };
      })
    );

    return questionsWithData;
  },
});

// Get all questions (for generating full exam)
export const getAllQuestions = query({
  args: {},
  handler: async (ctx) => {
    const questions = await ctx.db.query("questions").collect();

    const questionsWithData = await Promise.all(
      questions.map(async (question) => {
        const options = await ctx.db
          .query("answerOptions")
          .withIndex("by_question", (q) => q.eq("questionId", question._id))
          .collect();
        options.sort((a, b) => a.order - b.order);

        let passage = null;
        if (question.passageId) {
          passage = await ctx.db.get(question.passageId);
        }

        return {
          ...question,
          options,
          passage,
        };
      })
    );

    return questionsWithData;
  },
});

// Get explanation for a question
export const getExplanation = query({
  args: { questionId: v.id("questions") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("explanations")
      .withIndex("by_question", (q) => q.eq("questionId", args.questionId))
      .first();
  },
});
