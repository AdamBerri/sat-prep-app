"use node";

import { internalAction } from "./_generated/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import { GoogleGenAI } from "@google/genai";

// ─────────────────────────────────────────────────────────
// NANO BANANA PRO (GEMINI 3 PRO IMAGE) GENERATION
// ─────────────────────────────────────────────────────────

/**
 * Initialize the Gemini client with API key from environment.
 */
function getGeminiClient() {
  const apiKey = process.env.GOOGLE_AI_STUDIO_API_KEY;
  if (!apiKey) {
    throw new Error(
      "GOOGLE_AI_STUDIO_API_KEY environment variable is required. " +
        "Add it to your .env.local file and Convex dashboard."
    );
  }
  return new GoogleGenAI({ apiKey });
}

/**
 * Generate a single image using Nano Banana Pro and store it in Convex.
 * Uses gemini-3-pro-image-preview with built-in "Thinking" for accurate rendering.
 */
async function generateAndStoreImage(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ctx: any,
  description: string,
  altText: string
): Promise<{ imageId: string } | { error: string }> {
  try {
    const ai = getGeminiClient();

    // Use Nano Banana Pro (gemini-3-pro-image-preview)
    // The model has built-in "Thinking" that handles complex instructions
    const response = await ai.models.generateContent({
      model: "gemini-3-pro-image-preview",
      contents: description,
      config: {
        responseModalities: ["TEXT", "IMAGE"],
        imageConfig: {
          aspectRatio: "4:3", // Good for graphs/charts
          imageSize: "2K",
        },
      },
    });

    // Extract image data from the response
    const imagePart = response.candidates?.[0]?.content?.parts?.find(
      (part: { inlineData?: { mimeType?: string; data?: string } }) =>
        part.inlineData?.mimeType?.startsWith("image/")
    );

    if (!imagePart?.inlineData?.data) {
      return { error: "No image generated in response" };
    }

    // Convert base64 to binary
    const imageData = imagePart.inlineData.data;
    const mimeType = imagePart.inlineData.mimeType || "image/png";

    // Decode base64 to Uint8Array
    const binaryString = atob(imageData);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    const blob = new Blob([bytes], { type: mimeType });

    // Get upload URL from Convex storage
    const uploadUrl = (await ctx.runMutation(
      internal.images.generateUploadUrlInternal
    )) as string;

    // Upload the image to Convex storage
    const uploadResponse = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": mimeType },
      body: blob,
    });

    if (!uploadResponse.ok) {
      return { error: `Failed to upload image: ${uploadResponse.statusText}` };
    }

    const { storageId } = await uploadResponse.json();

    // Store image metadata in the database
    // 4:3 aspect ratio at 2K = approximately 1600x1200
    const imageId = (await ctx.runMutation(internal.images.storeImageInternal, {
      storageId,
      width: 1600,
      height: 1200,
      altText: altText,
      aspectRatio: 4 / 3,
    })) as string;

    return { imageId: imageId.toString() };
  } catch (error) {
    console.error("Nano Banana Pro image generation error:", error);
    return {
      error: error instanceof Error ? error.message : "Unknown error occurred",
    };
  }
}

/**
 * Batch generate images for multiple graph questions.
 * Processes sequentially with rate limiting to avoid API limits.
 */
export const batchGenerateImages = internalAction({
  args: {
    requests: v.array(
      v.object({
        graphType: v.string(),
        description: v.string(),
        altText: v.string(),
        questionIndex: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const results: Array<{
      questionIndex: number;
      imageId?: string;
      error?: string;
    }> = [];

    console.log(`Starting batch generation of ${args.requests.length} images with Nano Banana Pro...`);

    // Process sequentially to respect rate limits
    for (const request of args.requests) {
      console.log(
        `Generating image ${request.questionIndex + 1}/${args.requests.length}: ${request.graphType}`
      );

      try {
        const result = await generateAndStoreImage(
          ctx,
          request.description,
          request.altText
        );

        if ("error" in result) {
          console.error(
            `Failed to generate image ${request.questionIndex}: ${result.error}`
          );
          results.push({
            questionIndex: request.questionIndex,
            error: result.error,
          });
        } else {
          console.log(
            `Successfully generated image ${request.questionIndex}: ${result.imageId}`
          );
          results.push({
            questionIndex: request.questionIndex,
            imageId: result.imageId,
          });
        }
      } catch (error) {
        console.error(`Exception generating image ${request.questionIndex}:`, error);
        results.push({
          questionIndex: request.questionIndex,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }

      // Rate limiting: wait 2 seconds between requests
      // Nano Banana Pro may have stricter limits during preview
      await new Promise((resolve) => setTimeout(resolve, 2000));
    }

    console.log(
      `Batch generation complete. Success: ${results.filter((r) => r.imageId).length}/${args.requests.length}`
    );

    // After all images are generated, create the questions
    if (results.some((r) => r.imageId)) {
      console.log("Creating graph questions with generated images...");
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const createResult = await ctx.runMutation(
        (internal as any).seed.createGraphQuestionsWithImages,
        { imageResults: results }
      );
      console.log(`Created ${createResult.created} questions, ${createResult.errors} errors`);
    }

    return results;
  },
});
