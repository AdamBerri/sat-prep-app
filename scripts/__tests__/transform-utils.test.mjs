/**
 * Tests for Transform Utilities
 *
 * Run with: npm run test
 */

import { describe, it, expect } from 'vitest';
import {
  mapPassageType,
  mapCategory,
  mapDomain,
  transformQuestion,
  VALID_PASSAGE_TYPES,
} from '../transform-utils.mjs';

describe('mapPassageType', () => {
  it('should return only valid passage types for all inputs', () => {
    const testGenres = [
      'argumentative',
      'informational',
      'literary',
      'narrative',
      'persuasive',
      'expository',
      'scientific',
      'historical',
      'philosophical',
      'fiction',
      'humanities',
      'arts',
      'science',
    ];

    for (const genre of testGenres) {
      const result = mapPassageType(genre);
      expect(VALID_PASSAGE_TYPES, `Genre "${genre}" mapped to invalid type "${result}"`).toContain(result);
    }
  });

  it('should handle undefined/null/empty genres with valid default', () => {
    expect(VALID_PASSAGE_TYPES).toContain(mapPassageType(undefined));
    expect(VALID_PASSAGE_TYPES).toContain(mapPassageType(null));
    expect(VALID_PASSAGE_TYPES).toContain(mapPassageType(''));
  });

  it('should handle case insensitivity', () => {
    expect(mapPassageType('LITERARY')).toBe('literary_narrative');
    expect(mapPassageType('Literary')).toBe('literary_narrative');
    expect(mapPassageType('INFORMATIONAL')).toBe('social_science');
  });

  it('should map literary/narrative genres to literary_narrative', () => {
    expect(mapPassageType('literary')).toBe('literary_narrative');
    expect(mapPassageType('narrative')).toBe('literary_narrative');
    expect(mapPassageType('fiction')).toBe('literary_narrative');
  });

  it('should map informational/argumentative genres to social_science', () => {
    expect(mapPassageType('informational')).toBe('social_science');
    expect(mapPassageType('argumentative')).toBe('social_science');
    expect(mapPassageType('persuasive')).toBe('social_science');
  });

  it('should map scientific/expository genres to natural_science', () => {
    expect(mapPassageType('expository')).toBe('natural_science');
    expect(mapPassageType('scientific')).toBe('natural_science');
    expect(mapPassageType('science')).toBe('natural_science');
  });

  it('should map historical/philosophical genres to humanities', () => {
    expect(mapPassageType('historical')).toBe('humanities');
    expect(mapPassageType('philosophical')).toBe('humanities');
    expect(mapPassageType('humanities')).toBe('humanities');
    expect(mapPassageType('arts')).toBe('humanities');
  });

  it('should NEVER return "informational" (invalid schema value)', () => {
    const result = mapPassageType('informational');
    expect(result).not.toBe('informational');
    expect(result).toBe('social_science');
  });

  it('should NEVER return "argumentative" (invalid schema value)', () => {
    const result = mapPassageType('argumentative');
    expect(result).not.toBe('argumentative');
    expect(result).toBe('social_science');
  });
});

describe('mapCategory', () => {
  it('should map READING to reading_writing', () => {
    expect(mapCategory('READING')).toBe('reading_writing');
  });

  it('should map MATH to math', () => {
    expect(mapCategory('MATH')).toBe('math');
  });
});

describe('mapDomain', () => {
  it('should convert PascalCase to snake_case', () => {
    expect(mapDomain('StandardEnglishConventions')).toBe('standard_english_conventions');
    expect(mapDomain('InformationAndIdeas')).toBe('information_and_ideas');
  });

  it('should handle already snake_case input', () => {
    expect(mapDomain('standard_english_conventions')).toBe('standard_english_conventions');
  });
});

