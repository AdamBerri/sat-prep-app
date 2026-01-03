import type {
  SATConfig,
  PracticeSection,
} from "@/types";

// ============================================================================
// DIGITAL SAT CONFIGURATION
// ============================================================================

export const SAT_CONFIG: SATConfig = {
  sections: [
    {
      id: "reading_writing",
      name: "Reading & Writing",
      shortName: "R&W",
      totalQuestions: 54,
      totalTimeMinutes: 64,
      modules: [
        { id: "rw_1", name: "Module 1", questions: 27, timeMinutes: 32 },
        { id: "rw_2", name: "Module 2", questions: 27, timeMinutes: 32 },
      ],
    },
    {
      id: "math",
      name: "Math",
      shortName: "Math",
      totalQuestions: 44,
      totalTimeMinutes: 70,
      modules: [
        { id: "math_1", name: "Module 1", questions: 22, timeMinutes: 35 },
        { id: "math_2", name: "Module 2", questions: 22, timeMinutes: 35 },
      ],
    },
  ],
  breakDurationMinutes: 10,
  totalQuestions: 98,
  totalTimeMinutes: 134,
} as const;

// ============================================================================
// PRACTICE SECTIONS
// ============================================================================

export const SECTIONS: PracticeSection[] = [
  {
    id: "reading_writing",
    label: "Reading & Writing",
    questions: 54,
    time: "64 min",
  },
  {
    id: "math",
    label: "Math",
    questions: 44,
    time: "70 min",
  },
];

// ============================================================================
// DOMAIN & SKILL MAPPINGS
// ============================================================================

export const READING_WRITING_DOMAINS = [
  "information_and_ideas", // Domain 1: Central Ideas, Inferences, Command of Evidence
  "craft_and_structure", // Domain 2: Words in Context, Text Structure, Cross-Text
  "expression_of_ideas", // Domain 3: Rhetorical Synthesis, Transitions
  "standard_english_conventions", // Domain 4: Boundaries, Form/Structure/Sense
] as const;

export const MATH_DOMAINS = [
  "algebra",
  "advanced_math",
  "problem_solving",
  "geometry_and_trigonometry",
] as const;

export const READING_WRITING_SKILLS = [
  // Domain 1: Information and Ideas
  "central_ideas",
  "inferences",
  "command_of_evidence_textual",
  "command_of_evidence_quantitative",

  // Domain 2: Craft and Structure
  "vocabulary_in_context",
  "text_structure",
  "cross_text_connections",

  // Domain 3: Expression of Ideas
  "rhetorical_synthesis",
  "transitions",

  // Domain 4: Standard English Conventions
  "boundaries_between_sentences",
  "boundaries_within_sentences",
  "subject_verb_agreement",
  "pronoun_antecedent_agreement",
  "verb_finiteness",
  "verb_tense_aspect",
  "subject_modifier_placement",
  "genitives_plurals",
] as const;

export const MATH_SKILLS = [
  "linear_equations",
  "quadratic_equations",
  "systems_of_equations",
  "ratios_and_proportions",
] as const;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins}:${secs.toString().padStart(2, "0")}`;
}

export function formatDomain(domain: string): string {
  return domain
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

export function formatSkill(skill: string): string {
  return skill
    .split("_")
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}
