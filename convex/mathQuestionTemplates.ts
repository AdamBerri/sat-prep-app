// ─────────────────────────────────────────────────────────
// MATH QUESTION TEMPLATES
// ─────────────────────────────────────────────────────────
// Verbalized sampling parameters and distractor strategies
// for SAT math questions. Supports both figure and non-figure questions.

// ─────────────────────────────────────────────────────────
// MATH DOMAINS
// ─────────────────────────────────────────────────────────

/**
 * SAT Math domains based on College Board categories.
 */
export const MATH_DOMAINS = [
  "algebra", // 35% of SAT Math
  "advanced_math", // 35% of SAT Math
  "problem_solving", // 15% of SAT Math
  "geometry_trig", // 15% of SAT Math
] as const;

export type MathDomain = (typeof MATH_DOMAINS)[number];

/**
 * Domain weights matching SAT distribution.
 */
export const DOMAIN_DISTRIBUTION: Record<MathDomain, number> = {
  algebra: 0.35,
  advanced_math: 0.35,
  problem_solving: 0.15,
  geometry_trig: 0.15,
};

// ─────────────────────────────────────────────────────────
// MATH SKILLS
// ─────────────────────────────────────────────────────────

/**
 * Specific skills within each domain.
 */
export const MATH_SKILLS = {
  algebra: [
    "linear_equations",
    "linear_inequalities",
    "systems_of_equations",
    "linear_functions",
    "absolute_value",
  ],
  advanced_math: [
    "quadratic_equations",
    "polynomial_operations",
    "exponential_functions",
    "radical_equations",
    "rational_expressions",
  ],
  problem_solving: [
    "ratios_proportions",
    "percentages",
    "statistics_measures",
    "probability",
    "unit_conversion",
  ],
  geometry_trig: [
    "triangle_properties",
    "circle_properties",
    "coordinate_geometry",
    "trigonometric_ratios",
    "area_volume",
  ],
} as const;

export type MathSkill =
  | (typeof MATH_SKILLS.algebra)[number]
  | (typeof MATH_SKILLS.advanced_math)[number]
  | (typeof MATH_SKILLS.problem_solving)[number]
  | (typeof MATH_SKILLS.geometry_trig)[number];

/**
 * Get all skills as a flat array.
 */
export const ALL_MATH_SKILLS: MathSkill[] = [
  ...MATH_SKILLS.algebra,
  ...MATH_SKILLS.advanced_math,
  ...MATH_SKILLS.problem_solving,
  ...MATH_SKILLS.geometry_trig,
];

/**
 * Get the domain for a given skill.
 */
export function getDomainForSkill(skill: MathSkill): MathDomain {
  for (const [domain, skills] of Object.entries(MATH_SKILLS)) {
    if ((skills as readonly string[]).includes(skill)) {
      return domain as MathDomain;
    }
  }
  return "algebra"; // fallback
}

// ─────────────────────────────────────────────────────────
// FIGURE REQUIREMENTS
// ─────────────────────────────────────────────────────────

/**
 * Whether each skill requires a figure and what type.
 */
export type FigureRequirement = "none" | "graph" | "geometric" | "optional";

export const FIGURE_REQUIREMENTS: Record<MathSkill, FigureRequirement> = {
  // Algebra - mostly no figures
  linear_equations: "none",
  linear_inequalities: "none",
  systems_of_equations: "optional",
  linear_functions: "graph",
  absolute_value: "optional",

  // Advanced Math - graphs for functions
  quadratic_equations: "optional",
  polynomial_operations: "none",
  exponential_functions: "graph",
  radical_equations: "none",
  rational_expressions: "none",

  // Problem Solving - mostly no figures
  ratios_proportions: "none",
  percentages: "none",
  statistics_measures: "optional",
  probability: "none",
  unit_conversion: "none",

  // Geometry & Trig - always geometric figures
  triangle_properties: "geometric",
  circle_properties: "geometric",
  coordinate_geometry: "graph",
  trigonometric_ratios: "geometric",
  area_volume: "geometric",
};

