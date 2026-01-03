// ─────────────────────────────────────────────────────────
// MATH FIGURE IMAGE PROMPTS
// ─────────────────────────────────────────────────────────
// Prompts for Gemini to render math figures:
// - Coordinate graphs (lines, parabolas, points)
// - Geometric diagrams (triangles, circles, shapes)

import type { FigureType } from "./mathQuestionTemplates";

// ─────────────────────────────────────────────────────────
// DATA TYPES
// ─────────────────────────────────────────────────────────

export interface CoordinateGraphElement {
  kind: "line" | "parabola" | "points" | "circle" | "exponential" | "absolute_value";
  equation?: string; // e.g., "y = 2x + 3" or "y = x^2 - 4"
  points?: [number, number][]; // For discrete points
  color?: "blue" | "red" | "green" | "black";
  label?: string; // e.g., "f(x)" or "Line m"
  style?: "solid" | "dashed" | "dotted";
}

export interface LabeledPoint {
  point: [number, number];
  label: string;
}

export interface CoordinateGraphData {
  type: "coordinate_graph";
  elements: CoordinateGraphElement[];
  xRange: [number, number];
  yRange: [number, number];
  showGrid?: boolean;
  showAxes?: boolean;
  labeledPoints?: LabeledPoint[];
  title?: string;
}

export interface ShapeDefinition {
  kind: "triangle" | "rectangle" | "circle" | "line" | "angle" | "quadrilateral" | "polygon";
  vertices?: string[]; // e.g., ["A", "B", "C"]
  coordinates?: [number, number][]; // Actual positions for rendering
  measurements?: Record<string, string>; // e.g., { "AB": "5", "angle_A": "60°" }
  rightAngles?: string[]; // Vertices with right angles
  parallel?: [string, string][]; // Pairs of parallel segments
  congruent?: [string, string][]; // Pairs of congruent segments
  center?: [number, number]; // For circles
  radius?: number; // For circles
}

export interface AuxiliaryLine {
  from: string;
  to: string;
  style?: "solid" | "dashed" | "dotted";
  label?: string;
}

export interface GeometricDiagramData {
  type: "geometric_diagram";
  shapes: ShapeDefinition[];
  auxiliaryLines?: AuxiliaryLine[];
  title?: string;
}

export type MathFigureData = CoordinateGraphData | GeometricDiagramData;

// ─────────────────────────────────────────────────────────
// BASE STYLING
// ─────────────────────────────────────────────────────────

const BASE_STYLING = `
Style requirements:
- Render as a flat digital vector illustration, NOT a photograph
- Pure white background
- Crisp black lines for axes and shapes
- Clear, readable labels with appropriate font size
- No 3D effects, shadows, gradients, or photorealistic elements
- Print-ready educational graphic style
- Clean, professional SAT test appearance`;

const COORDINATE_STYLING = `
Coordinate plane requirements:
- Show x and y axes with arrows at ends
- Include light gray gridlines at integer intervals
- Label axes with x and y
- Mark integer tick marks on both axes
- Origin (0,0) clearly visible
- All plotted elements should be clearly distinguishable`;

const GEOMETRIC_STYLING = `
Geometric figure requirements:
- All vertices should be labeled with capital letters
- Right angles marked with small squares
- Measurements shown next to their corresponding sides/angles
- Parallel marks (arrows) on parallel segments
- Congruence marks (tick marks) on congruent segments
- Figure should be well-proportioned and not distorted`;

// ─────────────────────────────────────────────────────────
// COORDINATE GRAPH PROMPTS
// ─────────────────────────────────────────────────────────

/**
 * Build prompt for element description.
 */
function describeElement(element: CoordinateGraphElement): string {
  const color = element.color || "black";
  const style = element.style || "solid";
  const label = element.label ? ` labeled "${element.label}"` : "";

  switch (element.kind) {
    case "line":
      return `A ${style} ${color} line: ${element.equation}${label}`;
    case "parabola":
      return `A ${style} ${color} parabola: ${element.equation}${label}`;
    case "exponential":
      return `A ${style} ${color} exponential curve: ${element.equation}${label}`;
    case "absolute_value":
      return `A ${style} ${color} V-shaped absolute value graph: ${element.equation}${label}`;
    case "circle":
      return `A ${style} ${color} circle: ${element.equation}${label}`;
    case "points":
      const pts = element.points?.map((p) => `(${p[0]}, ${p[1]})`).join(", ") || "";
      return `${color} points at: ${pts}${label}`;
    default:
      return `A ${color} ${element.kind}${label}`;
  }
}

