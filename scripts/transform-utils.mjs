/**
 * Transform Utilities
 *
 * Shared functions for transforming SAT Generator output to Big App format.
 * Exported separately for testing.
 */

// Valid passage types according to Convex schema
export const VALID_PASSAGE_TYPES = [
  'literary_narrative',
  'social_science',
  'natural_science',
  'humanities'
];

/**
 * Map Generator section to Big App category
 */
export function mapCategory(section) {
  return section === "READING" ? "reading_writing" : "math";
}

/**
 * Map Generator domain to Big App domain
 */
export function mapDomain(domain) {
  return domain
    .replace(/([A-Z])/g, "_$1")
    .toLowerCase()
    .replace(/^_/, "")
    .replace(/_+/g, "_");
}

/**
 * Map passage genre to Big App passageType
 *
 * IMPORTANT: Must only return values in VALID_PASSAGE_TYPES
 */
export function mapPassageType(genre) {
  const mapping = {
    // Argumentative/persuasive content -> social_science
    argumentative: "social_science",
    persuasive: "social_science",

    // Informational content -> social_science (general non-fiction)
    informational: "social_science",

    // Literary/narrative content -> literary_narrative
    literary: "literary_narrative",
    narrative: "literary_narrative",
    fiction: "literary_narrative",

    // Scientific/expository content -> natural_science
    expository: "natural_science",
    scientific: "natural_science",
    science: "natural_science",

    // Historical/philosophical content -> humanities
    historical: "humanities",
    philosophical: "humanities",
    humanities: "humanities",
    arts: "humanities",
  };

  const result = mapping[genre?.toLowerCase()] || "social_science";

  // Validate - catch any mapping bugs
  if (!VALID_PASSAGE_TYPES.includes(result)) {
    throw new Error(`Invalid passageType mapping: "${genre}" -> "${result}". Valid types: ${VALID_PASSAGE_TYPES.join(', ')}`);
  }

  return result;
}

/**
 * Fisher-Yates shuffle for answer choices
 */
