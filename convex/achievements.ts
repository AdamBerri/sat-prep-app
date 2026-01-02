import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Achievement thresholds
const STREAK_THRESHOLDS = [
  { id: "streak_5", threshold: 5 },
  { id: "streak_10", threshold: 10 },
  { id: "streak_25", threshold: 25 },
  { id: "streak_50", threshold: 50 },
  { id: "streak_100", threshold: 100 },
];

const QUESTION_THRESHOLDS = [
  { id: "questions_10", threshold: 10 },
  { id: "questions_50", threshold: 50 },
  { id: "questions_100", threshold: 100 },
  { id: "questions_500", threshold: 500 },
  { id: "questions_1000", threshold: 1000 },
];

// Get all achievements for a user
export const getUserAchievements = query({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("userAchievements")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .collect();
  },
});

// Check if user has a specific achievement
export const hasAchievement = query({
  args: {
    visitorId: v.string(),
    achievementId: v.string(),
  },
  handler: async (ctx, args) => {
    const achievement = await ctx.db
      .query("userAchievements")
      .withIndex("by_visitor_and_achievement", (q) =>
        q.eq("visitorId", args.visitorId).eq("achievementId", args.achievementId)
      )
      .first();

    return !!achievement;
  },
});

// Award a specific achievement
export const awardAchievement = mutation({
  args: {
    visitorId: v.string(),
    achievementId: v.string(),
    category: v.union(
      v.literal("streak"),
      v.literal("questions"),
      v.literal("accuracy"),
      v.literal("domain_mastery"),
      v.literal("daily_challenge"),
      v.literal("special")
    ),
  },
  handler: async (ctx, args) => {
    // Check if already awarded
    const existing = await ctx.db
      .query("userAchievements")
      .withIndex("by_visitor_and_achievement", (q) =>
        q.eq("visitorId", args.visitorId).eq("achievementId", args.achievementId)
      )
      .first();

    if (existing) {
      return null; // Already has this achievement
    }

    // Award the achievement
    const id = await ctx.db.insert("userAchievements", {
      visitorId: args.visitorId,
      achievementId: args.achievementId,
      category: args.category,
      unlockedAt: Date.now(),
    });

    return { id, achievementId: args.achievementId };
  },
});

// Check and award achievements based on current context
export const checkAndAwardAchievements = mutation({
  args: {
    visitorId: v.string(),
    context: v.object({
      currentStreak: v.optional(v.number()),
      totalQuestions: v.optional(v.number()),
      sessionQuestions: v.optional(v.number()),
      sessionCorrect: v.optional(v.number()),
      masteryLevel: v.optional(v.string()),
      domain: v.optional(v.string()),
      category: v.optional(
        v.union(v.literal("reading_writing"), v.literal("math"))
      ),
    }),
  },
  handler: async (ctx, args) => {
    const newAchievements: string[] = [];
    const { context } = args;

    // Helper to check and award
    const checkAndAward = async (
      achievementId: string,
      category: "streak" | "questions" | "accuracy" | "domain_mastery" | "daily_challenge" | "special"
    ) => {
      const existing = await ctx.db
        .query("userAchievements")
        .withIndex("by_visitor_and_achievement", (q) =>
          q.eq("visitorId", args.visitorId).eq("achievementId", achievementId)
        )
        .first();

      if (!existing) {
        await ctx.db.insert("userAchievements", {
          visitorId: args.visitorId,
          achievementId,
          category,
          unlockedAt: Date.now(),
        });
        newAchievements.push(achievementId);
      }
    };

    // Check streak achievements
    if (context.currentStreak !== undefined) {
      for (const { id, threshold } of STREAK_THRESHOLDS) {
        if (context.currentStreak >= threshold) {
          await checkAndAward(id, "streak");
        }
      }
    }

    // Check question count achievements
    if (context.totalQuestions !== undefined) {
      for (const { id, threshold } of QUESTION_THRESHOLDS) {
        if (context.totalQuestions >= threshold) {
          await checkAndAward(id, "questions");
        }
      }

      // First question achievement
      if (context.totalQuestions >= 1) {
        await checkAndAward("first_question", "special");
      }
    }

    // Check session accuracy achievements
    if (
      context.sessionQuestions !== undefined &&
      context.sessionCorrect !== undefined &&
      context.sessionQuestions >= 20
    ) {
      const accuracy = (context.sessionCorrect / context.sessionQuestions) * 100;

      if (accuracy >= 80) {
        await checkAndAward("accuracy_80_session", "accuracy");
      }
      if (accuracy >= 90) {
        await checkAndAward("accuracy_90_session", "accuracy");
      }
    }

    // Check perfect 10 (10 correct in a row in session - same as streak_10 for now)
    if (context.currentStreak !== undefined && context.currentStreak >= 10) {
      await checkAndAward("perfect_10", "accuracy");
    }

    // Check domain mastery achievements
    if (context.masteryLevel === "expert" && context.domain) {
      const domainLower = context.domain.toLowerCase();

      if (domainLower.includes("algebra")) {
        await checkAndAward("domain_expert_algebra", "domain_mastery");
      }
      if (domainLower.includes("advanced")) {
        await checkAndAward("domain_expert_advanced_math", "domain_mastery");
      }
      if (domainLower.includes("geometry") || domainLower.includes("trig")) {
        await checkAndAward("domain_expert_geometry", "domain_mastery");
      }
      if (context.category === "reading_writing") {
        await checkAndAward("domain_expert_reading", "domain_mastery");
      }
    }

    // Check time-based achievements (Night Owl, Early Bird)
    const hour = new Date().getHours();
    if (hour >= 0 && hour < 5) {
      await checkAndAward("night_owl", "special");
    }
    if (hour >= 4 && hour < 6) {
      await checkAndAward("early_bird", "special");
    }

    return newAchievements;
  },
});

// Get achievement count by category
export const getAchievementStats = query({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    const achievements = await ctx.db
      .query("userAchievements")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .collect();

    const stats = {
      total: achievements.length,
      streak: 0,
      questions: 0,
      accuracy: 0,
      domain_mastery: 0,
      daily_challenge: 0,
      special: 0,
    };

    for (const achievement of achievements) {
      stats[achievement.category]++;
    }

    return stats;
  },
});