/**
 * Generate prompt for a coordinate graph.
 */
export function buildCoordinateGraphPrompt(data: CoordinateGraphData): string {
  const elementDescriptions = data.elements.map(describeElement).join("\n");

  const labeledPointsDesc = data.labeledPoints
    ?.map((lp) => `Point ${lp.label} at (${lp.point[0]}, ${lp.point[1]})`)
    .join("\n") || "";

  return `Create an SAT-style coordinate plane graph as a flat digital vector illustration.

${data.title ? `Title: "${data.title}"\n` : ""}
Coordinate plane window:
- X-axis from ${data.xRange[0]} to ${data.xRange[1]}
- Y-axis from ${data.yRange[0]} to ${data.yRange[1]}
${data.showGrid !== false ? "- Show gridlines at integer intervals" : "- No gridlines, just axes"}

Elements to draw:
${elementDescriptions}

${labeledPointsDesc ? `Labeled points:\n${labeledPointsDesc}\n` : ""}
Important:
- Each graphed element must be clearly visible and accurate
- Lines should extend to the edge of the visible window
- Points should be marked with solid dots
- If there are intercepts or special points, they should be clearly on the gridlines

${COORDINATE_STYLING}
${BASE_STYLING}`;
}

// ─────────────────────────────────────────────────────────
// GEOMETRIC DIAGRAM PROMPTS
// ─────────────────────────────────────────────────────────

/**
 * Build description for a shape.
 */
function describeShape(shape: ShapeDefinition): string {
  const parts: string[] = [];

  switch (shape.kind) {
    case "triangle":
      parts.push(`Triangle ${shape.vertices?.join("") || "ABC"}`);
      break;
    case "rectangle":
      parts.push(`Rectangle ${shape.vertices?.join("") || "ABCD"}`);
      break;
    case "circle":
      if (shape.center && shape.radius) {
        parts.push(`Circle with center at (${shape.center[0]}, ${shape.center[1]}) and radius ${shape.radius}`);
      } else {
        parts.push("Circle");
      }
      break;
    case "quadrilateral":
      parts.push(`Quadrilateral ${shape.vertices?.join("") || "ABCD"}`);
      break;
    case "polygon":
      parts.push(`Polygon with vertices ${shape.vertices?.join(", ") || ""}`);
      break;
    case "angle":
      parts.push(`Angle at vertex ${shape.vertices?.[1] || ""}`);
      break;
    case "line":
      parts.push(`Line segment from ${shape.vertices?.[0]} to ${shape.vertices?.[1]}`);
      break;
    default:
      parts.push(`Shape: ${shape.kind}`);
  }

  // Add measurements
  if (shape.measurements) {
    const measurementList = Object.entries(shape.measurements)
      .map(([key, val]) => {
        if (key.startsWith("angle_")) {
          return `Angle ${key.replace("angle_", "")} = ${val}`;
        }
        return `Side ${key} = ${val}`;
      })
      .join(", ");
    parts.push(`Measurements: ${measurementList}`);
  }

  // Add right angles
  if (shape.rightAngles?.length) {
    parts.push(`Right angle(s) at: ${shape.rightAngles.join(", ")}`);
  }

  // Add parallel segments
  if (shape.parallel?.length) {
    const parallelDesc = shape.parallel.map((p) => `${p[0]} || ${p[1]}`).join(", ");
    parts.push(`Parallel segments: ${parallelDesc}`);
  }

  // Add congruent segments
  if (shape.congruent?.length) {
    const congruentDesc = shape.congruent.map((c) => `${c[0]} ≅ ${c[1]}`).join(", ");
    parts.push(`Congruent segments: ${congruentDesc}`);
  }

  return parts.join("\n  ");
}

/**
 * Generate prompt for a geometric diagram.
 */
