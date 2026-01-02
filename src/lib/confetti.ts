import confetti from "canvas-confetti";

// Earthy theme colors matching the app's design
const EARTHY_COLORS = [
  "#a8c69f", // grass-light
  "#7eb36a", // grass-medium
  "#f4c430", // sunflower
  "#c9a66b", // wood-light
  "#5a8f4e", // grass-dark
  "#d4a574", // wood-medium
];

// Streak milestone colors (more intense)
const STREAK_COLORS = [
  "#ff6b35", // orange flame
  "#f7931e", // bright orange
  "#ffd700", // gold
  "#ff4500", // red-orange
  "#ff8c00", // dark orange
];

/**
 * Confetti presets for different celebration types
 */
export const confettiPresets = {
  /**
   * Small burst for correct answers
   */
  small: () => {
    confetti({
      particleCount: 30,
      spread: 50,
      origin: { y: 0.7, x: 0.5 },
      colors: EARTHY_COLORS,
      ticks: 100,
      gravity: 1.2,
      scalar: 0.9,
      disableForReducedMotion: true,
    });
  },

  /**
   * Medium celebration for streak milestones (5, 10)
   */
  medium: () => {
    confetti({
      particleCount: 80,
      spread: 70,
      origin: { y: 0.6, x: 0.5 },
      colors: [...EARTHY_COLORS, ...STREAK_COLORS],
      ticks: 150,
      gravity: 1,
      scalar: 1,
      disableForReducedMotion: true,
    });
  },

  /**
   * Large celebration for major achievements (25, 50, 100 streak)
   * Side cannons that fire continuously
   */
  large: () => {
    const duration = 2500;
    const end = Date.now() + duration;

    const frame = () => {
      // Left cannon
      confetti({
        particleCount: 3,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.65 },
        colors: STREAK_COLORS,
        ticks: 200,
        gravity: 0.8,
        scalar: 1.2,
        drift: 0.5,
        disableForReducedMotion: true,
      });

      // Right cannon
      confetti({
        particleCount: 3,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.65 },
        colors: STREAK_COLORS,
        ticks: 200,
        gravity: 0.8,
        scalar: 1.2,
        drift: -0.5,
        disableForReducedMotion: true,
      });

      if (Date.now() < end) {
        requestAnimationFrame(frame);
      }
    };

    frame();
  },

  /**
   * Achievement unlock celebration - upward burst with stars
   */
  achievement: () => {
    const count = 100;
    const defaults = {
      origin: { y: 0.7 },
      colors: ["#ffd700", "#ffb347", "#ff6961", "#77dd77", "#aec6cf"],
      disableForReducedMotion: true,
    };

    function fire(particleRatio: number, opts: confetti.Options) {
      confetti({
        ...defaults,
        ...opts,
        particleCount: Math.floor(count * particleRatio),
      });
    }

    fire(0.25, {
      spread: 26,
      startVelocity: 55,
    });

    fire(0.2, {
      spread: 60,
    });

    fire(0.35, {
      spread: 100,
      decay: 0.91,
      scalar: 0.8,
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 25,
      decay: 0.92,
      scalar: 1.2,
    });

    fire(0.1, {
      spread: 120,
      startVelocity: 45,
    });
  },

  /**
   * Daily goal completion - rain from top
   */
  goalComplete: () => {
    confetti({
      particleCount: 100,
      spread: 160,
      origin: { y: 0, x: 0.5 },
      gravity: 0.6,
      ticks: 300,
      colors: EARTHY_COLORS,
      scalar: 1.1,
      disableForReducedMotion: true,
    });
  },
};

export type ConfettiType = keyof typeof confettiPresets;

/**
 * Trigger confetti effect
 */
export function triggerConfetti(type: ConfettiType = "small"): void {
  const preset = confettiPresets[type];
  if (preset) {
    preset();
  }
}
