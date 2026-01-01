// ─────────────────────────────────────────────────────────
// GRAPH QUESTION TEMPLATES
// ─────────────────────────────────────────────────────────
// Templates for questions that require figure/graph images.
// Image prompts are generated dynamically by Claude (Stage 1),
// then rendered by Nano Banana Pro (Stage 2).

export interface GraphQuestionTemplate {
  prompt: string;
  options: Array<{ key: string; content: string }>;
  correctAnswer: string;
  domain: string;
  skill: string;
  explanation: string;
  figureType: "graph" | "geometric" | "data_display";
  imageAltText: string;
  // Optional: fallback prompt if Claude generation fails
  imageGenPrompt?: string;
}

// ─────────────────────────────────────────────────────────
// COORDINATE PLANE GRAPHS
// ─────────────────────────────────────────────────────────

export const COORDINATE_PLANE_QUESTIONS: GraphQuestionTemplate[] = [
  {
    prompt:
      "The graph of the linear function $f$ is shown. What is the slope of the line?",
    options: [
      { key: "A", content: "$-2$" },
      { key: "B", content: "$-\\frac{1}{2}$" },
      { key: "C", content: "$\\frac{1}{2}$" },
      { key: "D", content: "$2$" },
    ],
    correctAnswer: "C",
    domain: "algebra",
    skill: "linear_equations",
    explanation:
      "The slope is rise over run. From $(-2, -1)$ to $(2, 1)$: rise $= 1 - (-1) = 2$, run $= 2 - (-2) = 4$. Slope $= \\frac{2}{4} = \\frac{1}{2}$.",
    figureType: "graph",
    imageGenPrompt:
      "Create an SAT-style coordinate plane graph. Draw a straight line passing through the points (-2, -1) and (2, 1) with small dots marking these points. Show x and y axes from -5 to 5 with integer tick marks labeled. Include a light gray grid background. Black lines, white background, clean and minimal like a standardized test.",
    imageAltText:
      "Graph of a linear function on a coordinate plane passing through (-2, -1) and (2, 1)",
  },
  {
    prompt:
      "The graph of the quadratic function $f(x) = x^2 - 4x + 3$ is shown. What are the x-intercepts?",
    options: [
      { key: "A", content: "$x = 1$ and $x = 3$" },
      { key: "B", content: "$x = -1$ and $x = -3$" },
      { key: "C", content: "$x = 0$ and $x = 4$" },
      { key: "D", content: "$x = 2$ only" },
    ],
    correctAnswer: "A",
    domain: "advanced_math",
    skill: "quadratic_equations",
    explanation:
      "Factor the quadratic: $x^2 - 4x + 3 = (x - 1)(x - 3)$. Setting equal to zero: $x = 1$ or $x = 3$.",
    figureType: "graph",
    imageGenPrompt:
      "Create an SAT-style coordinate plane showing a parabola. The parabola opens upward with vertex at (2, -1), crossing the x-axis at x=1 and x=3, and passing through (0, 3) on the y-axis. Mark the x-intercepts with small dots. Show axes from -1 to 5 on x and -2 to 6 on y with labeled tick marks. Clean black curve on white background with light grid.",
    imageAltText:
      "Graph of a parabola opening upward with x-intercepts at x = 1 and x = 3",
  },
  {
    prompt:
      "The graph shows the exponential function $f(x) = 2^x$. Which statement about this function is true?",
    options: [
      { key: "A", content: "The function is decreasing for all values of $x$" },
      { key: "B", content: "The y-intercept is $(0, 1)$" },
      { key: "C", content: "The y-intercept is $(0, 2)$" },
      { key: "D", content: "The function has an x-intercept at $(1, 0)$" },
    ],
    correctAnswer: "B",
    domain: "advanced_math",
    skill: "exponential_functions",
    explanation:
      "For $f(x) = 2^x$, when $x = 0$, $f(0) = 2^0 = 1$. The y-intercept is $(0, 1)$. The function is always increasing and never crosses the x-axis.",
    figureType: "graph",
    imageGenPrompt:
      "Create an SAT-style graph of the exponential function f(x) = 2^x. The curve passes through (-2, 0.25), (-1, 0.5), (0, 1), (1, 2), (2, 4), and (3, 8). Mark the y-intercept at (0, 1) with a dot. Show x-axis from -3 to 4, y-axis from 0 to 8. The curve approaches but never touches the x-axis on the left. Label it 'f(x) = 2^x'. Clean standardized test style.",
    imageAltText:
      "Graph of exponential function 2^x showing rapid growth with y-intercept at (0, 1)",
  },
];