export function buildGeometricDiagramPrompt(data: GeometricDiagramData): string {
  const shapeDescriptions = data.shapes.map(describeShape).join("\n\n");

  const auxiliaryDesc = data.auxiliaryLines
    ?.map((aux) => `${aux.style || "dashed"} line from ${aux.from} to ${aux.to}${aux.label ? ` labeled "${aux.label}"` : ""}`)
    .join("\n") || "";

  return `Create an SAT-style geometric diagram as a flat digital vector illustration.

${data.title ? `Title: "${data.title}"\n` : ""}
Shapes to draw:
${shapeDescriptions}

${auxiliaryDesc ? `Auxiliary construction:\n${auxiliaryDesc}\n` : ""}
Labeling requirements:
- Label all vertices with capital letters (A, B, C, etc.)
- Show all measurements next to their corresponding elements
- Mark right angles with small squares
- Use tick marks to indicate congruent segments
- Use arrows to indicate parallel segments

${GEOMETRIC_STYLING}
${BASE_STYLING}`;
}

// ─────────────────────────────────────────────────────────
// SPECIFIC FIGURE TYPE PROMPTS
// ─────────────────────────────────────────────────────────

/**
 * Generate prompt for a right triangle with Pythagorean theorem setup.
 */
export function buildRightTrianglePrompt(
  vertices: [string, string, string],
  rightAngleVertex: string,
  sides: { [key: string]: string | number },
  unknownSide: string
): string {
  const data: GeometricDiagramData = {
    type: "geometric_diagram",
    shapes: [
      {
        kind: "triangle",
        vertices: vertices,
        rightAngles: [rightAngleVertex],
        measurements: Object.fromEntries(
          Object.entries(sides).map(([k, v]) => [k, String(v)])
        ),
      },
    ],
  };

  return buildGeometricDiagramPrompt(data) + `

Special note: This is a right triangle for Pythagorean theorem. The unknown side ${unknownSide} should be labeled with a variable (like x).`;
}

/**
 * Generate prompt for a linear function graph.
 */
export function buildLinearFunctionPrompt(
  slope: number,
  yIntercept: number,
  labeledPoints?: { x: number; y: number; label: string }[]
): string {
  const equation = `y = ${slope === 1 ? "" : slope === -1 ? "-" : slope}x ${yIntercept >= 0 ? `+ ${yIntercept}` : `- ${Math.abs(yIntercept)}`}`;

  const data: CoordinateGraphData = {
    type: "coordinate_graph",
    elements: [
      {
        kind: "line",
        equation: equation,
        color: "blue",
        style: "solid",
      },
    ],
    xRange: [-10, 10],
    yRange: [-10, 10],
    showGrid: true,
    showAxes: true,
    labeledPoints: labeledPoints?.map((p) => ({
      point: [p.x, p.y] as [number, number],
      label: p.label,
    })),
  };

  return buildCoordinateGraphPrompt(data);
}

/**
 * Generate prompt for a quadratic function graph.
 */
export function buildQuadraticFunctionPrompt(
  a: number,
  b: number,
  c: number,
  showVertex?: boolean,
  showRoots?: boolean
): string {
  // Standard form: y = ax² + bx + c
  const terms: string[] = [];
  if (a !== 0) terms.push(a === 1 ? "x²" : a === -1 ? "-x²" : `${a}x²`);
  if (b !== 0) terms.push(b > 0 && terms.length ? `+ ${b}x` : `${b}x`);
  if (c !== 0) terms.push(c > 0 && terms.length ? `+ ${c}` : `${c}`);
  const equation = `y = ${terms.join(" ")}`;

  const labeledPoints: LabeledPoint[] = [];

  // Calculate vertex
  if (showVertex) {
    const vx = -b / (2 * a);
    const vy = a * vx * vx + b * vx + c;
    labeledPoints.push({ point: [vx, vy], label: "Vertex" });
  }

  // Calculate roots if they exist and showRoots is true
  if (showRoots) {
    const discriminant = b * b - 4 * a * c;
    if (discriminant >= 0) {
      const root1 = (-b + Math.sqrt(discriminant)) / (2 * a);
      const root2 = (-b - Math.sqrt(discriminant)) / (2 * a);
      if (discriminant === 0) {
        labeledPoints.push({ point: [root1, 0], label: "Root" });
      } else {
        labeledPoints.push({ point: [root1, 0], label: "Root 1" });
        labeledPoints.push({ point: [root2, 0], label: "Root 2" });
      }
    }
  }

  const data: CoordinateGraphData = {
    type: "coordinate_graph",
    elements: [
      {
        kind: "parabola",
        equation: equation,
        color: "blue",
        style: "solid",
      },
    ],
    xRange: [-10, 10],
    yRange: [-10, 10],
    showGrid: true,
    showAxes: true,
    labeledPoints: labeledPoints.length > 0 ? labeledPoints : undefined,
  };

  return buildCoordinateGraphPrompt(data);
}

