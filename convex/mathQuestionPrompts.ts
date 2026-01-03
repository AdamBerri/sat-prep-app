// ─────────────────────────────────────────────────────────
// MATH QUESTION PROMPTS
// ─────────────────────────────────────────────────────────
// Claude prompts for generating SAT math problems and questions.
// Includes domain-specific prompts and distractor generation.

import {
  type SampledMathParams,
  type MathDomain,
  type MathSkill,
  type FigureType,
  MATH_DISTRACTOR_STRATEGIES,
  getReasoningStepCount,
  getDifficultyLevel,
} from "./mathQuestionTemplates";

// ─────────────────────────────────────────────────────────
// PROBLEM GENERATION BASE PROMPT
// ─────────────────────────────────────────────────────────

/**
 * Base prompt structure for generating math problems.
 */
export const MATH_PROBLEM_BASE_PROMPT = `You are generating an SAT Math problem.

PROBLEM SPECIFICATIONS:
- Domain: {domain}
- Skill: {skill}
- Context Type: {contextType}
- Difficulty Level: {difficultyLevel}/3
- Reasoning Steps: {reasoningSteps} (actual steps needed to solve)
- Figure Type: {figureType}

DIFFICULTY PARAMETERS (0.0 = easy, 1.0 = hard):
- Algebraic Complexity: {algebraicComplexity}
- Conceptual Depth: {conceptualDepth}
- Computation Load: {computationLoad}

{domainSpecificInstructions}

{figureInstructions}

GENERAL SAT MATH REQUIREMENTS:
1. Use realistic numbers that work out cleanly (no messy decimals unless intentional)
2. Problem should be solvable in 1-2 minutes
3. Context should be appropriate for high school students
4. All information needed to solve must be provided
5. Avoid ambiguous wording or trick questions

OUTPUT FORMAT (JSON only):
{
  "problemText": "The full problem statement",
  "givenInformation": ["List", "of", "given", "values", "or", "conditions"],
  "whatToFind": "What the student needs to calculate/determine",
  "correctAnswer": "The numerical or algebraic answer (e.g., '42' or 'x = 5' or '3/4')",
  "solutionSteps": [
    "Step 1: ...",
    "Step 2: ...",
    "Final: ..."
  ],
  "keyConceptsTested": ["concept1", "concept2"],
  "figureDescription": "Description of any figure needed (or null if none)",
  "figureData": {figureDataSpec}
}

Generate the problem now:`;

// ─────────────────────────────────────────────────────────
// DOMAIN-SPECIFIC INSTRUCTIONS
// ─────────────────────────────────────────────────────────

