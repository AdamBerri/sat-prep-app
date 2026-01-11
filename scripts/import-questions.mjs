#!/usr/bin/env node
/**
 * Import Questions Script
 *
 * Imports questions from a JSON export file into production Convex.
 * Handles image uploads and ID remapping.
 *
 * Usage:
 *   CONVEX_URL=$PROD_CONVEX_URL node scripts/import-questions.mjs questions-export.json
 *   CONVEX_URL=$PROD_CONVEX_URL node scripts/import-questions.mjs questions-export.json --dry-run
 *
 * Or use npm script:
 *   npm run import:questions questions-export.json
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import * as fs from "fs";

// ─────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────

const INPUT_FILE = process.argv[2];
const DRY_RUN = process.argv.includes("--dry-run");
const SKIP_EXISTING = process.argv.includes("--skip-existing");
const CONCURRENT_UPLOADS = 3;

// ─────────────────────────────────────────────────────────
// CLIENT SETUP
// ─────────────────────────────────────────────────────────

const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("Error: CONVEX_URL environment variable is required");
  console.error("This should point to your PRODUCTION Convex deployment");
  console.error("");
  console.error("Example:");
  console.error(
    '  CONVEX_URL="https://your-prod-deployment.convex.cloud" npm run import:questions export.json'
  );
  process.exit(1);
}

if (!INPUT_FILE) {
  console.error("Error: Input file is required");
  console.error("");
  console.error("Usage:");
  console.error("  npm run import:questions <export-file.json> [--dry-run] [--skip-existing]");
  console.error("");
  console.error("Options:");
  console.error("  --dry-run        Preview what would be imported without making changes");
  console.error("  --skip-existing  Skip questions that already exist (by prompt matching)");
  process.exit(1);
}

if (!fs.existsSync(INPUT_FILE)) {
  console.error(`Error: File not found: ${INPUT_FILE}`);
  process.exit(1);
}

const convex = new ConvexHttpClient(CONVEX_URL);

// ─────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function uploadImage(imageData) {
  // Get upload URL
  const uploadUrl = await convex.mutation(
    api.questionImport.generateImportUploadUrl,
    {}
  );

  // Convert base64 to blob
  const binaryData = Buffer.from(imageData.base64, "base64");

  // Upload to Convex storage
  const response = await fetch(uploadUrl, {
    method: "POST",
    headers: { "Content-Type": imageData.mimeType || "image/png" },
    body: binaryData,
  });

  if (!response.ok) {
    throw new Error(`Upload failed: ${response.status} ${response.statusText}`);
  }

  const { storageId } = await response.json();

  // Create image record
  const imageId = await convex.mutation(
    api.questionImport.storeImportedImage,
    {
      storageId,
      width: imageData.width,
      height: imageData.height,
      altText: imageData.altText,
      aspectRatio: imageData.aspectRatio,
      blurhash: imageData.blurhash,
    }
  );

  return imageId;
}

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────

async function main() {
  console.log(
    "╔════════════════════════════════════════════════════════════╗"
  );
  console.log(
    "║         SAT Questions Import (JSON → Prod)                 ║"
  );
  console.log(
    "╚════════════════════════════════════════════════════════════╝"
  );
  console.log("");
  console.log(`Target: ${CONVEX_URL}`);
  console.log(`Input: ${INPUT_FILE}`);
  console.log(`Dry Run: ${DRY_RUN}`);
  console.log(`Skip Existing: ${SKIP_EXISTING}`);
  console.log("");

  // Read export file
  console.log("Reading export file...");
  const exportData = JSON.parse(fs.readFileSync(INPUT_FILE, "utf-8"));

  console.log(`  Export date: ${exportData.exportedAt}`);
  console.log(`  Source: ${exportData.sourceDeployment}`);
  console.log(`  Questions: ${exportData.summary.totalQuestions}`);
  console.log(`  Passages: ${exportData.summary.totalPassages}`);
  console.log(`  Images: ${exportData.summary.totalImages}`);
  console.log("");

  // Get current production stats
  console.log("Checking current production stats...");
  const prodStats = await convex.query(api.questionImport.getImportStats, {});
  console.log(`  Current verified questions: ${prodStats.totalVerified}`);
  console.log(`  Current passages: ${prodStats.totalPassages}`);
  console.log(`  Current images: ${prodStats.totalImages}`);
  console.log("");

  if (DRY_RUN) {
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("                        DRY RUN MODE                           ");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("");
    console.log("Would import:");
    console.log(`  - ${exportData.summary.totalPassages} passages (deduped by content)`);
    console.log(`  - ${exportData.summary.totalImages} images`);
    console.log(`  - ${exportData.summary.totalQuestions} questions`);
    console.log("");
    console.log("Category breakdown:");
    console.log(`  - Reading/Writing: ${exportData.summary.byCategory.reading_writing}`);
    console.log(`  - Math: ${exportData.summary.byCategory.math}`);
    console.log("");
    console.log("No changes were made. Remove --dry-run to actually import.");
    return;
  }

  // ID remapping: old dev IDs → new prod IDs
  const passageIdMap = new Map();
  const imageIdMap = new Map();

  // Step 1: Upload images
  console.log("Uploading images...");
  const imageEntries = Object.entries(exportData.images);
  let imagesUploaded = 0;
  let imageErrors = [];

  for (let i = 0; i < imageEntries.length; i += CONCURRENT_UPLOADS) {
    const batch = imageEntries.slice(i, i + CONCURRENT_UPLOADS);
    const results = await Promise.allSettled(
      batch.map(async ([oldId, imageData]) => {
        const newId = await uploadImage(imageData);
        return { oldId, newId };
      })
    );

    for (const result of results) {
      if (result.status === "fulfilled") {
        imageIdMap.set(result.value.oldId, result.value.newId);
        imagesUploaded++;
      } else {
        imageErrors.push({ error: result.reason.message });
      }
    }

    console.log(`  Uploaded ${imagesUploaded}/${imageEntries.length} images`);

    // Brief pause to avoid rate limits
    if (i + CONCURRENT_UPLOADS < imageEntries.length) {
      await sleep(300);
    }
  }

  // Step 2: Import passages
  console.log("");
  console.log("Importing passages...");
  const passageEntries = Object.entries(exportData.passages);
  let passagesCreated = 0;
  let passagesSkipped = 0;

  let passageErrors = [];
  for (const [oldId, passage] of passageEntries) {
    try {
      const result = await convex.mutation(api.questionImport.importPassage, {
        title: passage.title,
        author: passage.author,
        source: passage.source,
        content: passage.content,
        passageType: passage.passageType,
        complexity: passage.complexity,
        analyzedFeatures: passage.analyzedFeatures,
        generationType: passage.generationType,
        usedInQuestionCount: passage.usedInQuestionCount,
        originalId: oldId,
      });

      passageIdMap.set(oldId, result.passageId);
      if (result.created) {
        passagesCreated++;
      } else {
        passagesSkipped++;
      }
    } catch (error) {
      console.error(`  ERROR importing passage ${oldId}: ${error.message}`);
      passageErrors.push({ oldId, error: error.message });
    }
  }
  console.log(
    `  Created: ${passagesCreated}, Skipped (duplicate): ${passagesSkipped}, Errors: ${passageErrors.length}`
  );

  // FAIL FAST: If any passages failed, stop and report
  if (passageErrors.length > 0) {
    console.error("");
    console.error("═══════════════════════════════════════════════════════════════");
    console.error("  IMPORT ABORTED: Passage import errors detected!");
    console.error("═══════════════════════════════════════════════════════════════");
    console.error("");
    console.error("The following passages failed to import:");
    for (const { oldId, error } of passageErrors.slice(0, 10)) {
      console.error(`  - ${oldId.substring(0, 40)}...`);
      console.error(`    Error: ${error}`);
    }
    if (passageErrors.length > 10) {
      console.error(`  ... and ${passageErrors.length - 10} more`);
    }
    console.error("");
    console.error("Questions were NOT imported to prevent orphaned references.");
    console.error("Fix the passage issues and re-run the import.");
    process.exit(1);
  }

  // Step 3: Import passage figures
  console.log("");
  console.log("Importing passage figures...");
  let passageFiguresCreated = 0;

  for (const item of exportData.questions) {
    if (item.passageFigures && item.passageFigures.length > 0) {
      const newPassageId = passageIdMap.get(item.passageId);
      if (!newPassageId) continue;

      for (const pf of item.passageFigures) {
        const newImageId = imageIdMap.get(pf.imageId);
        if (!newImageId) continue;

        try {
          await convex.mutation(api.questionImport.importPassageFigure, {
            passageId: newPassageId,
            imageId: newImageId,
            figureNumber: pf.figureNumber,
            caption: pf.caption,
            placement: pf.placement,
            insertAfterParagraph: pf.insertAfterParagraph,
          });
          passageFiguresCreated++;
        } catch (error) {
          console.error(`  Error importing passage figure: ${error.message}`);
        }
      }
    }
  }
  console.log(`  Created: ${passageFiguresCreated} passage figures`);

  // Step 4: Import questions
  console.log("");
  console.log("Importing questions...");
  let questionsImported = 0;
  let questionsSkipped = 0;
  let errors = [];

  for (const item of exportData.questions) {
    const { question, options, passageId, passage2Id, explanation } = item;

    try {
      // Check if question already exists (by prompt)
      if (SKIP_EXISTING) {
        const exists = await convex.query(
          api.questionImport.checkQuestionExists,
          { prompt: question.prompt }
        );
        if (exists.exists) {
          questionsSkipped++;
          continue;
        }
      }

      // Remap IDs - VALIDATE that passages exist if expected
      const newPassageId = passageId ? passageIdMap.get(passageId) : undefined;
      const newPassage2Id = passage2Id
        ? passageIdMap.get(passage2Id)
        : undefined;

      // CRITICAL: Fail if question expects a passage but we don't have it
      if (passageId && !newPassageId) {
        errors.push({
          prompt: question.prompt.substring(0, 50),
          error: `Missing passage: ${passageId} was not imported`,
        });
        continue; // Skip this question
      }
      if (passage2Id && !newPassage2Id) {
        errors.push({
          prompt: question.prompt.substring(0, 50),
          error: `Missing passage2: ${passage2Id} was not imported`,
        });
        continue; // Skip this question
      }

      // Remap figure imageId if present
      let figure = undefined;
      if (question.figure?.imageId) {
        const newImageId = imageIdMap.get(question.figure.imageId);
        if (newImageId) {
          figure = {
            imageId: newImageId,
            figureType: question.figure.figureType,
            caption: question.figure.caption,
          };
        }
      }

      // Remap option imageIds if present
      const mappedOptions = options.map((opt) => ({
        key: opt.key,
        content: opt.content,
        order: opt.order,
        imageId: opt.imageId ? imageIdMap.get(opt.imageId) : undefined,
      }));

      await convex.mutation(api.questionImport.importQuestion, {
        type: question.type,
        category: question.category,
        domain: question.domain,
        skill: question.skill,
        difficulty: question.difficulty,
        overallDifficulty: question.overallDifficulty,
        mathDifficulty: question.mathDifficulty,
        rwDifficulty: question.rwDifficulty,
        prompt: question.prompt,
        correctAnswer: question.correctAnswer,
        tags: question.tags || [],
        source: question.source,
        generationMetadata: question.generationMetadata,
        grammarData: question.grammarData,
        lineReference: question.lineReference,
        reviewStatus: question.reviewStatus,
        reviewMetadata: question.reviewMetadata,
        improvementHistory: question.improvementHistory,
        passageId: newPassageId,
        passage2Id: newPassage2Id,
        figure,
        options: mappedOptions,
        explanation: explanation
          ? {
              correctExplanation: explanation.correctExplanation,
              wrongAnswerExplanations: explanation.wrongAnswerExplanations,
              commonMistakes: explanation.commonMistakes,
              videoUrl: explanation.videoUrl,
            }
          : undefined,
        originalQuestionId: question._id,
      });

      questionsImported++;
      if (questionsImported % 10 === 0) {
        console.log(
          `  Imported ${questionsImported}/${exportData.questions.length} questions`
        );
      }
    } catch (error) {
      errors.push({ questionId: question._id, error: error.message });
    }
  }

  // Summary
  console.log("");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("                          SUMMARY                              ");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log(`  Images uploaded:      ${imagesUploaded}`);
  console.log(`  Passages created:     ${passagesCreated}`);
  console.log(`  Passages skipped:     ${passagesSkipped}`);
  console.log(`  Passage figures:      ${passageFiguresCreated}`);
  console.log(`  Questions imported:   ${questionsImported}`);
  if (SKIP_EXISTING) {
    console.log(`  Questions skipped:    ${questionsSkipped}`);
  }
  console.log(`  Errors:               ${errors.length + imageErrors.length}`);

  if (errors.length > 0) {
    console.log("");
    console.log("Question Errors:");
    errors.slice(0, 10).forEach((e) => console.log(`  - ${e.questionId}: ${e.error}`));
    if (errors.length > 10) {
      console.log(`  ... and ${errors.length - 10} more`);
    }
  }

  // Final stats
  console.log("");
  console.log("Verifying final stats...");
  const finalStats = await convex.query(api.questionImport.getImportStats, {});
  console.log(`  Total verified questions: ${finalStats.totalVerified}`);
  console.log(`  Total passages: ${finalStats.totalPassages}`);
  console.log(`  Total images: ${finalStats.totalImages}`);

  console.log("");
  console.log("Import complete!");
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
