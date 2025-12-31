"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import {
  TrendingUp,
  BookOpen,
  Calculator,
  Target,
  AlertTriangle,
  CheckCircle2,
} from "lucide-react";

export default function ProgressPage() {
  const { user } = useUser();
  const stats = useQuery(api.scores.getUserStats, {
    visitorId: user?.id ?? "",
  });
  const domainStats = useQuery(api.scores.getDomainStats, {
    visitorId: user?.id ?? "",
  });

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-[var(--ink-black)]">
          Your Progress
        </h1>
        <p className="font-body text-[var(--ink-faded)] mt-1">
          Track your improvement across all SAT domains
        </p>
      </div>

      {/* Overall Stats */}
      <div className="grid md:grid-cols-3 gap-4">
        <div className="card-paper p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[var(--grass-light)]/20 rounded-lg flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-[var(--grass-dark)]" />
            </div>
            <span className="font-display font-semibold text-[var(--ink-black)]">
              Overall Accuracy
            </span>
          </div>
          <div className="font-display text-4xl font-bold text-[var(--ink-black)]">
            {stats?.accuracy ? `${Math.round(stats.accuracy)}%` : "--"}
          </div>
          <div className="font-body text-sm text-[var(--ink-faded)] mt-1">
            {stats?.correctAnswers ?? 0} / {stats?.totalQuestions ?? 0} correct
          </div>
        </div>

        <div className="card-paper p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[var(--grass-light)]/20 rounded-lg flex items-center justify-center">
              <BookOpen className="w-5 h-5 text-[var(--grass-dark)]" />
            </div>
            <span className="font-display font-semibold text-[var(--ink-black)]">
              Reading & Writing
            </span>
          </div>
          <div className="font-display text-4xl font-bold text-[var(--ink-black)]">
            {stats?.rwAccuracy ? `${Math.round(stats.rwAccuracy)}%` : "--"}
          </div>
          <div className="font-body text-sm text-[var(--ink-faded)] mt-1">
            {stats?.rwCorrect ?? 0} / {stats?.rwTotal ?? 0} correct
          </div>
        </div>

        <div className="card-paper p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-10 h-10 bg-[var(--grass-light)]/20 rounded-lg flex items-center justify-center">
              <Calculator className="w-5 h-5 text-[var(--grass-dark)]" />
            </div>
            <span className="font-display font-semibold text-[var(--ink-black)]">
              Math
            </span>
          </div>
          <div className="font-display text-4xl font-bold text-[var(--ink-black)]">
            {stats?.mathAccuracy ? `${Math.round(stats.mathAccuracy)}%` : "--"}
          </div>
          <div className="font-body text-sm text-[var(--ink-faded)] mt-1">
            {stats?.mathCorrect ?? 0} / {stats?.mathTotal ?? 0} correct
          </div>
        </div>
      </div>

      {/* Domain Breakdown */}
      <div className="card-paper p-6 rounded-xl">
        <h2 className="font-display text-xl font-bold text-[var(--ink-black)] mb-6">
          Performance by Domain
        </h2>

        {domainStats === undefined ? (
          <div className="space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="animate-pulse">
                <div className="h-4 bg-[var(--paper-lines)] rounded w-1/4 mb-2" />
                <div className="h-6 bg-[var(--paper-lines)] rounded" />
              </div>
            ))}
          </div>
        ) : domainStats.length === 0 ? (
          <div className="text-center py-8">
            <Target className="w-12 h-12 text-[var(--ink-faded)] mx-auto mb-4 opacity-30" />
            <p className="font-body text-[var(--ink-faded)]">
              Complete some practice sessions to see your domain breakdown
            </p>
          </div>
        ) : (
          <div className="space-y-5">
            {domainStats.map((domain) => (
              <DomainBar key={domain.domain} {...domain} />
            ))}
          </div>
        )}
      </div>

      {/* Weak Areas */}
      <div className="grid md:grid-cols-2 gap-6">
        <div className="card-paper p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <AlertTriangle className="w-5 h-5 text-[var(--barn-red)]" />
            <h2 className="font-display text-lg font-bold text-[var(--ink-black)]">
              Areas to Improve
            </h2>
          </div>
          {domainStats === undefined ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-10 bg-[var(--paper-lines)] rounded" />
              <div className="h-10 bg-[var(--paper-lines)] rounded" />
            </div>
          ) : (
            <WeakAreasList domains={domainStats} />
          )}
        </div>

        <div className="card-paper p-6 rounded-xl">
          <div className="flex items-center gap-3 mb-4">
            <CheckCircle2 className="w-5 h-5 text-[var(--grass-dark)]" />
            <h2 className="font-display text-lg font-bold text-[var(--ink-black)]">
              Your Strengths
            </h2>
          </div>
          {domainStats === undefined ? (
            <div className="space-y-3 animate-pulse">
              <div className="h-10 bg-[var(--paper-lines)] rounded" />
              <div className="h-10 bg-[var(--paper-lines)] rounded" />
            </div>
          ) : (
            <StrengthsList domains={domainStats} />
          )}
        </div>
      </div>
    </div>
  );
}

