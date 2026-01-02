"use client";

import { getAchievementById, RARITY_COLORS } from "@/lib/achievements";
import { Lock } from "lucide-react";

interface AchievementBadgeProps {
  achievementId: string;
  unlocked: boolean;
  size?: "sm" | "md" | "lg";
  showLabel?: boolean;
  onClick?: () => void;
}

export function AchievementBadge({
  achievementId,
  unlocked,
  size = "md",
  showLabel = false,
  onClick,
}: AchievementBadgeProps) {
  const achievement = getAchievementById(achievementId);

  if (!achievement) return null;

  const Icon = achievement.icon;
  const rarityColors = RARITY_COLORS[achievement.rarity];

  const sizeClasses = {
    sm: "w-10 h-10",
    md: "w-14 h-14",
    lg: "w-20 h-20",
  };

  const iconSizes = {
    sm: "w-5 h-5",
    md: "w-7 h-7",
    lg: "w-10 h-10",
  };

  return (
    <div
      className={`
        flex flex-col items-center gap-1
        ${onClick ? "cursor-pointer" : ""}
      `}
      onClick={onClick}
    >
      <div
        className={`
          relative ${sizeClasses[size]} rounded-full
          flex items-center justify-center
          transition-all duration-300
          ${
            unlocked
              ? `${rarityColors.bg} ${rarityColors.border} border-2`
              : "bg-gray-200 border-gray-300 border-2"
          }
          ${!unlocked ? "grayscale opacity-50" : ""}
          ${onClick ? "hover:scale-110" : ""}
          ${
            unlocked &&
            (achievement.rarity === "legendary" || achievement.rarity === "epic")
              ? "badge-shine"
              : ""
          }
        `}
      >
        {unlocked ? (
          <Icon className={`${iconSizes[size]} ${rarityColors.text}`} />
        ) : (
          <Lock className={`${iconSizes[size]} text-gray-400`} />
        )}

        {/* Unlock indicator */}
        {unlocked && size !== "sm" && (
          <div className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center border-2 border-white">
            <svg
              className="w-3 h-3 text-white"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={3}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
        )}
      </div>

      {showLabel && (
        <span
          className={`
            text-xs font-medium text-center max-w-[80px] leading-tight
            ${unlocked ? "text-[var(--ink-black)]" : "text-gray-400"}
          `}
        >
          {achievement.name}
        </span>
      )}
    </div>
  );
}