/**
 * Generate prompt for a circle diagram (geometry).
 */
export function buildCircleGeometryPrompt(
  centerLabel: string,
  radiusLabel: string,
  radius: number | string,
  showDiameter?: boolean,
  inscribedAngle?: { vertex: string; arc: [string, string]; degrees: number }
): string {
  const shapes: ShapeDefinition[] = [
    {
      kind: "circle",
      center: [0, 0],
      radius: typeof radius === "number" ? radius : 3,
      measurements: { [radiusLabel]: String(radius) },
    },
  ];

  let additionalInstructions = "";

  if (showDiameter) {
    additionalInstructions += "\nShow the diameter as a line through the center, with its length labeled.";
  }

  if (inscribedAngle) {
    additionalInstructions += `\nShow inscribed angle at vertex ${inscribedAngle.vertex} spanning arc ${inscribedAngle.arc[0]}${inscribedAngle.arc[1]}, measuring ${inscribedAngle.degrees}°.`;
  }

  const data: GeometricDiagramData = {
    type: "geometric_diagram",
    shapes: shapes,
    title: `Circle with center ${centerLabel}`,
  };

  return buildGeometricDiagramPrompt(data) + additionalInstructions;
}

// ─────────────────────────────────────────────────────────
// MAIN PROMPT BUILDER
// ─────────────────────────────────────────────────────────

/**
 * Build the appropriate image generation prompt based on figure type.
 */
export function buildMathFigurePrompt(
  figureType: FigureType,
  data: MathFigureData
): { prompt: string; altText: string } {
  if (figureType === "none") {
    return { prompt: "", altText: "" };
  }

  let prompt: string;
  let altText: string;

  if (data.type === "coordinate_graph") {
    prompt = buildCoordinateGraphPrompt(data);
    const elementCount = data.elements.length;
    const elementTypes = [...new Set(data.elements.map((e) => e.kind))].join(", ");
    altText = `Coordinate plane showing ${elementCount} element(s): ${elementTypes}`;
  } else if (data.type === "geometric_diagram") {
    prompt = buildGeometricDiagramPrompt(data);
    const shapeTypes = data.shapes.map((s) => s.kind).join(", ");
    altText = `Geometric diagram showing ${shapeTypes}`;
  } else {
    throw new Error(`Unknown figure data type`);
  }

  return { prompt, altText };
}

// ─────────────────────────────────────────────────────────
// DATA VALIDATION
// ─────────────────────────────────────────────────────────

/**
 * Validate coordinate graph data structure.
 */
export function validateCoordinateGraphData(data: unknown): data is CoordinateGraphData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;

  return (
    d.type === "coordinate_graph" &&
    Array.isArray(d.elements) &&
    Array.isArray(d.xRange) &&
    d.xRange.length === 2 &&
    Array.isArray(d.yRange) &&
    d.yRange.length === 2
  );
}

/**
 * Validate geometric diagram data structure.
 */
export function validateGeometricDiagramData(data: unknown): data is GeometricDiagramData {
  if (!data || typeof data !== "object") return false;
  const d = data as Record<string, unknown>;

  return d.type === "geometric_diagram" && Array.isArray(d.shapes);
}

/**
 * Validate any math figure data.
 */
export function validateMathFigureData(data: unknown): data is MathFigureData {
  return validateCoordinateGraphData(data) || validateGeometricDiagramData(data);
}
