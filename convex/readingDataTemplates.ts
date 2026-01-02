// ─────────────────────────────────────────────────────────
// READING DATA QUESTION TEMPLATES
// ─────────────────────────────────────────────────────────
// Verbalized sampling parameters, Claude prompts, and
// distractor strategies for SAT reading questions with
// charts, graphs, and tables.

// ─────────────────────────────────────────────────────────
// VERBALIZED SAMPLING PARAMETERS
// ─────────────────────────────────────────────────────────

/**
 * Parameters for verbalized sampling to create unique questions.
 * Each parameter is sampled to guide question generation.
 */
export const QUESTION_FRAMING_PARAMS = {
  // Type of claim the passage makes about the data
  claimTypes: [
    "causal", // "X causes Y", "X leads to Y"
    "correlational", // "X is associated with Y", "X relates to Y"
    "comparative", // "X differs from Y", "X exceeds Y"
    "trend-based", // "X has increased/decreased over time"
  ] as const,

  // How strongly the claim is asserted (0 = tentative, 1 = definitive)
  claimStrength: { mean: 0.6, stdDev: 0.2 },

  // What specific data element the correct answer references
  targetDataPoints: [
    "max_value", // Highest value in dataset
    "min_value", // Lowest value in dataset
    "trend_direction", // Overall direction (up/down)
    "category_comparison", // Comparing two specific categories
    "specific_value", // Exact number from the data
    "percentage_change", // Change between two points
  ] as const,

  // What the question asks about the data
  questionPositions: [
    "support_claim", // "Which choice most effectively uses data to support..."
    "weaken_claim", // "Which choice most effectively uses data to weaken..."
    "complete_statement", // "Which choice most effectively completes the text?"
  ] as const,

  // Topic domains for realistic data scenarios
  domains: [
    "science", // Biology, chemistry, physics studies
    "economics", // Market data, employment, spending
    "social_science", // Survey data, demographics, psychology
    "health", // Medical studies, nutrition, exercise
    "environment", // Climate, pollution, conservation
  ] as const,
};

export type ClaimType = (typeof QUESTION_FRAMING_PARAMS.claimTypes)[number];
export type TargetDataPoint =
  (typeof QUESTION_FRAMING_PARAMS.targetDataPoints)[number];
export type QuestionPosition =
  (typeof QUESTION_FRAMING_PARAMS.questionPositions)[number];
export type DataDomain = (typeof QUESTION_FRAMING_PARAMS.domains)[number];

// ─────────────────────────────────────────────────────────
// DISTRACTOR STRATEGIES
// ─────────────────────────────────────────────────────────

/**
 * Strategies for generating plausible but incorrect answer choices.
 * Each strategy describes a common misinterpretation of data.
 */
export const DISTRACTOR_STRATEGIES = {
  misread_value:
    "Use a value from an adjacent category, time period, or row (e.g., 54% instead of 45%). The number exists in the data but answers a different question.",

  wrong_comparison:
    "Swap which category is higher/lower (e.g., claim 'A > B' when the data shows B > A). Use correct values but reverse the relationship.",

  opposite_trend:
    "Claim the opposite direction (e.g., 'decreased by 15%' when data shows a 15% increase). Match the magnitude but flip the direction.",

  percentage_confusion:
    "Confuse absolute numbers with percentages or vice versa (e.g., '20 participants' vs '20% of participants'). Use a number that appears in the data but with wrong units.",

  irrelevant_data:
    "Reference accurate data from the wrong year, category, or series that doesn't answer the specific question asked.",

  axis_misread:
    "Misinterpret which axis represents what, or confuse x and y values. Common with scatter plots and line graphs.",

  extrapolation_error:
    "Extend a trend beyond the data shown, making claims about values not actually in the dataset.",

  aggregation_error:
    "Confuse individual values with totals/averages, or misrepresent what a combined value means.",
} as const;

export type DistractorStrategy = keyof typeof DISTRACTOR_STRATEGIES;

/**
 * Pre-defined combinations of distractor strategies that work well together.
 * Each question uses 3 distractors, so we define effective triplets.
 */
export const DISTRACTOR_COMBOS: DistractorStrategy[][] = [
  ["misread_value", "wrong_comparison", "opposite_trend"],
  ["percentage_confusion", "irrelevant_data", "misread_value"],
  ["axis_misread", "wrong_comparison", "extrapolation_error"],
  ["aggregation_error", "misread_value", "opposite_trend"],
  ["irrelevant_data", "percentage_confusion", "wrong_comparison"],
  ["extrapolation_error", "misread_value", "aggregation_error"],
];