export type FigureType = "coordinate_graph" | "geometric_diagram" | "none";

/**
 * Map figure requirement to figure type.
 */
export function getFigureType(skill: MathSkill): FigureType {
  const req = FIGURE_REQUIREMENTS[skill];
  if (req === "graph") return "coordinate_graph";
  if (req === "geometric") return "geometric_diagram";
  if (req === "optional") {
    // 50% chance of figure for optional
    return Math.random() < 0.5 ? "none" :
      (skill.includes("geometry") || skill.includes("triangle") || skill.includes("circle") || skill.includes("trig"))
        ? "geometric_diagram"
        : "coordinate_graph";
  }
  return "none";
}

// ─────────────────────────────────────────────────────────
// CONTEXT TYPES
// ─────────────────────────────────────────────────────────

/**
 * Types of problem contexts.
 */
export const CONTEXT_TYPES = [
  "pure_math", // Abstract mathematical problem (solve for x, simplify)
  "real_world", // Word problem with practical application
  "scientific", // Science/physics context
] as const;

export type ContextType = (typeof CONTEXT_TYPES)[number];

/**
 * Context distribution by domain.
 */
export const CONTEXT_BY_DOMAIN: Record<MathDomain, ContextType[]> = {
  algebra: ["pure_math", "real_world", "scientific"],
  advanced_math: ["pure_math", "real_world"],
  problem_solving: ["real_world", "scientific"],
  geometry_trig: ["pure_math", "real_world", "scientific"],
};

// ─────────────────────────────────────────────────────────
// VERBALIZED SAMPLING PARAMETERS
// ─────────────────────────────────────────────────────────

/**
 * Gaussian distribution parameters for difficulty factors.
 */
export const MATH_QUESTION_PARAMS = {
  // Core difficulty factors (matching schema's mathDifficulty)
  reasoningSteps: { mean: 0.5, stdDev: 0.2 }, // Number of steps (1-5)
  algebraicComplexity: { mean: 0.5, stdDev: 0.25 }, // Equation complexity
  conceptualDepth: { mean: 0.5, stdDev: 0.2 }, // Understanding required
  computationLoad: { mean: 0.4, stdDev: 0.2 }, // Arithmetic difficulty
  multiStepRequired: { mean: 0.5, stdDev: 0.25 }, // Multi-step probability

  // Problem complexity
  wordProblemComplexity: { mean: 0.4, stdDev: 0.2 },
};

// ─────────────────────────────────────────────────────────
// DISTRACTOR STRATEGIES
// ─────────────────────────────────────────────────────────

/**
 * Math-specific distractor strategies.
 * Each describes a common math error that produces a plausible wrong answer.
 */
export const MATH_DISTRACTOR_STRATEGIES = {
  sign_error:
    "Result from common sign error (+/- confusion). Often happens with negatives or subtraction.",

  calculation_slip:
    "Off by a factor or simple arithmetic error. Forgot to multiply/divide by something.",

  partial_solution:
    "Stopped solving too early, only found one root, or didn't complete the final step.",

  wrong_formula:
    "Used an incorrect but related formula. Mixed up similar formulas (area vs perimeter, etc).",

  misread_problem:
    "Answered what was NOT asked. Found x instead of y, or answered the wrong part of the question.",

  order_of_operations:
    "Made PEMDAS/BODMAS mistake. Evaluated operations in wrong order.",

  setup_error:
    "Set up the equation incorrectly from the word problem. Translation error.",

  unit_confusion:
    "Mixed up units or dimensions. Forgot to convert, used wrong unit.",

  off_by_one:
    "Common counting error. Off by one in sequences, boundaries, or counts.",

  distribution_error:
    "Forgot to distribute across all terms. Incomplete distribution of multiplication.",
} as const;

