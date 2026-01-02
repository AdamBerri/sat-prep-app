import {
  Flame,
  Zap,
  Trophy,
  Crown,
  BookOpen,
  Target,
  GraduationCap,
  Award,
  Crosshair,
  Star,
  Calculator,
  Calendar,
  CheckCircle2,
  TrendingUp,
  Brain,
  Sparkles,
  type LucideIcon,
} from "lucide-react";

export type AchievementCategory =
  | "streak"
  | "questions"
  | "accuracy"
  | "domain_mastery"
  | "daily_challenge"
  | "special";

export type AchievementRarity =
  | "common"
  | "uncommon"
  | "rare"
  | "epic"
  | "legendary";

export interface AchievementDefinition {
  id: string;
  category: AchievementCategory;
  name: string;
  description: string;
  icon: LucideIcon;
  requirement: number;
  rarity: AchievementRarity;
  colors: {
    bg: string;
    text: string;
    border: string;
    glow?: string;
  };
}

// Rarity color schemes
export const RARITY_COLORS: Record<
  AchievementRarity,
  { bg: string; text: string; border: string; glow: string }
> = {
  common: {
    bg: "bg-stone-100",
    text: "text-stone-600",
    border: "border-stone-300",
    glow: "shadow-stone-200",
  },
  uncommon: {
    bg: "bg-green-100",
    text: "text-green-700",
    border: "border-green-400",
    glow: "shadow-green-200",
  },
  rare: {
    bg: "bg-blue-100",
    text: "text-blue-700",
    border: "border-blue-400",
    glow: "shadow-blue-300",
  },
  epic: {
    bg: "bg-purple-100",
    text: "text-purple-700",
    border: "border-purple-400",
    glow: "shadow-purple-300",
  },
  legendary: {
    bg: "bg-amber-100",
    text: "text-amber-700",
    border: "border-amber-400",
    glow: "shadow-amber-300",
  },
};

