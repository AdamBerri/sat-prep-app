import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Challenge templates for random selection
const CHALLENGE_TEMPLATES = [
  {
    type: "streak" as const,
    variations: [
      { target: 5, description: "Get a 5-question streak", reward: 50 },
      { target: 7, description: "Get a 7-question streak", reward: 70 },
      { target: 10, description: "Get a 10-question streak", reward: 100 },
    ],
  },
  {
    type: "questions" as const,
    variations: [
      { target: 10, description: "Answer 10 questions", reward: 30 },
      { target: 15, description: "Answer 15 questions", reward: 50 },
      { target: 20, description: "Answer 20 questions", reward: 70 },
      { target: 25, description: "Answer 25 questions", reward: 90 },
    ],
  },
  {
    type: "accuracy" as const,
    variations: [
      { target: 80, description: "Achieve 80% accuracy (10+ questions)", reward: 60 },
      { target: 85, description: "Achieve 85% accuracy (10+ questions)", reward: 80 },
    ],
  },
  {
    type: "domain_variety" as const,
    variations: [
      { target: 2, description: "Practice 2 different domains", reward: 40 },
      { target: 3, description: "Practice 3 different domains", reward: 60 },
    ],
  },
  {
    type: "hard_questions" as const,
    variations: [
      { target: 3, description: "Answer 3 hard questions correctly", reward: 75 },
      { target: 5, description: "Answer 5 hard questions correctly", reward: 100 },
    ],
  },
  {
    type: "speed" as const,
    variations: [
      { target: 5, description: "Answer 5 questions in under 2 minutes each", reward: 50 },
    ],
  },
];

// Generate challenges for the day
function generateChallenges(): Array<{
  id: string;
  type: "streak" | "questions" | "hard_questions" | "domain_variety" | "accuracy" | "speed";
  description: string;
  target: number;
  current: number;
  completed: boolean;
  reward: { type: "points"; value: number };
}> {
  // Shuffle templates
  const shuffled = [...CHALLENGE_TEMPLATES].sort(() => Math.random() - 0.5);

  // Pick 3 different types
  const selected = shuffled.slice(0, 3);

  return selected.map((template) => {
    // Pick a random variation
    const variation =
      template.variations[Math.floor(Math.random() * template.variations.length)];

    return {
      id: `${template.type}_${variation.target}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      type: template.type,
      description: variation.description,
      target: variation.target,
      current: 0,
      completed: false,
      reward: { type: "points" as const, value: variation.reward },
    };
  });
}

// Get today's date string
function getTodayString(): string {
  return new Date().toISOString().split("T")[0];
}

// Get or create daily challenges
export const getDailyChallenges = query({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    const today = getTodayString();

    const challenges = await ctx.db
      .query("dailyChallenges")
      .withIndex("by_visitor_and_date", (q) =>
        q.eq("visitorId", args.visitorId).eq("date", today)
      )
      .first();

    return challenges;
  },
});

// Generate new daily challenges (call if none exist for today)
export const generateDailyChallenges = mutation({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    const today = getTodayString();

    // Check if already exists
    const existing = await ctx.db
      .query("dailyChallenges")
      .withIndex("by_visitor_and_date", (q) =>
        q.eq("visitorId", args.visitorId).eq("date", today)
      )
      .first();

    if (existing) {
      return existing;
    }

    // Generate new challenges
    const challenges = generateChallenges();

    const id = await ctx.db.insert("dailyChallenges", {
      visitorId: args.visitorId,
      date: today,
      challenges,
      allCompleted: false,
      bonusClaimed: false,
    });

    return await ctx.db.get(id);
  },
});

// Update challenge progress
export const updateChallengeProgress = mutation({
  args: {
    visitorId: v.string(),
    updates: v.array(
      v.object({
        type: v.union(
          v.literal("streak"),
          v.literal("questions"),
          v.literal("hard_questions"),
          v.literal("domain_variety"),
          v.literal("accuracy"),
          v.literal("speed")
        ),
        value: v.number(), // For streak/questions: increment, for accuracy: percentage
        isAbsolute: v.optional(v.boolean()), // If true, set value directly instead of incrementing
      })
    ),
  },
  handler: async (ctx, args) => {
    const today = getTodayString();

    const doc = await ctx.db
      .query("dailyChallenges")
      .withIndex("by_visitor_and_date", (q) =>
        q.eq("visitorId", args.visitorId).eq("date", today)
      )
      .first();

    if (!doc) {
      return { newlyCompleted: [], allCompleted: false };
    }

    const newlyCompleted: string[] = [];

    const updatedChallenges = doc.challenges.map((challenge) => {
      const update = args.updates.find((u) => u.type === challenge.type);
      if (!update) return challenge;

      // Calculate new current value
      let newCurrent: number;
      if (update.isAbsolute) {
        // For accuracy, we set the value directly
        newCurrent = update.value;
      } else {
        // For questions/streak, we take the max (streak) or increment (questions)
        if (challenge.type === "streak") {
          // For streak, we want the max streak achieved
          newCurrent = Math.max(challenge.current, update.value);
        } else {
          // For questions, we increment
          newCurrent = challenge.current + update.value;
        }
      }

      // Cap at target
      newCurrent = Math.min(newCurrent, challenge.target);

      const completed = newCurrent >= challenge.target;

      if (completed && !challenge.completed) {
        newlyCompleted.push(challenge.id);
      }

      return {
        ...challenge,
        current: newCurrent,
        completed,
      };
    });

    const allCompleted = updatedChallenges.every((c) => c.completed);

    await ctx.db.patch(doc._id, {
      challenges: updatedChallenges,
      allCompleted,
    });

    return { newlyCompleted, allCompleted };
  },
});

// Claim bonus for completing all challenges
export const claimDailyBonus = mutation({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    const today = getTodayString();

    const doc = await ctx.db
      .query("dailyChallenges")
      .withIndex("by_visitor_and_date", (q) =>
        q.eq("visitorId", args.visitorId).eq("date", today)
      )
      .first();

    if (!doc || !doc.allCompleted || doc.bonusClaimed) {
      return { success: false, bonus: 0 };
    }

    // Calculate total bonus (sum of all rewards + 50% bonus)
    const totalRewards = doc.challenges.reduce(
      (sum, c) => sum + (c.reward.type === "points" ? Number(c.reward.value) : 0),
      0
    );
    const bonus = Math.floor(totalRewards * 0.5);

    await ctx.db.patch(doc._id, {
      bonusClaimed: true,
    });

    return { success: true, bonus };
  },
});

// Get challenge history (for stats)
export const getChallengeHistory = query({
  args: {
    visitorId: v.string(),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const limit = args.limit ?? 7;

    const history = await ctx.db
      .query("dailyChallenges")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .order("desc")
      .take(limit);

    return history;
  },
});

// Get streak of days with all challenges completed
export const getDailyStreak = query({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    const history = await ctx.db
      .query("dailyChallenges")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .order("desc")
      .take(60); // Check last 60 days max

    let streak = 0;
    const today = new Date();

    for (let i = 0; i < 60; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(checkDate.getDate() - i);
      const dateStr = checkDate.toISOString().split("T")[0];

      const dayRecord = history.find((h) => h.date === dateStr);

      if (dayRecord?.allCompleted) {
        streak++;
      } else if (i > 0) {
        // Allow today to be incomplete, but break on any other incomplete day
        break;
      }
    }

    return streak;
  },
});
