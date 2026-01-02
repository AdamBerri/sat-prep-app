"use client";

import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ChevronDown, ChevronUp, Trophy, Sparkles } from "lucide-react";
import { DailyChallengeCard } from "./DailyChallengeCard";

interface DailyChallengesProps {
  visitorId: string;
  compact?: boolean;
}

export function DailyChallenges({
  visitorId,
  compact = false,
}: DailyChallengesProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  const challenges = useQuery(api.dailyChallenges.getDailyChallenges, {
    visitorId,
  });
  const generateChallenges = useMutation(api.dailyChallenges.generateDailyChallenges);
  const claimBonus = useMutation(api.dailyChallenges.claimDailyBonus);

  // Generate challenges if they don't exist
  useEffect(() => {
    if (challenges === undefined) return; // Still loading
    if (challenges === null) {
      generateChallenges({ visitorId });
    }
  }, [challenges, visitorId, generateChallenges]);

  const handleClaimBonus = async () => {
    await claimBonus({ visitorId });
  };

  if (!challenges) {
    return (
      <div className="animate-pulse bg-gray-100 rounded-xl h-24" />
    );
  }

  const completedCount = challenges.challenges.filter((c) => c.completed).length;
  const totalCount = challenges.challenges.length;

  if (compact) {
    return (
      <div className="bg-white/80 backdrop-blur-sm rounded-xl border border-[var(--paper-lines)] overflow-hidden">
        {/* Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full px-4 py-3 flex items-center justify-between hover:bg-black/5 transition-colors"
        >
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-[var(--sunflower)]" />
            <span className="font-medium text-sm text-[var(--ink-black)]">
              Daily Challenges
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium text-[var(--ink-faded)]">
              {completedCount}/{totalCount}
            </span>
            {isExpanded ? (
              <ChevronUp className="w-4 h-4 text-[var(--ink-faded)]" />
            ) : (
              <ChevronDown className="w-4 h-4 text-[var(--ink-faded)]" />
            )}
          </div>
        </button>

        {/* Expanded content */}
        {isExpanded && (
          <div className="px-4 pb-4 space-y-2">
            {challenges.challenges.map((challenge) => (
              <DailyChallengeCard
                key={challenge.id}
                challenge={challenge}
                compact
              />
            ))}

            {/* Bonus claim */}
            {challenges.allCompleted && !challenges.bonusClaimed && (
              <button
                onClick={handleClaimBonus}
                className="w-full mt-2 py-2 bg-gradient-to-r from-[var(--sunflower)] to-amber-400 text-[var(--ink-black)] rounded-lg font-medium text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-opacity"
              >
                <Sparkles className="w-4 h-4" />
                Claim Bonus!
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  // Full view
  return (
    <div className="card-paper p-6 rounded-xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Trophy className="w-5 h-5 text-[var(--sunflower)]" />
          <h3 className="font-display font-bold text-lg text-[var(--ink-black)]">
            Daily Challenges
          </h3>
        </div>
        <div className="flex items-center gap-2">
          <div className="w-20 h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--grass-light)] to-[var(--grass-dark)] transition-all duration-500"
              style={{ width: `${(completedCount / totalCount) * 100}%` }}
            />
          </div>
          <span className="text-sm font-medium text-[var(--ink-faded)]">
            {completedCount}/{totalCount}
          </span>
        </div>
      </div>

      {/* Challenges */}
      <div className="space-y-3">
        {challenges.challenges.map((challenge) => (
          <DailyChallengeCard key={challenge.id} challenge={challenge} />
        ))}
      </div>

      {/* Bonus claim */}
      {challenges.allCompleted && !challenges.bonusClaimed && (
        <button
          onClick={handleClaimBonus}
          className="w-full mt-4 py-3 bg-gradient-to-r from-[var(--sunflower)] to-amber-400 text-[var(--ink-black)] rounded-xl font-bold flex items-center justify-center gap-2 hover:opacity-90 transition-opacity shadow-lg shadow-amber-200/50"
        >
          <Sparkles className="w-5 h-5" />
          Claim Completion Bonus!
        </button>
      )}

      {challenges.bonusClaimed && (
        <div className="mt-4 py-3 bg-green-50 border border-green-200 rounded-xl text-center">
          <p className="text-green-700 font-medium">
            All challenges completed! Great work!
          </p>
        </div>
      )}
    </div>
  );
}
