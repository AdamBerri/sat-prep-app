"use client";

import { useState, Suspense } from "react";
import { useUser, SignInButton, UserButton } from "@clerk/nextjs";
import { useQuery } from "convex/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import {
  Leaf,
  FileText,
  Download,
  CheckCircle2,
  Package,
  Loader2,
  ArrowRight,
  BookOpen,
  Clock,
  Star,
  ShoppingCart,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";

type PDFTest = {
  _id: Id<"pdfTests">;
  name: string;
  description: string;
  testNumber: number;
  questionCount: number;
  difficulty: "easy" | "medium" | "hard" | "mixed";
  isActive: boolean;
  createdAt: number;
  pdfStorageId: Id<"_storage">;
  answerKeyStorageId: Id<"_storage">;
  previewImageStorageId?: Id<"_storage">;
};

function StorePageContent() {
  const { user, isLoaded } = useUser();
  const searchParams = useSearchParams();
  const wasCanceled = searchParams.get("cancelled") === "true";

  const tests = useQuery(api.pdfTests.getActiveTests);
  const userAccess = useQuery(
    api.pdfTests.getUserTestAccess,
    user?.id ? { userId: user.id } : "skip"
  );

  const [selectedTests, setSelectedTests] = useState<Set<string>>(new Set());
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const toggleTestSelection = (testId: string) => {
    const newSelection = new Set(selectedTests);
    if (newSelection.has(testId)) {
      newSelection.delete(testId);
    } else {
      newSelection.add(testId);
    }
    setSelectedTests(newSelection);
  };

  const selectBundleTests = () => {
    if (!tests) return;
    // Select first 5 tests user doesn't own
    const availableTests = tests.filter(
      (t: PDFTest) => !userAccess?.includes(t._id)
    );
    const bundleSelection = new Set<string>(
      availableTests.slice(0, 5).map((t: PDFTest) => t._id as string)
    );
    setSelectedTests(bundleSelection);
  };

  const handleCheckout = async (purchaseType: "single" | "bundle") => {
    if (!user) return;

    const testIds = Array.from(selectedTests);
    if (purchaseType === "single" && testIds.length !== 1) {
      setError("Please select exactly 1 test for single purchase");
      return;
    }
    if (purchaseType === "bundle" && testIds.length !== 5) {
      setError("Please select exactly 5 tests for bundle purchase");
      return;
    }

    setIsCheckingOut(true);
    setError(null);

    try {
      const response = await fetch("/api/checkout/pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ purchaseType, testIds }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Checkout failed");
      }

      window.location.href = data.checkoutUrl;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
      setIsCheckingOut(false);
    }
  };

  const ownedTestIds = new Set(userAccess || []);
  const availableForPurchase =
    tests?.filter((t: PDFTest) => !ownedTestIds.has(t._id)) || [];

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
              the1600Club
            </span>
          </Link>

          <div className="flex items-center gap-4">
            {isLoaded && user ? (
              <>
                <Link
                  href="/dashboard/purchases"
                  className="font-body text-[var(--ink-faded)] hover:text-[var(--grass-dark)] transition-colors"
                >
                  My Tests
                </Link>
                <UserButton
                  appearance={{ elements: { avatarBox: "w-10 h-10" } }}
                />
              </>
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
          <FileText className="w-4 h-4 text-[var(--grass-dark)]" />
          <span className="font-body text-sm text-[var(--grass-dark)] font-medium">
            Print & Practice
          </span>
        </div>
        <h1 className="font-display text-4xl md:text-5xl font-bold text-[var(--ink-black)] mb-4">
          Official-Style SAT Practice Tests
        </h1>
        <p className="font-body text-lg text-[var(--ink-faded)] max-w-2xl mx-auto">
          Download full-length practice tests with detailed answer keys.
          Perfect for parents who want printable tests for their kids.
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

      {/* Bundle Offer */}
      <section className="px-6 mb-12">
        <div className="max-w-4xl mx-auto">
          <div className="bg-gradient-to-br from-[var(--grass-medium)] to-[var(--forest)] rounded-2xl p-8 text-white">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <Package className="w-6 h-6" />
                  <span className="font-body text-sm font-medium opacity-90">
                    Best Value
                  </span>
                </div>
                <h2 className="font-display text-3xl font-bold mb-2">
                  5-Test Bundle
                </h2>
                <p className="font-body opacity-90 mb-4">
                  Get 5 full-length tests for just $50 - that&apos;s $10 per
                  test!
                </p>
                <div className="flex items-baseline gap-2">
                  <span className="font-display text-4xl font-bold">$50</span>
                  <span className="line-through opacity-60">$100</span>
                  <span className="bg-white/20 px-2 py-1 rounded text-sm font-medium">
                    Save 50%
                  </span>
                </div>
              </div>
              {user ? (
                <button
                  onClick={() => {
                    selectBundleTests();
                  }}
                  disabled={availableForPurchase.length < 5}
                  className="bg-white text-[var(--grass-dark)] px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[var(--paper-cream)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                >
                  <ShoppingCart className="w-5 h-5" />
                  Select 5 Tests
                </button>
              ) : (
                <SignInButton mode="modal">
                  <button className="bg-white text-[var(--grass-dark)] px-8 py-4 rounded-xl font-semibold text-lg hover:bg-[var(--paper-cream)] transition-colors flex items-center gap-2">
                    Sign In to Purchase
                  </button>
                </SignInButton>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Test Grid */}
      <section className="px-6 pb-16">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between mb-8">
            <h2 className="font-display text-2xl font-bold text-[var(--ink-black)]">
              Available Tests
            </h2>
            {selectedTests.size > 0 && (
              <div className="flex items-center gap-4">
                <span className="font-body text-[var(--ink-faded)]">
                  {selectedTests.size} selected
                </span>
                <button
                  onClick={() => setSelectedTests(new Set())}
                  className="font-body text-sm text-[var(--barn-red)] hover:underline"
                >
                  Clear
                </button>
              </div>
            )}
          </div>

          {tests === undefined ? (
            <div className="text-center py-12">
              <Loader2 className="w-8 h-8 animate-spin mx-auto text-[var(--grass-dark)]" />
            </div>
          ) : tests.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl border border-[var(--paper-lines)]">
              <FileText className="w-12 h-12 mx-auto text-[var(--ink-faded)]/30 mb-4" />
              <p className="font-body text-[var(--ink-faded)]">
                No tests available yet. Check back soon!
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {tests.map((test: PDFTest) => {
                const isOwned = ownedTestIds.has(test._id);
                const isSelected = selectedTests.has(test._id);

                return (
                  <div
                    key={test._id}
                    className={`bg-white rounded-xl border-2 p-6 transition-all ${
                      isOwned
                        ? "border-[var(--grass-dark)]/30 bg-[var(--grass-light)]/5"
                        : isSelected
                          ? "border-[var(--grass-dark)] shadow-lg"
                          : "border-[var(--paper-lines)] hover:border-[var(--grass-medium)]"
                    }`}
                  >
                    {/* Test header */}
                    <div className="flex items-start justify-between mb-4">
                      <div>
                        <h3 className="font-display text-lg font-bold text-[var(--ink-black)]">
                          {test.name}
                        </h3>
                        <span
                          className={`inline-block mt-1 px-2 py-0.5 rounded text-xs font-medium ${
                            test.difficulty === "easy"
                              ? "bg-green-100 text-green-700"
                              : test.difficulty === "medium"
                                ? "bg-yellow-100 text-yellow-700"
                                : test.difficulty === "hard"
                                  ? "bg-red-100 text-red-700"
                                  : "bg-blue-100 text-blue-700"
                          }`}
                        >
                          {test.difficulty.charAt(0).toUpperCase() +
                            test.difficulty.slice(1)}
                        </span>
                      </div>
                      {isOwned && (
                        <div className="bg-[var(--grass-dark)] text-white p-1.5 rounded-full">
                          <CheckCircle2 className="w-4 h-4" />
                        </div>
                      )}
                    </div>

                    {/* Test details */}
                    <p className="font-body text-sm text-[var(--ink-faded)] mb-4">
                      {test.description}
                    </p>

                    <div className="flex items-center gap-4 text-sm text-[var(--ink-faded)] mb-4">
                      <div className="flex items-center gap-1">
                        <BookOpen className="w-4 h-4" />
                        <span>{test.questionCount} questions</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>~2.5 hours</span>
                      </div>
                    </div>

                    {/* Action */}
                    {isOwned ? (
                      <Link
                        href="/dashboard/purchases"
                        className="w-full py-2.5 rounded-lg font-medium bg-[var(--grass-light)]/30 text-[var(--grass-dark)] flex items-center justify-center gap-2"
                      >
                        <Download className="w-4 h-4" />
                        Download
                      </Link>
                    ) : user ? (
                      <div className="flex gap-2">
                        <button
                          onClick={() => toggleTestSelection(test._id)}
                          className={`flex-1 py-2.5 rounded-lg font-medium transition-colors ${
                            isSelected
                              ? "bg-[var(--grass-dark)] text-white"
                              : "bg-[var(--paper-warm)] text-[var(--ink-black)] hover:bg-[var(--paper-aged)]"
                          }`}
                        >
                          {isSelected ? "Selected" : "Select"}
                        </button>
                        <button
                          onClick={() => {
                            setSelectedTests(new Set([test._id]));
                            handleCheckout("single");
                          }}
                          disabled={isCheckingOut}
                          className="px-4 py-2.5 rounded-lg font-medium bg-[var(--grass-dark)] text-white hover:bg-[var(--forest)] transition-colors disabled:opacity-50"
                        >
                          $20
                        </button>
                      </div>
                    ) : (
                      <SignInButton mode="modal">
                        <button className="w-full py-2.5 rounded-lg font-medium bg-[var(--paper-warm)] text-[var(--ink-black)] hover:bg-[var(--paper-aged)]">
                          Sign in to purchase
                        </button>
                      </SignInButton>
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Checkout bar */}
          {selectedTests.size > 0 && user && (
            <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[var(--paper-lines)] p-4 shadow-lg">
              <div className="max-w-4xl mx-auto flex items-center justify-between">
                <div>
                  <span className="font-body text-[var(--ink-faded)]">
                    {selectedTests.size} test{selectedTests.size !== 1 && "s"}{" "}
                    selected
                  </span>
                  <span className="font-display text-xl font-bold text-[var(--ink-black)] ml-4">
                    {selectedTests.size === 5
                      ? "$50"
                      : `$${selectedTests.size * 20}`}
                    {selectedTests.size === 5 && (
                      <span className="text-sm text-[var(--grass-dark)] ml-2">
                        (Bundle price!)
                      </span>
                    )}
                  </span>
                </div>
                <button
                  onClick={() =>
                    handleCheckout(
                      selectedTests.size === 5 ? "bundle" : "single"
                    )
                  }
                  disabled={
                    isCheckingOut ||
                    (selectedTests.size !== 1 && selectedTests.size !== 5)
                  }
                  className="btn-grass flex items-center gap-2 disabled:opacity-50"
                >
                  {isCheckingOut ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      Checkout
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>
              {selectedTests.size !== 1 && selectedTests.size !== 5 && (
                <p className="text-center text-sm text-[var(--barn-red)] mt-2">
                  Select exactly 1 test ($20) or 5 tests ($50 bundle)
                </p>
              )}
            </div>
          )}

          {error && (
            <div className="mt-6 p-4 bg-red-50 border border-red-200 rounded-xl text-center">
              <p className="font-body text-red-600">{error}</p>
            </div>
          )}
        </div>
      </section>

      {/* Features */}
      <section className="py-16 px-6 bg-[var(--paper-warm)]">
        <div className="max-w-4xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-[var(--ink-black)] text-center mb-12">
            What You Get
          </h2>
          <div className="grid md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="w-12 h-12 bg-[var(--grass-light)]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <FileText className="w-6 h-6 text-[var(--grass-dark)]" />
              </div>
              <h3 className="font-display text-lg font-bold text-[var(--ink-black)] mb-2">
                Full-Length Tests
              </h3>
              <p className="font-body text-sm text-[var(--ink-faded)]">
                98 questions covering all SAT sections - Reading, Writing, and
                Math
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[var(--grass-light)]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <CheckCircle2 className="w-6 h-6 text-[var(--grass-dark)]" />
              </div>
              <h3 className="font-display text-lg font-bold text-[var(--ink-black)] mb-2">
                Answer Keys
              </h3>
              <p className="font-body text-sm text-[var(--ink-faded)]">
                Detailed answer explanations for every question to learn from
                mistakes
              </p>
            </div>
            <div className="text-center">
              <div className="w-12 h-12 bg-[var(--grass-light)]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Download className="w-6 h-6 text-[var(--grass-dark)]" />
              </div>
              <h3 className="font-display text-lg font-bold text-[var(--ink-black)] mb-2">
                Instant Download
              </h3>
              <p className="font-body text-sm text-[var(--ink-faded)]">
                Print at home and practice anytime - unlimited downloads after
                purchase
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* FAQ */}
      <section className="py-16 px-6">
        <div className="max-w-3xl mx-auto">
          <h2 className="font-display text-2xl font-bold text-[var(--ink-black)] text-center mb-12">
            Frequently Asked Questions
          </h2>
          <div className="space-y-6">
            <div className="bg-white rounded-xl border border-[var(--paper-lines)] p-6">
              <h3 className="font-display text-lg font-bold text-[var(--ink-black)] mb-2">
                How do I access my tests after purchase?
              </h3>
              <p className="font-body text-[var(--ink-faded)]">
                After payment, you&apos;ll be redirected to your downloads page.
                You can also access all your purchased tests anytime from the
                &quot;My Tests&quot; section in your dashboard.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-[var(--paper-lines)] p-6">
              <h3 className="font-display text-lg font-bold text-[var(--ink-black)] mb-2">
                Can I print the tests multiple times?
              </h3>
              <p className="font-body text-[var(--ink-faded)]">
                Yes! Once purchased, you can download and print each test as
                many times as you need. Great for retakes or multiple students.
              </p>
            </div>
            <div className="bg-white rounded-xl border border-[var(--paper-lines)] p-6">
              <h3 className="font-display text-lg font-bold text-[var(--ink-black)] mb-2">
                Are these official College Board tests?
              </h3>
              <p className="font-body text-[var(--ink-faded)]">
                These are high-quality practice tests designed to match the
                official SAT format, difficulty, and question types. They&apos;re
                created using our extensive question bank.
              </p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default function StorePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-[var(--paper-cream)] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-[var(--grass-dark)]" />
        </div>
      }
    >
      <StorePageContent />
    </Suspense>
  );
}
