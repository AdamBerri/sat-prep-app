#!/usr/bin/env node
/**
 * Repair Passage Links Script
 *
 * This script:
 * 1. Imports missing passages from the generator-import.json file
 * 2. Updates existing questions to link to their passages
 *
 * Usage:
 *   CONVEX_URL=$PROD_CONVEX_URL node scripts/repair-passage-links.mjs generator-import.json
 *   CONVEX_URL=$PROD_CONVEX_URL node scripts/repair-passage-links.mjs generator-import.json --dry-run
 */

import { ConvexHttpClient } from "convex/browser";
import { api } from "../convex/_generated/api.js";
import * as fs from "fs";

// ─────────────────────────────────────────────────────────
// CONFIGURATION
// ─────────────────────────────────────────────────────────

const INPUT_FILE = process.argv[2];
const DRY_RUN = process.argv.includes("--dry-run");

// ─────────────────────────────────────────────────────────
// CLIENT SETUP
// ─────────────────────────────────────────────────────────

const CONVEX_URL = process.env.CONVEX_URL || process.env.NEXT_PUBLIC_CONVEX_URL;
if (!CONVEX_URL) {
  console.error("Error: CONVEX_URL environment variable is required");
  process.exit(1);
}

if (!INPUT_FILE) {
  console.error("Error: Input file is required");
  console.error("Usage: node scripts/repair-passage-links.mjs <export-file.json> [--dry-run]");
  process.exit(1);
}

if (!fs.existsSync(INPUT_FILE)) {
  console.error(`Error: File not found: ${INPUT_FILE}`);
  process.exit(1);
}

const convex = new ConvexHttpClient(CONVEX_URL);

// ─────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────

async function main() {
  console.log("╔════════════════════════════════════════════════════════════╗");
  console.log("║         Repair Passage Links                               ║");
  console.log("╚════════════════════════════════════════════════════════════╝");
  console.log("");
  console.log(`Target: ${CONVEX_URL}`);
  console.log(`Input: ${INPUT_FILE}`);
  console.log(`Dry Run: ${DRY_RUN}`);
  console.log("");

  // Read export file
  console.log("Reading export file...");
  const exportData = JSON.parse(fs.readFileSync(INPUT_FILE, "utf-8"));

  console.log(`  Passages in file: ${Object.keys(exportData.passages).length}`);
  console.log(`  Questions in file: ${exportData.questions.length}`);
  console.log("");

  // Build a map from passage content hash to passage data
  // This helps us match passages by content since IDs might differ
  const passagesByContent = new Map();
  for (const [oldId, passage] of Object.entries(exportData.passages)) {
    passagesByContent.set(passage.content, { oldId, ...passage });
  }

  // Build a map from question prompt to expected passageId
  const questionPassageMap = new Map();
  for (const item of exportData.questions) {
    if (item.passageId) {
      questionPassageMap.set(item.question.prompt, {
        oldPassageId: item.passageId,
        passageContent: exportData.passages[item.passageId]?.content,
      });
    }
  }

  console.log(`  Questions needing passages: ${questionPassageMap.size}`);
  console.log("");

  if (DRY_RUN) {
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("                        DRY RUN MODE                           ");
    console.log("═══════════════════════════════════════════════════════════════");
    console.log("");
    console.log("Would:");
    console.log(`  - Import up to ${Object.keys(exportData.passages).length} passages`);
    console.log(`  - Update up to ${questionPassageMap.size} questions with passage links`);
    console.log("");
    console.log("No changes were made. Remove --dry-run to actually repair.");
    return;
  }

  // Step 1: Import all passages (deduplicates automatically)
  console.log("Step 1: Importing passages...");
  const passageIdMap = new Map(); // oldId -> newId
  const contentToNewId = new Map(); // content -> newId (for matching)
  let passagesCreated = 0;
  let passagesSkipped = 0;
  let passageErrors = 0;

  for (const [oldId, passage] of Object.entries(exportData.passages)) {
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
      contentToNewId.set(passage.content, result.passageId);

      if (result.created) {
        passagesCreated++;
      } else {
        passagesSkipped++;
      }
    } catch (error) {
      passageErrors++;
      console.error(`  ERROR importing passage ${oldId.substring(0, 30)}...:`);
      console.error(`    ${error.message}`);

      // If this is a critical error, we should stop
      if (passageErrors > 5) {
        console.error("");
        console.error("Too many passage errors! Stopping.");
        console.error("Fix the issues above and re-run.");
        process.exit(1);
      }
    }
  }

  console.log(`  Created: ${passagesCreated}`);
  console.log(`  Skipped (duplicate): ${passagesSkipped}`);
  console.log(`  Errors: ${passageErrors}`);
  console.log("");

  if (passagesCreated + passagesSkipped === 0) {
    console.error("No passages were imported! Cannot proceed.");
    process.exit(1);
  }

  // Step 2: Get all questions from the database that need passage linking
  console.log("Step 2: Finding questions needing passage links...");

  // Fetch questions in batches
  let cursor = 0;
  const questionsNeedingRepair = [];

  while (true) {
    const result = await convex.query(api.admin.listQuestionsForAdmin, {
      limit: 100,
      cursor,
      category: "reading_writing",
    });

    for (const q of result.questions) {
      // Check if this question should have a passage but doesn't
      const expectedPassage = questionPassageMap.get(q.prompt);
      if (expectedPassage && !q.passage) {
        // Find the new passageId by content
        const newPassageId = passageIdMap.get(expectedPassage.oldPassageId) ||
                            contentToNewId.get(expectedPassage.passageContent);

        if (newPassageId) {
          questionsNeedingRepair.push({
            questionId: q._id,
            prompt: q.prompt.substring(0, 50) + "...",
            newPassageId,
          });
        }
      }
    }

    if (!result.nextCursor || result.questions.length === 0) break;
    cursor = result.nextCursor;
  }

  console.log(`  Found ${questionsNeedingRepair.length} questions needing passage links`);
  console.log("");

  // Step 3: Update questions with passage links
  console.log("Step 3: Updating questions with passage links...");
  let questionsUpdated = 0;
  let updateErrors = 0;

  for (const repair of questionsNeedingRepair) {
    try {
      await convex.mutation(api.questionImport.updateQuestionPassageId, {
        questionId: repair.questionId,
        passageId: repair.newPassageId,
      });
      questionsUpdated++;

      if (questionsUpdated % 50 === 0) {
        console.log(`  Updated ${questionsUpdated}/${questionsNeedingRepair.length}...`);
      }
    } catch (error) {
      updateErrors++;
      console.error(`  ERROR updating question: ${error.message}`);
    }
  }

  console.log(`  Updated: ${questionsUpdated}`);
  console.log(`  Errors: ${updateErrors}`);
  console.log("");

  // Summary
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("                        REPAIR COMPLETE                        ");
  console.log("═══════════════════════════════════════════════════════════════");
  console.log("");
  console.log(`Passages: ${passagesCreated} created, ${passagesSkipped} skipped, ${passageErrors} errors`);
  console.log(`Questions: ${questionsUpdated} updated, ${updateErrors} errors`);
  console.log("");

  if (passageErrors > 0 || updateErrors > 0) {
    console.log("⚠️  There were errors. Check the output above.");
  } else {
    console.log("✅ All repairs completed successfully!");
  }
}

main().catch((error) => {
  console.error("Fatal error:", error);
  process.exit(1);
});