// ─────────────────────────────────────────────────────────
// DATA DISPLAY QUESTIONS
// ─────────────────────────────────────────────────────────

export const DATA_DISPLAY_QUESTIONS: GraphQuestionTemplate[] = [
  {
    prompt:
      "The bar graph shows the number of students in each grade who participated in a science fair. How many more 10th graders participated than 9th graders?",
    options: [
      { key: "A", content: "$5$" },
      { key: "B", content: "$8$" },
      { key: "C", content: "$10$" },
      { key: "D", content: "$15$" },
    ],
    correctAnswer: "C",
    domain: "problem_solving",
    skill: "data_analysis",
    explanation:
      "From the graph: 10th grade = 35 students, 9th grade = 25 students. Difference = $35 - 25 = 10$.",
    figureType: "data_display",
    imageGenPrompt:
      "Create an SAT-style vertical bar chart titled 'Science Fair Participation'. Four bars for grades 9th, 10th, 11th, 12th with heights 25, 35, 30, and 40 students respectively. Y-axis labeled 'Number of Students' from 0 to 50 with gridlines at 10, 20, 30, 40. Bars should be solid gray with the exact values clearly distinguishable. Clean, professional standardized test appearance.",
    imageAltText:
      "Bar chart showing science fair participation: 9th grade 25, 10th grade 35, 11th grade 30, 12th grade 40",
  },
  {
    prompt:
      "The scatter plot shows the relationship between hours studied and test scores. Based on the line of best fit shown, approximately what score would a student who studied 7 hours expect to receive?",
    options: [
      { key: "A", content: "$75$" },
      { key: "B", content: "$82$" },
      { key: "C", content: "$88$" },
      { key: "D", content: "$95$" },
    ],
    correctAnswer: "C",
    domain: "problem_solving",
    skill: "linear_regression",
    explanation:
      "Following the line of best fit to $x = 7$ hours, the predicted score is approximately $88$.",
    figureType: "data_display",
    imageGenPrompt:
      "Create an SAT-style scatter plot showing 'Hours Studied' (x-axis, 0-10) vs 'Test Score' (y-axis, 50-100). Plot points at approximately (1,55), (2,62), (3,68), (4,72), (5,78), (6,82), (8,92), (9,95). Draw a line of best fit passing roughly through (0,50) and (10,95). Points should be solid black dots, line should be thin and straight. Professional standardized test style with grid.",
    imageAltText:
      "Scatter plot showing positive correlation between hours studied and test scores with line of best fit",
  },
  {
    prompt:
      "The histogram shows the distribution of test scores for a class of 30 students. What percentage of students scored between 70 and 79?",
    options: [
      { key: "A", content: "$15\\%$" },
      { key: "B", content: "$25\\%$" },
      { key: "C", content: "$30\\%$" },
      { key: "D", content: "$35\\%$" },
    ],
    correctAnswer: "C",
    domain: "problem_solving",
    skill: "data_interpretation",
    explanation:
      "The 70-79 range has 9 students. Percentage = $\\frac{9}{30} \\times 100 = 30\\%$.",
    figureType: "data_display",
    imageGenPrompt:
      "Create an SAT-style histogram titled 'Test Score Distribution'. Five adjacent bars (no gaps) for score ranges 50-59, 60-69, 70-79, 80-89, 90-100 with heights 3, 5, 9, 8, 5 students. Y-axis labeled 'Number of Students' from 0 to 12. The 70-79 bar should be clearly the tallest at height 9. Clean horizontal gridlines, solid gray bars, professional test appearance.",
    imageAltText:
      "Histogram of test scores showing distribution with peak in 70-79 range (9 students)",
  },
];

// ─────────────────────────────────────────────────────────
// GEOMETRIC FIGURE QUESTIONS
// ─────────────────────────────────────────────────────────

