"use client";

import { useState, useMemo } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";
import CalendarPicker from "@/components/tutoring/CalendarPicker";
import TimeSlotPicker from "@/components/tutoring/TimeSlotPicker";
import { ArrowLeft, Loader2, User, DollarSign, Clock, AlertCircle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";

export default function BookTutoringPage() {
  const { user } = useUser();
  const searchParams = useSearchParams();
  const wasCancelled = searchParams.get("cancelled") === "true";

  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [selectedSlotId, setSelectedSlotId] = useState<Id<"tutoringSlots"> | null>(null);
  const [notes, setNotes] = useState("");
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Get active tutors
  const tutors = useQuery(api.tutoring.getActiveTutors);
  const tutor = tutors?.[0]; // For now, use the first tutor

  // Calculate date range for next 60 days
  const dateRange = useMemo(() => {
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date(start);
    end.setDate(end.getDate() + 60);
    return { start: start.getTime(), end: end.getTime() };
  }, []);

  // Get available dates for the calendar
  const availableDates = useQuery(
    api.tutoring.getAvailableDates,
    tutor
      ? {
          tutorId: tutor._id,
          startDate: dateRange.start,
          endDate: dateRange.end,
        }
      : "skip"
  );

  // Get available slots for selected date
  const dayRange = useMemo(() => {
    if (!selectedDate) return null;
    const start = new Date(selectedDate);
    start.setHours(0, 0, 0, 0);
    const end = new Date(selectedDate);
    end.setHours(23, 59, 59, 999);
    return { start: start.getTime(), end: end.getTime() };
  }, [selectedDate]);

  const availableSlots = useQuery(
    api.tutoring.getAvailableSlots,
    tutor && dayRange
      ? {
          tutorId: tutor._id,
          startDate: dayRange.start,
          endDate: dayRange.end,
        }
      : "skip"
  );

  const selectedSlot = useMemo(() => {
    return availableSlots?.find((s: { _id: Id<"tutoringSlots"> }) => s._id === selectedSlotId);
  }, [availableSlots, selectedSlotId]);

  const handleCheckout = async () => {
    if (!selectedSlotId || !user) return;

    setIsCheckingOut(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slotId: selectedSlotId,
          notes: notes.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      // Redirect to Stripe Checkout
      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsCheckingOut(false);
    }
  };

  const formatPrice = (cents: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  if (!tutors) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--grass-medium)]" />
      </div>
    );
  }

  if (!tutor) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <AlertCircle className="w-16 h-16 mx-auto text-[var(--ink-faded)]/30 mb-4" />
        <h2 className="font-display text-2xl font-bold text-[var(--ink-black)] mb-2">
          No Tutors Available
        </h2>
        <p className="font-body text-[var(--ink-faded)] mb-6">
          Tutoring sessions are not currently available. Please check back later.
        </p>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-[var(--grass-medium)] hover:text-[var(--grass-dark)] font-body"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="mb-8">
        <Link
          href="/dashboard/tutoring"
          className="inline-flex items-center gap-2 text-[var(--ink-faded)] hover:text-[var(--grass-medium)] font-body mb-4 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Tutoring
        </Link>
        <h1 className="font-display text-3xl font-bold text-[var(--ink-black)]">
          Book a Tutoring Session
        </h1>
        <p className="font-body text-[var(--ink-faded)] mt-2">
          Select a date and time that works for you
        </p>
      </div>

      {/* Cancelled notice */}
      {wasCancelled && (
        <div className="mb-6 p-4 bg-[var(--sunflower)]/10 border border-[var(--sunflower)]/30 rounded-xl">
          <p className="font-body text-[var(--wood-dark)]">
            Your checkout was cancelled. No payment was processed. You can try booking again.
          </p>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Left: Calendar and Time Slots */}
        <div className="lg:col-span-2 space-y-6">
          {/* Calendar */}
          <div>
            <h2 className="font-display text-lg font-semibold text-[var(--ink-black)] mb-4">
              1. Select a Date
            </h2>
            <CalendarPicker
              availableDates={availableDates || []}
              selectedDate={selectedDate}
              onSelectDate={(date) => {
                setSelectedDate(date);
                setSelectedSlotId(null); // Reset slot when date changes
              }}
            />
          </div>

          {/* Time Slots */}
          {selectedDate && (
            <div>
              <h2 className="font-display text-lg font-semibold text-[var(--ink-black)] mb-4">
                2. Select a Time
              </h2>
              <TimeSlotPicker
                slots={availableSlots || []}
                selectedSlotId={selectedSlotId}
                onSelectSlot={setSelectedSlotId}
                isLoading={!availableSlots}
              />
            </div>
          )}

          {/* Notes */}
          {selectedSlotId && (
            <div>
              <h2 className="font-display text-lg font-semibold text-[var(--ink-black)] mb-4">
                3. Add Notes (Optional)
              </h2>
              <div className="bg-white rounded-xl border border-[var(--paper-lines)] p-6 shadow-sm">
                <label className="block font-body text-sm font-medium text-[var(--ink-black)] mb-2">
                  What would you like to focus on?
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="e.g., I'm struggling with algebra word problems and need help with test-taking strategies..."
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg border border-[var(--paper-lines)] font-body text-[var(--ink-black)] placeholder:text-[var(--ink-faded)]/50 focus:outline-none focus:ring-2 focus:ring-[var(--grass-medium)]/50 focus:border-[var(--grass-medium)] resize-none"
                />
              </div>
            </div>
          )}
        </div>

        {/* Right: Booking Summary */}
        <div className="lg:col-span-1">
          <div className="sticky top-24">
            <div className="bg-white rounded-xl border border-[var(--paper-lines)] p-6 shadow-sm">
              <h2 className="font-display text-lg font-semibold text-[var(--ink-black)] mb-6">
                Booking Summary
              </h2>

              {/* Tutor Info */}
              <div className="flex items-center gap-3 pb-4 border-b border-[var(--paper-lines)]">
                <div className="w-12 h-12 rounded-full bg-[var(--grass-light)]/30 flex items-center justify-center">
                  {tutor.avatarUrl ? (
                    <img
                      src={tutor.avatarUrl}
                      alt={tutor.name}
                      className="w-12 h-12 rounded-full object-cover"
                    />
                  ) : (
                    <User className="w-6 h-6 text-[var(--grass-medium)]" />
                  )}
                </div>
                <div>
                  <p className="font-display font-semibold text-[var(--ink-black)]">
                    {tutor.name}
                  </p>
                  <p className="font-body text-sm text-[var(--ink-faded)]">SAT Tutor</p>
                </div>
              </div>

              {/* Session Details */}
              <div className="py-4 space-y-3 border-b border-[var(--paper-lines)]">
                <div className="flex items-center gap-3 text-[var(--ink-faded)]">
                  <Clock className="w-4 h-4" />
                  <span className="font-body text-sm">
                    {tutor.sessionDurationMinutes} minutes
                  </span>
                </div>
                {selectedDate && (
                  <div className="flex items-center gap-3 text-[var(--ink-black)]">
                    <span className="font-body text-sm font-medium">
                      {new Date(selectedDate).toLocaleDateString("en-US", {
                        weekday: "long",
                        month: "long",
                        day: "numeric",
                      })}
                    </span>
                  </div>
                )}
                {selectedSlot && (
                  <div className="flex items-center gap-3 text-[var(--ink-black)]">
                    <span className="font-body text-sm font-medium">
                      {new Date(selectedSlot.startTime).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}{" "}
                      -{" "}
                      {new Date(selectedSlot.endTime).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                        hour12: true,
                      })}
                    </span>
                  </div>
                )}
              </div>

              {/* Price */}
              <div className="py-4 flex items-center justify-between">
                <span className="font-display text-lg font-semibold text-[var(--ink-black)]">
                  Total
                </span>
                <span className="font-display text-2xl font-bold text-[var(--grass-dark)]">
                  {formatPrice(tutor.sessionPrice)}
                </span>
              </div>

              {/* Error */}
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                  <p className="font-body text-sm text-red-600">{error}</p>
                </div>
              )}

              {/* Checkout Button */}
              <button
                onClick={handleCheckout}
                disabled={!selectedSlotId || isCheckingOut}
                className={`
                  w-full py-3 rounded-lg font-body font-semibold transition-all
                  flex items-center justify-center gap-2
                  ${
                    selectedSlotId && !isCheckingOut
                      ? "bg-[var(--grass-medium)] text-white hover:bg-[var(--grass-dark)] shadow-md hover:shadow-lg"
                      : "bg-[var(--paper-lines)] text-[var(--ink-faded)] cursor-not-allowed"
                  }
                `}
              >
                {isCheckingOut ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <DollarSign className="w-4 h-4" />
                    Book for {formatPrice(tutor.sessionPrice)}
                  </>
                )}
              </button>

              {!selectedSlotId && (
                <p className="mt-3 font-body text-xs text-center text-[var(--ink-faded)]">
                  Select a date and time to continue
                </p>
              )}

              {/* Security note */}
              <p className="mt-4 font-body text-xs text-center text-[var(--ink-faded)]">
                Secure payment powered by Stripe
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
