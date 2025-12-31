"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import {
  History,
  Clock,
  CheckCircle2,
  XCircle,
  Eye,
  Calendar,
  Target,
} from "lucide-react";

export default function HistoryPage() {
  const { user } = useUser();
  const attempts = useQuery(api.attempts.getAllAttempts, {
    visitorId: user?.id ?? "",
  });

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-8">
      {/* Header */}
      <div>
        <h1 className="font-display text-3xl font-bold text-[var(--ink-black)]">
          Practice History
        </h1>
        <p className="font-body text-[var(--ink-faded)] mt-1">
          Review all your past practice sessions
        </p>
      </div>

      {/* Attempts List */}
      {attempts === undefined ? (
        <div className="space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="card-paper p-6 rounded-xl animate-pulse">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-[var(--paper-lines)] rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 bg-[var(--paper-lines)] rounded w-1/4" />
                  <div className="h-4 bg-[var(--paper-lines)] rounded w-1/3" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : attempts.length === 0 ? (
        <div className="card-paper p-12 rounded-xl text-center">
          <History className="w-16 h-16 text-[var(--ink-faded)] mx-auto mb-4 opacity-30" />
          <h2 className="font-display text-xl font-bold text-[var(--ink-black)] mb-2">
            No practice sessions yet
          </h2>
          <p className="font-body text-[var(--ink-faded)] mb-6">
            Start your first practice session to begin tracking your progress
          </p>
          <Link href="/practice" className="btn-grass">
            Start Practice
          </Link>
        </div>
      ) : (
        <div className="space-y-4">
          {attempts.map((attempt) => (
            <AttemptRow key={attempt._id} attempt={attempt} />
          ))}
        </div>
      )}
    </div>
  );
}

function AttemptRow({
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
    rwScaled?: number;
    mathScaled?: number;
  };
}) {
  const startDate = new Date(attempt.startedAt);
  const formattedDate = startDate.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
  const formattedTime = startDate.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });

  const isComplete = attempt.status === "completed";
  const isAbandoned = attempt.status === "abandoned";

  const accuracy =
    attempt.correctAnswers && attempt.totalQuestions
      ? Math.round((attempt.correctAnswers / attempt.totalQuestions) * 100)
      : null;

  const duration =
    attempt.completedAt && attempt.startedAt
      ? Math.round((attempt.completedAt - attempt.startedAt) / 60000)
      : null;

  return (
    <div className="card-paper p-6 rounded-xl">
      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
        {/* Icon */}
        <div
          className={`w-12 h-12 rounded-lg flex items-center justify-center flex-shrink-0 ${
            isComplete
              ? "bg-[var(--grass-light)]/20 text-[var(--grass-dark)]"
              : isAbandoned
              ? "bg-[var(--barn-red)]/10 text-[var(--barn-red)]"
              : "bg-[var(--sunflower)]/20 text-[var(--wood-dark)]"
          }`}
        >
          {isComplete ? (
            <CheckCircle2 className="w-6 h-6" />
          ) : isAbandoned ? (
            <XCircle className="w-6 h-6" />
          ) : (
            <Clock className="w-6 h-6" />
          )}
        </div>

        {/* Main Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="font-display font-semibold text-[var(--ink-black)]">
              {attempt.mode === "sat" ? "Full SAT Test" : "Practice Session"}
            </h3>
            <span
              className={`font-body text-xs px-2 py-0.5 rounded-full ${
                isComplete
                  ? "bg-[var(--grass-light)]/30 text-[var(--grass-dark)]"
                  : isAbandoned
                  ? "bg-[var(--barn-red)]/10 text-[var(--barn-red)]"
                  : "bg-[var(--sunflower)]/30 text-[var(--wood-dark)]"
              }`}
            >
              {isComplete ? "Completed" : isAbandoned ? "Abandoned" : "In Progress"}
            </span>
          </div>
          <div className="flex items-center gap-4 mt-1 text-sm font-body text-[var(--ink-faded)]">
            <span className="flex items-center gap-1">
              <Calendar className="w-4 h-4" />
              {formattedDate} at {formattedTime}
            </span>
            {duration && (
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                {duration} min
              </span>
            )}
          </div>
        </div>

        {/* Score */}
        {isComplete && (
          <div className="flex items-center gap-6 sm:ml-4">
            {attempt.scaledScore && (
              <div className="text-center">
                <div className="font-display text-2xl font-bold text-[var(--grass-dark)]">
                  {attempt.scaledScore}
                </div>
                <div className="font-body text-xs text-[var(--ink-faded)]">
                  Total Score
                </div>
              </div>
            )}
            {attempt.rwScaled && attempt.mathScaled && (
              <div className="hidden sm:flex items-center gap-4 text-center">
                <div>
                  <div className="font-display text-lg font-semibold text-[var(--ink-black)]">
                    {attempt.rwScaled}
                  </div>
                  <div className="font-body text-xs text-[var(--ink-faded)]">R&W</div>
                </div>
                <div className="h-8 w-px bg-[var(--paper-lines)]" />
                <div>
                  <div className="font-display text-lg font-semibold text-[var(--ink-black)]">
                    {attempt.mathScaled}
                  </div>
                  <div className="font-body text-xs text-[var(--ink-faded)]">Math</div>
                </div>
              </div>
            )}
            {accuracy !== null && (
              <div className="text-center">
                <div className="font-display text-lg font-semibold text-[var(--ink-black)]">
                  {accuracy}%
                </div>
                <div className="font-body text-xs text-[var(--ink-faded)]">Accuracy</div>
              </div>
            )}
          </div>
        )}

        {/* Review Button */}
        {isComplete && (
          <Link
            href={`/results/${attempt._id}`}
            className="btn-outline-wood flex items-center gap-2 flex-shrink-0"
          >
            <Eye className="w-4 h-4" />
            Review
          </Link>
        )}
      </div>
    </div>
  );
}
