import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

// Map Stripe price IDs to plan names
const PRICE_TO_PLAN: Record<string, "monthly" | "three_month" | "annual"> = {
  [process.env.STRIPE_PRICE_MONTHLY || ""]: "monthly",
  [process.env.STRIPE_PRICE_THREE_MONTH || ""]: "three_month",
  [process.env.STRIPE_PRICE_ANNUAL || ""]: "annual",
};

function getPlanFromPriceId(
  priceId: string
): "monthly" | "three_month" | "annual" {
  return PRICE_TO_PLAN[priceId] || "monthly";
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSubscriptionIdFromInvoice(invoice: any): string | null {
  if (typeof invoice.subscription === "string") {
    return invoice.subscription;
  }
  if (invoice.subscription?.id) {
    return invoice.subscription.id;
  }
  return null;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function getSubscriptionPeriods(subscription: any): {
  start: number;
  end: number;
} {
  return {
    start: (subscription.current_period_start || 0) * 1000,
    end: (subscription.current_period_end || 0) * 1000,
  };
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.text();
    const signature = request.headers.get("stripe-signature");

    if (!signature) {
      return NextResponse.json(
        { error: "Missing stripe-signature header" },
        { status: 400 }
      );
    }

    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
    } catch (err) {
      console.error("Webhook signature verification failed:", err);
      return NextResponse.json(
        { error: "Invalid signature" },
        { status: 400 }
      );
    }

    // Handle the event
    switch (event.type) {
      // ─────────────────────────────────────────────────────────
      // CHECKOUT COMPLETED (both one-time and subscription)
      // ─────────────────────────────────────────────────────────
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;

        if (session.mode === "subscription") {
          // Handle subscription checkout
          await handleSubscriptionCheckoutCompleted(session);
          console.log(`Subscription created for session: ${session.id}`);
        } else {
          // Handle one-time payment
          const purchaseType = session.metadata?.purchaseType;

          if (purchaseType === "pdf") {
            // PDF test purchase
            await convex.mutation(api.pdfTests.confirmPurchase, {
              stripeCheckoutSessionId: session.id,
              stripePaymentIntentId: session.payment_intent as
                | string
                | undefined,
            });
            console.log(`PDF purchase confirmed for session: ${session.id}`);
          } else {
            // Tutoring booking
            await convex.mutation(api.tutoring.confirmBooking, {
              stripeCheckoutSessionId: session.id,
              stripePaymentIntentId: session.payment_intent as
                | string
                | undefined,
            });
            console.log(`Booking confirmed for session: ${session.id}`);
          }
        }
        break;
      }

      // ─────────────────────────────────────────────────────────
      // SUBSCRIPTION LIFECYCLE EVENTS
      // ─────────────────────────────────────────────────────────
      case "customer.subscription.created":
      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        await handleSubscriptionUpdate(subscription);
        console.log(`Subscription updated: ${subscription.id}`);
        break;
      }

      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        await convex.mutation(api.subscriptions.cancelSubscription, {
          stripeSubscriptionId: subscription.id,
        });
        console.log(`Subscription canceled: ${subscription.id}`);
        break;
      }

      // ─────────────────────────────────────────────────────────
      // INVOICE EVENTS (for subscription renewals)
      // ─────────────────────────────────────────────────────────
      case "invoice.payment_succeeded": {
        const invoice = event.data.object;
        const subscriptionId = getSubscriptionIdFromInvoice(invoice);
        if (subscriptionId) {
          // Refresh subscription data on successful renewal
          const subscription = await stripe.subscriptions.retrieve(
            subscriptionId
          );
          await handleSubscriptionUpdate(subscription);
          console.log(`Invoice paid, subscription renewed: ${invoice.id}`);
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object;
        const subscriptionId = getSubscriptionIdFromInvoice(invoice);
        if (subscriptionId) {
          await convex.mutation(api.subscriptions.updateSubscriptionStatus, {
            stripeSubscriptionId: subscriptionId,
            status: "past_due",
          });
          console.log(`Invoice payment failed: ${invoice.id}`);
        }
        break;
      }

      // ─────────────────────────────────────────────────────────
      // OTHER EVENTS
      // ─────────────────────────────────────────────────────────
      case "checkout.session.expired": {
        const session = event.data.object as Stripe.Checkout.Session;
        console.log(`Checkout session expired: ${session.id}`);
        break;
      }

      case "payment_intent.payment_failed": {
        const paymentIntent = event.data.object as Stripe.PaymentIntent;
        console.log(`Payment failed for intent: ${paymentIntent.id}`);
        break;
      }

      default:
        console.log(`Unhandled event type: ${event.type}`);
    }

    return NextResponse.json({ received: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json(
      { error: "Webhook handler failed" },
      { status: 500 }
    );
  }
}

// ─────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────

async function handleSubscriptionCheckoutCompleted(
  session: Stripe.Checkout.Session
) {
  const subscription = await stripe.subscriptions.retrieve(
    session.subscription as string
  );

  const periods = getSubscriptionPeriods(subscription);
  const userId = session.metadata?.userId;
  const plan =
    (session.metadata?.plan as "monthly" | "three_month" | "annual") ||
    getPlanFromPriceId(subscription.items.data[0].price.id);

  if (!userId) {
    console.error("Missing userId in checkout session metadata");
    return;
  }

  await convex.mutation(api.subscriptions.createSubscription, {
    userId,
    stripeCustomerId: session.customer as string,
    stripeSubscriptionId: subscription.id,
    stripePriceId: subscription.items.data[0].price.id,
    plan,
    status: subscription.status,
    currentPeriodStart: periods.start,
    currentPeriodEnd: periods.end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

async function handleSubscriptionUpdate(subscription: Stripe.Subscription) {
  const periods = getSubscriptionPeriods(subscription);
  const priceId = subscription.items.data[0].price.id;
  const plan = getPlanFromPriceId(priceId);

  await convex.mutation(api.subscriptions.updateSubscription, {
    stripeSubscriptionId: subscription.id,
    stripePriceId: priceId,
    plan,
    status: subscription.status,
    currentPeriodStart: periods.start,
    currentPeriodEnd: periods.end,
    cancelAtPeriodEnd: subscription.cancel_at_period_end,
  });
}

