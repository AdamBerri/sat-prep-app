export const PRICING_TIERS = {
  monthly: {
    id: "monthly" as const,
    name: "Monthly",
    price: 79,
    interval: "month" as const,
    intervalCount: 1,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_MONTHLY || "",
    features: [
      "Unlimited practice questions",
      "Smart adaptive learning",
      "Real SAT simulations",
      "Progress tracking & analytics",
      "24/7 access",
    ],
    badge: null,
    monthlyEquivalent: 79,
    savings: null,
  },
  three_month: {
    id: "three_month" as const,
    name: "3 Months",
    price: 199,
    interval: "month" as const,
    intervalCount: 3,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_THREE_MONTH || "",
    features: [
      "Everything in Monthly",
      "Save 16% vs monthly",
      "Perfect for test prep cycles",
    ],
    badge: "Popular",
    monthlyEquivalent: 66,
    savings: 16,
  },
  annual: {
    id: "annual" as const,
    name: "Annual",
    price: 499,
    interval: "year" as const,
    intervalCount: 1,
    priceId: process.env.NEXT_PUBLIC_STRIPE_PRICE_ANNUAL || "",
    features: [
      "Everything in Monthly",
      "Save 47% vs monthly",
      "Best value for serious prep",
      "Full year of access",
    ],
    badge: "Best Value",
    monthlyEquivalent: 42,
    savings: 47,
  },
} as const;

export type PricingTier = keyof typeof PRICING_TIERS;
export type PricingTierData = (typeof PRICING_TIERS)[PricingTier];

export const TIER_ORDER: PricingTier[] = ["monthly", "three_month", "annual"];

export function getPlanDisplayName(plan: PricingTier): string {
  return PRICING_TIERS[plan].name;
}

export function formatPrice(cents: number): string {
  return `$${(cents).toFixed(0)}`;
}