// ─────────────────────────────────────────────────────────
// DATA GENERATION PROMPT
// ─────────────────────────────────────────────────────────

/**
 * Claude prompt for generating realistic dataset based on sampled parameters.
 * This is Stage 1a: Create the data that will be visualized.
 */
export const DATA_GENERATION_PROMPT = `You are generating realistic data for an SAT Reading question that tests data interpretation.

CONTEXT:
- Domain: {domain}
- Data Type: {dataType} (bar_chart, line_graph, or data_table)
- The data should support interesting questions about: {claimType} relationships

REQUIREMENTS:
1. Generate REALISTIC data that could appear in an academic study or report
2. Include 3-6 categories/data points (enough for comparison, not overwhelming)
3. Values should be plausible for the domain
4. Include enough variation to allow for interesting comparisons
5. The data should naturally support {claimType} interpretations

OUTPUT FORMAT (JSON only, no explanation):
{
  "title": "Clear, descriptive title for the figure",
  "xAxisLabel": "Label for x-axis or first column",
  "yAxisLabel": "Label for y-axis or value column",
  "categories": ["Category1", "Category2", ...],
  "values": [number1, number2, ...],
  "unit": "%" or "count" or specific unit,
  "source": "Fictional but realistic source attribution",
  "year": number or range string
}

For line graphs with multiple time points:
{
  "title": "...",
  "xAxisLabel": "Year",
  "yAxisLabel": "...",
  "timePoints": [2018, 2019, 2020, 2021, 2022],
  "series": [
    { "name": "Series A", "values": [10, 15, 18, 22, 25] },
    { "name": "Series B", "values": [8, 12, 14, 16, 20] }
  ],
  "unit": "...",
  "source": "...",
  "year": "2018-2022"
}

For data tables:
{
  "title": "Survey Results on Study Habits",
  "headers": ["Study Method", "Hours/Week", "GPA", "Satisfaction"],
  "rows": [
    { "label": "Flashcards", "values": [5.2, 3.4, "High"] },
    { "label": "Practice Tests", "values": [4.8, 3.6, "Very High"] },
    { "label": "Reading Notes", "values": [6.1, 3.2, "Medium"] },
    { "label": "Group Study", "values": [3.5, 3.3, "High"] }
  ],
  "source": "...",
  "year": 2024
}

Generate the data now:`;

// ─────────────────────────────────────────────────────────
// QUESTION GENERATION PROMPT
// ─────────────────────────────────────────────────────────

/**
 * Claude prompt for generating the question, passage, and answer choices.
 * This is Stage 2: Create the question around the data.
 */
export const QUESTION_GENERATION_PROMPT = `You are generating an SAT Reading question based on visual data.

SAMPLED PARAMETERS (use these to guide your generation):
- Claim Type: {claimType}
  ${"{claimTypeDescription}"}
- Claim Strength: {claimStrength} (0.0 = very tentative "may suggest", 1.0 = definitive "clearly demonstrates")
- Target Data Point: {targetDataPoint} (the correct answer MUST reference this aspect of the data)
- Question Position: {questionPosition}
- Distractor Strategies: {distractorStrategies}

DATA TO REFERENCE:
{dataJson}

TASK:
Generate an SAT-style reading question where students must interpret the data to support, weaken, or complete a claim.

REQUIREMENTS:
1. CONTEXT (2-3 sentences): Write a brief passage that:
   - Introduces a researcher, study, or finding related to the data
   - Makes a {claimType} claim at strength level {claimStrength}
   - Naturally leads to needing data support

2. QUESTION STEM: Use SAT-style phrasing based on {questionPosition}:
   - support_claim: "Which choice most effectively uses data from the figure to support [researcher's] claim?"
   - weaken_claim: "Which choice most effectively uses data from the figure to weaken [researcher's] conclusion?"
   - complete_statement: "Which choice most effectively uses data from the figure to complete the text?"

3. CORRECT ANSWER (A): Must accurately reference {targetDataPoint} from the data. Use specific numbers/values.

4. DISTRACTORS (B, C, D): Each uses a different strategy from {distractorStrategies}:
{distractorInstructions}

All answer choices should:
- Be similar in length and structure
- Sound plausible and academic
- Use specific data from the figure (real or misread values)

OUTPUT FORMAT (JSON only):
{
  "passage": "The 2-3 sentence context passage",
  "questionStem": "Which choice most effectively...",
  "choices": {
    "A": "Correct answer with accurate data reference",
    "B": "Distractor using strategy 1",
    "C": "Distractor using strategy 2",
    "D": "Distractor using strategy 3"
  },
  "explanation": "Why A is correct and B/C/D are wrong",
  "distractorExplanations": {
    "B": "Why this is wrong (strategy used)",
    "C": "Why this is wrong (strategy used)",
    "D": "Why this is wrong (strategy used)"
  }
}

Generate the question now:`;

