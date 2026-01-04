"use client";

import { useState, Suspense } from "react";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Leaf,
  Check,
  Sparkles,
  ArrowRight,
  Loader2,
  Zap,
  Shield,
  Clock,
} from "lucide-react";
import { PRICING_TIERS, TIER_ORDER, type PricingTier } from "@/lib/pricing";

function PricingPageContent() {
  const { user, isLoaded } = useUser();
  const router = useRouter();
  const searchParams = useSearchParams();
  const wasCanceled = searchParams.get("canceled") === "true";

  const [isCheckingOut, setIsCheckingOut] = useState<PricingTier | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSubscribe = async (plan: PricingTier) => {
    if (!user) return;

    setIsCheckingOut(plan);
    setError(null);

    try {
      const response = await fetch("/api/subscriptions/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ plan }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Failed to create checkout");
      }

      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsCheckingOut(null);
    }
  };

  return (
    <div className="min-h-screen bg-[var(--paper-cream)]">
      {/* Navigation */}
      <nav className="border-b border-[var(--paper-lines)] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--grass-medium)] to-[var(--forest)] rounded-lg flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <span className="font-display text-2xl font-bold text-[var(--ink-black)]">
              1600Club
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {isLoaded && user ? (
              <UserButton
                appearance={{
                  elements: { avatarBox: "w-10 h-10" },
                }}
              />
            ) : (
              <SignInButton mode="modal">
                <button className="btn-outline-wood">Sign In</button>
              </SignInButton>
            )}
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className="py-16 px-6 text-center">
        <div className="inline-flex items-center gap-2 bg-[var(--grass-light)]/20 rounded-full px-4 py-2 mb-6">
          <Sparkles className="w-4 h-4 text-[var(--grass-dark)]" />
          <span className="font-body text-sm text-[var(--grass-dark)] font-medium">
            Simple, transparent pricing
          </span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--ink-black)] mb-4">
          Choose Your Path to 1600
        </h1>
        <p className="font-body text-lg text-[var(--ink-faded)] max-w-2xl mx-auto">
          All plans include unlimited questions, adaptive learning, and full
          access to every feature. Pick the plan that fits your timeline.
        </p>
      </section>

      {/* Canceled notice */}
      {wasCanceled && (
        <div className="max-w-4xl mx-auto px-6 mb-8">
          <div className="p-4 bg-[var(--sunflower)]/10 border border-[var(--sunflower)]/30 rounded-xl text-center">
            <p className="font-body text-[var(--wood-dark)]">
              Checkout was canceled. No payment was processed.
            </p>
          </div>
        </div>
      )}

      {/* Pricing Cards */}
      <section className="pb-16 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="grid md:grid-cols-3 gap-6">
            {TIER_ORDER.map((key) => {
              const tier = PRICING_TIERS[key];
              const isHighlighted = key === "annual";
              const isLoading = isCheckingOut === key;

              return (
                <div
                  key={key}
                  className={`relative bg-white rounded-2xl border-2 p-6 transition-all hover:shadow-lg ${
                    isHighlighted
                      ? "border-[var(--grass-dark)] shadow-lg scale-105"
                      : "border-[var(--paper-lines)]"
                  }`}
                >
                  {/* Badge */}
                  {tier.badge && (
                    <div
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-bold ${
                        tier.badge === "Best Value"
                          ? "bg-[var(--grass-dark)] text-white"
                          : "bg-[var(--sunflower)] text-[var(--ink-black)]"
                      }`}
                    >
                      {tier.badge}
                    </div>
                  )}

                  {/* Plan name */}
                  <h3 className="font-display text-xl font-bold text-[var(--ink-black)] mt-2 mb-2">
                    {tier.name}
                  </h3>

                  {/* Price */}
                  <div className="mb-4">
                    <span className="font-display text-4xl font-bold text-[var(--ink-black)]">
                      ${tier.price}
                    </span>
                    <span className="font-body text-[var(--ink-faded)]">
                      /{tier.interval === "year" ? "year" : `${tier.intervalCount}mo`}
                    </span>
                  </div>

                  {/* Monthly equivalent */}
                  {tier.savings && (
                    <div className="mb-4 flex items-center gap-2">
                      <span className="font-body text-sm text-[var(--grass-dark)] font-medium">
                        ${tier.monthlyEquivalent}/mo
                      </span>
                      <span className="bg-[var(--grass-light)]/30 text-[var(--grass-dark)] text-xs font-bold px-2 py-0.5 rounded">
                        Save {tier.savings}%
                      </span>
                    </div>
                  )}

                  {/* Features */}
                  <ul className="space-y-3 mb-6">
                    {tier.features.map((feature, i) => (
                      <li key={i} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-[var(--grass-dark)] flex-shrink-0 mt-0.5" />
                        <span className="font-body text-sm text-[var(--ink-faded)]">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA */}
                  {user ? (
                    <button
                      onClick={() => handleSubscribe(key)}
                      disabled={isLoading || isCheckingOut !== null}
                      className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                        isHighlighted
                          ? "btn-grass"
                          : "bg-[var(--paper-warm)] text-[var(--ink-black)] hover:bg-[var(--paper-aged)]"
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {isLoading ? (
                        <>
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Processing...
                        </>
                      ) : (
                        <>
                          Get Started
                          <ArrowRight className="w-4 h-4" />
                        </>
                      )}
                    </button>
                  ) : (
                    <SignInButton mode="modal">
                      <button
                        className={`w-full py-3 rounded-lg font-semibold transition-all flex items-center justify-center gap-2 ${
                          isHighlighted
                            ? "btn-grass"
                            : "bg-[var(--paper-warm)] text-[var(--ink-black)] hover:bg-[var(--paper-aged)]"
                        }`}
                      >
                        Sign Up to Subscribe
                        <ArrowRight className="w-4 h-4" />
                      </button>
                    </SignInButton>
                  )}
                </div>
              );
            })}
          </div>

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-center">
              <p className="font-body text-red-600">{error}</p>
            </div>
          )}
        </div>
      </section>

      {/* Trust section */}
      <section className="py-16 px-6 bg-[var(--paper-warm)]">
        <div className="max-w-4xl mx-auto">
          <div className="grid md:grid-cols-3 gap-8 text-center">
            <div>
              <div className="w-12 h-12 bg-[var(--grass-light)]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-6 h-6 text-[var(--grass-dark)]" />
              </div>
              <h3 className="font-display text-lg font-bold text-[var(--ink-black)] mb-2">
                Unlimited Practice
              </h3>
              <p className="font-body text-sm text-[var(--ink-faded)]">
                Access thousands of questions across all SAT domains with adaptive
                difficulty.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-[var(--grass-light)]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-6 h-6 text-[var(--grass-dark)]" />
              </div>
              <h3 className="font-display text-lg font-bold text-[var(--ink-black)] mb-2">
                Money-Back Guarantee
              </h3>
              <p className="font-body text-sm text-[var(--ink-faded)]">
                Not seeing results? Get a full refund within 30 days, no questions
                asked.
              </p>
            </div>
            <div>
              <div className="w-12 h-12 bg-[var(--grass-light)]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-6 h-6 text-[var(--grass-dark)]" />
              </div>
              <h3 className="font-display text-lg font-bold text-[var(--ink-black)] mb-2">
                Cancel Anytime
              </h3>
              <p className="font-body text-sm text-[var(--ink-faded)]">
                No long-term commitment. Cancel your subscription whenever you
                want.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ Section */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-[var(--ink-black)] text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[var(--paper-lines)] p-6">
              <h3 className="font-display text-lg font-bold text-[var(--ink-black)] mb-2">
                What&apos;s included in my subscription?
              </h3>
              <p className="font-body text-[var(--ink-faded)]">
                All plans include unlimited practice questions, real SAT
                simulations, adaptive learning, progress tracking, endless mode,
                and access to all domains and skills.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-[var(--paper-lines)] p-6">
              <h3 className="font-display text-lg font-bold text-[var(--ink-black)] mb-2">
                Can I switch plans later?
              </h3>
              <p className="font-body text-[var(--ink-faded)]">
                Yes! You can upgrade or downgrade your plan at any time through
                your billing settings. Changes take effect at your next billing
                cycle.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-[var(--paper-lines)] p-6">
              <h3 className="font-display text-lg font-bold text-[var(--ink-black)] mb-2">
                Is tutoring included?
              </h3>
              <p className="font-body text-[var(--ink-faded)]">
                Tutoring sessions are sold separately. Subscribers get access to
                book 1-on-1 tutoring sessions with our expert tutors at $300 per
                90-minute session.
              </p>
            </div>

            <div className="bg-white rounded-xl border border-[var(--paper-lines)] p-6">
              <h3 className="font-display text-lg font-bold text-[var(--ink-black)] mb-2">
                How does the money-back guarantee work?
              </h3>
              <p className="font-body text-[var(--ink-faded)]">
                If you&apos;re not satisfied within the first 30 days, contact us for
                a full refund. We believe in our platform and want you to feel
                confident in your investment.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer CTA */}
      <section className="py-16 px-6 bg-gradient-to-br from-[var(--grass-medium)] to-[var(--forest)]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-3xl md:text-4xl font-bold text-white mb-4">
            Ready to Join the 1600 Club?
          </h2>
          <p className="font-body text-lg text-white/80 mb-8">
            Start your journey today with our most popular annual plan.
          </p>
          {user ? (
            <button
              onClick={() => handleSubscribe("annual")}
              disabled={isCheckingOut !== null}
              className="bg-white text-[var(--grass-dark)] px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[var(--paper-cream)] transition-colors flex items-center gap-2 mx-auto disabled:opacity-50"
            >
              {isCheckingOut === "annual" ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Processing...
                </>
              ) : (
                <>
                  Get Annual Plan - $499/year
                  <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          ) : (
            <SignInButton mode="modal">
              <button className="bg-white text-[var(--grass-dark)] px-8 py-4 rounded-lg font-semibold text-lg hover:bg-[var(--paper-cream)] transition-colors flex items-center gap-2 mx-auto">
                Sign Up & Get Started
                <ArrowRight className="w-5 h-5" />
              </button>
            </SignInButton>
          )}
        </div>
      </section>
    </div>
  );
}

export default function PricingPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--paper-cream)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--grass-dark)]" />
        </div>
      }
    >
      <PricingPageContent />
    </Suspense>
  );
}
