/**
 * Admin action to generate PDF practice tests from the question pool
 */
import { v } from "convex/values";
import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// Types for the PDF generator
interface PDFQuestion {
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

// Internal query to get questions with all related data
export const getQuestionsForPdf = internalQuery({
  args: {
    category: v.union(v.literal("reading_writing"), v.literal("math")),
    limit: v.number(),
    difficulty: v.optional(v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
      v.literal("mixed")
    )),
  },
  handler: async (ctx, args) => {
    let questions = await ctx.db
      .query("questions")
      .withIndex("by_category", (q) => q.eq("category", args.category))
      .collect();

    // Filter by difficulty if not mixed
    if (args.difficulty && args.difficulty !== "mixed") {
      const difficultyMap = { easy: 1, medium: 2, hard: 3 };
      questions = questions.filter(
        (q) => q.difficulty === difficultyMap[args.difficulty as "easy" | "medium" | "hard"]
      );
    }

    // Shuffle
    questions = questions.sort(() => Math.random() - 0.5);

    // Take limit
    questions = questions.slice(0, args.limit);

    // Get related data for each question
    const result: PDFQuestion[] = [];

    for (let i = 0; i < questions.length; i++) {
      const q = questions[i];

      // Get passage if exists
      let passage: PDFQuestion["passage"] | undefined;
      if (q.passageId) {
        const passageDoc = await ctx.db.get(q.passageId);
        if (passageDoc) {
          passage = {
            content: passageDoc.content,
            title: passageDoc.title,
            author: passageDoc.author,
          };
        }
      }

      // Get answer options
      const options = await ctx.db
        .query("answerOptions")
        .withIndex("by_question", (q2) => q2.eq("questionId", q._id))
        .collect();

      // Sort by order
      options.sort((a, b) => a.order - b.order);

      // Get explanation
      const explanation = await ctx.db
        .query("explanations")
        .withIndex("by_question", (q2) => q2.eq("questionId", q._id))
        .first();

      result.push({
        id: q._id,
        number: i + 1,
        category: q.category,
        domain: q.domain,
        skill: q.skill,
        difficulty: q.difficulty,
        prompt: q.prompt,
        passage,
        options: options.map((o) => ({
          key: o.key,
          content: o.content,
        })),
        correctAnswer: q.correctAnswer,
        explanation: explanation?.correctExplanation,
      });
    }

    return result;
  },
});

// Internal mutation to create the PDF test record
export const createPdfTestRecord = internalMutation({
  args: {
    name: v.string(),
    description: v.string(),
    testNumber: v.number(),
    pdfStorageId: v.id("_storage"),
    answerKeyStorageId: v.id("_storage"),
    questionCount: v.number(),
    difficulty: v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
      v.literal("mixed")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("pdfTests", {
      name: args.name,
      description: args.description,
      testNumber: args.testNumber,
      pdfStorageId: args.pdfStorageId,
      answerKeyStorageId: args.answerKeyStorageId,
      questionCount: args.questionCount,
      difficulty: args.difficulty,
      isActive: true,
      createdAt: Date.now(),
    });
  },
});

// Main action to generate a full test
export const generateFullTest = action({
  args: {
    testNumber: v.number(),
    difficulty: v.optional(v.union(
      v.literal("easy"),
      v.literal("medium"),
      v.literal("hard"),
      v.literal("mixed")
    )),
  },
  handler: async (ctx, args): Promise<Id<"pdfTests">> => {
    const difficulty = args.difficulty || "mixed";

    // Get questions
    const rwQuestions = await ctx.runQuery(internal.generateTestPdf.getQuestionsForPdf, {
      category: "reading_writing",
      limit: 54,
      difficulty,
    });

    const mathQuestions = await ctx.runQuery(internal.generateTestPdf.getQuestionsForPdf, {
      category: "math",
      limit: 44,
      difficulty,
    });

    // Renumber math questions starting from 55
    const renumberedMath = mathQuestions.map((q: PDFQuestion, i: number) => ({
      ...q,
      number: 55 + i,
    }));

    const testName = `Full-Length Practice Test #${args.testNumber}`;
    const allQuestions = [...rwQuestions, ...renumberedMath];

    // Import the PDF generator dynamically
    // Note: In Convex actions, we can use Node.js modules
    const { jsPDF } = await import("jspdf");

    // Generate Test PDF
    const testPdf = generatePdfDocument(
      jsPDF,
      testName,
      args.testNumber,
      rwQuestions,
      renumberedMath,
      false
    );

    // Generate Answer Key PDF
    const answerKeyPdf = generatePdfDocument(
      jsPDF,
      testName,
      args.testNumber,
      rwQuestions,
      renumberedMath,
      true
    );

    // Upload PDFs to storage
    const testBlob = new Blob([testPdf], { type: "application/pdf" });
    const answerKeyBlob = new Blob([answerKeyPdf], { type: "application/pdf" });

    const testStorageId = await ctx.storage.store(testBlob);
    const answerKeyStorageId = await ctx.storage.store(answerKeyBlob);

    // Create the PDF test record
    const testId = await ctx.runMutation(internal.generateTestPdf.createPdfTestRecord, {
      name: testName,
      description: `Full-length SAT practice test with ${allQuestions.length} questions. Difficulty: ${difficulty}.`,
      testNumber: args.testNumber,
      pdfStorageId: testStorageId,
      answerKeyStorageId: answerKeyStorageId,
      questionCount: allQuestions.length,
      difficulty,
    });

    return testId;
  },
});

