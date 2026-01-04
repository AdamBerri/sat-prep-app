import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../convex/_generated/api";
import { Id } from "../../../../convex/_generated/dataModel";

// Lazy initialization to avoid build-time errors when env vars are not set
let stripe: Stripe | null = null;
function getStripe(): Stripe {
  if (!stripe) {
    if (!process.env.STRIPE_SECRET_KEY) {
      throw new Error("STRIPE_SECRET_KEY is not set");
    }
    stripe = new Stripe(process.env.STRIPE_SECRET_KEY);
  }
  return stripe;
}

let convex: ConvexHttpClient | null = null;
function getConvex(): ConvexHttpClient {
  if (!convex) {
    if (!process.env.NEXT_PUBLIC_CONVEX_URL) {
      throw new Error("NEXT_PUBLIC_CONVEX_URL is not set");
    }
    convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL);
  }
  return convex;
}

export async function POST(request: NextRequest) {
  try {
    // Check authentication
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    // Get request body
    const body = await request.json();
    const { slotId, notes } = body;

    if (!slotId) {
      return NextResponse.json(
        { error: "Slot ID is required" },
        { status: 400 }
      );
    }

    // Create pending booking in Convex
    const bookingResult = await getConvex().mutation(api.tutoring.createPendingBooking, {
      slotId: slotId as Id<"tutoringSlots">,
      studentId: userId,
      studentEmail: user.emailAddresses[0]?.emailAddress || "",
      studentName: user.firstName
        ? `${user.firstName} ${user.lastName || ""}`.trim()
        : undefined,
      notes,
    });

    // Create Stripe Checkout Session
    const origin = request.headers.get("origin") || "http://localhost:3000";

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "1600Club Tutoring Session",
              description: `1.5 hour 1-on-1 SAT tutoring session with ${bookingResult.tutorName}`,
            },
            unit_amount: bookingResult.amount, // Amount in cents
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/dashboard/tutoring/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/dashboard/tutoring/book?cancelled=true`,
      customer_email: user.emailAddresses[0]?.emailAddress,
      metadata: {
        bookingId: bookingResult.bookingId,
        slotId: slotId,
        userId: userId,
      },
    });

    // Save Stripe session ID to booking
    await getConvex().mutation(api.tutoring.setStripeSessionId, {
      bookingId: bookingResult.bookingId as Id<"tutoringBookings">,
      stripeCheckoutSessionId: session.id,
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    const message = error instanceof Error ? error.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
