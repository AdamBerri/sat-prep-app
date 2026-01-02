"use client";

import { useUser } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import Link from "next/link";
import { Lock, Sparkles, ArrowRight, Loader2 } from "lucide-react";

interface SubscriptionGateProps {
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function SubscriptionGate({ children, fallback }: SubscriptionGateProps) {
  const { user, isLoaded } = useUser();

  const hasSubscription = useQuery(
    api.subscriptions.hasActiveSubscription,
    user?.id ? { userId: user.id } : "skip"
  );

  // Loading state
  if (!isLoaded || hasSubscription === undefined) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="flex items-center gap-3 text-[var(--ink-faded)]">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="font-body">Loading...</span>
        </div>
      </div>
    );
  }

  // Has active subscription - render children
  if (hasSubscription) {
    return <>{children}</>;
  }

  // No subscription - show upgrade prompt or fallback
  if (fallback) {
    return <>{fallback}</>;
  }

  return <DefaultUpgradePrompt />;
}

function DefaultUpgradePrompt() {
  return (
    <div className="min-h-[60vh] flex items-center justify-center p-6">
      <div className="max-w-md text-center">
        <div className="w-16 h-16 bg-[var(--grass-light)]/30 rounded-full flex items-center justify-center mx-auto mb-6">
          <Lock className="w-8 h-8 text-[var(--grass-dark)]" />
        </div>
        <h2 className="font-display text-2xl font-bold text-[var(--ink-black)] mb-3">
          Unlock Your Potential
        </h2>
        <p className="font-body text-[var(--ink-faded)] mb-6">
          Subscribe to access unlimited practice questions, adaptive learning,
          and all the tools you need to reach 1600.
        </p>
        <div className="space-y-3">
          <Link
            href="/pricing"
            className="btn-grass w-full flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            View Plans
            <ArrowRight className="w-4 h-4" />
          </Link>
          <p className="font-body text-xs text-[var(--ink-faded)]">
            Starting at $79/month. Cancel anytime.
          </p>
        </div>
      </div>
    </div>
  );
}

// Hook for checking subscription status
export function useSubscription() {
  const { user } = useUser();

  const subscription = useQuery(
    api.subscriptions.getSubscription,
    user?.id ? { userId: user.id } : "skip"
  );

  const hasSubscription = useQuery(
    api.subscriptions.hasActiveSubscription,
    user?.id ? { userId: user.id } : "skip"
  );

  return {
    subscription,
    hasSubscription: hasSubscription ?? false,
    isLoading: hasSubscription === undefined,
  };
}
