"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useState, useMemo } from "react";

interface CalendarPickerProps {
  availableDates: string[]; // Array of YYYY-MM-DD strings
  selectedDate: string | null;
  onSelectDate: (date: string) => void;
}

export default function CalendarPicker({
  availableDates,
  selectedDate,
  onSelectDate,
}: CalendarPickerProps) {
  const [currentMonth, setCurrentMonth] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), 1);
  });

  const availableDateSet = useMemo(
    () => new Set(availableDates),
    [availableDates]
  );

  const daysInMonth = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days: (Date | null)[] = [];

    // Add empty cells for days before the first of the month
    const startPadding = firstDay.getDay();
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }

    // Add all days in the month
    for (let day = 1; day <= lastDay.getDate(); day++) {
      days.push(new Date(year, month, day));
    }

    return days;
  }, [currentMonth]);

  const goToPreviousMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth((prev) => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
  };

  const formatDateString = (date: Date): string => {
    return date.toISOString().split("T")[0];
  };

  const isToday = (date: Date): boolean => {
    const today = new Date();
    return (
      date.getDate() === today.getDate() &&
      date.getMonth() === today.getMonth() &&
      date.getFullYear() === today.getFullYear()
    );
  };

  const isPast = (date: Date): boolean => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return date < today;
  };

  const monthName = currentMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  const canGoPrevious = useMemo(() => {
    const now = new Date();
    return (
      currentMonth.getFullYear() > now.getFullYear() ||
      (currentMonth.getFullYear() === now.getFullYear() &&
        currentMonth.getMonth() > now.getMonth())
    );
  }, [currentMonth]);

  return (
    <div className="bg-white rounded-xl border border-[var(--paper-lines)] p-6 shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <button
          onClick={goToPreviousMonth}
          disabled={!canGoPrevious}
          className="p-2 rounded-lg hover:bg-[var(--paper-cream)] disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
        >
          <ChevronLeft className="w-5 h-5 text-[var(--ink-faded)]" />
        </button>
        <h3 className="font-display text-lg font-semibold text-[var(--ink-black)]">
          {monthName}
        </h3>
        <button
          onClick={goToNextMonth}
          className="p-2 rounded-lg hover:bg-[var(--paper-cream)] transition-colors"
        >
          <ChevronRight className="w-5 h-5 text-[var(--ink-faded)]" />
        </button>
      </div>

      {/* Day names */}
      <div className="grid grid-cols-7 gap-1 mb-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
          <div
            key={day}
            className="text-center font-body text-xs font-medium text-[var(--ink-faded)] py-2"
          >
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {daysInMonth.map((date, index) => {
          if (!date) {
            return <div key={`empty-${index}`} className="aspect-square" />;
          }

          const dateString = formatDateString(date);
          const isAvailable = availableDateSet.has(dateString);
          const isSelected = selectedDate === dateString;
          const past = isPast(date);
          const today = isToday(date);

          return (
            <button
              key={dateString}
              onClick={() => isAvailable && !past && onSelectDate(dateString)}
              disabled={!isAvailable || past}
              className={`
                aspect-square rounded-lg font-body text-sm transition-all
                flex items-center justify-center relative
                ${
                  isSelected
                    ? "bg-[var(--grass-medium)] text-white font-semibold shadow-md"
                    : isAvailable && !past
                    ? "bg-[var(--grass-light)]/30 text-[var(--grass-dark)] hover:bg-[var(--grass-light)]/50 cursor-pointer font-medium"
                    : past
                    ? "text-[var(--ink-faded)]/40 cursor-not-allowed"
                    : "text-[var(--ink-faded)] cursor-not-allowed"
                }
                ${today && !isSelected ? "ring-2 ring-[var(--grass-medium)]/50" : ""}
              `}
            >
              {date.getDate()}
              {isAvailable && !past && !isSelected && (
                <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-[var(--grass-medium)]" />
              )}
            </button>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 pt-4 border-t border-[var(--paper-lines)] flex items-center justify-center gap-6 text-xs font-body text-[var(--ink-faded)]">
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-[var(--grass-light)]/30" />
          <span>Available</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-3 h-3 rounded bg-[var(--grass-medium)]" />
          <span>Selected</span>
        </div>
      </div>
    </div>
  );
}
