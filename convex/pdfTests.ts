import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ─────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────

// Get all active (purchasable) tests
export const getActiveTests = query({
  args: {},
  handler: async (ctx) => {
    const tests = await ctx.db
      .query("pdfTests")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Sort by test number
    return tests.sort((a, b) => a.testNumber - b.testNumber);
  },
});

// Get a single test by ID
export const getTestById = query({
  args: { testId: v.id("pdfTests") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.testId);
  },
});

// Get all of a user's purchases
export const getUserPurchases = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const purchases = await ctx.db
      .query("pdfPurchases")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("paymentStatus"), "completed"))
      .collect();

    // Get test details for each purchase
    const purchasesWithTests = await Promise.all(
      purchases.map(async (purchase) => {
        const tests = await Promise.all(
          purchase.testIds.map((testId) => ctx.db.get(testId))
        );
        return {
          ...purchase,
          tests: tests.filter(Boolean),
        };
      })
    );

    return purchasesWithTests.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Check if user has access to a specific test
export const hasAccessToTest = query({
  args: { userId: v.string(), testId: v.id("pdfTests") },
  handler: async (ctx, args) => {
    const purchases = await ctx.db
      .query("pdfPurchases")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("paymentStatus"), "completed"))
      .collect();

    return purchases.some((purchase) =>
      purchase.testIds.includes(args.testId)
    );
  },
});

// Get all test IDs a user has access to
export const getUserTestAccess = query({
  args: { userId: v.string() },
  handler: async (ctx, args) => {
    const purchases = await ctx.db
      .query("pdfPurchases")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("paymentStatus"), "completed"))
      .collect();

    const testIds = new Set<Id<"pdfTests">>();
    purchases.forEach((purchase) => {
      purchase.testIds.forEach((testId) => testIds.add(testId));
    });

    return Array.from(testIds);
  },
});

// Get download URL for a test PDF (if user has access)
export const getDownloadUrl = query({
  args: {
    userId: v.string(),
    testId: v.id("pdfTests"),
    fileType: v.union(v.literal("test"), v.literal("answers")),
  },
  handler: async (ctx, args) => {
    // Check access
    const purchases = await ctx.db
      .query("pdfPurchases")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("paymentStatus"), "completed"))
      .collect();

    const hasAccess = purchases.some((purchase) =>
      purchase.testIds.includes(args.testId)
    );

    if (!hasAccess) {
      return null;
    }

    // Get test
    const test = await ctx.db.get(args.testId);
    if (!test) return null;

    // Get download URL
    const storageId =
      args.fileType === "test" ? test.pdfStorageId : test.answerKeyStorageId;

    const url = await ctx.storage.getUrl(storageId);
    return url;
  },
});

// Get purchase by Stripe session ID
export const getPurchaseByStripeSession = query({
  args: { stripeCheckoutSessionId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("pdfPurchases")
      .withIndex("by_stripe_session", (q) =>
        q.eq("stripeCheckoutSessionId", args.stripeCheckoutSessionId)
      )
      .first();
  },
});

// ─────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────

// Create a pending purchase (called before Stripe checkout)
export const createPendingPurchase = mutation({
  args: {
    userId: v.string(),
    purchaseType: v.union(v.literal("single"), v.literal("bundle")),
    testIds: v.array(v.id("pdfTests")),
    amountPaid: v.number(),
  },
  handler: async (ctx, args) => {
    const purchaseId = await ctx.db.insert("pdfPurchases", {
      userId: args.userId,
      purchaseType: args.purchaseType,
      testIds: args.testIds,
      amountPaid: args.amountPaid,
      stripeCheckoutSessionId: "", // Will be updated
      paymentStatus: "pending",
      downloadCount: 0,
      createdAt: Date.now(),
    });

    return purchaseId;
  },
});

// Set Stripe session ID on purchase
export const setStripeSessionId = mutation({
  args: {
    purchaseId: v.id("pdfPurchases"),
    stripeCheckoutSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.purchaseId, {
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
    });
  },
});

// Confirm purchase (called by webhook)
export const confirmPurchase = mutation({
  args: {
    stripeCheckoutSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const purchase = await ctx.db
      .query("pdfPurchases")
      .withIndex("by_stripe_session", (q) =>
        q.eq("stripeCheckoutSessionId", args.stripeCheckoutSessionId)
      )
      .first();

    if (!purchase) {
      console.error(
        `Purchase not found for session: ${args.stripeCheckoutSessionId}`
      );
      return;
    }

    await ctx.db.patch(purchase._id, {
      paymentStatus: "completed",
      stripePaymentIntentId: args.stripePaymentIntentId,
      completedAt: Date.now(),
    });
  },
});

// Record a download
export const recordDownload = mutation({
  args: {
    userId: v.string(),
    testId: v.id("pdfTests"),
  },
  handler: async (ctx, args) => {
    // Find the purchase containing this test
    const purchases = await ctx.db
      .query("pdfPurchases")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .filter((q) => q.eq(q.field("paymentStatus"), "completed"))
      .collect();

    const purchase = purchases.find((p) => p.testIds.includes(args.testId));

    if (purchase) {
      await ctx.db.patch(purchase._id, {
        downloadCount: purchase.downloadCount + 1,
        lastDownloadedAt: Date.now(),
      });
    }
  },
});

// ─────────────────────────────────────────────────────────
// ADMIN MUTATIONS
// ─────────────────────────────────────────────────────────

// Create a new PDF test product
export const createPdfTest = mutation({
  args: {
    name: v.string(),
    description: v.string(),
    testNumber: v.number(),
    pdfStorageId: v.id("_storage"),
    answerKeyStorageId: v.id("_storage"),
    questionCount: v.number(),
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
      v.literal("mixed")
    ),
    previewImageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pdfTests", {
      ...args,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

// Update a PDF test
export const updatePdfTest = mutation({
  args: {
    testId: v.id("pdfTests"),
    name: v.optional(v.string()),
    description: v.optional(v.string()),
    isActive: v.optional(v.boolean()),
    pdfStorageId: v.optional(v.id("_storage")),
    answerKeyStorageId: v.optional(v.id("_storage")),
    previewImageStorageId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const { testId, ...updates } = args;
    const filteredUpdates = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );

    await ctx.db.patch(testId, filteredUpdates);
  },
});

// Generate upload URL for PDFs
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
