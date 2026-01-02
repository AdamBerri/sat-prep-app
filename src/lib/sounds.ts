export type SoundType =
  | "correct"
  | "incorrect"
  | "streak"
  | "achievement"
  | "levelUp"
  | "click";

interface SoundConfig {
  frequency: number;
  duration: number;
  type: OscillatorType;
  volume: number;
  attack?: number;
  decay?: number;
  // For complex sounds
  frequencies?: number[];
  durations?: number[];
}

// Sound configurations using Web Audio API synthesis
const SOUND_CONFIGS: Record<SoundType, SoundConfig | SoundConfig[]> = {
  correct: {
    frequency: 880, // A5
    duration: 0.15,
    type: "sine",
    volume: 0.3,
    attack: 0.01,
    decay: 0.1,
  },
  incorrect: {
    frequency: 220, // A3
    duration: 0.25,
    type: "triangle",
    volume: 0.2,
    attack: 0.01,
    decay: 0.2,
  },
  streak: [
    { frequency: 523.25, duration: 0.1, type: "sine", volume: 0.25 }, // C5
    { frequency: 659.25, duration: 0.1, type: "sine", volume: 0.25 }, // E5
    { frequency: 783.99, duration: 0.15, type: "sine", volume: 0.25 }, // G5
  ],
  achievement: [
    { frequency: 523.25, duration: 0.12, type: "sine", volume: 0.3 }, // C5
    { frequency: 659.25, duration: 0.12, type: "sine", volume: 0.3 }, // E5
    { frequency: 783.99, duration: 0.12, type: "sine", volume: 0.3 }, // G5
    { frequency: 1046.5, duration: 0.25, type: "sine", volume: 0.35 }, // C6
  ],
  levelUp: [
    { frequency: 392, duration: 0.1, type: "sine", volume: 0.3 }, // G4
    { frequency: 523.25, duration: 0.1, type: "sine", volume: 0.3 }, // C5
    { frequency: 659.25, duration: 0.1, type: "sine", volume: 0.3 }, // E5
    { frequency: 783.99, duration: 0.1, type: "sine", volume: 0.3 }, // G5
    { frequency: 1046.5, duration: 0.3, type: "sine", volume: 0.35 }, // C6
  ],
  click: {
    frequency: 1200,
    duration: 0.05,
    type: "sine",
    volume: 0.15,
    attack: 0.005,
    decay: 0.04,
  },
};

class SoundManager {
  private audioContext: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private volume: number = 0.7;
  private enabled: boolean = true;

  /**
   * Initialize the audio context (must be called after user interaction)
   */
  initialize(): void {
    if (this.audioContext) return;

    try {
      this.audioContext = new (window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext)();
      this.masterGain = this.audioContext.createGain();
      this.masterGain.connect(this.audioContext.destination);
      this.masterGain.gain.value = this.volume;
    } catch (e) {
      console.warn("Web Audio API not supported:", e);
    }
  }

  /**
   * Resume audio context if suspended (browser autoplay policy)
   */
  private async resume(): Promise<void> {
    if (this.audioContext?.state === "suspended") {
      await this.audioContext.resume();
    }
  }

  /**
   * Set master volume (0.0 - 1.0)
   */
  setVolume(volume: number): void {
    this.volume = Math.max(0, Math.min(1, volume));
    if (this.masterGain) {
      this.masterGain.gain.value = this.volume;
    }
  }

  /**
   * Get current volume
   */
  getVolume(): number {
    return this.volume;
  }

  /**
   * Enable/disable all sounds
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
  }

  /**
   * Check if sounds are enabled
   */
  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Play a single tone
   */
  private playTone(config: SoundConfig, startTime: number = 0): void {
    if (!this.audioContext || !this.masterGain) return;

    const oscillator = this.audioContext.createOscillator();
    const gainNode = this.audioContext.createGain();

    oscillator.type = config.type;
    oscillator.frequency.value = config.frequency;

    const now = this.audioContext.currentTime + startTime;
    const attack = config.attack ?? 0.01;
    const decay = config.decay ?? config.duration * 0.8;

    // Envelope
    gainNode.gain.setValueAtTime(0, now);
    gainNode.gain.linearRampToValueAtTime(config.volume, now + attack);
    gainNode.gain.linearRampToValueAtTime(0, now + config.duration);

    oscillator.connect(gainNode);
    gainNode.connect(this.masterGain);

    oscillator.start(now);
    oscillator.stop(now + config.duration + 0.1);
  }

  /**
   * Play a sound effect
   */
  async play(sound: SoundType): Promise<void> {
    if (!this.enabled) return;

    // Initialize on first play (after user interaction)
    if (!this.audioContext) {
      this.initialize();
    }

    await this.resume();

    const config = SOUND_CONFIGS[sound];
    if (!config) return;

    if (Array.isArray(config)) {
      // Play sequence of tones
      let time = 0;
      for (const tone of config) {
        this.playTone(tone, time);
        time += tone.duration * 0.8; // Slight overlap for smoothness
      }
    } else {
      // Play single tone
      this.playTone(config);
    }
  }
}

// Singleton instance
export const soundManager = new SoundManager();

/**
 * Play a sound effect
 */
export function playSound(sound: SoundType): void {
  soundManager.play(sound);
}
