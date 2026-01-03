"use client";

import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import Link from "next/link";
import {
  FileQuestion,
  BookOpen,
  Calculator,
  Image,
  AlertTriangle,
  CheckCircle,
  Clock,
  XCircle,
  Flag,
  BarChart3,
  ArrowRight,
} from "lucide-react";

export default function AdminOverviewPage() {
  const stats = useQuery(api.admin.getAdminOverviewStats);

  if (!stats) {
    return (
      <div className="p-6 lg:p-8 max-w-7xl mx-auto">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-slate-200 rounded w-1/3" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-32 bg-slate-200 rounded-xl" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-[var(--ink-black)]">
          Admin Dashboard
        </h1>
        <p className="font-body text-[var(--ink-faded)] mt-1">
          Overview of all questions in the database
        </p>
      </div>

      {/* Main Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={FileQuestion}
          label="Total Questions"
          value={stats.totalQuestions}
          color="blue"
        />
        <StatCard
          icon={BookOpen}
          label="Reading & Writing"
          value={stats.byCategory.reading_writing}
          color="purple"
        />
        <StatCard
          icon={Calculator}
          label="Math"
          value={stats.byCategory.math}
          color="green"
        />
        <StatCard
          icon={Image}
          label="With Images"
          value={stats.withImages}
          color="orange"
        />
      </div>

      {/* Review Status */}
      <div className="card-paper p-6 rounded-xl">
        <h2 className="font-display text-lg font-bold text-[var(--ink-black)] mb-4">
          Review Status
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
          <ReviewStatusCard
            label="Verified"
            count={stats.byReviewStatus.verified}
            icon={CheckCircle}
            color="green"
            href="/admin/questions?reviewStatus=verified"
          />
          <ReviewStatusCard
            label="Pending"
            count={stats.byReviewStatus.pending}
            icon={Clock}
            color="yellow"
            href="/admin/questions?reviewStatus=pending"
          />
          <ReviewStatusCard
            label="Needs Revision"
            count={stats.byReviewStatus.needs_revision}
            icon={AlertTriangle}
            color="orange"
            href="/admin/questions?reviewStatus=needs_revision"
          />
          <ReviewStatusCard
            label="Rejected"
            count={stats.byReviewStatus.rejected}
            icon={XCircle}
            color="red"
            href="/admin/questions?reviewStatus=rejected"
          />
          <ReviewStatusCard
            label="Flagged"
            count={stats.byReviewStatus.flagged_high_error}
            icon={Flag}
            color="red"
            href="/admin/questions?reviewStatus=flagged_high_error"
          />
          <ReviewStatusCard
            label="Unset"
            count={stats.byReviewStatus.unset}
            icon={FileQuestion}
            color="gray"
            href="/admin/questions"
          />
        </div>
      </div>

      {/* Performance Stats */}
      <div className="grid lg:grid-cols-2 gap-6">
        <div className="card-paper p-6 rounded-xl">
          <h2 className="font-display text-lg font-bold text-[var(--ink-black)] mb-4 flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-[var(--grass-dark)]" />
            Performance Metrics
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center p-3 bg-[var(--paper-lines)]/50 rounded-lg">
              <span className="font-body text-[var(--ink-faded)]">
                Total Student Attempts
              </span>
              <span className="font-display font-bold text-[var(--ink-black)]">
                {stats.totalAttempts.toLocaleString()}
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[var(--paper-lines)]/50 rounded-lg">
              <span className="font-body text-[var(--ink-faded)]">
                Avg Error Rate (10+ attempts)
              </span>
              <span className="font-display font-bold text-[var(--ink-black)]">
                {(stats.avgErrorRate * 100).toFixed(1)}%
              </span>
            </div>
            <div className="flex justify-between items-center p-3 bg-[var(--barn-red)]/10 rounded-lg">
              <span className="font-body text-[var(--barn-red)]">
                Flagged for High Error Rate
              </span>
              <span className="font-display font-bold text-[var(--barn-red)]">
                {stats.flaggedCount}
              </span>
            </div>
          </div>
        </div>

        {/* Domain Distribution */}
        <div className="card-paper p-6 rounded-xl">
          <h2 className="font-display text-lg font-bold text-[var(--ink-black)] mb-4">
            Questions by Domain
          </h2>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {(Object.entries(stats.byDomain) as [string, number][])
              .sort((a, b) => b[1] - a[1])
              .map(([domain, count]) => (
                <div
                  key={domain}
                  className="flex justify-between items-center p-2 hover:bg-[var(--paper-lines)]/50 rounded-lg"
                >
                  <span className="font-body text-sm text-[var(--ink-faded)] capitalize">
                    {domain.replace(/_/g, " ")}
                  </span>
                  <span className="font-display font-medium text-[var(--ink-black)]">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </div>
      </div>

      {/* Source Distribution */}
      <div className="card-paper p-6 rounded-xl">
        <h2 className="font-display text-lg font-bold text-[var(--ink-black)] mb-4">
          Questions by Source
        </h2>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {(Object.entries(stats.bySource) as [string, number][])
            .sort((a, b) => b[1] - a[1])
            .map(([source, count]) => (
              <div
                key={source}
                className="p-4 bg-[var(--paper-lines)]/50 rounded-lg"
              >
                <div className="font-display text-2xl font-bold text-[var(--ink-black)]">
                  {count}
                </div>
                <div className="font-body text-sm text-[var(--ink-faded)] capitalize">
                  {source.replace(/_/g, " ")}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div className="card-paper p-6 rounded-xl">
        <h2 className="font-display text-lg font-bold text-[var(--ink-black)] mb-4">
          Quick Actions
        </h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Link
            href="/admin/questions"
            className="flex items-center justify-between p-4 bg-[var(--grass-light)]/10 hover:bg-[var(--grass-light)]/20 rounded-xl transition-colors group"
          >
            <div className="flex items-center gap-3">
              <FileQuestion className="w-5 h-5 text-[var(--grass-dark)]" />
              <span className="font-body text-[var(--ink-black)]">
                Browse All Questions
              </span>
            </div>
            <ArrowRight className="w-5 h-5 text-[var(--grass-dark)] group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/admin/questions?hasImage=true"
            className="flex items-center justify-between p-4 bg-orange-50 hover:bg-orange-100 rounded-xl transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Image className="w-5 h-5 text-orange-600" />
              <span className="font-body text-[var(--ink-black)]">
                Questions with Images
              </span>
            </div>
            <ArrowRight className="w-5 h-5 text-orange-600 group-hover:translate-x-1 transition-transform" />
          </Link>

          <Link
            href="/admin/questions?reviewStatus=flagged_high_error"
            className="flex items-center justify-between p-4 bg-red-50 hover:bg-red-100 rounded-xl transition-colors group"
          >
            <div className="flex items-center gap-3">
              <Flag className="w-5 h-5 text-red-600" />
              <span className="font-body text-[var(--ink-black)]">
                Flagged Questions
              </span>
            </div>
            <ArrowRight className="w-5 h-5 text-red-600 group-hover:translate-x-1 transition-transform" />
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: number;
  color: "blue" | "purple" | "green" | "orange";
}) {
  const colors = {
    blue: "bg-blue-100 text-blue-600",
    purple: "bg-purple-100 text-purple-600",
    green: "bg-[var(--grass-light)]/30 text-[var(--grass-dark)]",
    orange: "bg-orange-100 text-orange-600",
  };

  return (
    <div className="card-paper p-5 rounded-xl">
      <div className="flex items-center gap-3 mb-2">
        <div
          className={`w-10 h-10 rounded-lg flex items-center justify-center ${colors[color]}`}
        >
          <Icon className="w-5 h-5" />
        </div>
      </div>
      <div className="font-display text-2xl font-bold text-[var(--ink-black)]">
        {value.toLocaleString()}
      </div>
      <div className="font-body text-sm text-[var(--ink-faded)]">{label}</div>
    </div>
  );
}

function ReviewStatusCard({
  label,
  count,
  icon: Icon,
  color,
  href,
}: {
  label: string;
  count: number;
  icon: React.ComponentType<{ className?: string }>;
  color: "green" | "yellow" | "orange" | "red" | "gray";
  href: string;
}) {
  const colors = {
    green: "bg-[var(--grass-light)]/20 text-[var(--grass-dark)]",
    yellow: "bg-yellow-100 text-yellow-700",
    orange: "bg-orange-100 text-orange-600",
    red: "bg-red-100 text-red-600",
    gray: "bg-slate-100 text-slate-600",
  };

  return (
    <Link
      href={href}
      className={`p-4 rounded-xl transition-all hover:scale-105 ${colors[color]}`}
    >
      <Icon className="w-5 h-5 mb-2" />
      <div className="font-display text-xl font-bold">{count}</div>
      <div className="font-body text-xs opacity-80">{label}</div>
    </Link>
  );
}
