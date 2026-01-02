// ─────────────────────────────────────────────────────────
// READING DATA IMAGE PROMPTS
// ─────────────────────────────────────────────────────────
// Chart-specific prompts for Gemini (Nano Banana Pro) to
// render accurate data visualizations for SAT reading questions.

// ─────────────────────────────────────────────────────────
// DATA TYPES
// ─────────────────────────────────────────────────────────

export type DataType = "bar_chart" | "line_graph" | "data_table";

export interface BarChartData {
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  categories: string[];
  values: number[];
  unit: string;
  source?: string;
  year?: string | number;
}

export interface MultiSeriesBarChartData {
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  categories: string[];
  series: Array<{
    name: string;
    values: number[];
  }>;
  unit: string;
  source?: string;
  year?: string | number;
}

export interface LineGraphData {
  title: string;
  xAxisLabel: string;
  yAxisLabel: string;
  timePoints: (string | number)[];
  series: Array<{
    name: string;
    values: number[];
  }>;
  unit: string;
  source?: string;
  year?: string | number;
}

export interface DataTableData {
  title: string;
  headers: string[];
  rows: Array<{
    label: string;
    values: (string | number)[];
  }>;
  source?: string;
  year?: string | number;
}

export type ChartData =
  | BarChartData
  | MultiSeriesBarChartData
  | LineGraphData
  | DataTableData;

// ─────────────────────────────────────────────────────────
// PROMPT TEMPLATES
// ─────────────────────────────────────────────────────────

/**
 * Base styling instructions for all chart types.
 * Consistent SAT-style appearance.
 */
const BASE_STYLING = `
Style requirements:
- Clean, professional appearance like a standardized test
- White background with subtle gray gridlines
- Black text and axes, dark gray bars/lines
- Clear, readable labels with appropriate font size
- No 3D effects, shadows, or decorative elements
- Include the title at the top
- If there's a source, show it in small text at bottom`;

/**
 * Generate prompt for a simple bar chart.
 */
export function buildBarChartPrompt(data: BarChartData): string {
  const maxValue = Math.max(...data.values);
  const roundedMax = Math.ceil(maxValue / 10) * 10 + 10;

  const valuesList = data.categories
    .map((cat, i) => `"${cat}": ${data.values[i]}${data.unit === "%" ? "%" : ""}`)
    .join(", ");

  return `Create an SAT-style vertical bar chart.

Title: "${data.title}"

X-axis categories (left to right): ${data.categories.map((c) => `"${c}"`).join(", ")}
Y-axis: "${data.yAxisLabel}" ranging from 0 to ${roundedMax}

EXACT bar heights (these must be precise and readable):
${valuesList}

The values must be clearly distinguishable from the gridlines. Each bar should be solid dark gray.
${data.source ? `\nSource attribution at bottom: "${data.source}"` : ""}
${BASE_STYLING}`;
}

/**
 * Generate prompt for a grouped/multi-series bar chart.
 */
export function buildMultiSeriesBarChartPrompt(
  data: MultiSeriesBarChartData
): string {
  const allValues = data.series.flatMap((s) => s.values);
  const maxValue = Math.max(...allValues);
  const roundedMax = Math.ceil(maxValue / 10) * 10 + 10;

  const seriesDescriptions = data.series
    .map((series, si) => {
      const values = data.categories
        .map(
          (cat, i) =>
            `"${cat}": ${series.values[i]}${data.unit === "%" ? "%" : ""}`
        )
        .join(", ");
      return `${series.name}: ${values}`;
    })
    .join("\n");

  return `Create an SAT-style grouped bar chart with ${data.series.length} series.

Title: "${data.title}"

X-axis categories: ${data.categories.map((c) => `"${c}"`).join(", ")}
Y-axis: "${data.yAxisLabel}" ranging from 0 to ${roundedMax}

EXACT values for each series (bars grouped by category):
${seriesDescriptions}

Legend: Show a legend identifying each series with different gray tones (light gray, medium gray, dark gray).
Each group of bars should be clearly distinguishable.
${data.source ? `\nSource attribution at bottom: "${data.source}"` : ""}
${BASE_STYLING}`;
}

/**
 * Generate prompt for a line graph.
 */