export const DOMAIN_SPECIFIC_INSTRUCTIONS: Record<MathDomain, string> = {
  algebra: `ALGEBRA DOMAIN INSTRUCTIONS:
Focus on linear relationships, equations, and inequalities.

SKILL-SPECIFIC GUIDANCE:
- linear_equations: Single variable, solve for x. Can include fractions, decimals, or distribution.
- linear_inequalities: Remember to flip inequality when multiplying/dividing by negative.
- systems_of_equations: Two equations, two unknowns. Use substitution or elimination.
- linear_functions: Slope, intercepts, parallel/perpendicular lines, function notation.
- absolute_value: Include both positive and negative solutions where applicable.

CONTEXT IDEAS:
- Real-world: Pricing, distances, time/rate/distance, mixing problems
- Pure math: Solve for x, simplify expressions, find intercepts

ANSWER FORMAT:
- Numerical answers should be simplified (e.g., 5, not 5.0)
- Fractions should be simplified (e.g., 3/4, not 6/8)
- Variables in solutions should be isolated (e.g., x = 5, not 5 = x)`,

  advanced_math: `ADVANCED MATH DOMAIN INSTRUCTIONS:
Focus on nonlinear equations and higher-order functions.

SKILL-SPECIFIC GUIDANCE:
- quadratic_equations: Factor, complete the square, or quadratic formula. May have 0, 1, or 2 real solutions.
- polynomial_operations: Add, subtract, multiply polynomials. Factor or expand.
- exponential_functions: Growth/decay, compound interest, exponential equations.
- radical_equations: Square roots, cube roots. Check for extraneous solutions.
- rational_expressions: Simplify, find domain restrictions, solve rational equations.

CONTEXT IDEAS:
- Real-world: Population growth, radioactive decay, projectile motion, investment growth
- Pure math: Factor, solve, simplify expressions

SPECIAL CONSIDERATIONS:
- For quadratics, ensure discriminant gives clean solutions
- Exponential problems often use base 2, e, or 10
- Watch for domain restrictions in rational expressions`,

  problem_solving: `PROBLEM SOLVING & DATA ANALYSIS DOMAIN INSTRUCTIONS:
Focus on quantitative reasoning and data interpretation.

SKILL-SPECIFIC GUIDANCE:
- ratios_proportions: Scale factors, similar figures, unit rates, direct/inverse variation.
- percentages: Percent change, percent of a number, tax/tip/discount.
- statistics_measures: Mean, median, mode, range, standard deviation concepts.
- probability: Simple probability, compound events, conditional probability basics.
- unit_conversion: Metric/imperial, time, currency, dimensional analysis.

CONTEXT IDEAS:
- Real-world: Shopping discounts, recipe scaling, sports statistics, survey data
- Scientific: Lab measurements, population studies, experimental data

DATA PRESENTATION:
- May include tables, charts, or graphs (describe in figureDescription)
- Present clear, realistic data sets
- Ensure data is unambiguous`,

  geometry_trig: `GEOMETRY & TRIGONOMETRY DOMAIN INSTRUCTIONS:
Focus on shapes, measurements, and trigonometric relationships.

SKILL-SPECIFIC GUIDANCE:
- triangle_properties: Pythagorean theorem, similar triangles, special right triangles (30-60-90, 45-45-90).
- circle_properties: Area, circumference, arc length, sector area, inscribed angles.
- coordinate_geometry: Distance formula, midpoint, slopes, equations of lines/circles.
- trigonometric_ratios: SOH-CAH-TOA, sin/cos/tan for right triangles, unit circle values.
- area_volume: 2D shapes (triangles, rectangles, circles) and 3D shapes (cubes, cylinders, spheres).

FIGURE REQUIREMENTS:
- Most geometry problems REQUIRE a figure
- Use standard notation: points labeled A, B, C; angles with degree symbol
- Include relevant measurements on the figure description

COMMON VALUES:
- Use clean angles: 30°, 45°, 60°, 90°
- Pythagorean triples: 3-4-5, 5-12-13, 8-15-17
- Common trig values: sin(30°)=1/2, cos(60°)=1/2, tan(45°)=1`,
};

// ─────────────────────────────────────────────────────────
// FIGURE INSTRUCTIONS
// ─────────────────────────────────────────────────────────

export const FIGURE_INSTRUCTIONS: Record<FigureType, string> = {
  none: `FIGURE: None required for this problem.
The problem should be solvable from the text alone.

For figureData, use: null`,

  coordinate_graph: `FIGURE: Coordinate plane graph required.
The problem involves functions, lines, or coordinate geometry.

For figureDescription, describe:
- What is being graphed (line, parabola, points, etc.)
- Key features visible (intercepts, vertex, asymptotes)
- Window/scale if important

For figureData, provide:
{
  "type": "coordinate_graph",
  "elements": [
    {
      "kind": "line|parabola|points|circle",
      "equation": "y = 2x + 3" or "y = x^2 - 4",
      "points": [[x1, y1], [x2, y2]] (for discrete points),
      "color": "blue|red|green",
      "label": "f(x)" (optional)
    }
  ],
  "xRange": [-10, 10],
  "yRange": [-10, 10],
  "showGrid": true,
  "showAxes": true,
  "labeledPoints": [{"point": [2, 7], "label": "A"}]
}`,

  geometric_diagram: `FIGURE: Geometric diagram required.
The problem involves shapes, angles, or spatial relationships.

For figureDescription, describe:
- Shape type (triangle, circle, quadrilateral, etc.)
- Labeled vertices/points
- Given measurements (sides, angles)
- Any special features (right angles, parallel lines, etc.)

For figureData, provide:
{
  "type": "geometric_diagram",
  "shapes": [
    {
      "kind": "triangle|rectangle|circle|line|angle",
      "vertices": ["A", "B", "C"],
      "coordinates": [[0, 0], [4, 0], [2, 3]],
      "measurements": {
        "AB": "5",
        "angle_A": "60°",
        "BC": "x"
      },
      "rightAngles": ["B"],
      "parallel": [["AB", "CD"]],
      "congruent": [["AB", "CD"]]
    }
  ],
  "auxiliaryLines": [
    {"from": "A", "to": "midpoint_BC", "style": "dashed"}
  ]
}`,
};

