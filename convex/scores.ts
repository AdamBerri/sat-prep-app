import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

// Calculate and save score report
export const calculateScore = mutation({
  args: {
    attemptId: v.id("examAttempts"),
    visitorId: v.string(),
  },
  handler: async (ctx, args) => {
    const now = Date.now();

    // Get the attempt
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt) throw new Error("Attempt not found");

    // Get all answers
    const answers = await ctx.db
      .query("userAnswers")
      .withIndex("by_attempt", (q) => q.eq("attemptId", args.attemptId))
      .collect();

    // Get all questions to calculate scores
    const questionIds = answers.map((a) => a.questionId);
    const questions = await Promise.all(
      questionIds.map((id) => ctx.db.get(id))
    );

    // Calculate raw scores
    let mathRaw = 0;
    let rwRaw = 0;
    let totalTimeMs = 0;

    // Track domain and skill scores
    const domainScores: Record<
      string,
      { category: "reading_writing" | "math"; correct: number; total: number }
    > = {};
    const skillScores: Record<
      string,
      {
        category: "reading_writing" | "math";
        domain: string;
        correct: number;
        total: number;
      }
    > = {};

    for (let i = 0; i < answers.length; i++) {
      const answer = answers[i];
      const question = questions[i];
      if (!question || !answer) continue;

      totalTimeMs += answer.timeSpentMs;

      const isCorrect = answer.isCorrect ?? false;

      // Count by category
      if (question.category === "math" && isCorrect) {
        mathRaw++;
      } else if (question.category === "reading_writing" && isCorrect) {
        rwRaw++;
      }

      // Track domain scores
      const domainKey = `${question.category}:${question.domain}`;
      if (!domainScores[domainKey]) {
        domainScores[domainKey] = {
          category: question.category,
          correct: 0,
          total: 0,
        };
      }
      domainScores[domainKey].total++;
      if (isCorrect) domainScores[domainKey].correct++;

      // Track skill scores
      const skillKey = `${question.category}:${question.domain}:${question.skill}`;
      if (!skillScores[skillKey]) {
        skillScores[skillKey] = {
          category: question.category,
          domain: question.domain,
          correct: 0,
          total: 0,
        };
      }
      skillScores[skillKey].total++;
      if (isCorrect) skillScores[skillKey].correct++;
    }

    // Convert raw to scaled (simplified conversion)
    // Real SAT uses more complex scaling based on test difficulty
    const mathScaled = Math.round(200 + (mathRaw / 44) * 600);
    const rwScaled = Math.round(200 + (rwRaw / 54) * 600);
    const totalScaled = mathScaled + rwScaled;

    // Format domain scores
    const formattedDomainScores = Object.entries(domainScores).map(
      ([key, data]) => ({
        category: data.category,
        domain: key.split(":")[1] ?? "",
        correct: data.correct,
        total: data.total,
        percentage: data.total > 0 ? (data.correct / data.total) * 100 : 0,
      })
    );

    // Format skill scores
    const formattedSkillScores = Object.entries(skillScores).map(
      ([key, data]) => ({
        category: data.category,
        domain: data.domain,
        skill: key.split(":")[2] ?? "",
        correct: data.correct,
        total: data.total,
        percentage: data.total > 0 ? (data.correct / data.total) * 100 : 0,
      })
    );

    // Save score report
    const reportId = await ctx.db.insert("scoreReports", {
      attemptId: args.attemptId,
      visitorId: args.visitorId,
      mathRaw,
      readingWritingRaw: rwRaw,
      mathScaled,
      readingWritingScaled: rwScaled,
      totalScaled,
      domainScores: formattedDomainScores,
      skillScores: formattedSkillScores,
      totalTimeMs,
      avgTimePerQuestionMs:
        answers.length > 0 ? totalTimeMs / answers.length : 0,
      generatedAt: now,
    });

    return reportId;
  },
});

// Get score report for an attempt
export const getScoreReport = query({
  args: { attemptId: v.id("examAttempts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scoreReports")
      .withIndex("by_attempt", (q) => q.eq("attemptId", args.attemptId))
      .first();
  },
});

