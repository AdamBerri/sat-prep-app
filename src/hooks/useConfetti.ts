"use client";

import { useCallback } from "react";
import { useReducedMotion } from "./useReducedMotion";
import { triggerConfetti, ConfettiType } from "@/lib/confetti";

interface UseConfettiOptions {
  enabled?: boolean;
}

interface UseConfettiReturn {
  trigger: (type?: ConfettiType) => void;
  isEnabled: boolean;
}

/**
 * Hook for triggering confetti celebrations
 * Automatically respects reduced motion preferences
 */
export function useConfetti(
  options: UseConfettiOptions = {}
): UseConfettiReturn {
  const { enabled = true } = options;
  const reducedMotion = useReducedMotion();

  const isEnabled = enabled && !reducedMotion;

  const trigger = useCallback(
    (type: ConfettiType = "small") => {
      if (!isEnabled) return;
      triggerConfetti(type);
    },
    [isEnabled]
  );

  return { trigger, isEnabled };
}