// ─────────────────────────────────────────────────────────
// QUESTION GENERATION PROMPT
// ─────────────────────────────────────────────────────────

/**
 * Prompt for converting a math problem into a multiple-choice question.
 */
export const MATH_QUESTION_GENERATION_PROMPT = `You are converting a math problem into an SAT-style multiple-choice question.

ORIGINAL PROBLEM:
{problemText}

GIVEN INFORMATION:
{givenInformation}

WHAT TO FIND:
{whatToFind}

CORRECT ANSWER:
{correctAnswer}

SOLUTION STEPS:
{solutionSteps}

DISTRACTOR STRATEGIES TO USE:
{distractorInstructions}

MULTIPLE-CHOICE REQUIREMENTS:
1. Answer choices must be clearly distinct
2. All choices should be plausible (could result from common errors)
3. Numerical answers should be in the same format (all decimals or all fractions)
4. Order choices logically (usually smallest to largest for numbers)
5. The correct answer position should be randomized (not always A)

DISTRACTOR GENERATION:
For each distractor, apply the specified strategy to create a wrong answer that:
- Could result from the described error
- Is mathematically plausible
- Is clearly different from other choices

OUTPUT FORMAT (JSON only):
{
  "questionStem": "The question text (may be same as problemText or slightly modified)",
  "choices": {
    "A": "First choice",
    "B": "Second choice",
    "C": "Third choice",
    "D": "Fourth choice"
  },
  "correctAnswer": "A" or "B" or "C" or "D",
  "explanation": "Step-by-step solution showing how to get the correct answer",
  "wrongAnswerExplanations": {
    "A": "Why this is wrong (if wrong) - what error leads here",
    "B": "Why this is wrong (if wrong) - what error leads here",
    "C": "Why this is wrong (if wrong) - what error leads here",
    "D": "Why this is wrong (if wrong) - what error leads here"
  }
}

Generate the multiple-choice question now:`;

// ─────────────────────────────────────────────────────────
// PROMPT BUILDERS
// ─────────────────────────────────────────────────────────

/**
 * Build distractor instructions from math-specific strategies.
 */
export function buildMathDistractorInstructions(
  strategies: [string, string, string]
): string {
  return strategies
    .map(
      (strategy, i) =>
        `- Distractor ${i + 1} (${strategy}): ${MATH_DISTRACTOR_STRATEGIES[strategy as keyof typeof MATH_DISTRACTOR_STRATEGIES]}`
    )
    .join("\n");
}

/**
 * Build figure data spec based on figure type.
 */
function getFigureDataSpec(figureType: FigureType): string {
  if (figureType === "none") return "null";
  if (figureType === "coordinate_graph") {
    return `{ "type": "coordinate_graph", "elements": [...], "xRange": [...], "yRange": [...] }`;
  }
  return `{ "type": "geometric_diagram", "shapes": [...] }`;
}

/**
 * Build the problem generation prompt with sampled parameters.
 */
export function buildMathProblemPrompt(params: SampledMathParams): string {
  const difficultyLevel = getDifficultyLevel(params.targetOverallDifficulty);
  const reasoningSteps = getReasoningStepCount(params.reasoningSteps);
  const domainInstructions = DOMAIN_SPECIFIC_INSTRUCTIONS[params.domain];
  const figureInstructions = FIGURE_INSTRUCTIONS[params.figureType];

  return MATH_PROBLEM_BASE_PROMPT
    .replace("{domain}", params.domain)
    .replace("{skill}", params.skill)
    .replace("{contextType}", params.contextType)
    .replace("{difficultyLevel}", String(difficultyLevel))
    .replace("{reasoningSteps}", String(reasoningSteps))
    .replace("{figureType}", params.figureType)
    .replace("{algebraicComplexity}", params.algebraicComplexity.toFixed(2))
    .replace("{conceptualDepth}", params.conceptualDepth.toFixed(2))
    .replace("{computationLoad}", params.computationLoad.toFixed(2))
    .replace("{domainSpecificInstructions}", domainInstructions)
    .replace("{figureInstructions}", figureInstructions)
    .replace("{figureDataSpec}", getFigureDataSpec(params.figureType));
}

