import { NextRequest, NextResponse } from "next/server";
import { auth, currentUser } from "@clerk/nextjs/server";
import Stripe from "stripe";
import { ConvexHttpClient } from "convex/browser";
import { api } from "../../../../../convex/_generated/api";
import { Id } from "../../../../../convex/_generated/dataModel";

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

// Pricing in cents
const SINGLE_TEST_PRICE = 2000; // $20
const BUNDLE_PRICE = 5000; // $50 for 5 tests

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
    const { purchaseType, testIds } = body as {
      purchaseType: "single" | "bundle";
      testIds: string[];
    };

    if (!purchaseType || !testIds || testIds.length === 0) {
      return NextResponse.json(
        { error: "Invalid request: purchaseType and testIds required" },
        { status: 400 }
      );
    }

    // Validate purchase type and test count
    if (purchaseType === "single" && testIds.length !== 1) {
      return NextResponse.json(
        { error: "Single purchase must have exactly 1 test" },
        { status: 400 }
      );
    }

    if (purchaseType === "bundle" && testIds.length !== 5) {
      return NextResponse.json(
        { error: "Bundle purchase must have exactly 5 tests" },
        { status: 400 }
      );
    }

    // Calculate price
    const amount = purchaseType === "single" ? SINGLE_TEST_PRICE : BUNDLE_PRICE;

    // Create pending purchase in Convex
    const purchaseId = await getConvex().mutation(
      api.pdfTests.createPendingPurchase,
      {
        userId,
        purchaseType,
        testIds: testIds as Id<"pdfTests">[],
        amountPaid: amount,
      }
    );

    // Create Stripe checkout session
    const origin = request.headers.get("origin") || "http://localhost:3000";

    const session = await getStripe().checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name:
                purchaseType === "single"
                  ? "SAT Practice Test"
                  : "SAT Practice Test Bundle (5 Tests)",
              description:
                purchaseType === "single"
                  ? "Full-length SAT practice test with answer key"
                  : "5 full-length SAT practice tests with answer keys - Save $50!",
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: "payment",
      success_url: `${origin}/store/success?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/store?cancelled=true`,
      customer_email: user.emailAddresses[0]?.emailAddress,
      metadata: {
        purchaseType: "pdf",
        purchaseId: purchaseId,
        userId: userId,
        testIds: testIds.join(","),
      },
    });

    // Save Stripe session ID to purchase
    await getConvex().mutation(api.pdfTests.setStripeSessionId, {
      purchaseId: purchaseId as Id<"pdfPurchases">,
      stripeCheckoutSessionId: session.id,
    });

    return NextResponse.json({ checkoutUrl: session.url });
  } catch (error) {
    console.error("PDF checkout error:", error);
    const message =
      error instanceof Error ? error.message : "Checkout failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
