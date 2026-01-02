import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { Id } from "./_generated/dataModel";

// ─────────────────────────────────────────────────────────
// QUERIES
// ─────────────────────────────────────────────────────────

// Get all active tutors
export const getActiveTutors = query({
  args: {},
  handler: async (ctx) => {
    return await ctx.db
      .query("tutors")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();
  },
});

// Get a specific tutor by ID
export const getTutor = query({
  args: { tutorId: v.id("tutors") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.tutorId);
  },
});

// Get available slots for a tutor within a date range
export const getAvailableSlots = query({
  args: {
    tutorId: v.optional(v.id("tutors")),
    startDate: v.number(), // Unix timestamp for start of range
    endDate: v.number(), // Unix timestamp for end of range
  },
  handler: async (ctx, args) => {
    // If no tutorId specified, get slots from all active tutors
    let slots;
    if (args.tutorId) {
      const tutorId = args.tutorId;
      slots = await ctx.db
        .query("tutoringSlots")
        .withIndex("by_tutor_and_start", (q) =>
          q.eq("tutorId", tutorId).gte("startTime", args.startDate)
        )
        .filter((q) =>
          q.and(
            q.lte(q.field("startTime"), args.endDate),
            q.eq(q.field("status"), "available")
          )
        )
        .collect();
    } else {
      slots = await ctx.db
        .query("tutoringSlots")
        .withIndex("by_start_time", (q) => q.gte("startTime", args.startDate))
        .filter((q) =>
          q.and(
            q.lte(q.field("startTime"), args.endDate),
            q.eq(q.field("status"), "available")
          )
        )
        .collect();
    }

    // Fetch tutor info for each slot
    const slotsWithTutors = await Promise.all(
      slots.map(async (slot) => {
        const tutor = await ctx.db.get(slot.tutorId);
        return { ...slot, tutor };
      })
    );

    return slotsWithTutors;
  },
});

// Get dates that have available slots (for calendar highlighting)
export const getAvailableDates = query({
  args: {
    tutorId: v.optional(v.id("tutors")),
    startDate: v.number(),
    endDate: v.number(),
  },
  handler: async (ctx, args) => {
    let slots;
    if (args.tutorId) {
      const tutorId = args.tutorId;
      slots = await ctx.db
        .query("tutoringSlots")
        .withIndex("by_tutor_and_start", (q) =>
          q.eq("tutorId", tutorId).gte("startTime", args.startDate)
        )
        .filter((q) =>
          q.and(
            q.lte(q.field("startTime"), args.endDate),
            q.eq(q.field("status"), "available")
          )
        )
        .collect();
    } else {
      slots = await ctx.db
        .query("tutoringSlots")
        .withIndex("by_start_time", (q) => q.gte("startTime", args.startDate))
        .filter((q) =>
          q.and(
            q.lte(q.field("startTime"), args.endDate),
            q.eq(q.field("status"), "available")
          )
        )
        .collect();
    }

    // Extract unique dates (in YYYY-MM-DD format based on local time)
    const dates = new Set<string>();
    slots.forEach((slot) => {
      const date = new Date(slot.startTime);
      dates.add(date.toISOString().split("T")[0]);
    });

    return Array.from(dates);
  },
});

// Get a student's bookings
export const getStudentBookings = query({
  args: {
    studentId: v.string(),
    status: v.optional(
      v.union(
        v.literal("pending_payment"),
        v.literal("confirmed"),
        v.literal("completed"),
        v.literal("cancelled"),
        v.literal("no_show")
      )
    ),
  },
  handler: async (ctx, args) => {
    let bookingsQuery = ctx.db
      .query("tutoringBookings")
      .withIndex("by_student", (q) => q.eq("studentId", args.studentId));

    const bookings = await bookingsQuery.collect();

    // Filter by status if specified
    const filtered = args.status
      ? bookings.filter((b) => b.status === args.status)
      : bookings;

    // Fetch slot and tutor info for each booking
    const bookingsWithDetails = await Promise.all(
      filtered.map(async (booking) => {
        const slot = await ctx.db.get(booking.slotId);
        const tutor = await ctx.db.get(booking.tutorId);
        return { ...booking, slot, tutor };
      })
    );

    // Sort by slot start time
    return bookingsWithDetails.sort((a, b) => {
      const aTime = a.slot?.startTime ?? 0;
      const bTime = b.slot?.startTime ?? 0;
      return aTime - bTime;
    });
  },
});

