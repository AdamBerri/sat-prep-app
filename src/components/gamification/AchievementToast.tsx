"use client";

import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { getAchievementById, RARITY_COLORS } from "@/lib/achievements";

interface AchievementToastProps {
  achievementId: string;
  onDismiss: () => void;
  autoDismissMs?: number;
}

export function AchievementToast({
  achievementId,
  onDismiss,
  autoDismissMs = 5000,
}: AchievementToastProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [isExiting, setIsExiting] = useState(false);

  const achievement = getAchievementById(achievementId);

  useEffect(() => {
    // Trigger entrance animation
    const showTimer = setTimeout(() => setIsVisible(true), 50);

    // Auto dismiss
    const dismissTimer = setTimeout(() => {
      handleDismiss();
    }, autoDismissMs);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(dismissTimer);
    };
  }, [autoDismissMs]);

  const handleDismiss = () => {
    setIsExiting(true);
    setTimeout(onDismiss, 300);
  };

  if (!achievement) return null;

  const Icon = achievement.icon;
  const rarityColors = RARITY_COLORS[achievement.rarity];

  return (
    <div
      className={`
        fixed bottom-6 right-6 z-50 max-w-sm
        transform transition-all duration-300 ease-out
        ${isVisible && !isExiting ? "translate-x-0 opacity-100" : "translate-x-full opacity-0"}
      `}
    >
      <div
        className={`
          ${rarityColors.bg} ${rarityColors.border}
          border-2 rounded-xl p-4 shadow-lg
          ${achievement.rarity === "legendary" ? "shadow-amber-300/50" : ""}
          ${achievement.rarity === "epic" ? "shadow-purple-300/50" : ""}
        `}
      >
        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="absolute top-2 right-2 p-1 rounded-full hover:bg-black/5 transition-colors"
        >
          <X className="w-4 h-4 text-gray-500" />
        </button>

        <div className="flex items-center gap-4">
          {/* Icon */}
          <div
            className={`
              relative w-14 h-14 rounded-full flex items-center justify-center
              ${rarityColors.bg} ${rarityColors.border} border-2
              achievement-pop
            `}
          >
            <Icon className={`w-7 h-7 ${rarityColors.text}`} />
            {(achievement.rarity === "legendary" ||
              achievement.rarity === "epic") && (
              <div className="absolute inset-0 rounded-full badge-shine" />
            )}
          </div>

          {/* Content */}
          <div className="flex-1 pr-4">
            <p className="text-xs font-medium text-[var(--ink-faded)] uppercase tracking-wide">
              Achievement Unlocked!
            </p>
            <p className={`font-display font-bold text-lg ${rarityColors.text}`}>
              {achievement.name}
            </p>
            <p className="text-sm text-[var(--ink-faded)]">
              {achievement.description}
            </p>
          </div>
        </div>

        {/* Rarity label */}
        <div className="mt-3 flex justify-end">
          <span
            className={`
              text-xs font-medium px-2 py-0.5 rounded-full
              ${rarityColors.bg} ${rarityColors.text} ${rarityColors.border} border
              capitalize
            `}
          >
            {achievement.rarity}
          </span>
        </div>
      </div>
    </div>
  );
}
