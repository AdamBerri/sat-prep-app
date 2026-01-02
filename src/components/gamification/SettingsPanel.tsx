"use client";

import { useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Settings, Volume2, VolumeX, Sparkles, X } from "lucide-react";

interface SettingsPanelProps {
  visitorId: string;
  isOpen: boolean;
  onClose: () => void;
}

export function SettingsPanel({ visitorId, isOpen, onClose }: SettingsPanelProps) {
  const settings = useQuery(api.userSettings.getSettings, { visitorId });
  const updateSettings = useMutation(api.userSettings.updateSettings);

  const [localVolume, setLocalVolume] = useState<number | null>(null);

  if (!isOpen) return null;

  const volume = localVolume ?? settings?.soundVolume ?? 0.7;
  const soundEnabled = settings?.soundEnabled ?? true;
  const confettiEnabled = settings?.confettiEnabled ?? true;

  const handleVolumeChange = (value: number) => {
    setLocalVolume(value);
  };

  const handleVolumeCommit = () => {
    if (localVolume !== null) {
      updateSettings({ visitorId, soundVolume: localVolume });
      setLocalVolume(null);
    }
  };

  const toggleSound = () => {
    updateSettings({ visitorId, soundEnabled: !soundEnabled });
  };

  const toggleConfetti = () => {
    updateSettings({ visitorId, confettiEnabled: !confettiEnabled });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Panel */}
      <div className="relative bg-[var(--paper-cream)] rounded-2xl shadow-xl w-full max-w-sm p-6 animate-in fade-in zoom-in duration-200">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <Settings className="w-5 h-5 text-[var(--ink-faded)]" />
            <h2 className="font-display text-xl font-bold text-[var(--ink-black)]">
              Settings
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-full hover:bg-black/5 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Settings */}
        <div className="space-y-6">
          {/* Sound Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {soundEnabled ? (
                <Volume2 className="w-5 h-5 text-[var(--grass-dark)]" />
              ) : (
                <VolumeX className="w-5 h-5 text-[var(--ink-faded)]" />
              )}
              <span className="font-medium text-[var(--ink-black)]">
                Sound Effects
              </span>
            </div>
            <button
              onClick={toggleSound}
              className={`
                relative w-12 h-6 rounded-full transition-colors
                ${soundEnabled ? "bg-[var(--grass-medium)]" : "bg-gray-300"}
              `}
            >
              <div
                className={`
                  absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform
                  ${soundEnabled ? "translate-x-7" : "translate-x-1"}
                `}
              />
            </button>
          </div>

          {/* Volume Slider */}
          {soundEnabled && (
            <div className="pl-8">
              <div className="flex items-center gap-3">
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.1"
                  value={volume}
                  onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                  onMouseUp={handleVolumeCommit}
                  onTouchEnd={handleVolumeCommit}
                  className="flex-1 h-2 bg-gray-200 rounded-full appearance-none cursor-pointer accent-[var(--grass-dark)]"
                />
                <span className="text-sm font-medium text-[var(--ink-faded)] w-8 text-right">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Confetti Toggle */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Sparkles
                className={`w-5 h-5 ${
                  confettiEnabled
                    ? "text-[var(--sunflower)]"
                    : "text-[var(--ink-faded)]"
                }`}
              />
              <span className="font-medium text-[var(--ink-black)]">
                Confetti Animations
              </span>
            </div>
            <button
              onClick={toggleConfetti}
              className={`
                relative w-12 h-6 rounded-full transition-colors
                ${confettiEnabled ? "bg-[var(--grass-medium)]" : "bg-gray-300"}
              `}
            >
              <div
                className={`
                  absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform
                  ${confettiEnabled ? "translate-x-7" : "translate-x-1"}
                `}
              />
            </button>
          </div>

          {/* Accessibility note */}
          <p className="text-xs text-[var(--ink-faded)] pt-2 border-t border-[var(--paper-lines)]">
            Animations automatically respect your device&apos;s reduced motion
            preferences.
          </p>
        </div>
      </div>
    </div>
  );
}

// Settings Button component for use in headers
interface SettingsButtonProps {
  onClick: () => void;
}

export function SettingsButton({ onClick }: SettingsButtonProps) {
  return (
    <button
      onClick={onClick}
      className="p-2 rounded-full hover:bg-black/5 transition-colors"
      title="Settings"
    >
      <Settings className="w-5 h-5 text-[var(--ink-faded)]" />
    </button>
  );
}