// Helper function to generate PDF document (moved inline for Convex action)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function generatePdfDocument(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  jsPDF: any,
  testName: string,
  testNumber: number,
  rwQuestions: PDFQuestion[],
  mathQuestions: PDFQuestion[],
  isAnswerKey: boolean
): ArrayBuffer {
  const PAGE_WIDTH = 612;
  const PAGE_HEIGHT = 792;
  const MARGIN = 50;
  const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
  const LINE_HEIGHT = 14;
  const TITLE_SIZE = 24;
  const HEADING_SIZE = 16;
  const BODY_SIZE = 11;
  const SMALL_SIZE = 9;

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "letter",
  });

  // Helper function to wrap text
  function wrapText(text: string, maxWidth: number): string[] {
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

  // Helper to check page breaks
  function checkPageBreak(yPosition: number, neededSpace: number): number {
    if (yPosition + neededSpace > PAGE_HEIGHT - MARGIN) {
      pdf.addPage();
      return MARGIN;
    }
    return yPosition;
  }

  // Generate cover page
  pdf.setFontSize(TITLE_SIZE);
  pdf.setFont("helvetica", "bold");
  const title = isAnswerKey ? "Answer Key" : "Practice Test";
  pdf.text(title, PAGE_WIDTH / 2, 200, { align: "center" });

  pdf.setFontSize(HEADING_SIZE);
  pdf.text(testName, PAGE_WIDTH / 2, 240, { align: "center" });

  pdf.setFontSize(BODY_SIZE);
  pdf.setFont("helvetica", "normal");
  pdf.text(`Test #${testNumber}`, PAGE_WIDTH / 2, 270, { align: "center" });

  if (!isAnswerKey) {
    let y = 350;
    pdf.setFontSize(HEADING_SIZE);
    pdf.setFont("helvetica", "bold");
    pdf.text("Instructions", MARGIN, y);

    y += 25;
    pdf.setFontSize(BODY_SIZE);
    pdf.setFont("helvetica", "normal");
    const instructions = [
      "This test contains two sections: Reading and Writing, and Math.",
      "Reading and Writing: 54 questions, 64 minutes recommended.",
      "Math: 44 questions, 70 minutes recommended.",
      "For multiple choice questions, select the best answer.",
      "Use a #2 pencil to mark your answers.",
    ];

    for (const instruction of instructions) {
      pdf.text(`• ${instruction}`, MARGIN, y);
      y += LINE_HEIGHT + 5;
    }
  }

  // Footer
  pdf.setFontSize(SMALL_SIZE);
  pdf.setTextColor(128);
  pdf.text(
    "© the1600club - For personal use only",
    PAGE_WIDTH / 2,
    PAGE_HEIGHT - 50,
    { align: "center" }
  );
  pdf.setTextColor(0);

  // Generate section helper
  function generateSection(
    sectionName: string,
    questions: PDFQuestion[],
    timeLimit: number
  ) {
    pdf.addPage();
    let y = MARGIN;

    pdf.setFontSize(HEADING_SIZE);
    pdf.setFont("helvetica", "bold");
    pdf.text(sectionName, PAGE_WIDTH / 2, y, { align: "center" });

    y += 30;

    pdf.setFontSize(BODY_SIZE);
    pdf.setFont("helvetica", "normal");
    pdf.text(
      `${questions.length} Questions • ${timeLimit} Minutes`,
      PAGE_WIDTH / 2,
      y,
      { align: "center" }
    );

    y += 40;

    // Render questions
    for (const question of questions) {
      const estimatedSpace = question.passage ? 300 : 150;
      y = checkPageBreak(y, estimatedSpace);

      // Question number
      pdf.setFontSize(BODY_SIZE);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${question.number}.`, MARGIN, y);

      // Passage if exists
      if (question.passage) {
        const passageX = MARGIN + 25;
        const passageWidth = CONTENT_WIDTH - 25;

        if (question.passage.title || question.passage.author) {
          pdf.setFont("helvetica", "italic");
          pdf.setFontSize(SMALL_SIZE);
          let header = "";
          if (question.passage.title) {
            header = `"${question.passage.title}"`;
          }
          if (question.passage.author) {
            header += header
              ? ` by ${question.passage.author}`
              : question.passage.author;
          }
          pdf.text(header, passageX, y);
          y += LINE_HEIGHT;
        }

        pdf.setFont("helvetica", "normal");
        pdf.setFontSize(BODY_SIZE);
        const passageLines = wrapText(question.passage.content, passageWidth);
        for (const line of passageLines) {
          y = checkPageBreak(y, LINE_HEIGHT);
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
      const promptLines = wrapText(question.prompt, questionWidth);
      for (const line of promptLines) {
        y = checkPageBreak(y, LINE_HEIGHT);
        pdf.text(line, questionX, y);
        y += LINE_HEIGHT;
      }
      y += 8;

      // Answer options
      const optionX = MARGIN + 35;
      const optionWidth = CONTENT_WIDTH - 45;

      for (const option of question.options) {
        y = checkPageBreak(y, LINE_HEIGHT * 2);

        const isCorrect = isAnswerKey && option.key === question.correctAnswer;

        if (isCorrect) {
          pdf.setFont("helvetica", "bold");
          pdf.setTextColor(0, 128, 0);
        } else {
          pdf.setFont("helvetica", "normal");
          pdf.setTextColor(0);
        }

        const optionPrefix =
          isAnswerKey && isCorrect ? `✓ ${option.key})` : `${option.key})`;
        const optionText = `${optionPrefix} ${option.content}`;
        const optionLines = wrapText(optionText, optionWidth);

        for (const line of optionLines) {
          pdf.text(line, optionX, y);
          y += LINE_HEIGHT;
        }
        y += 3;
      }

      pdf.setTextColor(0);

      // Explanation for answer key
      if (isAnswerKey && question.explanation) {
        y = checkPageBreak(y, LINE_HEIGHT * 4);
        y += 5;

        pdf.setFont("helvetica", "italic");
        pdf.setFontSize(SMALL_SIZE);
        pdf.setTextColor(80);
        const explanationLines = wrapText(
          `Explanation: ${question.explanation}`,
          questionWidth
        );
        for (const line of explanationLines) {
          y = checkPageBreak(y, LINE_HEIGHT);
          pdf.text(line, questionX, y);
          y += LINE_HEIGHT - 2;
        }
        pdf.setTextColor(0);
        pdf.setFontSize(BODY_SIZE);
      }

      y += 15;
    }
  }

  // Generate answer grid for answer key
  if (isAnswerKey) {
    function generateAnswerGrid(questions: PDFQuestion[], sectionName: string) {
      pdf.addPage();
      let y = MARGIN;

      pdf.setFontSize(HEADING_SIZE);
      pdf.setFont("helvetica", "bold");
      pdf.text(`${sectionName} - Quick Reference`, PAGE_WIDTH / 2, y, {
        align: "center",
      });
      y += 40;

      const cols = 5;
      const cellWidth = 80;
      const cellHeight = 20;

      pdf.setFontSize(BODY_SIZE);

      for (let i = 0; i < questions.length; i++) {
        const col = i % cols;
        const row = Math.floor(i / cols);
        const x = MARGIN + col * cellWidth;
        const cellY = y + row * cellHeight;

        if (cellY > PAGE_HEIGHT - MARGIN - cellHeight) {
          pdf.addPage();
          y = MARGIN;
        }

        const actualY = y + (Math.floor(i / cols) % 30) * cellHeight;

        pdf.setFont("helvetica", "normal");
        pdf.text(`${questions[i].number}. `, x, actualY);
        pdf.setFont("helvetica", "bold");
        pdf.text(questions[i].correctAnswer, x + 25, actualY);
      }
    }

    generateAnswerGrid(rwQuestions, "Reading and Writing");
    generateAnswerGrid(mathQuestions, "Math");
  }

  // Generate sections
  generateSection(
    isAnswerKey ? "Reading and Writing - Detailed" : "Section 1: Reading and Writing",
    rwQuestions,
    64
  );
  generateSection(
    isAnswerKey ? "Math - Detailed" : "Section 2: Math",
    mathQuestions,
    70
  );

  return pdf.output("arraybuffer");
}
