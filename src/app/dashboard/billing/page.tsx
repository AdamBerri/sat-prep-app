"use client";

import { useState } from "react";
import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import Link from "next/link";
import {
  CreditCard,
  Calendar,
  AlertCircle,
  ExternalLink,
  Loader2,
  CheckCircle2,
  Sparkles,
  ArrowRight,
} from "lucide-react";
import { PRICING_TIERS, type PricingTier } from "@/lib/pricing";

export default function BillingPage() {
  const { user } = useUser();
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const subscription = useQuery(
    api.subscriptions.getSubscription,
    user?.id ? { userId: user.id } : "skip"
  );

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      const response = await fetch("/api/subscriptions/portal", {
        method: "POST",
      });
      const data = await response.json();
      if (data.portalUrl) {
        window.location.href = data.portalUrl;
      }
    } catch (err) {
      console.error("Failed to open portal:", err);
    } finally {
      setIsLoadingPortal(false);
    }
  };

  // Loading state
  if (subscription === undefined) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-4">
        <div className="animate-pulse space-y-4">
          <div className="h-8 bg-[var(--paper-lines)] rounded w-1/3"></div>
          <div className="h-48 bg-[var(--paper-lines)] rounded"></div>
        </div>
      </div>
    );
  }

  // No subscription
  if (!subscription) {
    return <NoSubscriptionState />;
  }

  const planDetails = PRICING_TIERS[subscription.plan as PricingTier];
  const isActive =
    subscription.status === "active" || subscription.status === "trialing";
  const isPastDue = subscription.status === "past_due";
  const renewalDate = new Date(subscription.currentPeriodEnd);

  return (
    <div className="max-w-4xl mx-auto py-8 px-4">
      <h1 className="font-display text-3xl font-bold text-[var(--ink-black)] mb-8">
        Billing & Subscription
      </h1>

      {/* Past due warning */}
      {isPastDue && (
        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="font-body font-medium text-red-800">
              Payment Failed
            </p>
            <p className="font-body text-sm text-red-600">
              Your last payment failed. Please update your payment method to
              continue your subscription.
            </p>
          </div>
        </div>
      )}

      {/* Current Plan Card */}
      <div className="bg-white rounded-xl border border-[var(--paper-lines)] p-6 mb-6">
        <div className="flex items-start justify-between mb-6">
          <div>
            <h2 className="font-display text-lg font-semibold text-[var(--ink-black)]">
              Current Plan
            </h2>
            <p className="font-body text-[var(--ink-faded)]">
              {planDetails?.name || subscription.plan} Plan
            </p>
          </div>
          <div
            className={`px-3 py-1 rounded-full text-sm font-medium ${
              isActive
                ? "bg-[var(--grass-light)]/30 text-[var(--grass-dark)]"
                : isPastDue
                  ? "bg-red-100 text-red-700"
                  : "bg-[var(--sunflower)]/30 text-[var(--wood-dark)]"
            }`}
          >
            {subscription.status === "trialing"
              ? "Trial"
              : isActive
                ? "Active"
                : isPastDue
                  ? "Past Due"
                  : "Canceled"}
          </div>
        </div>

        <div className="grid sm:grid-cols-2 gap-4 mb-6">
          <div className="flex items-center gap-3">
            <CreditCard className="w-5 h-5 text-[var(--ink-faded)]" />
            <div>
              <p className="font-body text-sm text-[var(--ink-faded)]">Price</p>
              <p className="font-body font-medium text-[var(--ink-black)]">
                ${planDetails?.price || "—"}/
                {planDetails?.interval === "year"
                  ? "year"
                  : `${planDetails?.intervalCount || 1}mo`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Calendar className="w-5 h-5 text-[var(--ink-faded)]" />
            <div>
              <p className="font-body text-sm text-[var(--ink-faded)]">
                {subscription.cancelAtPeriodEnd ? "Access ends" : "Renews"}
              </p>
              <p className="font-body font-medium text-[var(--ink-black)]">
                {renewalDate.toLocaleDateString("en-US", {
                  month: "long",
                  day: "numeric",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {subscription.cancelAtPeriodEnd && (
          <div className="p-3 bg-[var(--sunflower)]/10 border border-[var(--sunflower)]/30 rounded-lg mb-6">
            <p className="font-body text-sm text-[var(--wood-dark)]">
              Your subscription is canceled and will end on{" "}
              {renewalDate.toLocaleDateString()}. You can resubscribe anytime.
            </p>
          </div>
        )}

        <button
          onClick={handleManageSubscription}
          disabled={isLoadingPortal}
          className="btn-grass flex items-center gap-2"
        >
          {isLoadingPortal ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <ExternalLink className="w-4 h-4" />
          )}
          Manage Subscription
        </button>
      </div>

      {/* Features included */}
      {planDetails && (
        <div className="bg-white rounded-xl border border-[var(--paper-lines)] p-6">
          <h3 className="font-display text-lg font-semibold text-[var(--ink-black)] mb-4">
            Your Plan Includes
          </h3>
          <ul className="space-y-3">
            {planDetails.features.map((feature, i) => (
              <li key={i} className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-[var(--grass-dark)]" />
                <span className="font-body text-[var(--ink-black)]">
                  {feature}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}

function NoSubscriptionState() {
  return (
    <div className="max-w-4xl mx-auto py-12 px-4">
      <div className="text-center py-12 bg-white rounded-xl border border-[var(--paper-lines)]">
        <div className="w-16 h-16 bg-[var(--grass-light)]/30 rounded-full flex items-center justify-center mx-auto mb-4">
          <Sparkles className="w-8 h-8 text-[var(--grass-dark)]" />
        </div>
        <h2 className="font-display text-2xl font-bold text-[var(--ink-black)] mb-2">
          No Active Subscription
        </h2>
        <p className="font-body text-[var(--ink-faded)] mb-6 max-w-md mx-auto">
          Subscribe to unlock unlimited practice questions, adaptive learning,
          and all the tools you need to reach 1600.
        </p>
        <Link
          href="/pricing"
          className="btn-grass inline-flex items-center gap-2"
        >
          View Plans
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
