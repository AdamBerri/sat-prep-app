import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

// Default settings
const DEFAULT_SETTINGS = {
  soundEnabled: true,
  soundVolume: 0.7,
  confettiEnabled: true,
};

// Get user settings
export const getSettings = query({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userGamificationSettings")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .first();

    if (!settings) {
      return { ...DEFAULT_SETTINGS, visitorId: args.visitorId };
    }

    return settings;
  },
});

// Update user settings
export const updateSettings = mutation({
  args: {
    visitorId: v.string(),
    soundEnabled: v.optional(v.boolean()),
    soundVolume: v.optional(v.number()),
    confettiEnabled: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("userGamificationSettings")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .first();

    const updates: Partial<{
      soundEnabled: boolean;
      soundVolume: number;
      confettiEnabled: boolean;
    }> = {};

    if (args.soundEnabled !== undefined) {
      updates.soundEnabled = args.soundEnabled;
    }
    if (args.soundVolume !== undefined) {
      updates.soundVolume = Math.max(0, Math.min(1, args.soundVolume));
    }
    if (args.confettiEnabled !== undefined) {
      updates.confettiEnabled = args.confettiEnabled;
    }

    if (existing) {
      await ctx.db.patch(existing._id, updates);
      return await ctx.db.get(existing._id);
    } else {
      const id = await ctx.db.insert("userGamificationSettings", {
        visitorId: args.visitorId,
        soundEnabled: args.soundEnabled ?? DEFAULT_SETTINGS.soundEnabled,
        soundVolume: args.soundVolume ?? DEFAULT_SETTINGS.soundVolume,
        confettiEnabled: args.confettiEnabled ?? DEFAULT_SETTINGS.confettiEnabled,
      });
      return await ctx.db.get(id);
    }
  },
});

// Toggle sound
export const toggleSound = mutation({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userGamificationSettings")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .first();

    if (settings) {
      await ctx.db.patch(settings._id, {
        soundEnabled: !settings.soundEnabled,
      });
      return !settings.soundEnabled;
    } else {
      await ctx.db.insert("userGamificationSettings", {
        visitorId: args.visitorId,
        soundEnabled: false, // Toggle from default true
        soundVolume: DEFAULT_SETTINGS.soundVolume,
        confettiEnabled: DEFAULT_SETTINGS.confettiEnabled,
      });
      return false;
    }
  },
});

// Toggle confetti
export const toggleConfetti = mutation({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    const settings = await ctx.db
      .query("userGamificationSettings")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .first();

    if (settings) {
      await ctx.db.patch(settings._id, {
        confettiEnabled: !settings.confettiEnabled,
      });
      return !settings.confettiEnabled;
    } else {
      await ctx.db.insert("userGamificationSettings", {
        visitorId: args.visitorId,
        soundEnabled: DEFAULT_SETTINGS.soundEnabled,
        soundVolume: DEFAULT_SETTINGS.soundVolume,
        confettiEnabled: false, // Toggle from default true
      });
      return false;
    }
  },
});