function DomainBar({
  domain,
  correct,
  total,
  accuracy,
}: {
  domain: string;
  correct: number;
  total: number;
  accuracy: number;
}) {
  const displayName = formatDomainName(domain);
  const barColor =
    accuracy >= 80
      ? "bg-[var(--grass-dark)]"
      : accuracy >= 60
      ? "bg-[var(--grass-medium)]"
      : accuracy >= 40
      ? "bg-[var(--sunflower)]"
      : "bg-[var(--barn-red)]";

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="font-body text-sm text-[var(--ink-black)]">
          {displayName}
        </span>
        <span className="font-body text-sm text-[var(--ink-faded)]">
          {correct}/{total} ({Math.round(accuracy)}%)
        </span>
      </div>
      <div className="h-3 bg-[var(--paper-lines)] rounded-full overflow-hidden">
        <div
          className={`h-full ${barColor} rounded-full transition-all duration-500`}
          style={{ width: `${accuracy}%` }}
        />
      </div>
    </div>
  );
}

function WeakAreasList({
  domains,
}: {
  domains: { domain: string; accuracy: number }[];
}) {
  const weakAreas = domains
    .filter((d) => d.accuracy < 60)
    .sort((a, b) => a.accuracy - b.accuracy)
    .slice(0, 3);

  if (weakAreas.length === 0) {
    return (
      <p className="font-body text-[var(--ink-faded)] text-sm">
        Great job! No weak areas detected yet. Keep practicing to maintain your performance.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {weakAreas.map((area) => (
        <li
          key={area.domain}
          className="flex items-center justify-between p-3 bg-[var(--barn-red)]/5 rounded-lg border border-[var(--barn-red)]/20"
        >
          <span className="font-body text-sm text-[var(--ink-black)]">
            {formatDomainName(area.domain)}
          </span>
          <span className="font-body text-sm font-medium text-[var(--barn-red)]">
            {Math.round(area.accuracy)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

function StrengthsList({
  domains,
}: {
  domains: { domain: string; accuracy: number }[];
}) {
  const strengths = domains
    .filter((d) => d.accuracy >= 70)
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 3);

  if (strengths.length === 0) {
    return (
      <p className="font-body text-[var(--ink-faded)] text-sm">
        Keep practicing to build your strengths! Focus on accuracy and you'll see results here.
      </p>
    );
  }

  return (
    <ul className="space-y-3">
      {strengths.map((area) => (
        <li
          key={area.domain}
          className="flex items-center justify-between p-3 bg-[var(--grass-light)]/10 rounded-lg border border-[var(--grass-medium)]/30"
        >
          <span className="font-body text-sm text-[var(--ink-black)]">
            {formatDomainName(area.domain)}
          </span>
          <span className="font-body text-sm font-medium text-[var(--grass-dark)]">
            {Math.round(area.accuracy)}%
          </span>
        </li>
      ))}
    </ul>
  );
}

function formatDomainName(domain: string): string {
  const names: Record<string, string> = {
    craft_and_structure: "Craft & Structure",
    information_and_ideas: "Information & Ideas",
    standard_english_conventions: "Standard English",
    expression_of_ideas: "Expression of Ideas",
    algebra: "Algebra",
    advanced_math: "Advanced Math",
    problem_solving: "Problem Solving",
    geometry_and_trig: "Geometry & Trigonometry",
  };
  return names[domain] || domain.replace(/_/g, " ");
}
