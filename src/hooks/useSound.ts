"use client";

import { useCallback, useEffect, useState } from "react";
import { soundManager, SoundType } from "@/lib/sounds";

interface UseSoundOptions {
  enabled?: boolean;
  volume?: number;
}

interface UseSoundReturn {
  play: (sound: SoundType) => void;
  isEnabled: boolean;
  setEnabled: (enabled: boolean) => void;
  volume: number;
  setVolume: (volume: number) => void;
}

/**
 * Hook for playing sound effects
 */
export function useSound(options: UseSoundOptions = {}): UseSoundReturn {
  const { enabled: initialEnabled = true, volume: initialVolume = 0.7 } =
    options;

  const [isEnabled, setIsEnabled] = useState(initialEnabled);
  const [volume, setVolumeState] = useState(initialVolume);

  // Sync with sound manager
  useEffect(() => {
    soundManager.setEnabled(isEnabled);
  }, [isEnabled]);

  useEffect(() => {
    soundManager.setVolume(volume);
  }, [volume]);

  const play = useCallback(
    (sound: SoundType) => {
      if (isEnabled) {
        soundManager.play(sound);
      }
    },
    [isEnabled]
  );

  const setEnabled = useCallback((enabled: boolean) => {
    setIsEnabled(enabled);
    soundManager.setEnabled(enabled);
  }, []);

  const setVolume = useCallback((vol: number) => {
    const clampedVolume = Math.max(0, Math.min(1, vol));
    setVolumeState(clampedVolume);
    soundManager.setVolume(clampedVolume);
  }, []);

  return {
    play,
    isEnabled,
    setEnabled,
    volume,
    setVolume,
  };
}