// Get all score reports for a visitor
export const getScoreHistory = query({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("scoreReports")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .collect();
  },
});

// Get aggregate user stats for dashboard
export const getUserStats = query({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    if (!args.visitorId) return null;

    // Get all completed attempts
    const attempts = await ctx.db
      .query("examAttempts")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .filter((q) => q.eq(q.field("status"), "completed"))
      .collect();

    if (attempts.length === 0) {
      return {
        totalAttempts: 0,
        totalQuestions: 0,
        correctAnswers: 0,
        accuracy: 0,
        bestScore: null,
        rwCorrect: 0,
        rwTotal: 0,
        rwAccuracy: 0,
        mathCorrect: 0,
        mathTotal: 0,
        mathAccuracy: 0,
      };
    }

    // Get all answers for this user
    const allAnswers = await ctx.db
      .query("userAnswers")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .collect();

    // Get questions for categorization
    const questionIds = [...new Set(allAnswers.map((a) => a.questionId))];
    const questions = await Promise.all(
      questionIds.map((id) => ctx.db.get(id))
    );
    const questionMap = new Map(
      questions.filter(Boolean).map((q) => [q!._id, q!])
    );

    let totalCorrect = 0;
    let rwCorrect = 0;
    let rwTotal = 0;
    let mathCorrect = 0;
    let mathTotal = 0;

    for (const answer of allAnswers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;

      if (question.category === "reading_writing") {
        rwTotal++;
        if (answer.isCorrect) {
          rwCorrect++;
          totalCorrect++;
        }
      } else if (question.category === "math") {
        mathTotal++;
        if (answer.isCorrect) {
          mathCorrect++;
          totalCorrect++;
        }
      }
    }

    // Get best score from score reports
    const scoreReports = await ctx.db
      .query("scoreReports")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .collect();

    const bestScore =
      scoreReports.length > 0
        ? Math.max(...scoreReports.map((r) => r.totalScaled))
        : null;

    const totalQuestions = rwTotal + mathTotal;

    return {
      totalAttempts: attempts.length,
      totalQuestions,
      correctAnswers: totalCorrect,
      accuracy: totalQuestions > 0 ? (totalCorrect / totalQuestions) * 100 : 0,
      bestScore,
      rwCorrect,
      rwTotal,
      rwAccuracy: rwTotal > 0 ? (rwCorrect / rwTotal) * 100 : 0,
      mathCorrect,
      mathTotal,
      mathAccuracy: mathTotal > 0 ? (mathCorrect / mathTotal) * 100 : 0,
    };
  },
});

// Get domain-level stats for progress page
export const getDomainStats = query({
  args: { visitorId: v.string() },
  handler: async (ctx, args) => {
    if (!args.visitorId) return [];

    // Get all answers for this user
    const allAnswers = await ctx.db
      .query("userAnswers")
      .withIndex("by_visitor", (q) => q.eq("visitorId", args.visitorId))
      .collect();

    if (allAnswers.length === 0) return [];

    // Get questions for domain info
    const questionIds = [...new Set(allAnswers.map((a) => a.questionId))];
    const questions = await Promise.all(
      questionIds.map((id) => ctx.db.get(id))
    );
    const questionMap = new Map(
      questions.filter(Boolean).map((q) => [q!._id, q!])
    );

    // Aggregate by domain
    const domainStats: Record<
      string,
      { correct: number; total: number }
    > = {};

    for (const answer of allAnswers) {
      const question = questionMap.get(answer.questionId);
      if (!question) continue;

      const domain = question.domain;
      if (!domainStats[domain]) {
        domainStats[domain] = { correct: 0, total: 0 };
      }
      domainStats[domain].total++;
      if (answer.isCorrect) {
        domainStats[domain].correct++;
      }
    }

    return Object.entries(domainStats).map(([domain, stats]) => ({
      domain,
      correct: stats.correct,
      total: stats.total,
      accuracy: stats.total > 0 ? (stats.correct / stats.total) * 100 : 0,
    }));
  },
});
