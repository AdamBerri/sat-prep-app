"use client";

import { Clock } from "lucide-react";
import { Id } from "../../../convex/_generated/dataModel";

interface TimeSlot {
  _id: Id<"tutoringSlots">;
  startTime: number;
  endTime: number;
  tutor?: {
    name: string;
    sessionPrice: number;
    sessionDurationMinutes: number;
  } | null;
}

interface TimeSlotPickerProps {
  slots: TimeSlot[];
  selectedSlotId: Id<"tutoringSlots"> | null;
  onSelectSlot: (slotId: Id<"tutoringSlots">) => void;
  isLoading?: boolean;
}

export default function TimeSlotPicker({
  slots,
  selectedSlotId,
  onSelectSlot,
  isLoading,
}: TimeSlotPickerProps) {
  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours === 0) return `${mins}min`;
    if (mins === 0) return `${hours}hr`;
    return `${hours}hr ${mins}min`;
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl border border-[var(--paper-lines)] p-6 shadow-sm">
        <div className="animate-pulse space-y-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-16 bg-[var(--paper-cream)] rounded-lg"
            />
          ))}
        </div>
      </div>
    );
  }

  if (slots.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-[var(--paper-lines)] p-6 shadow-sm text-center">
        <Clock className="w-12 h-12 mx-auto text-[var(--ink-faded)]/30 mb-3" />
        <p className="font-body text-[var(--ink-faded)]">
          No available times for this date
        </p>
        <p className="font-body text-sm text-[var(--ink-faded)]/70 mt-1">
          Try selecting a different date
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl border border-[var(--paper-lines)] p-6 shadow-sm">
      <h3 className="font-display text-lg font-semibold text-[var(--ink-black)] mb-4">
        Available Times
      </h3>
      <div className="space-y-3">
        {slots.map((slot) => {
          const isSelected = selectedSlotId === slot._id;
          const duration = slot.tutor?.sessionDurationMinutes || 90;

          return (
            <button
              key={slot._id}
              onClick={() => onSelectSlot(slot._id)}
              className={`
                w-full p-4 rounded-lg border-2 transition-all text-left
                ${
                  isSelected
                    ? "border-[var(--grass-medium)] bg-[var(--grass-light)]/20"
                    : "border-[var(--paper-lines)] hover:border-[var(--grass-light)] hover:bg-[var(--paper-cream)]"
                }
              `}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className={`
                      w-10 h-10 rounded-lg flex items-center justify-center
                      ${
                        isSelected
                          ? "bg-[var(--grass-medium)] text-white"
                          : "bg-[var(--paper-cream)] text-[var(--ink-faded)]"
                      }
                    `}
                  >
                    <Clock className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-body font-semibold text-[var(--ink-black)]">
                      {formatTime(slot.startTime)} - {formatTime(slot.endTime)}
                    </p>
                    <p className="font-body text-sm text-[var(--ink-faded)]">
                      {formatDuration(duration)} session
                    </p>
                  </div>
                </div>
                <div
                  className={`
                    w-5 h-5 rounded-full border-2 flex items-center justify-center
                    ${
                      isSelected
                        ? "border-[var(--grass-medium)] bg-[var(--grass-medium)]"
                        : "border-[var(--ink-faded)]/30"
                    }
                  `}
                >
                  {isSelected && (
                    <div className="w-2 h-2 rounded-full bg-white" />
                  )}
                </div>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