export type MathDistractorStrategy = keyof typeof MATH_DISTRACTOR_STRATEGIES;

/**
 * Effective distractor combinations by domain.
 */
export const DISTRACTOR_COMBOS_BY_DOMAIN: Record<MathDomain, MathDistractorStrategy[][]> = {
  algebra: [
    ["sign_error", "calculation_slip", "setup_error"],
    ["partial_solution", "distribution_error", "misread_problem"],
    ["order_of_operations", "sign_error", "wrong_formula"],
  ],
  advanced_math: [
    ["partial_solution", "sign_error", "calculation_slip"],
    ["wrong_formula", "order_of_operations", "distribution_error"],
    ["setup_error", "partial_solution", "misread_problem"],
  ],
  problem_solving: [
    ["setup_error", "unit_confusion", "calculation_slip"],
    ["misread_problem", "off_by_one", "partial_solution"],
    ["wrong_formula", "calculation_slip", "setup_error"],
  ],
  geometry_trig: [
    ["wrong_formula", "calculation_slip", "unit_confusion"],
    ["setup_error", "misread_problem", "partial_solution"],
    ["sign_error", "wrong_formula", "off_by_one"],
  ],
};

// General fallback combos
export const DISTRACTOR_COMBOS: MathDistractorStrategy[][] = [
  ["sign_error", "calculation_slip", "partial_solution"],
  ["wrong_formula", "setup_error", "misread_problem"],
  ["order_of_operations", "distribution_error", "unit_confusion"],
];

// ─────────────────────────────────────────────────────────
// SAMPLED PARAMETERS INTERFACE
// ─────────────────────────────────────────────────────────

export interface SampledMathParams {
  // Question configuration
  domain: MathDomain;
  skill: MathSkill;
  contextType: ContextType;

  // Figure configuration
  figureType: FigureType;

  // Difficulty factors (0.0-1.0)
  reasoningSteps: number;
  algebraicComplexity: number;
  conceptualDepth: number;
  computationLoad: number;
  multiStepRequired: number;

  // Word problem complexity
  wordProblemComplexity: number;

  // Distractor strategy triplet
  distractorStrategies: [MathDistractorStrategy, MathDistractorStrategy, MathDistractorStrategy];

  // Overall target
  targetOverallDifficulty: number;
}

// ─────────────────────────────────────────────────────────
// SAMPLING UTILITIES
// ─────────────────────────────────────────────────────────

/**
 * Sample from a Gaussian distribution, clamped to [0, 1].
 */
export function sampleGaussian(mean: number, stdDev: number): number {
  const u1 = Math.random();
  const u2 = Math.random();
  const z = Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
  const value = mean + z * stdDev;
  return Math.max(0, Math.min(1, value));
}

/**
 * Sample uniformly from an array.
 */
