import { mutation, query, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// ─────────────────────────────────────────────────────────
// FILE STORAGE FUNCTIONS
// ─────────────────────────────────────────────────────────

/**
 * Generate an upload URL for file storage.
 * Client can POST an image to this URL.
 */
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});

/**
 * Store image metadata after upload.
 * Returns the imageId for referencing in questions.
 */
export const storeImage = mutation({
  args: {
    storageId: v.id("_storage"),
    width: v.number(),
    height: v.number(),
    altText: v.string(),
    aspectRatio: v.optional(v.number()),
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

/**
 * Get a displayable URL for an image by its ID.
 */
export const getImageUrl = query({
  args: { imageId: v.id("images") },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image) return null;
    return await ctx.storage.getUrl(image.storageId);
  },
});

/**
 * Get multiple image URLs at once (for batch loading).
 */
export const getImageUrls = query({
  args: { imageIds: v.array(v.id("images")) },
  handler: async (ctx, args) => {
    const results: Record<string, string | null> = {};
    for (const imageId of args.imageIds) {
      const image = await ctx.db.get(imageId);
      if (image) {
        results[imageId] = await ctx.storage.getUrl(image.storageId);
      } else {
        results[imageId] = null;
      }
    }
    return results;
  },
});

/**
 * Get image metadata by ID.
 */
export const getImage = query({
  args: { imageId: v.id("images") },
  handler: async (ctx, args) => {
    const image = await ctx.db.get(args.imageId);
    if (!image) return null;
    const url = await ctx.storage.getUrl(image.storageId);
    return { ...image, url };
  },
});

// ─────────────────────────────────────────────────────────
// INTERNAL MUTATIONS (for use in actions)
// ─────────────────────────────────────────────────────────

/**
 * Internal mutation for storing image from an action.
 * Used by geminiImages.ts after generating images.
 */
export const storeImageInternal = internalMutation({
  args: {
    storageId: v.id("_storage"),
    width: v.number(),
    height: v.number(),
    altText: v.string(),
    aspectRatio: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const imageId = await ctx.db.insert("images", {
      storageId: args.storageId,
      width: args.width,
      height: args.height,
      aspectRatio: args.aspectRatio ?? args.width / args.height,
      altText: args.altText,
    });
    return imageId;
  },
});

/**
 * Internal mutation to generate upload URL from an action.
 */
export const generateUploadUrlInternal = internalMutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
