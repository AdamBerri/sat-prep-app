"use client";

import { useSearchParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { CheckCircle, Download, FileText, ArrowRight, Loader2 } from "lucide-react";
import { Suspense, useState } from "react";
import { Id } from "../../../../convex/_generated/dataModel";

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

function SuccessContent() {
  const searchParams = useSearchParams();
  const sessionId = searchParams.get("session_id");
  const { user } = useUser();

  const purchase = useQuery(
    api.pdfTests.getPurchaseByStripeSession,
    sessionId ? { stripeCheckoutSessionId: sessionId } : "skip"
  );

  const [downloadingTest, setDownloadingTest] = useState<string | null>(null);
  const [downloadingAnswers, setDownloadingAnswers] = useState<string | null>(null);
  const recordDownload = useMutation(api.pdfTests.recordDownload);

  // Get full test details for each purchased test
  const testIds = purchase?.testIds || [];
  const tests = useQuery(
    api.pdfTests.getActiveTests,
    {}
  );

  const purchasedTests = tests?.filter((test: PDFTest) =>
    testIds.includes(test._id)
  ) || [];

  const handleDownload = async (
    testId: Id<"pdfTests">,
    fileType: "test" | "answers"
  ) => {
    if (!user?.id) return;

    const setDownloading = fileType === "test" ? setDownloadingTest : setDownloadingAnswers;
    setDownloading(testId);

    try {
      // Get the download URL
      const response = await fetch(`/api/download/pdf?testId=${testId}&fileType=${fileType}`);
      const data = await response.json();

      if (data.url) {
        // Record the download
        await recordDownload({ userId: user.id, testId });

        // Open download in new tab
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setDownloading(null);
    }
  };

  if (!sessionId) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Invalid Session</h1>
          <p className="text-slate-400 mb-6">No checkout session found.</p>
          <Link
            href="/store"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Back to Store
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </div>
    );
  }

  if (purchase === undefined) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading your purchase...</span>
        </div>
      </div>
    );
  }

  if (!purchase) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-white mb-4">Purchase Not Found</h1>
          <p className="text-slate-400 mb-6">
            We couldn&apos;t find this purchase. It may still be processing.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link
              href="/dashboard/purchases"
              className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              View My Purchases
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/store"
              className="inline-flex items-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Back to Store
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const isPending = purchase.paymentStatus === "pending";

  return (
    <div className="min-h-screen bg-slate-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        {/* Success Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-green-500/20 mb-6">
            <CheckCircle className="w-10 h-10 text-green-500" />
          </div>
          <h1 className="text-3xl font-bold text-white mb-3">
            {isPending ? "Processing Payment..." : "Purchase Complete!"}
          </h1>
          <p className="text-slate-400 text-lg">
            {isPending
              ? "Your payment is being processed. Downloads will be available shortly."
              : "Thank you for your purchase. Your tests are ready to download."}
          </p>
        </div>

        {/* Purchase Details */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 mb-8">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-slate-800">
            <div>
              <p className="text-slate-400 text-sm">Order Total</p>
              <p className="text-2xl font-bold text-white">
                ${(purchase.amountPaid / 100).toFixed(2)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-slate-400 text-sm">Purchase Type</p>
              <p className="text-white font-medium capitalize">
                {purchase.purchaseType === "bundle" ? "5-Test Bundle" : "Single Test"}
              </p>
            </div>
          </div>

          {/* Test Downloads */}
          <h2 className="text-lg font-semibold text-white mb-4">Your Tests</h2>

          {isPending ? (
            <div className="text-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-violet-500 mx-auto mb-4" />
              <p className="text-slate-400">
                Waiting for payment confirmation...
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {purchasedTests.length > 0 ? (
                purchasedTests.map((test: PDFTest) => (
                  <div
                    key={test._id}
                    className="bg-slate-800 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-violet-500/20 rounded-lg">
                        <FileText className="w-5 h-5 text-violet-400" />
                      </div>
                      <div>
                        <p className="font-medium text-white">{test.name}</p>
                        <p className="text-sm text-slate-400">
                          {test.questionCount} questions • {test.difficulty}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleDownload(test._id, "test")}
                        disabled={downloadingTest === test._id}
                        className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-600/50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        {downloadingTest === test._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        Test PDF
                      </button>
                      <button
                        onClick={() => handleDownload(test._id, "answers")}
                        disabled={downloadingAnswers === test._id}
                        className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 text-white px-4 py-2 rounded-lg text-sm font-medium transition-colors"
                      >
                        {downloadingAnswers === test._id ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                        Answers
                      </button>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-slate-400 text-center py-4">
                  Loading test details...
                </p>
              )}
            </div>
          )}
        </div>

        {/* Next Steps */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-6">
          <h3 className="font-semibold text-white mb-3">What&apos;s Next?</h3>
          <ul className="space-y-2 text-slate-400 mb-6">
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-1">•</span>
              Download your tests and print them for the most authentic experience
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-1">•</span>
              Set aside 2-3 hours of uninterrupted time
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-1">•</span>
              Use the answer key to grade and review your work
            </li>
            <li className="flex items-start gap-2">
              <span className="text-violet-400 mt-1">•</span>
              Access your downloads anytime from your dashboard
            </li>
          </ul>
          <div className="flex flex-col sm:flex-row gap-3">
            <Link
              href="/dashboard/purchases"
              className="flex-1 flex items-center justify-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Go to My Purchases
              <ArrowRight className="w-4 h-4" />
            </Link>
            <Link
              href="/store"
              className="flex-1 flex items-center justify-center gap-2 bg-slate-700 hover:bg-slate-600 text-white px-6 py-3 rounded-lg font-medium transition-colors"
            >
              Browse More Tests
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function StoreSuccessPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
          <div className="flex items-center gap-3 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span>Loading...</span>
          </div>
        </div>
      }
    >
      <SuccessContent />
    </Suspense>
  );
}