// Get upcoming confirmed sessions for a student
export const getUpcomingSessions = query({
  args: { studentId: v.string() },
  handler: async (ctx, args) => {
    const now = Date.now();

    const bookings = await ctx.db
      .query("tutoringBookings")
      .withIndex("by_student_and_status", (q) =>
        q.eq("studentId", args.studentId).eq("status", "confirmed")
      )
      .collect();

    // Fetch slot and tutor info, filter for future sessions
    const upcomingSessions = await Promise.all(
      bookings.map(async (booking) => {
        const slot = await ctx.db.get(booking.slotId);
        if (!slot || slot.startTime < now) return null;
        const tutor = await ctx.db.get(booking.tutorId);
        return { ...booking, slot, tutor };
      })
    );

    return upcomingSessions
      .filter((s): s is NonNullable<typeof s> => s !== null)
      .sort((a, b) => a.slot.startTime - b.slot.startTime);
  },
});

// Get a specific booking by ID
export const getBooking = query({
  args: { bookingId: v.id("tutoringBookings") },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) return null;

    const slot = await ctx.db.get(booking.slotId);
    const tutor = await ctx.db.get(booking.tutorId);

    return { ...booking, slot, tutor };
  },
});

// Get booking by Stripe checkout session ID
export const getBookingByStripeSession = query({
  args: { stripeCheckoutSessionId: v.string() },
  handler: async (ctx, args) => {
    const booking = await ctx.db
      .query("tutoringBookings")
      .withIndex("by_stripe_session", (q) =>
        q.eq("stripeCheckoutSessionId", args.stripeCheckoutSessionId)
      )
      .first();

    if (!booking) return null;

    const slot = await ctx.db.get(booking.slotId);
    const tutor = await ctx.db.get(booking.tutorId);

    return { ...booking, slot, tutor };
  },
});

// ─────────────────────────────────────────────────────────
// MUTATIONS
// ─────────────────────────────────────────────────────────

// Create a pending booking (before payment)
export const createPendingBooking = mutation({
  args: {
    slotId: v.id("tutoringSlots"),
    studentId: v.string(),
    studentEmail: v.string(),
    studentName: v.optional(v.string()),
    notes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Get the slot
    const slot = await ctx.db.get(args.slotId);
    if (!slot) {
      throw new Error("Slot not found");
    }

    // Check if slot is still available
    if (slot.status !== "available") {
      throw new Error("This time slot is no longer available");
    }

    // Get the tutor for pricing
    const tutor = await ctx.db.get(slot.tutorId);
    if (!tutor) {
      throw new Error("Tutor not found");
    }

    // Update slot to pending with 15 minute expiry
    const pendingExpiry = Date.now() + 15 * 60 * 1000;
    await ctx.db.patch(args.slotId, {
      status: "pending",
      pendingExpiry,
    });

    // Create the booking
    const bookingId = await ctx.db.insert("tutoringBookings", {
      slotId: args.slotId,
      tutorId: slot.tutorId,
      studentId: args.studentId,
      studentEmail: args.studentEmail,
      studentName: args.studentName,
      amountPaid: tutor.sessionPrice,
      paymentStatus: "pending",
      notes: args.notes,
      status: "pending_payment",
      createdAt: Date.now(),
    });

    return {
      bookingId,
      amount: tutor.sessionPrice,
      tutorName: tutor.name,
      slotStartTime: slot.startTime,
      slotEndTime: slot.endTime,
    };
  },
});

// Update booking with Stripe session ID
export const setStripeSessionId = mutation({
  args: {
    bookingId: v.id("tutoringBookings"),
    stripeCheckoutSessionId: v.string(),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.bookingId, {
      stripeCheckoutSessionId: args.stripeCheckoutSessionId,
    });
  },
});

// Confirm booking after successful payment (called by webhook)
export const confirmBooking = mutation({
  args: {
    stripeCheckoutSessionId: v.string(),
    stripePaymentIntentId: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Find the booking
    const booking = await ctx.db
      .query("tutoringBookings")
      .withIndex("by_stripe_session", (q) =>
        q.eq("stripeCheckoutSessionId", args.stripeCheckoutSessionId)
      )
      .first();

    if (!booking) {
      throw new Error("Booking not found for this checkout session");
    }

    // Get the tutor for Zoom link
    const tutor = await ctx.db.get(booking.tutorId);

    // Update booking to confirmed
    await ctx.db.patch(booking._id, {
      paymentStatus: "completed",
      stripePaymentIntentId: args.stripePaymentIntentId,
      status: "confirmed",
      confirmedAt: Date.now(),
      zoomLink: tutor?.zoomPersonalMeetingUrl,
    });

    // Update slot to booked
    await ctx.db.patch(booking.slotId, {
      status: "booked",
      pendingExpiry: undefined,
    });

    return booking._id;
  },
});