export function sampleFrom<T>(arr: readonly T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

/**
 * Sample a domain weighted by SAT distribution.
 */
export function sampleDomainWeighted(): MathDomain {
  const rand = Math.random();
  let cumulative = 0;

  for (const [domain, weight] of Object.entries(DOMAIN_DISTRIBUTION)) {
    cumulative += weight;
    if (rand < cumulative) {
      return domain as MathDomain;
    }
  }

  return sampleFrom(MATH_DOMAINS);
}

/**
 * Sample a skill from a domain.
 */
export function sampleSkillFromDomain(domain: MathDomain): MathSkill {
  const skills = MATH_SKILLS[domain];
  return sampleFrom(skills);
}

/**
 * Sample a distractor strategy combination for a domain.
 */
export function sampleDistractorCombo(
  domain: MathDomain
): [MathDistractorStrategy, MathDistractorStrategy, MathDistractorStrategy] {
  const domainCombos = DISTRACTOR_COMBOS_BY_DOMAIN[domain];
  const combo = sampleFrom(domainCombos || DISTRACTOR_COMBOS);
  return combo as [MathDistractorStrategy, MathDistractorStrategy, MathDistractorStrategy];
}

/**
 * Generate all sampled parameters for a math question.
 */
export function sampleMathQuestionParams(
  overrides?: Partial<SampledMathParams>
): SampledMathParams {
  const domain = overrides?.domain ?? sampleDomainWeighted();
  const skill = overrides?.skill ?? sampleSkillFromDomain(domain);
  const figureType = overrides?.figureType ?? getFigureType(skill);
  const contextType = overrides?.contextType ?? sampleFrom(CONTEXT_BY_DOMAIN[domain]);

  return {
    domain,
    skill,
    contextType,
    figureType,
    reasoningSteps:
      overrides?.reasoningSteps ??
      sampleGaussian(
        MATH_QUESTION_PARAMS.reasoningSteps.mean,
        MATH_QUESTION_PARAMS.reasoningSteps.stdDev
      ),
    algebraicComplexity:
      overrides?.algebraicComplexity ??
      sampleGaussian(
        MATH_QUESTION_PARAMS.algebraicComplexity.mean,
        MATH_QUESTION_PARAMS.algebraicComplexity.stdDev
      ),
    conceptualDepth:
      overrides?.conceptualDepth ??
      sampleGaussian(
        MATH_QUESTION_PARAMS.conceptualDepth.mean,
        MATH_QUESTION_PARAMS.conceptualDepth.stdDev
      ),
    computationLoad:
      overrides?.computationLoad ??
      sampleGaussian(
        MATH_QUESTION_PARAMS.computationLoad.mean,
        MATH_QUESTION_PARAMS.computationLoad.stdDev
      ),
    multiStepRequired:
      overrides?.multiStepRequired ??
      sampleGaussian(
        MATH_QUESTION_PARAMS.multiStepRequired.mean,
        MATH_QUESTION_PARAMS.multiStepRequired.stdDev
      ),
    wordProblemComplexity:
      overrides?.wordProblemComplexity ??
      sampleGaussian(
        MATH_QUESTION_PARAMS.wordProblemComplexity.mean,
        MATH_QUESTION_PARAMS.wordProblemComplexity.stdDev
      ),
    distractorStrategies: overrides?.distractorStrategies ?? sampleDistractorCombo(domain),
    targetOverallDifficulty: overrides?.targetOverallDifficulty ?? sampleGaussian(0.5, 0.15),
  };
}

/**
 * Compute mathDifficulty object from sampled params.
 */
export function computeMathDifficulty(params: SampledMathParams): {
  reasoningSteps: number;
  algebraicComplexity: number;
  conceptualDepth: number;
  computationLoad: number;
  multiStepRequired: number;
} {
  return {
    reasoningSteps: params.reasoningSteps,
    algebraicComplexity: params.algebraicComplexity,
    conceptualDepth: params.conceptualDepth,
    computationLoad: params.computationLoad,
    multiStepRequired: params.multiStepRequired,
  };
}

/**
 * Compute overall difficulty from mathDifficulty factors.
 */
export function computeOverallDifficulty(params: SampledMathParams): number {
  const factors = [
    params.reasoningSteps,
    params.algebraicComplexity,
    params.conceptualDepth,
    params.computationLoad,
    params.multiStepRequired,
  ];
  return factors.reduce((sum, f) => sum + f, 0) / factors.length;
}

/**
 * Convert reasoning steps (0-1) to actual number of steps (1-5).
 */
export function getReasoningStepCount(normalized: number): number {
  return Math.round(1 + normalized * 4); // 1 to 5 steps
}

/**
 * Get difficulty level (1-3) from overall difficulty.
 */
export function getDifficultyLevel(overallDifficulty: number): 1 | 2 | 3 {
  if (overallDifficulty < 0.33) return 1;
  if (overallDifficulty < 0.67) return 2;
  return 3;
}
