/**
 * PDF Generator for SAT Practice Tests
 *
 * This utility generates PDF practice tests and answer keys from the question pool.
 * For use in admin/generation scripts.
 */

import jsPDF from "jspdf";

// Types
export interface PDFQuestion {
  id: string;
  number: number;
  category: "reading_writing" | "math";
  domain: string;
  skill: string;
  difficulty: number;
  prompt: string;
  passage?: {
    content: string;
    title?: string;
    author?: string;
  };
  options: Array<{
    key: string;
    content: string;
  }>;
  correctAnswer: string;
  explanation?: string;
}

export interface TestGenerationOptions {
  testNumber: number;
  testName: string;
  readingWritingQuestions: PDFQuestion[];
  mathQuestions: PDFQuestion[];
  includeInstructions?: boolean;
}

// Constants for PDF layout
const PAGE_WIDTH = 612; // 8.5" in points
const PAGE_HEIGHT = 792; // 11" in points
const MARGIN = 50;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LINE_HEIGHT = 14;
const TITLE_SIZE = 24;
const HEADING_SIZE = 16;
const BODY_SIZE = 11;
const SMALL_SIZE = 9;

/**
 * Wraps text to fit within a specified width
 */
function wrapText(
  pdf: jsPDF,
  text: string,
  maxWidth: number
): string[] {
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    if (paragraph.trim() === "") {
      lines.push("");
      continue;
    }

    const words = paragraph.split(" ");
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = pdf.getTextWidth(testLine);

      if (testWidth > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }
  }

  return lines;
}

/**
 * Adds a new page if needed based on remaining space
 */
function checkPageBreak(
  pdf: jsPDF,
  yPosition: number,
  neededSpace: number
): number {
  if (yPosition + neededSpace > PAGE_HEIGHT - MARGIN) {
    pdf.addPage();
    return MARGIN;
  }
  return yPosition;
}

/**
 * Generates the cover page for the test
 */
function generateCoverPage(
  pdf: jsPDF,
  testName: string,
  testNumber: number,
  isAnswerKey: boolean = false
): void {
  // Title
  pdf.setFontSize(TITLE_SIZE);
  pdf.setFont("helvetica", "bold");
  const title = isAnswerKey ? "Answer Key" : "Practice Test";
  pdf.text(title, PAGE_WIDTH / 2, 200, { align: "center" });

  // Test name
  pdf.setFontSize(HEADING_SIZE);
  pdf.text(testName, PAGE_WIDTH / 2, 240, { align: "center" });

  // Test number
  pdf.setFontSize(BODY_SIZE);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Test #${testNumber}`, PAGE_WIDTH / 2, 270, { align: "center" });

  // Instructions (for test only)
  if (!isAnswerKey) {
    let y = 350;
    pdf.setFontSize(HEADING_SIZE);
    pdf.setFont("helvetica", "bold");
    pdf.text("Instructions", MARGIN, y);

    y += 25;
    pdf.setFontSize(BODY_SIZE);
    pdf.setFont("helvetica", "normal");
    const instructions = [
      "• This test contains two sections: Reading and Writing, and Math.",
      "• Reading and Writing: 54 questions, 64 minutes recommended.",
      "• Math: 44 questions, 70 minutes recommended.",
      "• For multiple choice questions, select the best answer from the options provided.",
      "• For grid-in questions, write your answer in the space provided.",
      "• No calculator is allowed for the first portion of the Math section.",
      "• Use a #2 pencil to mark your answers.",
      "• Do not make any stray marks on the answer sheet.",
    ];

    for (const instruction of instructions) {
      const lines = wrapText(pdf, instruction, CONTENT_WIDTH);
      for (const line of lines) {
        pdf.text(line, MARGIN, y);
        y += LINE_HEIGHT;
      }
      y += 5;
    }
  }

  // Footer
  pdf.setFontSize(SMALL_SIZE);
  pdf.setTextColor(128);
  pdf.text(
    "© 1600 Club - For personal use only",
    PAGE_WIDTH / 2,
    PAGE_HEIGHT - 50,
    { align: "center" }
  );
  pdf.setTextColor(0);
}

/**
 * Generates a section header
 */
function generateSectionHeader(
  pdf: jsPDF,
  sectionName: string,
  questionCount: number,
  timeLimit: number
): number {
  pdf.addPage();
  let y = MARGIN;

  // Section title
  pdf.setFontSize(HEADING_SIZE);
  pdf.setFont("helvetica", "bold");
  pdf.text(sectionName, PAGE_WIDTH / 2, y, { align: "center" });

  y += 30;

  // Section info
  pdf.setFontSize(BODY_SIZE);
  pdf.setFont("helvetica", "normal");
  pdf.text(`${questionCount} Questions • ${timeLimit} Minutes`, PAGE_WIDTH / 2, y, {
    align: "center",
  });

  y += 40;

  return y;
}