export const GEOMETRIC_QUESTIONS: GraphQuestionTemplate[] = [
  {
    prompt:
      "In the triangle shown, $\\angle A = 50°$ and $\\angle B = 60°$. What is the measure of $\\angle C$?",
    options: [
      { key: "A", content: "$60°$" },
      { key: "B", content: "$70°$" },
      { key: "C", content: "$80°$" },
      { key: "D", content: "$90°$" },
    ],
    correctAnswer: "B",
    domain: "geometry_and_trigonometry",
    skill: "triangle_properties",
    explanation:
      "The sum of angles in a triangle is $180°$. So $\\angle C = 180° - 50° - 60° = 70°$.",
    figureType: "geometric",
    imageGenPrompt:
      "Create an SAT-style triangle diagram. Draw an acute triangle ABC with vertex A at bottom-left, B at bottom-right, and C at top. Label each vertex with its letter. Mark angle A with a small arc and label '50°', mark angle B with a small arc and label '60°', mark angle C with just an arc (no degree label - that's what students solve for). Clean black lines on white, no fill, professional geometry figure style.",
    imageAltText:
      "Triangle ABC with angle A = 50 degrees and angle B = 60 degrees, angle C unlabeled",
  },
  {
    prompt:
      "A circle has a radius of 5 units. What is the area of the shaded sector if the central angle is 72°?",
    options: [
      { key: "A", content: "$5\\pi$" },
      { key: "B", content: "$10\\pi$" },
      { key: "C", content: "$15\\pi$" },
      { key: "D", content: "$25\\pi$" },
    ],
    correctAnswer: "A",
    domain: "geometry_and_trigonometry",
    skill: "circle_properties",
    explanation:
      "Sector area = $\\frac{\\theta}{360°} \\times \\pi r^2 = \\frac{72°}{360°} \\times \\pi (5)^2 = \\frac{1}{5} \\times 25\\pi = 5\\pi$.",
    figureType: "geometric",
    imageGenPrompt:
      "Create an SAT-style circle diagram with a shaded sector. Draw a circle with a center dot. Show two radii forming a 72-degree sector, with the sector shaded in light gray. Label one radius as '5'. Mark the central angle with a small arc and label '72°'. The rest of the circle should be white/unshaded. Clean black outlines, professional geometry figure for a standardized test.",
    imageAltText: "Circle with radius 5 and a 72-degree shaded sector",
  },
  {
    prompt:
      "In the figure, lines $l$ and $m$ are parallel, and they are cut by transversal $t$. If $\\angle 1 = 115°$, what is the measure of $\\angle 2$?",
    options: [
      { key: "A", content: "$65°$" },
      { key: "B", content: "$75°$" },
      { key: "C", content: "$115°$" },
      { key: "D", content: "$125°$" },
    ],
    correctAnswer: "A",
    domain: "geometry_and_trigonometry",
    skill: "parallel_lines",
    explanation:
      "$\\angle 1$ and $\\angle 2$ are co-interior angles (same-side interior angles). They are supplementary, so $\\angle 2 = 180° - 115° = 65°$.",
    figureType: "geometric",
    imageGenPrompt:
      "Create an SAT-style parallel lines diagram. Draw two horizontal parallel lines labeled 'l' (top) and 'm' (bottom) with small arrows indicating they extend infinitely. A diagonal transversal line labeled 't' crosses both. At the upper intersection, mark angle 1 on the interior right side and label it '115°'. At the lower intersection, mark angle 2 on the interior left side (co-interior to angle 1) with just '2' label, no degree. Clean black lines, white background, standardized test geometry style.",
    imageAltText:
      "Two parallel lines l and m crossed by transversal t, with angle 1 = 115° and angle 2 to be found",
  },
];

// ─────────────────────────────────────────────────────────
// EXPORT ALL TEMPLATES
// ─────────────────────────────────────────────────────────

export const ALL_GRAPH_QUESTION_TEMPLATES: GraphQuestionTemplate[] = [
  ...COORDINATE_PLANE_QUESTIONS,
  ...DATA_DISPLAY_QUESTIONS,
  ...GEOMETRIC_QUESTIONS,
];
