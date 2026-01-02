import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

// ─────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────

// Get user's subscription (active, trialing, or canceled but still valid)
export const getSubscription = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (!subscription) return null;

    // Return if active, trialing, or canceled but still within period
    if (
      subscription.status === "active" ||
      subscription.status === "trialing" ||
      (subscription.status === "canceled" &&
        subscription.currentPeriodEnd > Date.now())
    ) {
      return subscription;
    }

    return subscription;
  },
});

// Check if user has active subscription (for gating)
export const hasActiveSubscription = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .first();

    if (!subscription) return false;

    // Active or trialing
    if (
      subscription.status === "active" ||
      subscription.status === "trialing"
    ) {
      return true;
    }

    // Canceled but still within paid period
    if (
      subscription.status === "canceled" &&
      subscription.currentPeriodEnd > Date.now()
    ) {
      return true;
    }

    return false;
  },
});

// Get Stripe customer ID for user
export const getStripeCustomerId = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.userId))
      .first();

    return user?.stripeCustomerId ?? null;
  },
});

// Get subscription by Stripe subscription ID
export const getByStripeSubscriptionId = query({
  args: { stripeSubscriptionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();
  },
});

// ─────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────

// Set Stripe customer ID on user
export const setStripeCustomerId = mutation({
  args: {
    userId: v.string(),
    stripeCustomerId: v.string(),
  },
  handler: async (ctx, args) => {
    const user = await ctx.db
      .query("users")
      .withIndex("by_external_id", (q) => q.eq("externalId", args.userId))
      .first();

    if (user) {
      await ctx.db.patch(user._id, {
        stripeCustomerId: args.stripeCustomerId,
      });
    }
  },
});

// Create new subscription (called by webhook)
export const createSubscription = mutation({
  args: {
    userId: v.string(),
    stripeCustomerId: v.string(),
    stripeSubscriptionId: v.string(),
    stripePriceId: v.string(),
    plan: v.union(
      v.literal("monthly"),
      v.literal("three_month"),
      v.literal("annual")
    ),
    status: v.string(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
    trialStart: v.optional(v.number()),
    trialEnd: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if subscription already exists
    const existing = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    const subscriptionStatus = args.status as
      | "active"
      | "past_due"
      | "canceled"
      | "incomplete"
      | "incomplete_expired"
      | "trialing"
      | "unpaid"
      | "paused";

    if (existing) {
      // Update existing
      await ctx.db.patch(existing._id, {
        stripePriceId: args.stripePriceId,
        plan: args.plan,
        status: subscriptionStatus,
        currentPeriodStart: args.currentPeriodStart,
        currentPeriodEnd: args.currentPeriodEnd,
        cancelAtPeriodEnd: args.cancelAtPeriodEnd,
        trialStart: args.trialStart,
        trialEnd: args.trialEnd,
        updatedAt: Date.now(),
      });
      return existing._id;
    }

    // Create new
    return await ctx.db.insert("subscriptions", {
      userId: args.userId,
      stripeCustomerId: args.stripeCustomerId,
      stripeSubscriptionId: args.stripeSubscriptionId,
      stripePriceId: args.stripePriceId,
      plan: args.plan,
      status: subscriptionStatus,
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd,
      trialStart: args.trialStart,
      trialEnd: args.trialEnd,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

// Update subscription (called by webhook on subscription.updated)
export const updateSubscription = mutation({
  args: {
    stripeSubscriptionId: v.string(),
    stripePriceId: v.optional(v.string()),
    plan: v.optional(
      v.union(
        v.literal("monthly"),
        v.literal("three_month"),
        v.literal("annual")
      )
    ),
    status: v.string(),
    currentPeriodStart: v.number(),
    currentPeriodEnd: v.number(),
    cancelAtPeriodEnd: v.boolean(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    if (!subscription) {
      console.error(`Subscription not found: ${args.stripeSubscriptionId}`);
      return;
    }

    const subscriptionStatus = args.status as
      | "active"
      | "past_due"
      | "canceled"
      | "incomplete"
      | "incomplete_expired"
      | "trialing"
      | "unpaid"
      | "paused";

    await ctx.db.patch(subscription._id, {
      ...(args.stripePriceId && { stripePriceId: args.stripePriceId }),
      ...(args.plan && { plan: args.plan }),
      status: subscriptionStatus,
      currentPeriodStart: args.currentPeriodStart,
      currentPeriodEnd: args.currentPeriodEnd,
      cancelAtPeriodEnd: args.cancelAtPeriodEnd,
      updatedAt: Date.now(),
    });
  },
});

// Update subscription status only (for payment failures)
export const updateSubscriptionStatus = mutation({
  args: {
    stripeSubscriptionId: v.string(),
    status: v.string(),
  },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    if (subscription) {
      const subscriptionStatus = args.status as
        | "active"
        | "past_due"
        | "canceled"
        | "incomplete"
        | "incomplete_expired"
        | "trialing"
        | "unpaid"
        | "paused";

      await ctx.db.patch(subscription._id, {
        status: subscriptionStatus,
        updatedAt: Date.now(),
      });
    }
  },
});

// Cancel subscription (mark as canceled)
export const cancelSubscription = mutation({
  args: { stripeSubscriptionId: v.string() },
  handler: async (ctx, args) => {
    const subscription = await ctx.db
      .query("subscriptions")
      .withIndex("by_stripe_subscription_id", (q) =>
        q.eq("stripeSubscriptionId", args.stripeSubscriptionId)
      )
      .first();

    if (subscription) {
      await ctx.db.patch(subscription._id, {
        status: "canceled",
        updatedAt: Date.now(),
      });
    }
  },
});
