"use client";

import { CheckCircle2, Target, Flame, BookOpen, Layers, Clock, Crosshair } from "lucide-react";

interface Challenge {
  id: string;
  type: "streak" | "questions" | "hard_questions" | "domain_variety" | "accuracy" | "speed";
  description: string;
  target: number;
  current: number;
  completed: boolean;
  reward: {
    type: "points" | "badge";
    value: number | string;
  };
}

interface DailyChallengeCardProps {
  challenge: Challenge;
  compact?: boolean;
}

const TYPE_ICONS = {
  streak: Flame,
  questions: BookOpen,
  hard_questions: Target,
  domain_variety: Layers,
  accuracy: Crosshair,
  speed: Clock,
};

const TYPE_COLORS = {
  streak: "text-orange-500",
  questions: "text-blue-500",
  hard_questions: "text-red-500",
  domain_variety: "text-purple-500",
  accuracy: "text-cyan-500",
  speed: "text-green-500",
};

export function DailyChallengeCard({
  challenge,
  compact = false,
}: DailyChallengeCardProps) {
  const Icon = TYPE_ICONS[challenge.type];
  const iconColor = TYPE_COLORS[challenge.type];
  const progress = Math.min(100, (challenge.current / challenge.target) * 100);

  if (compact) {
    return (
      <div
        className={`
          flex items-center gap-2 p-2 rounded-lg
          ${challenge.completed ? "bg-green-50" : "bg-white/50"}
        `}
      >
        <div className={`${iconColor}`}>
          {challenge.completed ? (
            <CheckCircle2 className="w-4 h-4 text-green-500" />
          ) : (
            <Icon className="w-4 h-4" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-[var(--ink-black)] truncate">
            {challenge.description}
          </p>
          <div className="h-1 bg-gray-200 rounded-full mt-1 overflow-hidden">
            <div
              className={`h-full transition-all duration-300 ${
                challenge.completed
                  ? "bg-green-500"
                  : "bg-gradient-to-r from-[var(--grass-light)] to-[var(--grass-dark)]"
              }`}
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <span className="text-xs font-medium text-[var(--ink-faded)] whitespace-nowrap">
          {challenge.current}/{challenge.target}
        </span>
      </div>
    );
  }

  return (
    <div
      className={`
        p-4 rounded-xl border-2 transition-all
        ${
          challenge.completed
            ? "bg-green-50 border-green-200"
            : "bg-white border-[var(--paper-lines)]"
        }
      `}
    >
      <div className="flex items-start gap-3">
        {/* Icon */}
        <div
          className={`
            w-10 h-10 rounded-full flex items-center justify-center
            ${challenge.completed ? "bg-green-100" : "bg-gray-100"}
          `}
        >
          {challenge.completed ? (
            <CheckCircle2 className="w-5 h-5 text-green-500" />
          ) : (
            <Icon className={`w-5 h-5 ${iconColor}`} />
          )}
        </div>

        {/* Content */}
        <div className="flex-1">
          <p
            className={`
              font-medium
              ${challenge.completed ? "text-green-700 line-through" : "text-[var(--ink-black)]"}
            `}
          >
            {challenge.description}
          </p>

          {/* Progress bar */}
          <div className="mt-2 flex items-center gap-2">
            <div className="flex-1 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className={`h-full transition-all duration-500 ${
                  challenge.completed
                    ? "bg-green-500"
                    : "bg-gradient-to-r from-[var(--grass-light)] to-[var(--grass-dark)]"
                }`}
                style={{ width: `${progress}%` }}
              />
            </div>
            <span className="text-sm font-medium text-[var(--ink-faded)]">
              {challenge.current}/{challenge.target}
            </span>
          </div>

          {/* Reward */}
          <div className="mt-2 flex items-center gap-1">
            <span className="text-xs text-[var(--ink-faded)]">Reward:</span>
            <span className="text-xs font-medium text-[var(--sunflower)]">
              +{challenge.reward.value} pts
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