/**
 * Build the question generation prompt from a generated problem.
 */
export function buildMathQuestionPrompt(
  problem: {
    problemText: string;
    givenInformation: string[];
    whatToFind: string;
    correctAnswer: string;
    solutionSteps: string[];
  },
  distractorStrategies: [string, string, string]
): string {
  const distractorInstructions = buildMathDistractorInstructions(distractorStrategies);

  return MATH_QUESTION_GENERATION_PROMPT
    .replace("{problemText}", problem.problemText)
    .replace("{givenInformation}", problem.givenInformation.map((g, i) => `${i + 1}. ${g}`).join("\n"))
    .replace("{whatToFind}", problem.whatToFind)
    .replace("{correctAnswer}", problem.correctAnswer)
    .replace("{solutionSteps}", problem.solutionSteps.join("\n"))
    .replace("{distractorInstructions}", distractorInstructions);
}

// ─────────────────────────────────────────────────────────
// SKILL-SPECIFIC EXAMPLE PROMPTS
// ─────────────────────────────────────────────────────────

/**
 * Example problems for few-shot learning (by skill).
 * These help Claude understand the expected format and difficulty.
 */
export const SKILL_EXAMPLES: Partial<Record<MathSkill, string>> = {
  linear_equations: `Example: If 3x + 7 = 22, what is the value of x?
Answer: x = 5
Steps: 1) Subtract 7 from both sides: 3x = 15. 2) Divide by 3: x = 5.`,

  quadratic_equations: `Example: If x² - 5x + 6 = 0, what are the solutions for x?
Answer: x = 2 or x = 3
Steps: 1) Factor: (x - 2)(x - 3) = 0. 2) Set each factor to 0: x = 2 or x = 3.`,

  triangle_properties: `Example: In right triangle ABC, angle C is the right angle. If AC = 3 and BC = 4, what is AB?
Answer: AB = 5
Steps: 1) Use Pythagorean theorem: AB² = AC² + BC². 2) AB² = 9 + 16 = 25. 3) AB = 5.`,

  percentages: `Example: A shirt originally costs $40. It is on sale for 25% off. What is the sale price?
Answer: $30
Steps: 1) Calculate discount: 40 × 0.25 = $10. 2) Subtract from original: 40 - 10 = $30.`,

  ratios_proportions: `Example: If the ratio of boys to girls in a class is 3:5 and there are 24 students total, how many girls are there?
Answer: 15 girls
Steps: 1) Total ratio parts: 3 + 5 = 8. 2) Each part: 24 ÷ 8 = 3 students. 3) Girls: 5 × 3 = 15.`,
};

/**
 * Get a skill-specific example for the prompt (if available).
 */
export function getSkillExample(skill: MathSkill): string | null {
  return SKILL_EXAMPLES[skill] || null;
}

// ─────────────────────────────────────────────────────────
// VALIDATION PROMPT
// ─────────────────────────────────────────────────────────

/**
 * Prompt for validating generated problems.
 */
export const VALIDATION_PROMPT = `Review this SAT math problem for quality and correctness.

PROBLEM:
{problemText}

CLAIMED CORRECT ANSWER:
{correctAnswer}

SOLUTION STEPS:
{solutionSteps}

CHECK THE FOLLOWING:
1. Is the problem mathematically correct?
2. Can it be solved with the given information?
3. Is the claimed answer actually correct?
4. Is the difficulty appropriate for SAT?
5. Is the wording clear and unambiguous?

OUTPUT FORMAT (JSON only):
{
  "isValid": true or false,
  "issues": ["List of any issues found"],
  "suggestedFixes": ["Fixes if issues exist"],
  "verifiedAnswer": "The answer you calculated"
}`;

/**
 * Build validation prompt for a generated problem.
 */
export function buildValidationPrompt(
  problemText: string,
  correctAnswer: string,
  solutionSteps: string[]
): string {
  return VALIDATION_PROMPT
    .replace("{problemText}", problemText)
    .replace("{correctAnswer}", correctAnswer)
    .replace("{solutionSteps}", solutionSteps.join("\n"));
}