// Cancel a booking
export const cancelBooking = mutation({
  args: {
    bookingId: v.id("tutoringBookings"),
    studentId: v.string(),
  },
  handler: async (ctx, args) => {
    const booking = await ctx.db.get(args.bookingId);
    if (!booking) {
      throw new Error("Booking not found");
    }

    // Verify ownership
    if (booking.studentId !== args.studentId) {
      throw new Error("You can only cancel your own bookings");
    }

    // Check if cancellation is allowed (e.g., 24 hours before)
    const slot = await ctx.db.get(booking.slotId);
    if (slot) {
      const hoursUntilSession = (slot.startTime - Date.now()) / (1000 * 60 * 60);
      if (hoursUntilSession < 24) {
        throw new Error(
          "Cancellations must be made at least 24 hours before the session"
        );
      }
    }

    // Update booking
    await ctx.db.patch(args.bookingId, {
      status: "cancelled",
      cancelledAt: Date.now(),
    });

    // Release the slot back to available
    if (slot) {
      await ctx.db.patch(booking.slotId, {
        status: "available",
        pendingExpiry: undefined,
      });
    }

    return { success: true };
  },
});

// Expire pending bookings (called by scheduled job)
export const expirePendingBookings = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();

    // Find pending slots that have expired
    const pendingSlots = await ctx.db
      .query("tutoringSlots")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    for (const slot of pendingSlots) {
      if (slot.pendingExpiry && slot.pendingExpiry < now) {
        // Release the slot
        await ctx.db.patch(slot._id, {
          status: "available",
          pendingExpiry: undefined,
        });

        // Find and update the associated booking
        const booking = await ctx.db
          .query("tutoringBookings")
          .withIndex("by_slot", (q) => q.eq("slotId", slot._id))
          .filter((q) => q.eq(q.field("status"), "pending_payment"))
          .first();

        if (booking) {
          await ctx.db.patch(booking._id, {
            status: "cancelled",
            paymentStatus: "failed",
            cancelledAt: now,
          });
        }
      }
    }
  },
});

// ─────────────────────────────────────────────────────────
// ADMIN MUTATIONS
// ─────────────────────────────────────────────────────────

// Create or update a tutor
export const upsertTutor = mutation({
  args: {
    tutorId: v.optional(v.id("tutors")),
    userId: v.optional(v.string()),
    name: v.string(),
    email: v.string(),
    bio: v.optional(v.string()),
    avatarUrl: v.optional(v.string()),
    sessionPrice: v.number(),
    sessionDurationMinutes: v.number(),
    zoomPersonalMeetingUrl: v.optional(v.string()),
    isActive: v.boolean(),
  },
  handler: async (ctx, args) => {
    if (args.tutorId) {
      // Update existing tutor
      await ctx.db.patch(args.tutorId, {
        userId: args.userId,
        name: args.name,
        email: args.email,
        bio: args.bio,
        avatarUrl: args.avatarUrl,
        sessionPrice: args.sessionPrice,
        sessionDurationMinutes: args.sessionDurationMinutes,
        zoomPersonalMeetingUrl: args.zoomPersonalMeetingUrl,
        isActive: args.isActive,
      });
      return args.tutorId;
    } else {
      // Create new tutor
      return await ctx.db.insert("tutors", {
        userId: args.userId,
        name: args.name,
        email: args.email,
        bio: args.bio,
        avatarUrl: args.avatarUrl,
        sessionPrice: args.sessionPrice,
        sessionDurationMinutes: args.sessionDurationMinutes,
        zoomPersonalMeetingUrl: args.zoomPersonalMeetingUrl,
        isActive: args.isActive,
        createdAt: Date.now(),
      });
    }
  },
});

// Create time slots for a tutor
export const createSlots = mutation({
  args: {
    tutorId: v.id("tutors"),
    slots: v.array(
      v.object({
        startTime: v.number(),
        endTime: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    const tutor = await ctx.db.get(args.tutorId);
    if (!tutor) {
      throw new Error("Tutor not found");
    }

    const createdSlots: Id<"tutoringSlots">[] = [];

    for (const slot of args.slots) {
      // Check for overlapping slots
      const existingSlots = await ctx.db
        .query("tutoringSlots")
        .withIndex("by_tutor_and_start", (q) =>
          q.eq("tutorId", args.tutorId)
        )
        .collect();

      const hasOverlap = existingSlots.some(
        (existing) =>
          slot.startTime < existing.endTime && slot.endTime > existing.startTime
      );

      if (hasOverlap) {
        continue; // Skip overlapping slots
      }

      const slotId = await ctx.db.insert("tutoringSlots", {
        tutorId: args.tutorId,
        startTime: slot.startTime,
        endTime: slot.endTime,
        status: "available",
      });

      createdSlots.push(slotId);
    }

    return createdSlots;
  },
});

// Delete a slot (admin only)
export const deleteSlot = mutation({
  args: { slotId: v.id("tutoringSlots") },
  handler: async (ctx, args) => {
    const slot = await ctx.db.get(args.slotId);
    if (!slot) {
      throw new Error("Slot not found");
    }

    if (slot.status === "booked") {
      throw new Error("Cannot delete a booked slot");
    }

    await ctx.db.delete(args.slotId);
    return { success: true };
  },
});
