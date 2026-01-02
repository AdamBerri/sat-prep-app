"use client";

import { Calendar, Clock, Video, User } from "lucide-react";
import Link from "next/link";
import { Id } from "../../../convex/_generated/dataModel";

interface SessionCardProps {
  booking: {
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
  showActions?: boolean;
}

export default function SessionCard({ booking, showActions = true }: SessionCardProps) {
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

  const isUpcoming = booking.slot && booking.slot.startTime > Date.now();
  const isInProgress =
    booking.slot &&
    booking.slot.startTime <= Date.now() &&
    booking.slot.endTime > Date.now();

  const getStatusBadge = () => {
    if (isInProgress) {
      return (
        <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--sunflower)]/20 text-[var(--wood-dark)]">
          In Progress
        </span>
      );
    }
    switch (booking.status) {
      case "confirmed":
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--grass-light)]/30 text-[var(--grass-dark)]">
            Confirmed
          </span>
        );
      case "completed":
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-[var(--paper-lines)] text-[var(--ink-faded)]">
            Completed
          </span>
        );
      case "cancelled":
        return (
          <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-600">
            Cancelled
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="bg-white rounded-xl border border-[var(--paper-lines)] p-5 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-full bg-[var(--grass-light)]/30 flex items-center justify-center">
            {booking.tutor?.avatarUrl ? (
              <img
                src={booking.tutor.avatarUrl}
                alt={booking.tutor.name}
                className="w-12 h-12 rounded-full object-cover"
              />
            ) : (
              <User className="w-6 h-6 text-[var(--grass-medium)]" />
            )}
          </div>
          <div>
            <h4 className="font-display font-semibold text-[var(--ink-black)]">
              {booking.tutor?.name || "Tutor"}
            </h4>
            <p className="font-body text-sm text-[var(--ink-faded)]">
              1-on-1 SAT Tutoring
            </p>
          </div>
        </div>
        {getStatusBadge()}
      </div>

      {booking.slot && (
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-[var(--ink-faded)]">
            <Calendar className="w-4 h-4" />
            <span className="font-body text-sm">
              {formatDate(booking.slot.startTime)}
            </span>
          </div>
          <div className="flex items-center gap-2 text-[var(--ink-faded)]">
            <Clock className="w-4 h-4" />
            <span className="font-body text-sm">
              {formatTime(booking.slot.startTime)} - {formatTime(booking.slot.endTime)}
            </span>
          </div>
        </div>
      )}

      {booking.notes && (
        <div className="bg-[var(--paper-cream)] rounded-lg p-3 mb-4">
          <p className="font-body text-sm text-[var(--ink-faded)]">
            <span className="font-medium text-[var(--ink-black)]">Your notes:</span>{" "}
            {booking.notes}
          </p>
        </div>
      )}

      {showActions && (
        <div className="flex items-center gap-3">
          {booking.zoomLink && (isUpcoming || isInProgress) && (
            <a
              href={booking.zoomLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`
                flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-body font-medium transition-colors
                ${
                  isInProgress
                    ? "bg-[var(--grass-medium)] text-white hover:bg-[var(--grass-dark)]"
                    : "bg-[var(--grass-light)]/30 text-[var(--grass-dark)] hover:bg-[var(--grass-light)]/50"
                }
              `}
            >
              <Video className="w-4 h-4" />
              {isInProgress ? "Join Now" : "Join Zoom"}
            </a>
          )}
          <Link
            href={`/dashboard/tutoring/${booking._id}`}
            className="flex-1 text-center px-4 py-2.5 rounded-lg font-body font-medium border border-[var(--paper-lines)] text-[var(--ink-faded)] hover:bg-[var(--paper-cream)] transition-colors"
          >
            View Details
          </Link>
        </div>
      )}
    </div>
  );
}