export const ACHIEVEMENTS: AchievementDefinition[] = [
  // ─────────────────────────────────────────────────────────
  // STREAK ACHIEVEMENTS
  // ─────────────────────────────────────────────────────────
  {
    id: "streak_5",
    category: "streak",
    name: "Getting Warm",
    description: "Answer 5 questions correctly in a row",
    icon: Flame,
    requirement: 5,
    rarity: "common",
    colors: {
      bg: "bg-orange-100",
      text: "text-orange-600",
      border: "border-orange-300",
    },
  },
  {
    id: "streak_10",
    category: "streak",
    name: "On Fire",
    description: "Answer 10 questions correctly in a row",
    icon: Flame,
    requirement: 10,
    rarity: "uncommon",
    colors: {
      bg: "bg-orange-200",
      text: "text-orange-700",
      border: "border-orange-400",
    },
  },
  {
    id: "streak_25",
    category: "streak",
    name: "Blazing",
    description: "Answer 25 questions correctly in a row",
    icon: Zap,
    requirement: 25,
    rarity: "rare",
    colors: {
      bg: "bg-amber-200",
      text: "text-amber-700",
      border: "border-amber-500",
    },
  },
  {
    id: "streak_50",
    category: "streak",
    name: "Unstoppable",
    description: "Answer 50 questions correctly in a row",
    icon: Trophy,
    requirement: 50,
    rarity: "epic",
    colors: {
      bg: "bg-purple-200",
      text: "text-purple-700",
      border: "border-purple-500",
    },
  },
  {
    id: "streak_100",
    category: "streak",
    name: "Legendary",
    description: "Answer 100 questions correctly in a row",
    icon: Crown,
    requirement: 100,
    rarity: "legendary",
    colors: {
      bg: "bg-yellow-200",
      text: "text-yellow-700",
      border: "border-yellow-500",
      glow: "shadow-yellow-400",
    },
  },

  // ─────────────────────────────────────────────────────────
  // QUESTION COUNT ACHIEVEMENTS
  // ─────────────────────────────────────────────────────────
  {
    id: "questions_10",
    category: "questions",
    name: "First Steps",
    description: "Answer 10 questions total",
    icon: BookOpen,
    requirement: 10,
    rarity: "common",
    colors: {
      bg: "bg-green-100",
      text: "text-green-600",
      border: "border-green-300",
    },
  },
  {
    id: "questions_50",
    category: "questions",
    name: "Dedicated",
    description: "Answer 50 questions total",
    icon: BookOpen,
    requirement: 50,
    rarity: "common",
    colors: {
      bg: "bg-green-100",
      text: "text-green-600",
      border: "border-green-300",
    },
  },
  {
    id: "questions_100",
    category: "questions",
    name: "Century",
    description: "Answer 100 questions total",
    icon: Target,
    requirement: 100,
    rarity: "uncommon",
    colors: {
      bg: "bg-blue-200",
      text: "text-blue-700",
      border: "border-blue-400",
    },
  },
  {
    id: "questions_500",
    category: "questions",
    name: "Scholar",
    description: "Answer 500 questions total",
    icon: GraduationCap,
    requirement: 500,
    rarity: "rare",
    colors: {
      bg: "bg-indigo-200",
      text: "text-indigo-700",
      border: "border-indigo-500",
    },
  },
  {
    id: "questions_1000",
    category: "questions",
    name: "Master",
    description: "Answer 1000 questions total",
    icon: Award,
    requirement: 1000,
    rarity: "epic",
    colors: {
      bg: "bg-purple-200",
      text: "text-purple-700",
      border: "border-purple-500",
    },
  },

  // ─────────────────────────────────────────────────────────
  // ACCURACY ACHIEVEMENTS
  // ─────────────────────────────────────────────────────────
  {
    id: "accuracy_80_session",
    category: "accuracy",
    name: "Sharp",
    description: "Achieve 80% accuracy in a session (20+ questions)",
    icon: Target,
    requirement: 80,
    rarity: "uncommon",
    colors: {
      bg: "bg-teal-200",
      text: "text-teal-700",
      border: "border-teal-400",
    },
  },
  {
    id: "accuracy_90_session",
    category: "accuracy",
    name: "Precision",
    description: "Achieve 90% accuracy in a session (20+ questions)",
    icon: Crosshair,
    requirement: 90,
    rarity: "rare",
    colors: {
      bg: "bg-cyan-200",
      text: "text-cyan-700",
      border: "border-cyan-500",
    },
  },
  {
    id: "perfect_10",
    category: "accuracy",
    name: "Perfect 10",
    description: "Answer 10 questions perfectly in one session",
    icon: Star,
    requirement: 10,
    rarity: "uncommon",
    colors: {
      bg: "bg-yellow-100",
      text: "text-yellow-600",
      border: "border-yellow-300",
    },
  },

  // ─────────────────────────────────────────────────────────
  // DOMAIN MASTERY ACHIEVEMENTS
  // ─────────────────────────────────────────────────────────
  {
    id: "domain_expert_algebra",
    category: "domain_mastery",
    name: "Algebra Expert",
    description: "Reach Expert level in Algebra",
    icon: Calculator,
    requirement: 1,
    rarity: "epic",
    colors: {
      bg: "bg-blue-200",
      text: "text-blue-700",
      border: "border-blue-500",
    },
  },
  {
    id: "domain_expert_advanced_math",
    category: "domain_mastery",
    name: "Advanced Math Expert",
    description: "Reach Expert level in Advanced Math",
    icon: Brain,
    requirement: 1,
    rarity: "epic",
    colors: {
      bg: "bg-violet-200",
      text: "text-violet-700",
      border: "border-violet-500",
    },
  },
  {
    id: "domain_expert_geometry",
    category: "domain_mastery",
    name: "Geometry Expert",
    description: "Reach Expert level in Geometry & Trigonometry",
    icon: Sparkles,
    requirement: 1,
    rarity: "epic",
    colors: {
      bg: "bg-pink-200",
      text: "text-pink-700",
      border: "border-pink-500",
    },
  },
  {
    id: "domain_expert_reading",
    category: "domain_mastery",
    name: "Reading Expert",
    description: "Reach Expert level in any Reading & Writing domain",
    icon: BookOpen,
    requirement: 1,
    rarity: "epic",
    colors: {
      bg: "bg-emerald-200",
      text: "text-emerald-700",
      border: "border-emerald-500",
    },
  },

  // ─────────────────────────────────────────────────────────
  // DAILY CHALLENGE ACHIEVEMENTS
  // ─────────────────────────────────────────────────────────
  {
    id: "daily_complete_all",
    category: "daily_challenge",
    name: "Daily Champion",
    description: "Complete all daily challenges in one day",
    icon: Calendar,
    requirement: 1,
    rarity: "uncommon",
    colors: {
      bg: "bg-green-200",
      text: "text-green-700",
      border: "border-green-500",
    },
  },
  {
    id: "daily_streak_7",
    category: "daily_challenge",
    name: "Weekly Warrior",
    description: "Complete daily goals 7 days in a row",
    icon: TrendingUp,
    requirement: 7,
    rarity: "rare",
    colors: {
      bg: "bg-emerald-200",
      text: "text-emerald-700",
      border: "border-emerald-500",
    },
  },
  {
    id: "daily_streak_30",
    category: "daily_challenge",
    name: "Monthly Master",
    description: "Complete daily goals 30 days in a row",
    icon: Crown,
    requirement: 30,
    rarity: "legendary",
    colors: {
      bg: "bg-amber-200",
      text: "text-amber-700",
      border: "border-amber-500",
      glow: "shadow-amber-400",
    },
  },

  // ─────────────────────────────────────────────────────────
  // SPECIAL ACHIEVEMENTS
  // ─────────────────────────────────────────────────────────
  {
    id: "first_question",
    category: "special",
    name: "Journey Begins",
    description: "Answer your first question",
    icon: CheckCircle2,
    requirement: 1,
    rarity: "common",
    colors: {
      bg: "bg-sky-100",
      text: "text-sky-600",
      border: "border-sky-300",
    },
  },
  {
    id: "night_owl",
    category: "special",
    name: "Night Owl",
    description: "Practice after midnight",
    icon: Star,
    requirement: 1,
    rarity: "uncommon",
    colors: {
      bg: "bg-indigo-200",
      text: "text-indigo-700",
      border: "border-indigo-400",
    },
  },
  {
    id: "early_bird",
    category: "special",
    name: "Early Bird",
    description: "Practice before 6 AM",
    icon: Sparkles,
    requirement: 1,
    rarity: "uncommon",
    colors: {
      bg: "bg-orange-200",
      text: "text-orange-700",
      border: "border-orange-400",
    },
  },
];

// Helper to get achievement by ID
export function getAchievementById(id: string): AchievementDefinition | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

// Helper to get achievements by category
export function getAchievementsByCategory(
  category: AchievementCategory
): AchievementDefinition[] {
  return ACHIEVEMENTS.filter((a) => a.category === category);
}

// Helper to check if a streak milestone was just reached
export function getStreakMilestone(streak: number): number | null {
  const milestones = [5, 10, 25, 50, 100];
  return milestones.includes(streak) ? streak : null;
}

// Check if this is a "big" milestone (triggers large celebration)
export function isBigStreakMilestone(streak: number): boolean {
  return [25, 50, 100].includes(streak);
}
