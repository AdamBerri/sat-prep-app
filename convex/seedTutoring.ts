import { mutation } from "./_generated/server";
import { v } from "convex/values";

// Seed a tutor and create some initial availability slots
export const seedTutor = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    bio: v.optional(v.string()),
    zoomLink: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Check if tutor already exists
    const existingTutor = await ctx.db
      .query("tutors")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    if (existingTutor) {
      return { tutorId: existingTutor._id, message: "Tutor already exists" };
    }

    // Create the tutor
    const tutorId = await ctx.db.insert("tutors", {
      name: args.name,
      email: args.email,
      bio: args.bio || "Expert SAT tutor with years of experience helping students achieve their target scores.",
      sessionPrice: 30000, // $300 in cents
      sessionDurationMinutes: 90, // 1.5 hours
      zoomPersonalMeetingUrl: args.zoomLink,
      isActive: true,
      createdAt: Date.now(),
    });

    return { tutorId, message: "Tutor created successfully" };
  },
});

// Generate availability slots for a tutor
export const generateSlots = mutation({
  args: {
    tutorId: v.id("tutors"),
    daysAhead: v.number(), // How many days ahead to generate slots
    slotsPerDay: v.number(), // How many slots per day
    startHour: v.number(), // Start hour in 24-hour format (e.g., 9 for 9 AM)
  },
  handler: async (ctx, args) => {
    const tutor = await ctx.db.get(args.tutorId);
    if (!tutor) {
      throw new Error("Tutor not found");
    }

    const sessionDuration = tutor.sessionDurationMinutes * 60 * 1000; // in milliseconds
    const createdSlots: string[] = [];

    // Generate slots for the next N days
    for (let day = 1; day <= args.daysAhead; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);
      date.setHours(args.startHour, 0, 0, 0);

      for (let slot = 0; slot < args.slotsPerDay; slot++) {
        const startTime = date.getTime() + slot * (sessionDuration + 30 * 60 * 1000); // 30 min gap between slots
        const endTime = startTime + sessionDuration;

        // Check for existing slot at this time
        const existingSlot = await ctx.db
          .query("tutoringSlots")
          .withIndex("by_tutor_and_start", (q) =>
            q.eq("tutorId", args.tutorId).eq("startTime", startTime)
          )
          .first();

        if (!existingSlot) {
          const slotId = await ctx.db.insert("tutoringSlots", {
            tutorId: args.tutorId,
            startTime,
            endTime,
            status: "available",
          });
          createdSlots.push(slotId);
        }
      }
    }

    return {
      message: `Created ${createdSlots.length} slots`,
      slotIds: createdSlots,
    };
  },
});

// Helper to create specific time slots
export const createSpecificSlot = mutation({
  args: {
    tutorId: v.id("tutors"),
    date: v.string(), // YYYY-MM-DD format
    hour: v.number(), // Hour in 24-hour format
    minute: v.number(), // Minute
  },
  handler: async (ctx, args) => {
    const tutor = await ctx.db.get(args.tutorId);
    if (!tutor) {
      throw new Error("Tutor not found");
    }

    const [year, month, day] = args.date.split("-").map(Number);
    const startDate = new Date(year, month - 1, day, args.hour, args.minute, 0, 0);
    const startTime = startDate.getTime();
    const endTime = startTime + tutor.sessionDurationMinutes * 60 * 1000;

    // Check if slot already exists
    const existingSlot = await ctx.db
      .query("tutoringSlots")
      .withIndex("by_tutor_and_start", (q) =>
        q.eq("tutorId", args.tutorId).eq("startTime", startTime)
      )
      .first();

    if (existingSlot) {
      return { slotId: existingSlot._id, message: "Slot already exists" };
    }

    const slotId = await ctx.db.insert("tutoringSlots", {
      tutorId: args.tutorId,
      startTime,
      endTime,
      status: "available",
    });

    return { slotId, message: "Slot created successfully" };
  },
});

// Quick setup: Create tutor and generate slots in one call
export const quickSetup = mutation({
  args: {
    name: v.string(),
    email: v.string(),
    bio: v.optional(v.string()),
    zoomLink: v.optional(v.string()),
    daysAhead: v.optional(v.number()),
    slotsPerDay: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Check if tutor already exists
    let tutor = await ctx.db
      .query("tutors")
      .withIndex("by_email", (q) => q.eq("email", args.email))
      .first();

    let tutorCreated = false;

    if (!tutor) {
      // Create the tutor
      const tutorId = await ctx.db.insert("tutors", {
        name: args.name,
        email: args.email,
        bio: args.bio || "Expert SAT tutor helping students achieve their dream scores.",
        sessionPrice: 30000, // $300 in cents
        sessionDurationMinutes: 90, // 1.5 hours
        zoomPersonalMeetingUrl: args.zoomLink,
        isActive: true,
        createdAt: Date.now(),
      });
      tutor = await ctx.db.get(tutorId);
      tutorCreated = true;
    }

    if (!tutor) {
      throw new Error("Failed to create or find tutor");
    }

    // Generate slots
    const daysAhead = args.daysAhead ?? 14;
    const slotsPerDay = args.slotsPerDay ?? 3;
    const sessionDuration = tutor.sessionDurationMinutes * 60 * 1000;
    let slotsCreated = 0;

    for (let day = 1; day <= daysAhead; day++) {
      const date = new Date();
      date.setDate(date.getDate() + day);

      // Skip weekends
      if (date.getDay() === 0 || date.getDay() === 6) continue;

      date.setHours(10, 0, 0, 0); // Start at 10 AM

      for (let slot = 0; slot < slotsPerDay; slot++) {
        const startTime = date.getTime() + slot * (sessionDuration + 30 * 60 * 1000);
        const endTime = startTime + sessionDuration;

        // Check for existing slot
        const existingSlot = await ctx.db
          .query("tutoringSlots")
          .withIndex("by_tutor_and_start", (q) =>
            q.eq("tutorId", tutor!._id).eq("startTime", startTime)
          )
          .first();

        if (!existingSlot) {
          await ctx.db.insert("tutoringSlots", {
            tutorId: tutor._id,
            startTime,
            endTime,
            status: "available",
          });
          slotsCreated++;
        }
      }
    }

    return {
      tutorId: tutor._id,
      tutorCreated,
      slotsCreated,
      message: tutorCreated
        ? `Created tutor "${args.name}" with ${slotsCreated} slots`
        : `Found existing tutor, added ${slotsCreated} new slots`,
    };
  },
});
