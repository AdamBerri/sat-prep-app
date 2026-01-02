"use client";

import { useSearchParams } from "next/navigation";
import { useQuery } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { CheckCircle, Calendar, Clock, Video, Download, ArrowRight, Loader2 } from "lucide-react";
import Link from "next/link";

export default function BookingSuccessPage() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");

  const booking = useQuery(
    api.tutoring.getBookingByStripeSession,
    sessionId ? { stripeCheckoutSessionId: sessionId } : "skip"
  );

  const formatDate = (timestamp: number): string => {
    return new Date(timestamp).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatTime = (timestamp: number): string => {
    return new Date(timestamp).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const generateICSFile = () => {
    if (!booking?.slot) return;

    const startDate = new Date(booking.slot.startTime);
    const endDate = new Date(booking.slot.endTime);

    const formatICSDate = (date: Date): string => {
      return date.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
    };

    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//1600Club//Tutoring//EN
BEGIN:VEVENT
DTSTART:${formatICSDate(startDate)}
DTEND:${formatICSDate(endDate)}
SUMMARY:SAT Tutoring Session with ${booking.tutor?.name || "Tutor"}
DESCRIPTION:1-on-1 SAT tutoring session\\n\\nZoom Link: ${booking.zoomLink || "Will be provided"}${booking.notes ? `\\n\\nYour notes: ${booking.notes}` : ""}
LOCATION:${booking.zoomLink || "Zoom (link will be provided)"}
STATUS:CONFIRMED
END:VEVENT
END:VCALENDAR`;

    const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "tutoring-session.ics";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  if (!sessionId) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <h1 className="font-display text-2xl font-bold text-[var(--ink-black)] mb-4">
          Invalid Session
        </h1>
        <p className="font-body text-[var(--ink-faded)] mb-6">
          No booking session found. Please try booking again.
        </p>
        <Link
          href="/dashboard/tutoring/book"
          className="inline-flex items-center gap-2 px-6 py-3 bg-[var(--grass-medium)] text-white rounded-lg font-body font-semibold hover:bg-[var(--grass-dark)] transition-colors"
        >
          Book a Session
        </Link>
      </div>
    );
  }

  if (booking === undefined) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--grass-medium)] mx-auto mb-4" />
          <p className="font-body text-[var(--ink-faded)]">Confirming your booking...</p>
        </div>
      </div>
    );
  }

  if (!booking) {
    return (
      <div className="max-w-2xl mx-auto py-12 px-4 text-center">
        <Loader2 className="w-12 h-12 animate-spin text-[var(--grass-medium)] mx-auto mb-4" />
        <h1 className="font-display text-2xl font-bold text-[var(--ink-black)] mb-4">
          Processing Payment...
        </h1>
        <p className="font-body text-[var(--ink-faded)]">
          Please wait while we confirm your booking. This may take a few seconds.
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto py-12 px-4">
      {/* Success Icon */}
      <div className="text-center mb-8">
        <div className="w-20 h-20 mx-auto mb-6 bg-[var(--grass-light)]/30 rounded-full flex items-center justify-center">
          <CheckCircle className="w-12 h-12 text-[var(--grass-medium)]" />
        </div>
        <h1 className="font-display text-3xl font-bold text-[var(--ink-black)] mb-2">
          Booking Confirmed!
        </h1>
        <p className="font-body text-[var(--ink-faded)]">
          Your tutoring session has been scheduled successfully.
        </p>
      </div>

      {/* Session Details Card */}
      <div className="bg-white rounded-xl border border-[var(--paper-lines)] p-6 shadow-sm mb-6">
        <h2 className="font-display text-lg font-semibold text-[var(--ink-black)] mb-4">
          Session Details
        </h2>

        <div className="space-y-4">
          {/* Tutor */}
          <div className="flex items-center gap-3 pb-4 border-b border-[var(--paper-lines)]">
            <div className="w-12 h-12 rounded-full bg-[var(--grass-light)]/30 flex items-center justify-center">
              {booking.tutor?.avatarUrl ? (
                <img
                  src={booking.tutor.avatarUrl}
                  alt={booking.tutor.name}
                  className="w-12 h-12 rounded-full object-cover"
                />
              ) : (
                <span className="font-display text-lg font-bold text-[var(--grass-medium)]">
                  {booking.tutor?.name?.[0] || "T"}
                </span>
              )}
            </div>
            <div>
              <p className="font-display font-semibold text-[var(--ink-black)]">
                {booking.tutor?.name || "Tutor"}
              </p>
              <p className="font-body text-sm text-[var(--ink-faded)]">
                1-on-1 SAT Tutoring
              </p>
            </div>
          </div>

          {/* Date & Time */}
          {booking.slot && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-[var(--grass-medium)]" />
                <span className="font-body text-[var(--ink-black)]">
                  {formatDate(booking.slot.startTime)}
                </span>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-[var(--grass-medium)]" />
                <span className="font-body text-[var(--ink-black)]">
                  {formatTime(booking.slot.startTime)} - {formatTime(booking.slot.endTime)}
                </span>
              </div>
            </div>
          )}

          {/* Zoom Link */}
          {booking.zoomLink && (
            <div className="pt-4 border-t border-[var(--paper-lines)]">
              <div className="flex items-center gap-3 mb-3">
                <Video className="w-5 h-5 text-[var(--grass-medium)]" />
                <span className="font-body font-medium text-[var(--ink-black)]">
                  Zoom Meeting Link
                </span>
              </div>
              <a
                href={booking.zoomLink}
                target="_blank"
                rel="noopener noreferrer"
                className="block w-full p-3 bg-[var(--paper-cream)] rounded-lg font-body text-sm text-[var(--grass-dark)] hover:bg-[var(--grass-light)]/30 transition-colors break-all"
              >
                {booking.zoomLink}
              </a>
            </div>
          )}

          {/* Notes */}
          {booking.notes && (
            <div className="pt-4 border-t border-[var(--paper-lines)]">
              <p className="font-body text-sm text-[var(--ink-faded)] mb-1">Your notes:</p>
              <p className="font-body text-[var(--ink-black)]">{booking.notes}</p>
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="space-y-3">
        <button
          onClick={generateICSFile}
          className="w-full flex items-center justify-center gap-2 py-3 bg-[var(--grass-medium)] text-white rounded-lg font-body font-semibold hover:bg-[var(--grass-dark)] transition-colors"
        >
          <Download className="w-4 h-4" />
          Add to Calendar
        </button>

        {booking.zoomLink && (
          <a
            href={booking.zoomLink}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full flex items-center justify-center gap-2 py-3 border border-[var(--paper-lines)] rounded-lg font-body font-semibold text-[var(--ink-black)] hover:bg-[var(--paper-cream)] transition-colors"
          >
            <Video className="w-4 h-4" />
            Open Zoom Link
          </a>
        )}

        <Link
          href="/dashboard/tutoring"
          className="w-full flex items-center justify-center gap-2 py-3 text-[var(--grass-medium)] font-body font-medium hover:text-[var(--grass-dark)] transition-colors"
        >
          View All Sessions
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Confirmation Email Note */}
      <p className="mt-8 text-center font-body text-sm text-[var(--ink-faded)]">
        A confirmation email has been sent to your email address.
      </p>
    </div>
  );
}
