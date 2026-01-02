"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";
import SessionCard from "@/components/tutoring/SessionCard";
import { Calendar, Plus, Clock, Video, Loader2 } from "lucide-react";
import Link from "next/link";

type BookingWithDetails = {
  _id: Id<"tutoringBookings">;
  status: string;
  zoomLink?: string;
  notes?: string;
  slot?: {
    startTime: number;
    endTime: number;
  } | null;
  tutor?: {
    name: string;
    avatarUrl?: string;
  } | null;
};

export default function TutoringPage() {
  const { user } = useUser();

  const upcomingSessions = useQuery(
    api.tutoring.getUpcomingSessions,
    user?.id ? { studentId: user.id } : "skip"
  );

  const allBookings = useQuery(
    api.tutoring.getStudentBookings,
    user?.id ? { studentId: user.id } : "skip"
  );

  const tutors = useQuery(api.tutoring.getActiveTutors);
  const tutor = tutors?.[0];

  const pastSessions = allBookings?.filter(
    (b: { status: string; slot?: { startTime: number } | null }) =>
      b.status === "completed" || (b.slot && b.slot.startTime < Date.now() && b.status === "confirmed")
  );

  const formatPrice = (cents: number): string => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(cents / 100);
  };

  if (!user) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[var(--grass-medium)]" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8 px-4">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="font-display text-3xl font-bold text-[var(--ink-black)]">
            Tutoring
          </h1>
          <p className="font-body text-[var(--ink-faded)] mt-2">
            Book 1-on-1 sessions with expert SAT tutors
          </p>
        </div>
        <Link
          href="/dashboard/tutoring/book"
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-[var(--grass-medium)] text-white rounded-lg font-body font-semibold hover:bg-[var(--grass-dark)] transition-colors shadow-md hover:shadow-lg"
        >
          <Plus className="w-4 h-4" />
          Book Session
        </Link>
      </div>

      {/* Tutor Info Card */}
      {tutor && (
        <div className="bg-gradient-to-r from-[var(--grass-light)]/20 to-[var(--grass-medium)]/10 rounded-xl border border-[var(--grass-light)]/30 p-6 mb-8">
          <div className="flex flex-col md:flex-row md:items-center gap-6">
            <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-md">
              {tutor.avatarUrl ? (
                <img
                  src={tutor.avatarUrl}
                  alt={tutor.name}
                  className="w-20 h-20 rounded-full object-cover"
                />
              ) : (
                <span className="font-display text-2xl font-bold text-[var(--grass-medium)]">
                  {tutor.name[0]}
                </span>
              )}
            </div>
            <div className="flex-1">
              <h2 className="font-display text-xl font-bold text-[var(--ink-black)]">
                {tutor.name}
              </h2>
              {tutor.bio && (
                <p className="font-body text-[var(--ink-faded)] mt-1">{tutor.bio}</p>
              )}
              <div className="flex flex-wrap items-center gap-4 mt-3">
                <div className="flex items-center gap-2 text-[var(--grass-dark)]">
                  <Clock className="w-4 h-4" />
                  <span className="font-body text-sm">
                    {tutor.sessionDurationMinutes} min sessions
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[var(--grass-dark)]">
                  <Video className="w-4 h-4" />
                  <span className="font-body text-sm">Via Zoom</span>
                </div>
                <div className="font-display font-bold text-[var(--grass-dark)]">
                  {formatPrice(tutor.sessionPrice)}/session
                </div>
              </div>
            </div>
            <Link
              href="/dashboard/tutoring/book"
              className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--grass-medium)] text-white rounded-lg font-body font-semibold hover:bg-[var(--grass-dark)] transition-colors"
            >
              <Calendar className="w-4 h-4" />
              Book Now
            </Link>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* Upcoming Sessions */}
        <div>
          <h2 className="font-display text-lg font-semibold text-[var(--ink-black)] mb-4">
            Upcoming Sessions
          </h2>
          {upcomingSessions === undefined ? (
            <div className="bg-white rounded-xl border border-[var(--paper-lines)] p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--grass-medium)] mx-auto" />
            </div>
          ) : upcomingSessions.length === 0 ? (
            <div className="bg-white rounded-xl border border-[var(--paper-lines)] p-8 text-center">
              <Calendar className="w-12 h-12 mx-auto text-[var(--ink-faded)]/30 mb-3" />
              <p className="font-body text-[var(--ink-faded)] mb-4">
                No upcoming sessions
              </p>
              <Link
                href="/dashboard/tutoring/book"
                className="inline-flex items-center gap-2 text-[var(--grass-medium)] hover:text-[var(--grass-dark)] font-body font-medium"
              >
                <Plus className="w-4 h-4" />
                Book your first session
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {upcomingSessions.map((booking: BookingWithDetails) => (
                <SessionCard key={booking._id} booking={booking} />
              ))}
            </div>
          )}
        </div>

        {/* Past Sessions */}
        <div>
          <h2 className="font-display text-lg font-semibold text-[var(--ink-black)] mb-4">
            Past Sessions
          </h2>
          {allBookings === undefined ? (
            <div className="bg-white rounded-xl border border-[var(--paper-lines)] p-8 text-center">
              <Loader2 className="w-6 h-6 animate-spin text-[var(--grass-medium)] mx-auto" />
            </div>
          ) : !pastSessions || pastSessions.length === 0 ? (
            <div className="bg-white rounded-xl border border-[var(--paper-lines)] p-8 text-center">
              <Clock className="w-12 h-12 mx-auto text-[var(--ink-faded)]/30 mb-3" />
              <p className="font-body text-[var(--ink-faded)]">
                No past sessions yet
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pastSessions.map((booking: BookingWithDetails) => (
                <SessionCard key={booking._id} booking={booking} showActions={false} />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