export function buildLineGraphPrompt(data: LineGraphData): string {
  const allValues = data.series.flatMap((s) => s.values);
  const maxValue = Math.max(...allValues);
  const minValue = Math.min(...allValues);
  const roundedMax = Math.ceil(maxValue / 10) * 10 + 10;
  const roundedMin = Math.max(0, Math.floor(minValue / 10) * 10 - 10);

  const seriesDescriptions = data.series
    .map((series) => {
      const points = data.timePoints
        .map(
          (t, i) =>
            `(${t}, ${series.values[i]}${data.unit === "%" ? "%" : ""})`
        )
        .join(" → ");
      return `${series.name}: ${points}`;
    })
    .join("\n");

  return `Create an SAT-style line graph with ${data.series.length} line${data.series.length > 1 ? "s" : ""}.

Title: "${data.title}"

X-axis: "${data.xAxisLabel}" with points at ${data.timePoints.join(", ")}
Y-axis: "${data.yAxisLabel}" ranging from ${roundedMin} to ${roundedMax}

EXACT data points to plot (connect with straight lines):
${seriesDescriptions}

Mark each data point with a small dot/circle.
${data.series.length > 1 ? "Use different line styles (solid, dashed) or markers to distinguish series. Include a legend." : ""}
${data.source ? `\nSource attribution at bottom: "${data.source}"` : ""}
${BASE_STYLING}`;
}

/**
 * Generate prompt for a data table.
 */
export function buildDataTablePrompt(data: DataTableData): string {
  const tableContent = data.rows
    .map((row) => `${row.label}: ${row.values.join(" | ")}`)
    .join("\n");

  return `Create an SAT-style data table.

Title: "${data.title}"

Column headers: ${data.headers.join(" | ")}

Row data:
${tableContent}

Table requirements:
- Clean black borders around all cells
- Header row should be slightly shaded or bold
- All numbers should be clearly legible
- Professional, standardized test appearance
- White background
- Proper alignment (text left, numbers right)
${data.source ? `\nSource attribution below table: "${data.source}"` : ""}`;
}

// ─────────────────────────────────────────────────────────
// MAIN PROMPT BUILDER
// ─────────────────────────────────────────────────────────

/**
 * Build the appropriate image generation prompt based on data type.
 */
export function buildChartPrompt(
  dataType: DataType,
  data: ChartData
): { prompt: string; altText: string } {
  let prompt: string;
  let altText: string;

  switch (dataType) {
    case "bar_chart":
      if ("series" in data && Array.isArray((data as MultiSeriesBarChartData).series)) {
        const multiData = data as MultiSeriesBarChartData;
        prompt = buildMultiSeriesBarChartPrompt(multiData);
        altText = `Grouped bar chart showing ${multiData.title} with ${multiData.series.length} series across ${multiData.categories.length} categories`;
      } else {
        const barData = data as BarChartData;
        prompt = buildBarChartPrompt(barData);
        altText = `Bar chart showing ${barData.title} for ${barData.categories.length} categories`;
      }
      break;

    case "line_graph":
      const lineData = data as LineGraphData;
      prompt = buildLineGraphPrompt(lineData);
      altText = `Line graph showing ${lineData.title} with ${lineData.series.length} series over ${lineData.timePoints.length} time points`;
      break;

    case "data_table":
      const tableData = data as DataTableData;
      prompt = buildDataTablePrompt(tableData);
      altText = `Data table showing ${tableData.title} with ${tableData.rows.length} rows and ${tableData.headers.length} columns`;
      break;

    default:
      throw new Error(`Unknown data type: ${dataType}`);
  }

  return { prompt, altText };
}

// ─────────────────────────────────────────────────────────
// DATA VALIDATION
// ─────────────────────────────────────────────────────────

/**
 * Validate that generated data has the required structure.
 */
export function validateChartData(
  dataType: DataType,
  data: unknown
): data is ChartData {
  if (!data || typeof data !== "object") return false;

  const d = data as Record<string, unknown>;

  // All types need a title
  if (typeof d.title !== "string") return false;

  switch (dataType) {
    case "bar_chart":
      return (
        Array.isArray(d.categories) &&
        (Array.isArray(d.values) || Array.isArray(d.series)) &&
        typeof d.yAxisLabel === "string"
      );

    case "line_graph":
      return (
        Array.isArray(d.timePoints) &&
        Array.isArray(d.series) &&
        typeof d.xAxisLabel === "string" &&
        typeof d.yAxisLabel === "string"
      );

    case "data_table":
      return Array.isArray(d.headers) && Array.isArray(d.rows);

    default:
      return false;
  }
}
