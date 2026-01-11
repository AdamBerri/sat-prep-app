#!/usr/bin/env node
/**
 * Validate Import Data Integrity
 *
 * Run BEFORE importing to catch issues:
 *   node scripts/validate-import-data.mjs generator-import.json
 *
 * Or use npm script:
 *   npm run validate:import generator-import.json
 */

import fs from 'fs';

// Valid passage types according to Convex schema
const VALID_PASSAGE_TYPES = [
  'literary_narrative',
  'social_science',
  'natural_science',
  'humanities'
];

// Skills that REQUIRE passages (reading/writing questions)
const SKILLS_REQUIRING_PASSAGE = [
  // Information and Ideas
  'central_ideas',
  'inferences',
  'command_of_evidence',
  'textual_evidence',

  // Craft and Structure
  'words_in_context',
  'text_structure',
  'cross_text_connections',
  'overall_purpose',

  // Expression of Ideas
  'rhetorical_synthesis',
  'transitions',

  // Standard English Conventions
  'boundaries',
  'form_structure_sense',
  'boundaries_between_sentences',
  'boundaries_within_sentences',
  'subject_verb_agreement',
  'pronoun_antecedent_agreement',
  'verb_finiteness',
  'verb_tense_aspect',
  'subject_modifier_placement',
  'genitives_plurals',
];

function validate(filePath) {
  if (!filePath) {
    console.error('Usage: node scripts/validate-import-data.mjs <import-file.json>');
    process.exit(1);
  }

  if (!fs.existsSync(filePath)) {
    console.error(`Error: File not found: ${filePath}`);
    process.exit(1);
  }

  const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  const errors = [];
  const warnings = [];

  // Stats tracking
  const stats = {
    totalQuestions: data.questions?.length || 0,
    totalPassages: Object.keys(data.passages || {}).length,
    readingWritingQuestions: 0,
    mathQuestions: 0,
    questionsWithPassage: 0,
    questionsWithoutPassage: 0,
    passagesByType: {},
  };

  console.log('\n');
  console.log('Validating import data...\n');

  // 1. Validate all passages have valid passageType
  console.log('Checking passages...');
  for (const [passageId, passage] of Object.entries(data.passages || {})) {
    // Check passageType is valid
    if (!VALID_PASSAGE_TYPES.includes(passage.passageType)) {
      errors.push(
        `Passage ${passageId}: Invalid passageType "${passage.passageType}". ` +
        `Valid types: ${VALID_PASSAGE_TYPES.join(', ')}`
      );
    }

    // Check content is not empty
    if (!passage.content || passage.content.trim() === '') {
      errors.push(`Passage ${passageId}: Empty content`);
    }

    // Track stats
    stats.passagesByType[passage.passageType] = (stats.passagesByType[passage.passageType] || 0) + 1;
  }
  console.log(`  Found ${stats.totalPassages} passages`);

  // 2. Validate all reading/writing questions have passages when required
  console.log('Checking questions...');
  for (const item of data.questions || []) {
    const { question, passageId } = item;

    // Track category
    if (question.category === 'reading_writing') {
      stats.readingWritingQuestions++;
    } else {
      stats.mathQuestions++;
    }

    // Track passage presence
    if (passageId) {
      stats.questionsWithPassage++;
    } else {
      stats.questionsWithoutPassage++;
    }

    // Check if this skill requires a passage
    if (question.category === 'reading_writing' && SKILLS_REQUIRING_PASSAGE.includes(question.skill)) {
      if (!passageId) {
        errors.push(
          `Question ${question._id} (skill: ${question.skill}): ` +
          `Missing passageId - REQUIRED for this skill type`
        );
      } else if (!(data.passages || {})[passageId]) {
        errors.push(
          `Question ${question._id}: passageId "${passageId}" not found in passages object`
        );
      }
    }

    // Validate question has required fields
    if (!question.prompt) {
      errors.push(`Question ${question._id}: Missing prompt`);
    }
    if (!question.correctAnswer) {
      errors.push(`Question ${question._id}: Missing correctAnswer`);
    }
    if (!item.options || item.options.length === 0) {
      errors.push(`Question ${question._id}: Missing answer options`);
    }
  }
  console.log(`  Found ${stats.totalQuestions} questions`);
  console.log(`    - Reading/Writing: ${stats.readingWritingQuestions}`);
  console.log(`    - Math: ${stats.mathQuestions}`);
  console.log(`    - With passage: ${stats.questionsWithPassage}`);
  console.log(`    - Without passage: ${stats.questionsWithoutPassage}`);

  // 3. Summary
  console.log('\n');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('                    IMPORT VALIDATION REPORT                    ');
  console.log('═══════════════════════════════════════════════════════════════');
  console.log('');
  console.log('Summary:');
  console.log(`  Total questions:    ${stats.totalQuestions}`);
  console.log(`  Total passages:     ${stats.totalPassages}`);
  console.log(`  Reading/Writing:    ${stats.readingWritingQuestions}`);
  console.log(`  Math:               ${stats.mathQuestions}`);
  console.log('');
  console.log('Passage types:');
  for (const [type, count] of Object.entries(stats.passagesByType)) {
    const isValid = VALID_PASSAGE_TYPES.includes(type);
    console.log(`  ${isValid ? '  ' : 'X '}${type}: ${count}${isValid ? '' : ' (INVALID)'}`);
  }
  console.log('');
  console.log(`Errors:   ${errors.length}`);
  console.log(`Warnings: ${warnings.length}`);

  if (errors.length > 0) {
    console.log('\n');
    console.log('ERRORS (must fix before import):');
    console.log('─────────────────────────────────');
    errors.slice(0, 20).forEach((e, i) => console.log(`  ${i + 1}. ${e}`));
    if (errors.length > 20) {
      console.log(`  ... and ${errors.length - 20} more errors`);
    }
  }

  if (warnings.length > 0) {
    console.log('\n');
    console.log('WARNINGS:');
    console.log('─────────');
    warnings.forEach((w, i) => console.log(`  ${i + 1}. ${w}`));
  }

  console.log('\n');
  if (errors.length === 0) {
    console.log('All validations passed! Safe to import.');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Clear existing questions (if needed):');
    console.log('     npx convex run seed:clearAllQuestions \'{}\'');
    console.log('');
    console.log('  2. Import questions:');
    console.log(`     npm run import:questions ${filePath}`);
    process.exit(0);
  } else {
    console.log('Validation FAILED. Fix errors before importing.');
    process.exit(1);
  }
}

validate(process.argv[2]);