export function shuffleArray(array) {
  const shuffled = [...array];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

/**
 * Transform difficulty factors for reading/writing questions
 */
export function transformRWDifficulty(difficulty) {
  if (!difficulty) return undefined;

  return {
    passageComplexity: (difficulty.linguistic || 3) / 5,
    inferenceDepth: (difficulty.conceptual || 3) / 5,
    vocabularyLevel: (difficulty.linguistic || 3) / 5,
    evidenceEvaluation: (difficulty.procedural || 3) / 5,
    synthesisRequired: (difficulty.conceptual || 3) / 5,
  };
}

/**
 * Transform difficulty factors for math questions
 */
export function transformMathDifficulty(difficulty) {
  if (!difficulty) return undefined;

  return {
    reasoningSteps: (difficulty.procedural || 3) / 5,
    algebraicComplexity: (difficulty.procedural || 3) / 5,
    conceptualDepth: (difficulty.conceptual || 3) / 5,
    computationLoad: (difficulty.computational || 3) / 5,
    multiStepRequired: (difficulty.procedural || 3) / 5,
  };
}

/**
 * Infer figure type from question content for questions that need images
 */
export function inferFigureType(question, category) {
  if (!question.hasImage) return undefined;

  const topic = question.topic?.subtopic || "";
  const desc = (question.imageDescription || "").toLowerCase();

  // Geometry topics
  if (
    ["area_volume", "triangles", "circles", "lines_angles", "right_triangles"].includes(topic)
  ) {
    return "geometric";
  }

  // Data visualization
  if (desc.includes("graph") || desc.includes("chart") || topic.includes("data")) {
    return "graph";
  }

  if (desc.includes("table")) {
    return "table";
  }

  if (desc.includes("diagram")) {
    return "diagram";
  }

  // Default based on category
  return category === "math" ? "geometric" : "data_display";
}

/**
 * Transform a Generator question to Big App import format
 */
export function transformQuestion(genQuestion) {
  const category = mapCategory(genQuestion.topic.section);
  const domain = mapDomain(genQuestion.topic.domain);
  const skill = genQuestion.topic.subtopic;

  // Shuffle answer choices
  const originalChoices = genQuestion.choices || [];
  const shuffledChoices = shuffleArray(originalChoices);

  // Create label mapping (old position -> new position)
  const labelOrder = ["A", "B", "C", "D"];
  const newLabelMap = {};
  const oldLabelMap = {};

  shuffledChoices.forEach((choice, newIndex) => {
    const newLabel = labelOrder[newIndex];
    const oldLabel = choice.label;
    newLabelMap[oldLabel] = newLabel;
    oldLabelMap[newLabel] = oldLabel;
  });

  // Find the new correct answer label
  const originalCorrectLabel = genQuestion.correctAnswer;
  const newCorrectLabel = newLabelMap[originalCorrectLabel];

  // Transform options with new order
  const options = shuffledChoices.map((choice, index) => ({
    key: labelOrder[index],
    content: choice.text,
    order: index,
  }));

  // Transform wrongAnswerExplanations with new labels
  let wrongAnswerExplanations = undefined;
  if (genQuestion.distractorRationale) {
    wrongAnswerExplanations = {};

    for (const [oldLabel, rationale] of Object.entries(genQuestion.distractorRationale)) {
      const newLabel = newLabelMap[oldLabel];
      if (newLabel && newLabel !== newCorrectLabel) {
        wrongAnswerExplanations[newLabel] = rationale;
      }
    }
  }

  // Build the transformed question
  const transformed = {
    question: {
      _id: genQuestion.id,
      type: genQuestion.answerType === "grid_in" ? "grid_in" : "multiple_choice",
      category,
      domain,
      skill,
      difficulty: genQuestion.difficulty?.overall || 3,
      overallDifficulty: (genQuestion.difficulty?.overall || 3) / 5,
      prompt: genQuestion.stem,
      correctAnswer: newCorrectLabel,
      tags: [
        `topic:${skill}`,
        `domain:${domain}`,
        `difficulty:${genQuestion.difficulty?.overall || 3}`,
      ],
      source: {
        type: "agent_generated",
        generationBatchId: genQuestion.metadata?.generationId || undefined,
      },
      generationMetadata: {
        agentVersion: "sat-generator-1.0",
        promptTemplate: genQuestion.metadata?.promptVersion || "v1.0.0",
        generatedAt: new Date(genQuestion.metadata?.generatedAt || Date.now()).getTime(),
        qualityScore: genQuestion._evaluation?.score,
      },
      reviewStatus: "pending",
    },
    options,
    passageId: undefined,
    explanation: {
      correctExplanation: genQuestion.explanation || "",
      wrongAnswerExplanations,
    },
  };

  // Add category-specific difficulty
  if (category === "reading_writing") {
    transformed.question.rwDifficulty = transformRWDifficulty(genQuestion.difficulty);
  } else {
    transformed.question.mathDifficulty = transformMathDifficulty(genQuestion.difficulty);
  }

  // Handle passage (for reading questions)
  if (genQuestion.passage) {
    // Create a unique passage ID based on content hash
    const passageId = `passage_${Buffer.from(genQuestion.passage.substring(0, 100)).toString("base64").replace(/[^a-zA-Z0-9]/g, "").substring(0, 20)}`;

    transformed.passageId = passageId;
    transformed.passageData = {
      title: genQuestion.passageMetadata?.source || "Generated Passage",
      author: undefined,
      source: genQuestion.passageMetadata?.source,
      content: genQuestion.passage,
      passageType: mapPassageType(genQuestion.passageMetadata?.genre),
      complexity: (genQuestion.difficulty?.linguistic || 3) / 5,
      generationType: "agent_generated",
    };
  }

  // Handle images (mark for generation, don't include actual images)
  if (genQuestion.hasImage) {
    transformed.needsImage = true;
    transformed.imageDescription = genQuestion.imageDescription;
    transformed.figureType = inferFigureType(genQuestion, category);
  }

  return transformed;
}
