import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const PRICE_IDS: Record<string, string> = {
  monthly: process.env.STRIPE_PRICE_MONTHLY!,
  three_month: process.env.STRIPE_PRICE_THREE_MONTH!,
  annual: process.env.STRIPE_PRICE_ANNUAL!,
};

export async function POST(request: NextRequest) {
  try {
    const { userId } = await auth();
    if (!userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await currentUser();
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 401 });
    }

    const body = await request.json();
    const { plan } = body as { plan: string };

    if (!plan || !PRICE_IDS[plan]) {
      return NextResponse.json({ error: "Invalid plan" }, { status: 400 });
    }

    // Get or create Stripe customer
    let stripeCustomerId = await convex.query(
      api.subscriptions.getStripeCustomerId,
      { userId }
    );

    if (!stripeCustomerId) {
      const customer = await stripe.customers.create({
        email: user.emailAddresses[0]?.emailAddress,
        name: user.firstName
          ? `${user.firstName} ${user.lastName || ""}`.trim()
          : undefined,
        metadata: { clerkUserId: userId },
      });
      stripeCustomerId = customer.id;

      await convex.mutation(api.subscriptions.setStripeCustomerId, {
        userId,
        stripeCustomerId,
      });
    }

    // Create checkout session
    const origin = request.headers.get("origin") || "http://localhost:3000";

    const session = await stripe.checkout.sessions.create({
      customer: stripeCustomerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: PRICE_IDS[plan],
          quantity: 1,
        },
      ],
      success_url: `${origin}/dashboard?subscription=success`,
      cancel_url: `${origin}/pricing?canceled=true`,
      metadata: {
        userId,
        plan,
      },
      subscription_data: {
        metadata: {
          userId,
          plan,
        },
      },
      allow_promotion_codes: true,
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("Subscription checkout error:", error);
    const message =
      error instanceof Error ? error.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