/**
 * Renders a single question
 */
function renderQuestion(
  pdf: jsPDF,
  question: PDFQuestion,
  yPosition: number,
  showAnswer: boolean = false
): number {
  let y = yPosition;

  // Check if we need a new page (estimate space needed)
  const estimatedSpace = question.passage ? 300 : 150;
  y = checkPageBreak(pdf, y, estimatedSpace);

  // Question number
  pdf.setFontSize(BODY_SIZE);
  pdf.setFont("helvetica", "bold");
  pdf.text(`${question.number}.`, MARGIN, y);

  // If there's a passage, render it first
  if (question.passage) {
    const passageX = MARGIN + 25;
    const passageWidth = CONTENT_WIDTH - 25;

    // Passage header
    if (question.passage.title || question.passage.author) {
      pdf.setFont("helvetica", "italic");
      pdf.setFontSize(SMALL_SIZE);
      let header = "";
      if (question.passage.title) {
        header = `"${question.passage.title}"`;
      }
      if (question.passage.author) {
        header += header ? ` by ${question.passage.author}` : question.passage.author;
      }
      pdf.text(header, passageX, y);
      y += LINE_HEIGHT;
    }

    // Passage content
    pdf.setFont("helvetica", "normal");
    pdf.setFontSize(BODY_SIZE);
    const passageLines = wrapText(pdf, question.passage.content, passageWidth);
    for (const line of passageLines) {
      y = checkPageBreak(pdf, y, LINE_HEIGHT);
      pdf.text(line, passageX, y);
      y += LINE_HEIGHT;
    }
    y += 10;
  }

  // Question prompt
  const questionX = MARGIN + 25;
  const questionWidth = CONTENT_WIDTH - 25;

  pdf.setFont("helvetica", "normal");
  pdf.setFontSize(BODY_SIZE);
  const promptLines = wrapText(pdf, question.prompt, questionWidth);
  for (const line of promptLines) {
    y = checkPageBreak(pdf, y, LINE_HEIGHT);
    pdf.text(line, questionX, y);
    y += LINE_HEIGHT;
  }
  y += 8;

  // Answer options
  const optionX = MARGIN + 35;
  const optionWidth = CONTENT_WIDTH - 45;

  for (const option of question.options) {
    y = checkPageBreak(pdf, y, LINE_HEIGHT * 2);

    const isCorrect = showAnswer && option.key === question.correctAnswer;

    if (isCorrect) {
      pdf.setFont("helvetica", "bold");
      pdf.setTextColor(0, 128, 0); // Green for correct answer
    } else {
      pdf.setFont("helvetica", "normal");
      pdf.setTextColor(0);
    }

    const optionPrefix = showAnswer && isCorrect ? `✓ ${option.key})` : `${option.key})`;
    const optionText = `${optionPrefix} ${option.content}`;
    const optionLines = wrapText(pdf, optionText, optionWidth);

    for (const line of optionLines) {
      pdf.text(line, optionX, y);
      y += LINE_HEIGHT;
    }
    y += 3;
  }

  pdf.setTextColor(0); // Reset color

  // Explanation (for answer key)
  if (showAnswer && question.explanation) {
    y = checkPageBreak(pdf, y, LINE_HEIGHT * 4);
    y += 5;

    pdf.setFont("helvetica", "italic");
    pdf.setFontSize(SMALL_SIZE);
    pdf.setTextColor(80);
    const explanationLines = wrapText(pdf, `Explanation: ${question.explanation}`, questionWidth);
    for (const line of explanationLines) {
      y = checkPageBreak(pdf, y, LINE_HEIGHT);
      pdf.text(line, questionX, y);
      y += LINE_HEIGHT - 2;
    }
    pdf.setTextColor(0);
    pdf.setFontSize(BODY_SIZE);
  }

  y += 15; // Space between questions

  return y;
}

/**
 * Generates a quick answer reference grid
 */
