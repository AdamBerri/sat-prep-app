"use client";

import { X } from "lucide-react";
import { ACHIEVEMENTS, type AchievementCategory } from "@/lib/achievements";
import { AchievementBadge } from "./AchievementBadge";

interface AchievementModalProps {
  isOpen: boolean;
  onClose: () => void;
  unlockedIds: string[];
}

const CATEGORY_LABELS: Record<AchievementCategory, string> = {
  streak: "Streak Achievements",
  questions: "Question Milestones",
  accuracy: "Accuracy Awards",
  domain_mastery: "Domain Mastery",
  daily_challenge: "Daily Challenges",
  special: "Special Achievements",
};

const CATEGORY_ORDER: AchievementCategory[] = [
  "streak",
  "questions",
  "accuracy",
  "domain_mastery",
  "daily_challenge",
  "special",
];

export function AchievementModal({
  isOpen,
  onClose,
  unlockedIds,
}: AchievementModalProps) {
  if (!isOpen) return null;

  const unlockedSet = new Set(unlockedIds);
  const totalUnlocked = unlockedIds.length;
  const totalAchievements = ACHIEVEMENTS.length;

  // Group achievements by category
  const groupedAchievements = CATEGORY_ORDER.map((category) => ({
    category,
    label: CATEGORY_LABELS[category],
    achievements: ACHIEVEMENTS.filter((a) => a.category === category),
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Modal */}
      <div className="relative bg-[var(--paper-cream)] rounded-2xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="sticky top-0 bg-[var(--paper-cream)] border-b border-[var(--paper-lines)] px-6 py-4 flex items-center justify-between z-10">
          <div>
            <h2 className="font-display text-2xl font-bold text-[var(--ink-black)]">
              Achievements
            </h2>
            <p className="text-sm text-[var(--ink-faded)]">
              {totalUnlocked} of {totalAchievements} unlocked
            </p>
          </div>

          {/* Progress bar */}
          <div className="flex items-center gap-3">
            <div className="w-32 h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-[var(--grass-light)] to-[var(--grass-dark)] transition-all duration-500"
                style={{
                  width: `${(totalUnlocked / totalAchievements) * 100}%`,
                }}
              />
            </div>
            <span className="text-sm font-medium text-[var(--ink-faded)]">
              {Math.round((totalUnlocked / totalAchievements) * 100)}%
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-80px)]">
          <div className="space-y-8">
            {groupedAchievements.map(({ category, label, achievements }) => (
              <div key={category}>
                <h3 className="font-display font-semibold text-lg text-[var(--ink-black)] mb-4">
                  {label}
                </h3>
                <div className="grid grid-cols-4 sm:grid-cols-5 md:grid-cols-6 gap-4">
                  {achievements.map((achievement) => (
                    <AchievementBadge
                      key={achievement.id}
                      achievementId={achievement.id}
                      unlocked={unlockedSet.has(achievement.id)}
                      size="md"
                      showLabel
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