// ─────────────────────────────────────────────────────────
// CLAIM TYPE DESCRIPTIONS
// ─────────────────────────────────────────────────────────

export const CLAIM_TYPE_DESCRIPTIONS: Record<ClaimType, string> = {
  causal:
    'The passage should suggest X causes/leads to/results in Y. Example: "Researchers found that increased screen time leads to reduced sleep quality."',
  correlational:
    'The passage should note X is associated with/related to Y without implying causation. Example: "The study observed a relationship between exercise frequency and reported stress levels."',
  comparative:
    'The passage should compare two or more groups/categories. Example: "Urban residents showed different patterns than rural residents in their commuting habits."',
  "trend-based":
    'The passage should describe change over time. Example: "Over the past decade, renewable energy adoption has shifted significantly in the manufacturing sector."',
};

// ─────────────────────────────────────────────────────────
// SAMPLING UTILITIES
// ─────────────────────────────────────────────────────────

/**
 * Sample from a Gaussian distribution, clamped to [0, 1].
 */
export function sampleGaussian(mean: number, stdDev: number): number {
  // Box-Muller transform
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
 * Sample a distractor strategy combination.
 */
export function sampleDistractorCombo(): DistractorStrategy[] {
  return sampleFrom(DISTRACTOR_COMBOS);
}

/**
 * Generate all sampled parameters for a question.
 */
export interface SampledQuestionParams {
  claimType: ClaimType;
  claimStrength: number;
  targetDataPoint: TargetDataPoint;
  questionPosition: QuestionPosition;
  distractorStrategies: DistractorStrategy[];
  domain: DataDomain;
}

export function sampleQuestionParams(): SampledQuestionParams {
  return {
    claimType: sampleFrom(QUESTION_FRAMING_PARAMS.claimTypes),
    claimStrength: sampleGaussian(
      QUESTION_FRAMING_PARAMS.claimStrength.mean,
      QUESTION_FRAMING_PARAMS.claimStrength.stdDev
    ),
    targetDataPoint: sampleFrom(QUESTION_FRAMING_PARAMS.targetDataPoints),
    questionPosition: sampleFrom(QUESTION_FRAMING_PARAMS.questionPositions),
    distractorStrategies: sampleDistractorCombo(),
    domain: sampleFrom(QUESTION_FRAMING_PARAMS.domains),
  };
}

// ─────────────────────────────────────────────────────────
// PROMPT BUILDERS
// ─────────────────────────────────────────────────────────

/**
 * Build the data generation prompt with sampled parameters.
 */
export function buildDataGenerationPrompt(
  params: SampledQuestionParams,
  dataType: "bar_chart" | "line_graph" | "data_table"
): string {
  return DATA_GENERATION_PROMPT.replace("{domain}", params.domain)
    .replace("{dataType}", dataType)
    .replace("{claimType}", params.claimType)
    .replace("{claimType}", params.claimType);
}

/**
 * Build the question generation prompt with all parameters and data.
 */
export function buildQuestionGenerationPrompt(
  params: SampledQuestionParams,
  dataJson: string
): string {
  // Build distractor instructions
  const distractorInstructions = params.distractorStrategies
    .map(
      (strategy, i) =>
        `   - Choice ${["B", "C", "D"][i]}: ${DISTRACTOR_STRATEGIES[strategy]}`
    )
    .join("\n");

  return QUESTION_GENERATION_PROMPT.replace("{claimType}", params.claimType)
    .replace("{claimTypeDescription}", CLAIM_TYPE_DESCRIPTIONS[params.claimType])
    .replace("{claimStrength}", params.claimStrength.toFixed(2))
    .replace("{targetDataPoint}", params.targetDataPoint)
    .replace("{questionPosition}", params.questionPosition)
    .replace(
      "{distractorStrategies}",
      params.distractorStrategies.join(", ")
    )
    .replace("{dataJson}", dataJson)
    .replace("{distractorInstructions}", distractorInstructions);
}
