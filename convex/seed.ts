import { mutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// Sample passages for Reading & Writing
const SAMPLE_PASSAGES = [
  {
    title: "The Migration Crisis",
    author: "Dr. Sarah Chen",
    content: `The sudden policy shift would precipitate a series of unprecedented changes across the region. Officials had not anticipated the speed at which events would unfold, nor the magnitude of their consequences.

Within weeks, thousands of families found themselves navigating a bureaucratic labyrinth that seemed designed more to confuse than to assist. The new regulations, hastily drafted and poorly communicated, left even experienced immigration attorneys struggling to advise their clients.

"We've never seen anything quite like this," remarked one senior official, speaking on condition of anonymity. "The cascading effects are still being calculated."`,
  },
  {
    title: "Ocean Acidification",
    author: "Marine Biology Quarterly",
    content: `The ocean absorbs approximately 30% of the carbon dioxide produced by human activities. While this has helped slow the pace of climate change, it has come at a significant cost to marine ecosystems.

As CO2 dissolves in seawater, it forms carbonic acid, gradually lowering the ocean's pH. This process, known as ocean acidification, threatens organisms that build shells or skeletons from calcium carbonate, including corals, mollusks, and some plankton species.

Recent studies indicate that current acidification rates are unprecedented in at least the past 300 million years.`,
  },
  {
    title: "The Architecture of Memory",
    author: "Dr. James Morrison",
    content: `Memory is not a passive recording device but an active process of reconstruction. Each time we recall an event, we reassemble it from fragments stored across different brain regions, influenced by our current emotional state and accumulated experiences.

This reconstructive nature explains why memories can be remarkably unreliable. Details shift, emotions intensify or fade, and entirely false elements can be incorporated through suggestion or imagination.

Understanding this malleability has profound implications for fields ranging from criminal justice to therapeutic practice.`,
  },
  {
    title: "Urban Beekeeping",
    author: "City Nature Magazine",
    content: `Rooftop apiaries have become increasingly common in metropolitan areas, transforming unused urban spaces into thriving ecosystems. These city-dwelling bees often produce honey with unique flavor profiles, reflecting the diverse flora found in parks, gardens, and window boxes throughout the urban landscape.

Beyond honey production, urban beekeeping serves a crucial ecological function. Bees pollinate community gardens and green spaces, contributing to urban food security and biodiversity. Some cities have even revised zoning laws to encourage the practice.`,
  },
  {
    title: "The Physics of Music",
    author: "Dr. Elena Vasquez",
    content: `When a guitar string vibrates, it doesn't simply move back and forth in a single pattern. Instead, it simultaneously oscillates at multiple frequencies, producing a fundamental tone along with a series of overtones called harmonics. This complex vibration pattern gives each instrument its distinctive timbre.

The relationship between these harmonics follows precise mathematical ratios first described by Pythagoras. A string divided exactly in half produces a note one octave higher; divided into thirds, it yields a perfect fifth. This mathematical foundation underlies all of Western music theory.`,
  },
  {
    title: "Coral Restoration",
    author: "Pacific Marine Institute",
    content: `Marine biologists have developed innovative techniques to accelerate coral growth in laboratory settings. By carefully controlling water temperature, light exposure, and nutrient levels, researchers can grow coral fragments up to 40 times faster than they would develop in the wild.

These lab-grown corals are then transplanted to degraded reef systems, where they help rebuild ecosystems devastated by bleaching events. While promising, scientists caution that restoration efforts cannot substitute for addressing the root causes of coral decline, particularly rising ocean temperatures.`,
  },
  {
    title: "The Language of Dolphins",
    author: "Journal of Marine Cognition",
    content: `Bottlenose dolphins communicate through a sophisticated system of clicks, whistles, and body movements. Each dolphin develops a unique "signature whistle" during its first year of life—essentially a name that other dolphins use to call to that specific individual.

Recent studies using underwater microphones and computer analysis have revealed that dolphin communication may be far more complex than previously thought. Researchers have identified patterns suggesting rudimentary syntax, with certain sound combinations consistently appearing in specific contexts.`,
  },
  {
    title: "Ancient Agricultural Practices",
    author: "Dr. Marcus Webb",
    content: `The terraced hillsides of the Andes Mountains represent one of humanity's most remarkable engineering achievements. Built by pre-Columbian civilizations over 1,000 years ago, these agricultural platforms transformed steep, unusable slopes into productive farmland capable of feeding large populations.

Each terrace creates its own microclimate, with temperature variations between levels allowing farmers to cultivate different crops at different elevations. This vertical farming strategy maximized the limited arable land available in mountainous terrain while preventing erosion and managing water flow.`,
  },
  {
    title: "The Art of Fermentation",
    author: "Culinary Science Review",
    content: `Fermentation is one of the oldest food preservation techniques, predating written history. The process relies on microorganisms—typically bacteria or yeast—that convert sugars into acids, gases, or alcohol. This transformation not only extends shelf life but often creates entirely new flavors and textures.

Modern chefs have rediscovered fermentation as a culinary tool, using controlled decomposition to develop complex flavor profiles. From Korean kimchi to French cheese, fermented foods represent a bridge between ancient tradition and contemporary gastronomy.`,
  },
  {
    title: "Sleep and Creativity",
    author: "Neuroscience Today",
    content: `The relationship between sleep and creative problem-solving has fascinated researchers for decades. Studies consistently show that people who sleep after learning new information perform better on tasks requiring creative insight than those who remain awake for the same period.

During REM sleep, the brain appears to forge unexpected connections between disparate pieces of information. This process may explain why many artists and scientists report breakthrough ideas occurring during dreams or immediately upon waking. The brain, freed from the constraints of conscious logic, explores possibilities that might otherwise go unnoticed.`,
  },
];

// Reading & Writing question templates
const RW_TEMPLATES = [
  {
    prompt: 'As used in the passage, "precipitate" most nearly means',
    options: [
      { key: "A", content: "hasty and rash" },
      { key: "B", content: "to cause to happen suddenly" },
      { key: "C", content: "a chemical deposit" },
      { key: "D", content: "falling moisture" },
    ],
    correctAnswer: "B",
    domain: "craft_and_structure",
    skill: "vocabulary_in_context",
  },
  {
    prompt: "The main purpose of the passage is to",
    options: [
      { key: "A", content: "analyze a complex scientific phenomenon" },
      { key: "B", content: "advocate for a particular policy position" },
      { key: "C", content: "describe a significant challenge or development" },
      { key: "D", content: "compare competing scientific theories" },
    ],
    correctAnswer: "C",
    domain: "information_and_ideas",
    skill: "central_ideas",
  },
  {
    prompt: "Which choice best describes the function of the second paragraph?",
    options: [
      { key: "A", content: "It introduces a counterargument to the main claim" },
      { key: "B", content: "It provides specific evidence supporting an earlier assertion" },
      { key: "C", content: "It shifts focus to a related but distinct topic" },
      { key: "D", content: "It summarizes the implications of the research described" },
    ],
    correctAnswer: "B",
    domain: "craft_and_structure",
    skill: "rhetorical_synthesis",
  },
  {
    prompt: "Based on the passage, which statement best describes the author's perspective?",
    options: [
      { key: "A", content: "Cautiously optimistic about future developments" },
      { key: "B", content: "Deeply skeptical of current approaches" },
      { key: "C", content: "Objectively informative without taking a position" },
      { key: "D", content: "Enthusiastically supportive of new methods" },
    ],
    correctAnswer: "A",
    domain: "information_and_ideas",
    skill: "command_of_evidence",
  },
  {
    prompt: "Which choice best states the central idea of the passage?",
    options: [
      { key: "A", content: "Traditional methods remain superior to modern innovations" },
      { key: "B", content: "A particular phenomenon has significant and complex implications" },
      { key: "C", content: "Scientific consensus on the topic remains elusive" },
      { key: "D", content: "Economic factors outweigh environmental concerns" },
    ],
    correctAnswer: "B",
    domain: "information_and_ideas",
    skill: "central_ideas",
  },
];

// Math question templates (using LaTeX notation with $...$ delimiters)
const MATH_TEMPLATES = [
  {
    prompt: "If $3x + 7 = 22$, what is the value of $6x + 14$?",
    options: [
      { key: "A", content: "$30$" },
      { key: "B", content: "$37$" },
      { key: "C", content: "$44$" },
      { key: "D", content: "$51$" },
    ],
    correctAnswer: "C",
    domain: "algebra",
    skill: "linear_equations",
    explanation:
      "First solve for $x$: $3x + 7 = 22$, so $3x = 15$, and $x = 5$. Then $6x + 14 = 6(5) + 14 = 30 + 14 = 44$. Alternatively, notice that $6x + 14 = 2(3x + 7) = 2(22) = 44$.",
  },
  {
    prompt: "Which of the following is equivalent to $(x + 3)^2 - 9$?",
    options: [
      { key: "A", content: "$x^2$" },
      { key: "B", content: "$x^2 + 6x$" },
      { key: "C", content: "$x^2 + 6x + 9$" },
      { key: "D", content: "$x^2 - 6x$" },
    ],
    correctAnswer: "B",
    domain: "advanced_math",
    skill: "quadratic_equations",
    explanation:
      "Expand $(x + 3)^2 = x^2 + 6x + 9$. Then subtract 9: $x^2 + 6x + 9 - 9 = x^2 + 6x$.",
  },
  {
    prompt:
      "A line passes through the points $(2, 5)$ and $(6, 13)$. What is the slope of this line?",
    options: [
      { key: "A", content: "$\\frac{1}{2}$" },
      { key: "B", content: "$2$" },
      { key: "C", content: "$4$" },
      { key: "D", content: "$8$" },
    ],
    correctAnswer: "B",
    domain: "algebra",
    skill: "linear_equations",
    explanation:
      "Slope $= \\frac{y_2 - y_1}{x_2 - x_1} = \\frac{13 - 5}{6 - 2} = \\frac{8}{4} = 2$.",
  },
  {
    prompt: "If $f(x) = 2x^2 - 3x + 1$, what is $f(-2)$?",
    options: [
      { key: "A", content: "$3$" },
      { key: "B", content: "$11$" },
      { key: "C", content: "$15$" },
      { key: "D", content: "$19$" },
    ],
    correctAnswer: "C",
    domain: "advanced_math",
    skill: "quadratic_equations",
    explanation:
      "$f(-2) = 2(-2)^2 - 3(-2) + 1 = 2(4) + 6 + 1 = 8 + 6 + 1 = 15$.",
  },
  {
    prompt:
      "What is the solution to the system of equations: $y = 2x + 1$ and $y = -x + 7$?",
    options: [
      { key: "A", content: "$x = 2, y = 5$" },
      { key: "B", content: "$x = 3, y = 4$" },
      { key: "C", content: "$x = 1, y = 3$" },
      { key: "D", content: "$x = 4, y = 3$" },
    ],
    correctAnswer: "A",
    domain: "algebra",
    skill: "systems_of_equations",
    explanation:
      "Set the equations equal: $2x + 1 = -x + 7$. Solve: $3x = 6$, so $x = 2$. Then $y = 2(2) + 1 = 5$.",
  },
  {
    prompt: "If the ratio of $a$ to $b$ is $3:5$, and $b = 20$, what is $a$?",
    options: [
      { key: "A", content: "$8$" },
      { key: "B", content: "$12$" },
      { key: "C", content: "$15$" },
      { key: "D", content: "$33$" },
    ],
    correctAnswer: "B",
    domain: "problem_solving",
    skill: "ratios_and_proportions",
    explanation:
      "If $a:b = 3:5$, then $\\frac{a}{b} = \\frac{3}{5}$. With $b = 20$: $\\frac{a}{20} = \\frac{3}{5}$, so $a = 20 \\times \\frac{3}{5} = 12$.",
  },
  {
    prompt:
      "In a right triangle, one leg is $6$ and the hypotenuse is $10$. What is the length of the other leg?",
    options: [
      { key: "A", content: "$4$" },
      { key: "B", content: "$6$" },
      { key: "C", content: "$8$" },
      { key: "D", content: "$12$" },
    ],
    correctAnswer: "C",
    domain: "geometry_and_trigonometry",
    skill: "right_triangles",
    explanation:
      "By the Pythagorean theorem: $a^2 + b^2 = c^2$. So $6^2 + b^2 = 10^2$, meaning $36 + b^2 = 100$, $b^2 = 64$, $b = 8$.",
  },
  {
    prompt: "What is the value of $x$ if $2^x = 32$?",
    options: [
      { key: "A", content: "$4$" },
      { key: "B", content: "$5$" },
      { key: "C", content: "$6$" },
      { key: "D", content: "$16$" },
    ],
    correctAnswer: "B",
    domain: "advanced_math",
    skill: "exponential_functions",
    explanation: "$32 = 2^5$, so $2^x = 2^5$ means $x = 5$.",
  },
];

export const seedDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    // Check if already seeded
    const existingQuestions = await ctx.db.query("questions").first();
    if (existingQuestions) {
      return { message: "Database already seeded", seeded: false };
    }

    const passageIds: Id<"passages">[] = [];
    const questionIds: Id<"questions">[] = [];

    // Insert passages
    for (const passage of SAMPLE_PASSAGES) {
      const passageId = await ctx.db.insert("passages", {
        title: passage.title,
        author: passage.author,
        content: passage.content,
      });
      passageIds.push(passageId);
    }

    // Create Reading & Writing questions (54 total for a full exam)
    // We'll create multiple questions per passage
    let rwCount = 0;
    for (let i = 0; i < 54; i++) {
      const passageIndex = i % passageIds.length;
      const templateIndex = i % RW_TEMPLATES.length;
      const template = RW_TEMPLATES[templateIndex];
      const passageId = passageIds[passageIndex];

      if (!template || !passageId) continue;

      const questionId = await ctx.db.insert("questions", {
        type: "multiple_choice",
        category: "reading_writing",
        domain: template.domain,
        skill: template.skill,
        difficulty: Math.floor(Math.random() * 3) + 1, // 1-3
        prompt: template.prompt,
        passageId: passageId,
        correctAnswer: template.correctAnswer,
        tags: [template.domain, template.skill],
      });

      questionIds.push(questionId);

      // Insert answer options
      for (let j = 0; j < template.options.length; j++) {
        const option = template.options[j];
        if (!option) continue;
        await ctx.db.insert("answerOptions", {
          questionId,
          key: option.key,
          content: option.content,
          order: j,
        });
      }

      // Insert explanation
      await ctx.db.insert("explanations", {
        questionId,
        correctExplanation: `The correct answer is ${template.correctAnswer}. This question tests your understanding of ${template.skill.replace(/_/g, " ")}.`,
        wrongAnswerExplanations: {
          A: template.correctAnswer !== "A" ? "This is incorrect because it doesn't fully capture the meaning in context." : undefined,
          B: template.correctAnswer !== "B" ? "This is incorrect because it misinterprets the passage's main point." : undefined,
          C: template.correctAnswer !== "C" ? "This is incorrect because it focuses on a minor detail." : undefined,
          D: template.correctAnswer !== "D" ? "This is incorrect because it contradicts information in the passage." : undefined,
        },
        commonMistakes: [
          {
            reason: "Misread the question",
            description: "Make sure to read what the question is specifically asking for.",
          },
          {
            reason: "Didn't refer back to passage",
            description: "Always verify your answer against the text.",
          },
        ],
      });

      rwCount++;
    }

    // Create Math questions (44 total for a full exam)
    for (let i = 0; i < 44; i++) {
      const templateIndex = i % MATH_TEMPLATES.length;
      const template = MATH_TEMPLATES[templateIndex];

      if (!template) continue;

      const questionId = await ctx.db.insert("questions", {
        type: "multiple_choice",
        category: "math",
        domain: template.domain,
        skill: template.skill,
        difficulty: Math.floor(Math.random() * 3) + 1, // 1-3
        prompt: template.prompt,
        correctAnswer: template.correctAnswer,
        tags: [template.domain, template.skill],
      });

      questionIds.push(questionId);

      // Insert answer options
      for (let j = 0; j < template.options.length; j++) {
        const option = template.options[j];
        if (!option) continue;
        await ctx.db.insert("answerOptions", {
          questionId,
          key: option.key,
          content: option.content,
          order: j,
        });
      }

      // Insert explanation
      await ctx.db.insert("explanations", {
        questionId,
        correctExplanation: template.explanation,
        wrongAnswerExplanations: {
          A: template.correctAnswer !== "A" ? "This is a common calculation error." : undefined,
          B: template.correctAnswer !== "B" ? "Check your arithmetic carefully." : undefined,
          C: template.correctAnswer !== "C" ? "Review the problem setup." : undefined,
          D: template.correctAnswer !== "D" ? "This may result from a sign error." : undefined,
        },
        commonMistakes: [
          {
            reason: "Calculation error",
            description: "Double-check each step of your calculations.",
          },
          {
            reason: "Misunderstood the question",
            description: "Read the question carefully to understand what's being asked.",
          },
        ],
      });
    }

    return {
      message: "Database seeded successfully",
      seeded: true,
      stats: {
        passages: passageIds.length,
        readingWritingQuestions: rwCount,
        mathQuestions: 44,
        totalQuestions: questionIds.length,
      },
    };
  },
});

// Clear all data (for development)
export const clearDatabase = mutation({
  args: {},
  handler: async (ctx) => {
    // Delete in order to respect foreign key relationships
    const tables = [
      "scoreReports",
      "userAnswers",
      "highlights",
      "examAttempts",
      "explanations",
      "answerOptions",
      "questions",
      "passageFigures",
      "passages",
      "examSections",
      "exams",
      "questionSets",
      "users",
    ] as const;

    let totalDeleted = 0;

    for (const table of tables) {
      const docs = await ctx.db.query(table).collect();
      for (const doc of docs) {
        await ctx.db.delete(doc._id);
        totalDeleted++;
      }
    }

    return { message: `Deleted ${totalDeleted} documents` };
  },
});
