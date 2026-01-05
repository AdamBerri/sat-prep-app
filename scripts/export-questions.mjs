#!/usr/bin/env node
/**
 * Export Verified Questions Script
 *
 * Exports verified questions from dev Convex to a JSON file.
 * Includes all related data and base64-encoded images.
 *
 * Usage:
 *   CONVEX_URL=$DEV_CONVEX_URL node scripts/export-questions.mjs
 *   CONVEX_URL=$DEV_CONVEX_URL node scripts/export-questions.mjs --output custom-export.json
 *
 * Or use npm script:
 *   npm run export:questions
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.mjs";
import * as fs from "fs";

// ─────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────

const BATCH_SIZE = 50;
const outputArgIndex = process.argv.indexOf("--output");
const OUTPUT_FILE =
  outputArgIndex !== -1
    ? process.argv[outputArgIndex + 1]
    : `questions-export-${new Date().toISOString().split("T")[0]}.json`;

// ─────────────────────────────────────────────────────────
// CLIENT SETUP
// ─────────────────────────────────────────────────────────

const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("Error: CONVEX_URL environment variable is required");
  console.error("This should point to your DEV Convex deployment");
  console.error("");
  console.error("Example:");
  console.error(
    '  CONVEX_URL="https://your-dev-deployment.convex.cloud" npm run export:questions'
  );
  process.exit(1);
}

const convex = new ConvexHttpClient(CONVEX_URL);

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

async function fetchImageAsBase64(url) {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      console.error(`  Failed to fetch image: ${response.status}`);
      return null;
    }
    const buffer = await response.arrayBuffer();
    const base64 = Buffer.from(buffer).toString("base64");

    // Detect mime type from magic bytes
    const bytes = new Uint8Array(buffer);
    let mimeType = "image/png";
    if (bytes[0] === 0xff && bytes[1] === 0xd8) mimeType = "image/jpeg";
    if (bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46)
      mimeType = "image/gif";
    if (bytes[0] === 0x52 && bytes[1] === 0x49 && bytes[8] === 0x57)
      mimeType = "image/webp";

    return { base64, mimeType };
  } catch (error) {
    console.error(`  Error fetching image: ${error.message}`);
    return null;
  }
}

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────

async function main() {
  console.log(
    "╔════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║         SAT Questions Export (Dev → JSON)                  ║"
  );
  console.log(
    "╚════════════════════════════════════════════════════════════╝"
  );
  console.log("");
  console.log(`Source: ${CONVEX_URL}`);
  console.log(`Output: ${OUTPUT_FILE}`);
  console.log("");

  // First get stats
  console.log("Fetching export statistics...");
  const stats = await convex.query(api.questionExport.getExportStats, {});
  console.log(`  Total verified questions: ${stats.totalVerified}`);
  console.log(`  Reading/Writing: ${stats.byCategory.reading_writing}`);
  console.log(`  Math: ${stats.byCategory.math}`);
  console.log(`  With figures: ${stats.withFigures}`);
  console.log(`  With passages: ${stats.withPassages}`);
  console.log("");

  if (stats.totalVerified === 0) {
    console.log("No verified questions to export.");
    process.exit(0);
  }

  const exportData = {
    exportedAt: new Date().toISOString(),
    sourceDeployment: CONVEX_URL,
    passages: {}, // Deduplicated passages by ID
    images: {}, // Images with base64 data by ID
    questions: [],
  };

  let offset = 0;
  let totalFetched = 0;

  // Fetch all verified questions in batches
  console.log("Fetching verified questions...");

  while (true) {
    const result = await convex.query(
      api.questionExport.getVerifiedQuestionsForExport,
      {
        limit: BATCH_SIZE,
        offset,
      }
    );

    if (result.questions.length === 0) break;

    for (const item of result.questions) {
      const {
        question,
        options,
        passage,
        passage2,
        passage2Id,
        passageFigures,
        explanation,
        image,
        imageUrl,
      } = item;

      // Store passage (deduplicated)
      if (passage && !exportData.passages[passage._id]) {
        exportData.passages[passage._id] = passage;
      }
      if (passage2 && !exportData.passages[passage2._id]) {
        exportData.passages[passage2._id] = passage2;
      }

      // Fetch and store question figure image as base64
      if (image && imageUrl && !exportData.images[image._id]) {
        console.log(`  Fetching figure image for question...`);
        const imageData = await fetchImageAsBase64(imageUrl);
        if (imageData) {
          exportData.images[image._id] = {
            ...image,
            base64: imageData.base64,
            mimeType: imageData.mimeType,
          };
        }
      }

      // Fetch passage figure images
      for (const pf of passageFigures) {
        if (pf.image && pf.imageUrl && !exportData.images[pf.image._id]) {
          console.log(`  Fetching passage figure image...`);
          const imageData = await fetchImageAsBase64(pf.imageUrl);
          if (imageData) {
            exportData.images[pf.image._id] = {
              ...pf.image,
              base64: imageData.base64,
              mimeType: imageData.mimeType,
            };
          }
        }
      }

      // Fetch option images
      for (const opt of options) {
        if (opt.image && opt.imageUrl && !exportData.images[opt.image._id]) {
          console.log(`  Fetching option image...`);
          const imageData = await fetchImageAsBase64(opt.imageUrl);
          if (imageData) {
            exportData.images[opt.image._id] = {
              ...opt.image,
              base64: imageData.base64,
              mimeType: imageData.mimeType,
            };
          }
        }
      }

      // Store question with all data
      exportData.questions.push({
        question,
        options: options.map((o) => ({
          key: o.key,
          content: o.content,
          order: o.order,
          imageId: o.imageId,
        })),
        passageId: passage?._id,
        passage2Id: passage2Id,
        passageFigures: passageFigures.map((pf) => ({
          figureNumber: pf.figureNumber,
          caption: pf.caption,
          placement: pf.placement,
          insertAfterParagraph: pf.insertAfterParagraph,
          imageId: pf.imageId,
        })),
        explanation,
      });
    }

    totalFetched += result.questions.length;
    console.log(`  Fetched ${totalFetched}/${result.total} questions...`);

    if (!result.hasMore) break;
    offset = result.nextOffset;
  }

  console.log("");
  console.log(`Total questions: ${exportData.questions.length}`);
  console.log(`Total passages: ${Object.keys(exportData.passages).length}`);
  console.log(`Total images: ${Object.keys(exportData.images).length}`);

  // Create final export object with summary
  const finalExport = {
    exportedAt: exportData.exportedAt,
    sourceDeployment: exportData.sourceDeployment,
    summary: {
      totalQuestions: exportData.questions.length,
      totalPassages: Object.keys(exportData.passages).length,
      totalImages: Object.keys(exportData.images).length,
      byCategory: {
        reading_writing: exportData.questions.filter(
          (q) => q.question.category === "reading_writing"
        ).length,
        math: exportData.questions.filter(
          (q) => q.question.category === "math"
        ).length,
      },
    },
    passages: exportData.passages,
    images: exportData.images,
    questions: exportData.questions,
  };

  // Write to file
  console.log("");
  console.log(`Writing to ${OUTPUT_FILE}...`);
  fs.writeFileSync(OUTPUT_FILE, JSON.stringify(finalExport, null, 2));

  const stats2 = fs.statSync(OUTPUT_FILE);
  console.log(`  File size: ${(stats2.size / 1024 / 1024).toFixed(2)} MB`);

  console.log("");
  console.log("Export complete!");
  console.log("");
  console.log("Next steps:");
  console.log(
    `  1. Copy ${OUTPUT_FILE} to where you can access production`
  );
  console.log(
    `  2. Run: CONVEX_URL=$PROD_URL npm run import:questions ${OUTPUT_FILE}`
  );
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
