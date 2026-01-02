"use client";

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../convex/_generated/api";
import { useReducedMotion } from "@/hooks/useReducedMotion";
import { triggerConfetti, type ConfettiType } from "@/lib/confetti";
import { soundManager, type SoundType } from "@/lib/sounds";
import { getStreakMilestone, isBigStreakMilestone } from "@/lib/achievements";
import { AchievementToast } from "@/components/gamification/AchievementToast";

interface GamificationContextValue {
  // Confetti
  fireConfetti: (type?: ConfettiType) => void;
  confettiEnabled: boolean;

  // Sound
  playSound: (sound: SoundType) => void;
  soundEnabled: boolean;
  soundVolume: number;

  // Achievements
  pendingAchievements: string[];
  dismissAchievement: () => void;
  unlockedAchievementIds: string[];
  checkAchievements: (context: AchievementContext) => Promise<string[]>;

  // Daily Challenges
  updateChallenges: (updates: ChallengeUpdate[]) => Promise<void>;

  // Celebration helper
  celebrateCorrectAnswer: (streak: number, isLevelUp?: boolean) => void;
  celebrateWrongAnswer: () => void;

  // Settings
  toggleSound: () => void;
  toggleConfetti: () => void;
}

interface AchievementContext {
  currentStreak?: number;
  totalQuestions?: number;
  sessionQuestions?: number;
  sessionCorrect?: number;
  masteryLevel?: string;
  domain?: string;
  category?: "reading_writing" | "math";
}

interface ChallengeUpdate {
  type: "streak" | "questions" | "hard_questions" | "domain_variety" | "accuracy" | "speed";
  value: number;
  isAbsolute?: boolean;
}

const GamificationContext = createContext<GamificationContextValue | null>(null);

interface GamificationProviderProps {
  children: ReactNode;
  visitorId: string;
}

export function GamificationProvider({
  children,
  visitorId,
}: GamificationProviderProps) {
  const reducedMotion = useReducedMotion();
  const [pendingAchievements, setPendingAchievements] = useState<string[]>([]);
  const [soundInitialized, setSoundInitialized] = useState(false);

  // Queries
  const settings = useQuery(api.userSettings.getSettings, { visitorId });
  const achievements = useQuery(api.achievements.getUserAchievements, {
    visitorId,
  });

  // Mutations
  const checkAndAwardAchievements = useMutation(
    api.achievements.checkAndAwardAchievements
  );
  const updateChallengeProgress = useMutation(
    api.dailyChallenges.updateChallengeProgress
  );
  const updateSettings = useMutation(api.userSettings.updateSettings);

  // Derived state
  const confettiEnabled =
    !reducedMotion && (settings?.confettiEnabled ?? true);
  const soundEnabled = settings?.soundEnabled ?? true;
  const soundVolume = settings?.soundVolume ?? 0.7;
  const unlockedAchievementIds =
    achievements?.map((a) => a.achievementId) ?? [];

  // Initialize sound manager on first user interaction
  useEffect(() => {
    const handleInteraction = () => {
      if (!soundInitialized) {
        soundManager.initialize();
        setSoundInitialized(true);
      }
    };

    window.addEventListener("click", handleInteraction, { once: true });
    window.addEventListener("keydown", handleInteraction, { once: true });

    return () => {
      window.removeEventListener("click", handleInteraction);
      window.removeEventListener("keydown", handleInteraction);
    };
  }, [soundInitialized]);

  // Sync sound settings
  useEffect(() => {
    soundManager.setEnabled(soundEnabled);
    soundManager.setVolume(soundVolume);
  }, [soundEnabled, soundVolume]);

  // Confetti wrapper
  const fireConfetti = useCallback(
    (type: ConfettiType = "small") => {
      if (confettiEnabled) {
        triggerConfetti(type);
      }
    },
    [confettiEnabled]
  );

  // Sound wrapper
  const playSound = useCallback(
    (sound: SoundType) => {
      if (soundEnabled) {
        soundManager.play(sound);
      }
    },
    [soundEnabled]
  );

  // Dismiss achievement toast
  const dismissAchievement = useCallback(() => {
    setPendingAchievements((prev) => prev.slice(1));
  }, []);

  // Check achievements
  const checkAchievements = useCallback(
    async (context: AchievementContext): Promise<string[]> => {
      const newAchievements = await checkAndAwardAchievements({
        visitorId,
        context,
      });

      if (newAchievements.length > 0) {
        setPendingAchievements((prev) => [...prev, ...newAchievements]);

        // Play achievement sound and trigger celebration
        playSound("achievement");
        fireConfetti("achievement");
      }

      return newAchievements;
    },
    [visitorId, checkAndAwardAchievements, playSound, fireConfetti]
  );

  // Update challenges
  const updateChallenges = useCallback(
    async (updates: ChallengeUpdate[]) => {
      await updateChallengeProgress({
        visitorId,
        updates,
      });
    },
    [visitorId, updateChallengeProgress]
  );

  // Celebration helpers
  const celebrateCorrectAnswer = useCallback(
    (streak: number, isLevelUp?: boolean) => {
      // Always play correct sound
      playSound("correct");

      // Check for streak milestone
      const milestone = getStreakMilestone(streak);
      if (milestone) {
        // Play streak sound
        setTimeout(() => playSound("streak"), 200);

        // Fire appropriate confetti
        if (isBigStreakMilestone(streak)) {
          fireConfetti("large");
        } else {
          fireConfetti("medium");
        }
      } else {
        // Small confetti for regular correct
        fireConfetti("small");
      }

      // Level up celebration
      if (isLevelUp) {
        setTimeout(() => {
          playSound("levelUp");
          fireConfetti("achievement");
        }, 300);
      }
    },
    [playSound, fireConfetti]
  );

  const celebrateWrongAnswer = useCallback(() => {
    playSound("incorrect");
  }, [playSound]);

  // Settings toggles
  const toggleSound = useCallback(() => {
    updateSettings({ visitorId, soundEnabled: !soundEnabled });
  }, [visitorId, soundEnabled, updateSettings]);

  const toggleConfetti = useCallback(() => {
    updateSettings({
      visitorId,
      confettiEnabled: !(settings?.confettiEnabled ?? true),
    });
  }, [visitorId, settings?.confettiEnabled, updateSettings]);

  const value: GamificationContextValue = {
    fireConfetti,
    confettiEnabled,
    playSound,
    soundEnabled,
    soundVolume,
    pendingAchievements,
    dismissAchievement,
    unlockedAchievementIds,
    checkAchievements,
    updateChallenges,
    celebrateCorrectAnswer,
    celebrateWrongAnswer,
    toggleSound,
    toggleConfetti,
  };

  return (
    <GamificationContext.Provider value={value}>
      {children}

      {/* Achievement Toast Queue */}
      {pendingAchievements.length > 0 && (
        <AchievementToast
          key={pendingAchievements[0]}
          achievementId={pendingAchievements[0]}
          onDismiss={dismissAchievement}
        />
      )}
    </GamificationContext.Provider>
  );
}

export function useGamification(): GamificationContextValue {
  const context = useContext(GamificationContext);
  if (!context) {
    throw new Error(
      "useGamification must be used within a GamificationProvider"
    );
  }
  return context;
}