describe('transformQuestion - Reading/Writing with Passage', () => {
  const createGenQuestion = (overrides = {}) => ({
    id: 'test-id-123',
    topic: {
      section: 'READING',
      domain: 'Standard_English_Conventions',
      subtopic: 'form_structure_sense'
    },
    passage: 'The Renaissance artist Michelangelo, whose sculptures and paintings have influenced countless generations of artists...',
    passageMetadata: { genre: 'informational', wordCount: 98 },
    stem: 'Which choice completes the text so that it conforms to the conventions of Standard English?',
    choices: [
      { label: 'A', text: 'Option A with who', isCorrect: true },
      { label: 'B', text: 'Option B with whom', isCorrect: false },
      { label: 'C', text: 'Option C with which', isCorrect: false },
      { label: 'D', text: 'Option D with that', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Choice A is correct because...',
    distractorRationale: {
      A: 'This is correct.',
      B: 'Whom is object form.',
      C: 'Which is for things.',
      D: 'That is less preferred.',
    },
    difficulty: { overall: 5, conceptual: 4.9, procedural: 5, linguistic: 5 },
    metadata: {
      generatedAt: '2026-01-08T14:37:59.428Z',
      promptVersion: '1.0.0',
    },
    ...overrides,
  });

  it('should create passageId for questions with passage', () => {
    const result = transformQuestion(createGenQuestion());

    expect(result.passageId).toBeDefined();
    expect(result.passageId).not.toBeUndefined();
    expect(typeof result.passageId).toBe('string');
    expect(result.passageId.length).toBeGreaterThan(0);
  });

  it('should create passageData for questions with passage', () => {
    const result = transformQuestion(createGenQuestion());

    expect(result.passageData).toBeDefined();
    expect(result.passageData.content).toContain('Michelangelo');
  });

  it('should set valid passageType in passageData', () => {
    const result = transformQuestion(createGenQuestion());

    expect(result.passageData).toBeDefined();
    expect(VALID_PASSAGE_TYPES).toContain(result.passageData.passageType);
  });

  it('should NOT have undefined passageId for reading questions with passage', () => {
    const result = transformQuestion(createGenQuestion());

    expect(result.passageId).not.toBeUndefined();
    expect(result.passageData).not.toBeUndefined();
  });

  it('should correctly map informational genre to valid passageType', () => {
    const result = transformQuestion(createGenQuestion({
      passageMetadata: { genre: 'informational' }
    }));

    // informational should map to social_science, NOT "informational"
    expect(result.passageData.passageType).toBe('social_science');
    expect(result.passageData.passageType).not.toBe('informational');
  });

  it('should correctly set category as reading_writing', () => {
    const result = transformQuestion(createGenQuestion());

    expect(result.question.category).toBe('reading_writing');
  });

  it('should preserve passage content exactly', () => {
    const genQuestion = createGenQuestion();
    const result = transformQuestion(genQuestion);

    expect(result.passageData.content).toBe(genQuestion.passage);
  });
});

describe('transformQuestion - Math without Passage', () => {
  const createMathQuestion = () => ({
    id: 'math-test-id',
    topic: {
      section: 'MATH',
      domain: 'Algebra',
      subtopic: 'linear_equations'
    },
    stem: 'Solve for x: 2x + 5 = 15',
    choices: [
      { label: 'A', text: '5', isCorrect: true },
      { label: 'B', text: '10', isCorrect: false },
      { label: 'C', text: '7.5', isCorrect: false },
      { label: 'D', text: '20', isCorrect: false },
    ],
    correctAnswer: 'A',
    explanation: 'Subtract 5 from both sides...',
    difficulty: { overall: 2 },
    metadata: { generatedAt: '2026-01-08T14:37:59.428Z' },
  });

  it('should NOT have passageId for math questions', () => {
    const result = transformQuestion(createMathQuestion());

    expect(result.passageId).toBeUndefined();
    expect(result.passageData).toBeUndefined();
  });

  it('should set category as math', () => {
    const result = transformQuestion(createMathQuestion());

    expect(result.question.category).toBe('math');
  });
});

describe('Critical Data Integrity', () => {
  it('All reading/writing questions with passages must have valid passageType', () => {
    // This test ensures the core bug is fixed
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

      expect(
        result.passageData.passageType,
        `Genre "${genre}" should map to "${expected}", not "${result.passageData.passageType}"`
      ).toBe(expected);

      expect(
        VALID_PASSAGE_TYPES,
        `PassageType "${result.passageData.passageType}" is not valid`
      ).toContain(result.passageData.passageType);
    }
  });
});
