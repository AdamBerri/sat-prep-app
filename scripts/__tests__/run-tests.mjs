#!/usr/bin/env node
/**
 * Simple test runner for transform utilities
 *
 * Run with: node scripts/__tests__/run-tests.mjs
 */

import {
  mapPassageType,
  mapCategory,
  mapDomain,
  transformQuestion,
  VALID_PASSAGE_TYPES,
} from '../transform-utils.mjs';

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (e) {
    console.log(`  ✗ ${name}`);
    console.log(`    Error: ${e.message}`);
    failed++;
  }
}

function expect(actual) {
  return {
    toBe(expected) {
      if (actual !== expected) {
        throw new Error(`Expected "${expected}" but got "${actual}"`);
      }
    },
    toContain(value) {
      if (!actual.includes(value)) {
        throw new Error(`Expected array to contain "${value}" but it doesn't. Array: [${actual.join(', ')}]`);
      }
    },
    toBeDefined() {
      if (actual === undefined) {
        throw new Error(`Expected value to be defined but got undefined`);
      }
    },
    not: {
      toBe(expected) {
        if (actual === expected) {
          throw new Error(`Expected value to not be "${expected}"`);
        }
      },
      toBeUndefined() {
        if (actual === undefined) {
          throw new Error(`Expected value to not be undefined`);
        }
      }
    }
  };
}

console.log('\n');
console.log('═══════════════════════════════════════════════════════════════');
console.log('                    TRANSFORM UTILS TESTS                       ');
console.log('═══════════════════════════════════════════════════════════════');

console.log('\nmapPassageType:');

test('should return only valid passage types for all inputs', () => {
  const testGenres = [
    'argumentative', 'informational', 'literary',
    'narrative', 'persuasive', 'expository',
    'scientific', 'historical', 'philosophical',
    'fiction', 'humanities', 'arts', 'science',
  ];

  for (const genre of testGenres) {
    const result = mapPassageType(genre);
    expect(VALID_PASSAGE_TYPES).toContain(result);
  }
});

test('should handle undefined/null/empty genres with valid default', () => {
  expect(VALID_PASSAGE_TYPES).toContain(mapPassageType(undefined));
  expect(VALID_PASSAGE_TYPES).toContain(mapPassageType(null));
  expect(VALID_PASSAGE_TYPES).toContain(mapPassageType(''));
});

test('should map literary to literary_narrative', () => {
  expect(mapPassageType('literary')).toBe('literary_narrative');
  expect(mapPassageType('narrative')).toBe('literary_narrative');
});

test('should map informational to social_science (NOT "informational")', () => {
  expect(mapPassageType('informational')).toBe('social_science');
  expect(mapPassageType('informational')).not.toBe('informational');
});

test('should map argumentative to social_science (NOT "argumentative")', () => {
  expect(mapPassageType('argumentative')).toBe('social_science');
  expect(mapPassageType('argumentative')).not.toBe('argumentative');
});

test('should map expository to natural_science', () => {
  expect(mapPassageType('expository')).toBe('natural_science');
});

test('should map historical to humanities', () => {
  expect(mapPassageType('historical')).toBe('humanities');
});

console.log('\nmapCategory:');

test('should map READING to reading_writing', () => {
  expect(mapCategory('READING')).toBe('reading_writing');
});

test('should map MATH to math', () => {
  expect(mapCategory('MATH')).toBe('math');
});

console.log('\ntransformQuestion - Reading/Writing with Passage:');

const createGenQuestion = () => ({
  id: 'test-id-123',
  topic: {
    section: 'READING',
    domain: 'Standard_English_Conventions',
    subtopic: 'form_structure_sense'
  },
  passage: 'The Renaissance artist Michelangelo, whose sculptures and paintings...',
  passageMetadata: { genre: 'informational', wordCount: 98 },
  stem: 'Which choice completes the text?',
  choices: [
    { label: 'A', text: 'Option A', isCorrect: true },
    { label: 'B', text: 'Option B', isCorrect: false },
    { label: 'C', text: 'Option C', isCorrect: false },
    { label: 'D', text: 'Option D', isCorrect: false },
  ],
  correctAnswer: 'A',
  explanation: 'Choice A is correct because...',
  difficulty: { overall: 5 },
  metadata: { generatedAt: '2026-01-08T14:37:59.428Z' },
});

test('should create passageId for questions with passage', () => {
  const result = transformQuestion(createGenQuestion());
  expect(result.passageId).toBeDefined();
  expect(result.passageId).not.toBeUndefined();
});

test('should create passageData for questions with passage', () => {
  const result = transformQuestion(createGenQuestion());
  expect(result.passageData).toBeDefined();
});

test('should set valid passageType in passageData (social_science, NOT informational)', () => {
  const result = transformQuestion(createGenQuestion());
  expect(result.passageData.passageType).toBe('social_science');
  expect(result.passageData.passageType).not.toBe('informational');
  expect(VALID_PASSAGE_TYPES).toContain(result.passageData.passageType);
});

test('should correctly set category as reading_writing', () => {
  const result = transformQuestion(createGenQuestion());
  expect(result.question.category).toBe('reading_writing');
});

console.log('\nCritical Data Integrity Tests:');

test('All reading/writing questions with passages must have valid passageType', () => {
  const testCases = [
    { genre: 'informational', expected: 'social_science' },
    { genre: 'argumentative', expected: 'social_science' },
    { genre: 'literary', expected: 'literary_narrative' },
    { genre: 'expository', expected: 'natural_science' },
    { genre: 'historical', expected: 'humanities' },
  ];

  for (const { genre, expected } of testCases) {
    const result = transformQuestion({
      id: `test-${genre}`,
      topic: { section: 'READING', domain: 'Test', subtopic: 'test' },
      passage: 'Test passage content',
      passageMetadata: { genre },
      stem: 'Test question?',
      choices: [{ label: 'A', text: 'A', isCorrect: true }],
      correctAnswer: 'A',
      explanation: 'Test explanation',
    });

    expect(result.passageData.passageType).toBe(expected);
    expect(VALID_PASSAGE_TYPES).toContain(result.passageData.passageType);
  }
});

// Summary
console.log('\n');
console.log('═══════════════════════════════════════════════════════════════');
console.log(`                    RESULTS: ${passed} passed, ${failed} failed`);
console.log('═══════════════════════════════════════════════════════════════');

if (failed > 0) {
  process.exit(1);
} else {
  console.log('\n✅ All tests passed!\n');
  process.exit(0);
}
