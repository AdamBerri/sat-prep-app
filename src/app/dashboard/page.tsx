"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import {
  BookOpen,
  Target,
  TrendingUp,
  Clock,
  Award,
  ChevronRight,
  Flame,
  Calendar,
  CheckCircle2,
  PlayCircle,
  Calculator,
  Zap,
  Trophy,
} from "lucide-react";

export default function DashboardPage() {
  const { user } = useUser();
  const stats = useQuery(api.scores.getUserStats, {
    visitorId: user?.id ?? "",
  });

  const recentAttempts = useQuery(api.attempts.getRecentAttempts, {
    visitorId: user?.id ?? "",
    limit: 5,
  });

  // Get current in-progress attempt for resume card
  const currentAttempt = useQuery(api.attempts.getCurrentAttempt, {
    visitorId: user?.id ?? "",
  });

  // Get endless mode streak stats
  const streakStats = useQuery(api.endless.getStreakStats, {
    visitorId: user?.id ?? "",
  });

  // Get daily goal progress
  const dailyProgress = useQuery(api.endless.getDailyGoalProgress, {
    visitorId: user?.id ?? "",
  });

  const greeting = getGreeting();
  const firstName = user?.firstName || "there";

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--ink-black)]">
            {greeting}, {firstName}!
          </h1>
          <p className="font-body text-[var(--ink-faded)] mt-1">
            Ready to grow your SAT score today?
          </p>
        </div>
        <Link href="/practice" className="btn-grass flex items-center gap-2 self-start">
          <BookOpen className="w-4 h-4" />
          Start Practice
        </Link>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <StatCard
          icon={Target}
          label="Questions Answered"
          value={stats?.totalQuestions ?? 0}
          color="grass"
        />
        <StatCard
          icon={CheckCircle2}
          label="Correct Answers"
          value={stats?.correctAnswers ?? 0}
          subtext={stats?.accuracy ? `${Math.round(stats.accuracy)}% accuracy` : undefined}
          color="grass"
        />
        <StatCard
          icon={Flame}
          label="Best Streak"
          value={streakStats?.bestStreak ?? 0}
          subtext={streakStats?.currentStreak ? `Current: ${streakStats.currentStreak}` : undefined}
          color="sunflower"
        />
        <StatCard
          icon={Clock}
          label="Practice Sessions"
          value={stats?.totalAttempts ?? 0}
          color="wood"
        />
        <StatCard
          icon={Award}
          label="Best Score"
          value={stats?.bestScore ?? "--"}
          subtext={stats?.bestScore ? "out of 1600" : undefined}
          color="barn"
        />
      </div>

      {/* Quick Actions + Recent Activity */}
      <div className="grid lg:grid-cols-3 gap-6">
        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-4">
          <h2 className="font-display text-xl font-bold text-[var(--ink-black)]">
            Quick Actions
          </h2>
          <div className="space-y-3">
            {/* Resume Card - shown when there's an in-progress session */}
            {currentAttempt && (
              <Link
                href="/practice"
                className="card-paper p-4 rounded-xl border-2 border-[var(--grass-dark)] bg-[var(--grass-light)]/10 flex items-center gap-4 transition-colors hover:bg-[var(--grass-light)]/20"
              >
                <div className="w-10 h-10 rounded-lg bg-[var(--grass-dark)] flex items-center justify-center">
                  <PlayCircle className="w-5 h-5 text-white" />
                </div>
                <div className="flex-1">
                  <div className="font-display font-semibold text-[var(--grass-dark)]">
                    Continue Practice
                  </div>
                  <div className="font-body text-sm text-[var(--ink-faded)]">
                    {currentAttempt.section === "math"
                      ? "Math"
                      : currentAttempt.section === "reading_writing"
                      ? "Reading & Writing"
                      : "Full Test"}{" "}
                    &bull; {currentAttempt.answeredCount} answered
                  </div>
                </div>
                <ChevronRight className="w-5 h-5 text-[var(--grass-dark)]" />
              </Link>
            )}
            <QuickActionCard
              href="/practice?mode=timed"
              icon={Clock}
              title="Full SAT Test"
              description="98 questions, timed"
              color="grass"
            />
            <QuickActionCard
              href="/practice?section=reading_writing"
              icon={BookOpen}
              title="Reading & Writing"
              description="Practice untimed"
              color="wood"
            />
            <QuickActionCard
              href="/practice?section=math"
              icon={Calculator}
              title="Math Section"
              description="Practice untimed"
              color="barn"
            />
            <QuickActionCard
              href="/endless"
              icon={Zap}
              title="Endless Mode"
              description={dailyProgress ? `${dailyProgress.questionsAnswered}/${dailyProgress.target} today` : "Adaptive practice"}
              color="sunflower"
            />
          </div>
        </div>

        {/* Recent Activity */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-display text-xl font-bold text-[var(--ink-black)]">
              Recent Activity
            </h2>
            <Link
              href="/dashboard/history"
              className="font-body text-sm text-[var(--grass-dark)] hover:underline flex items-center gap-1"
            >
              View all <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {recentAttempts === undefined ? (
            <div className="card-paper p-8 rounded-xl text-center">
              <div className="animate-pulse space-y-3">
                <div className="h-4 bg-[var(--paper-lines)] rounded w-3/4 mx-auto" />
                <div className="h-4 bg-[var(--paper-lines)] rounded w-1/2 mx-auto" />
              </div>
            </div>
          ) : recentAttempts.length === 0 ? (
            <div className="card-paper p-8 rounded-xl text-center">
              <Calendar className="w-12 h-12 text-[var(--ink-faded)] mx-auto mb-4 opacity-30" />
              <p className="font-body text-[var(--ink-faded)]">
                No practice sessions yet.
              </p>
              <Link
                href="/practice"
                className="font-body text-[var(--grass-dark)] hover:underline mt-2 inline-block"
              >
                Start your first session →
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {recentAttempts.map((attempt) => (
                <AttemptCard key={attempt._id} attempt={attempt} />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Score Trend (placeholder for now) */}
      <div className="card-paper p-6 rounded-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-display text-xl font-bold text-[var(--ink-black)]">
            Score Trend
          </h2>
          <Link
            href="/dashboard/progress"
            className="font-body text-sm text-[var(--grass-dark)] hover:underline flex items-center gap-1"
          >
            View details <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
        <div className="h-48 flex items-center justify-center border-2 border-dashed border-[var(--paper-lines)] rounded-xl">
          <div className="text-center">
            <TrendingUp className="w-12 h-12 text-[var(--ink-faded)] mx-auto mb-2 opacity-30" />
            <p className="font-body text-[var(--ink-faded)]">
              Score chart coming soon
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper components

function StatCard({
  icon: Icon,
  label,
  value,
  subtext,
  color,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  subtext?: string;
  color: "grass" | "wood" | "barn" | "sunflower";
}) {
  const colorClasses = {
    grass: "bg-[var(--grass-light)]/20 text-[var(--grass-dark)]",
    wood: "bg-[var(--wood-light)]/20 text-[var(--wood-dark)]",
    barn: "bg-[var(--barn-red)]/10 text-[var(--barn-red)]",
    sunflower: "bg-[var(--sunflower)]/20 text-orange-500",
  };

  return (
    <div className="card-paper p-5 rounded-xl">
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center mb-3 ${colorClasses[color]}`}
      >
        <Icon className="w-5 h-5" />
      </div>
      <div className="font-display text-2xl font-bold text-[var(--ink-black)]">
        {value}
      </div>
      <div className="font-body text-sm text-[var(--ink-faded)]">{label}</div>
      {subtext && (
        <div className="font-body text-xs text-[var(--ink-faded)] mt-1">
          {subtext}
        </div>
      )}
    </div>
  );
}

function QuickActionCard({
  href,
  icon: Icon,
  title,
  description,
  color,
}: {
  href: string;
  icon: React.ElementType;
  title: string;
  description: string;
  color: "grass" | "wood" | "barn" | "sunflower";
}) {
  const colorClasses = {
    grass: "border-[var(--grass-medium)] hover:bg-[var(--grass-light)]/10",
    wood: "border-[var(--wood-medium)] hover:bg-[var(--wood-light)]/10",
    barn: "border-[var(--barn-red)]/50 hover:bg-[var(--barn-red)]/5",
    sunflower: "border-[var(--sunflower)] hover:bg-[var(--sunflower)]/10",
  };

  const iconClasses = {
    grass: "text-[var(--grass-dark)]",
    wood: "text-[var(--wood-dark)]",
    barn: "text-[var(--barn-red)]",
    sunflower: "text-orange-500",
  };

  return (
    <Link
      href={href}
      className={`card-paper p-4 rounded-xl border-2 flex items-center gap-4 transition-colors ${colorClasses[color]}`}
    >
      <Icon className={`w-6 h-6 ${iconClasses[color]}`} />
      <div className="flex-1">
        <div className="font-display font-semibold text-[var(--ink-black)]">
          {title}
        </div>
        <div className="font-body text-sm text-[var(--ink-faded)]">
          {description}
        </div>
      </div>
      <ChevronRight className="w-5 h-5 text-[var(--ink-faded)]" />
    </Link>
  );
}

function AttemptCard({
  attempt,
}: {
  attempt: {
    _id: string;
    mode: string;
    status: string;
    startedAt: number;
    completedAt?: number;
    correctAnswers?: number;
    totalQuestions?: number;
    scaledScore?: number;
  };
}) {
  const date = new Date(attempt.startedAt);
  const formattedDate = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  const formattedTime = date.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const isComplete = attempt.status === "completed";
  const accuracy =
    attempt.correctAnswers && attempt.totalQuestions
      ? Math.round((attempt.correctAnswers / attempt.totalQuestions) * 100)
      : null;

  return (
    <div className="card-paper p-4 rounded-xl flex items-center gap-4">
      <div
        className={`w-12 h-12 rounded-lg flex items-center justify-center ${
          isComplete
            ? "bg-[var(--grass-light)]/20 text-[var(--grass-dark)]"
            : "bg-[var(--sunflower)]/20 text-[var(--wood-dark)]"
        }`}
      >
        {isComplete ? (
          <CheckCircle2 className="w-6 h-6" />
        ) : (
          <Clock className="w-6 h-6" />
        )}
      </div>
      <div className="flex-1 min-w-0">
        <div className="font-display font-semibold text-[var(--ink-black)]">
          {attempt.mode === "sat" ? "Full SAT Test" : "Practice Session"}
        </div>
        <div className="font-body text-sm text-[var(--ink-faded)]">
          {formattedDate} at {formattedTime}
        </div>
      </div>
      {isComplete && (
        <div className="text-right">
          {attempt.scaledScore && (
            <div className="font-display text-xl font-bold text-[var(--grass-dark)]">
              {attempt.scaledScore}
            </div>
          )}
          {accuracy !== null && (
            <div className="font-body text-xs text-[var(--ink-faded)]">
              {accuracy}% correct
            </div>
          )}
        </div>
      )}
      {!isComplete && (
        <span className="font-body text-xs px-2 py-1 bg-[var(--sunflower)]/20 text-[var(--wood-dark)] rounded-full">
          In Progress
        </span>
      )}
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}