function generateAnswerGrid(
  pdf: jsPDF,
  questions: PDFQuestion[],
  sectionName: string
): void {
  pdf.addPage();
  let y = MARGIN;

  // Title
  pdf.setFontSize(HEADING_SIZE);
  pdf.setFont("helvetica", "bold");
  pdf.text(`${sectionName} - Answer Key`, PAGE_WIDTH / 2, y, { align: "center" });
  y += 40;

  // Grid layout
  const cols = 5;
  const cellWidth = 80;
  const cellHeight = 20;

  pdf.setFontSize(BODY_SIZE);

  for (let i = 0; i < questions.length; i++) {
    const col = i % cols;
    const row = Math.floor(i / cols);
    const x = MARGIN + col * cellWidth;
    const cellY = y + row * cellHeight;

    // Check for page break
    if (cellY > PAGE_HEIGHT - MARGIN - cellHeight) {
      pdf.addPage();
      y = MARGIN;
      // Recalculate with new page
      const newRow = Math.floor((i - (row * cols)) / cols);
      const newCellY = y + newRow * cellHeight;

      pdf.setFont("helvetica", "normal");
      pdf.text(`${questions[i].number}. `, x, newCellY);
      pdf.setFont("helvetica", "bold");
      pdf.text(questions[i].correctAnswer, x + 25, newCellY);
    } else {
      pdf.setFont("helvetica", "normal");
      pdf.text(`${questions[i].number}. `, x, cellY);
      pdf.setFont("helvetica", "bold");
      pdf.text(questions[i].correctAnswer, x + 25, cellY);
    }
  }
}

/**
 * Generates the complete test PDF
 */
export function generateTestPDF(options: TestGenerationOptions): Uint8Array {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });

  // Cover page
  generateCoverPage(pdf, options.testName, options.testNumber, false);

  // Reading & Writing section
  let y = generateSectionHeader(
    pdf,
    "Section 1: Reading and Writing",
    options.readingWritingQuestions.length,
    64
  );

  for (const question of options.readingWritingQuestions) {
    y = renderQuestion(pdf, question, y, false);
  }

  // Math section
  y = generateSectionHeader(
    pdf,
    "Section 2: Math",
    options.mathQuestions.length,
    70
  );

  for (const question of options.mathQuestions) {
    y = renderQuestion(pdf, question, y, false);
  }

  // Return as Uint8Array
  return pdf.output("arraybuffer") as unknown as Uint8Array;
}

/**
 * Generates the answer key PDF
 */
export function generateAnswerKeyPDF(options: TestGenerationOptions): Uint8Array {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });

  // Cover page
  generateCoverPage(pdf, options.testName, options.testNumber, true);

  // Quick answer grids
  generateAnswerGrid(pdf, options.readingWritingQuestions, "Reading and Writing");
  generateAnswerGrid(pdf, options.mathQuestions, "Math");

  // Detailed explanations - Reading & Writing
  let y = generateSectionHeader(
    pdf,
    "Detailed Explanations: Reading and Writing",
    options.readingWritingQuestions.length,
    0
  );

  for (const question of options.readingWritingQuestions) {
    y = renderQuestion(pdf, question, y, true);
  }

  // Detailed explanations - Math
  y = generateSectionHeader(
    pdf,
    "Detailed Explanations: Math",
    options.mathQuestions.length,
    0
  );

  for (const question of options.mathQuestions) {
    y = renderQuestion(pdf, question, y, true);
  }

  // Return as Uint8Array
  return pdf.output("arraybuffer") as unknown as Uint8Array;
}

/**
 * Helper to select questions for a balanced test
 */
export function selectQuestionsForTest(
  allQuestions: PDFQuestion[],
  category: "reading_writing" | "math",
  count: number,
  difficulty: "easy" | "medium" | "hard" | "mixed"
): PDFQuestion[] {
  let filtered = allQuestions.filter((q) => q.category === category);

  // Apply difficulty filter
  if (difficulty !== "mixed") {
    const difficultyMap = { easy: 1, medium: 2, hard: 3 };
    filtered = filtered.filter((q) => q.difficulty === difficultyMap[difficulty]);
  }

  // Shuffle and select
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  const selected = shuffled.slice(0, count);

  // Assign question numbers
  return selected.map((q, i) => ({ ...q, number: i + 1 }));
}

/**
 * Creates a full SAT test (98 questions)
 */
export function createFullSATTest(
  allQuestions: PDFQuestion[],
  testNumber: number,
  difficulty: "easy" | "medium" | "hard" | "mixed" = "mixed"
): TestGenerationOptions {
  const rwQuestions = selectQuestionsForTest(
    allQuestions,
    "reading_writing",
    54,
    difficulty
  );

  const mathQuestions = selectQuestionsForTest(
    allQuestions,
    "math",
    44,
    difficulty
  );

  // Renumber math questions starting from 55
  const renumberedMath = mathQuestions.map((q, i) => ({
    ...q,
    number: 55 + i,
  }));

  return {
    testNumber,
    testName: `Full-Length Practice Test #${testNumber}`,
    readingWritingQuestions: rwQuestions,
    mathQuestions: renumberedMath,
  };
}
