"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../convex/_generated/api";
import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import {
  Download,
  FileText,
  ShoppingBag,
  Loader2,
  Calendar,
  Package,
} from "lucide-react";
import { useState } from "react";
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

type Purchase = {
  _id: Id<"pdfPurchases">;
  userId: string;
  purchaseType: "single" | "bundle";
  testIds: Id<"pdfTests">[];
  amountPaid: number;
  stripeCheckoutSessionId: string;
  paymentStatus: "pending" | "completed" | "failed" | "refunded";
  downloadCount: number;
  createdAt: number;
  tests: PDFTest[];
};

type TestWithPurchaseInfo = PDFTest & {
  purchaseDate: number;
  purchaseType: "single" | "bundle";
};

export default function PurchasesPage() {
  const { user } = useUser();
  const purchases = useQuery(
    api.pdfTests.getUserPurchases,
    user?.id ? { userId: user.id } : "skip"
  );

  const [downloadingTest, setDownloadingTest] = useState<string | null>(null);
  const [downloadingAnswers, setDownloadingAnswers] = useState<string | null>(null);
  const recordDownload = useMutation(api.pdfTests.recordDownload);

  const handleDownload = async (
    testId: Id<"pdfTests">,
    fileType: "test" | "answers"
  ) => {
    if (!user?.id) return;

    const setDownloading =
      fileType === "test" ? setDownloadingTest : setDownloadingAnswers;
    setDownloading(testId);

    try {
      const response = await fetch(
        `/api/download/pdf?testId=${testId}&fileType=${fileType}`
      );
      const data = await response.json();

      if (data.url) {
        await recordDownload({ userId: user.id, testId });
        window.open(data.url, "_blank");
      }
    } catch (error) {
      console.error("Download error:", error);
    } finally {
      setDownloading(null);
    }
  };

  if (purchases === undefined) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="flex items-center gap-3 text-slate-400">
          <Loader2 className="w-6 h-6 animate-spin" />
          <span>Loading purchases...</span>
        </div>
      </div>
    );
  }

  // Flatten all tests from all purchases
  const allTests: TestWithPurchaseInfo[] = (purchases as Purchase[]).flatMap(
    (purchase: Purchase) =>
      purchase.tests.map((test: PDFTest) => ({
        ...test,
        purchaseDate: purchase.createdAt,
        purchaseType: purchase.purchaseType,
      }))
  );

  // Remove duplicates (in case same test was in multiple purchases)
  const uniqueTests = allTests.filter(
    (test: TestWithPurchaseInfo, index: number, self: TestWithPurchaseInfo[]) =>
      index === self.findIndex((t: TestWithPurchaseInfo) => t._id === test._id)
  );

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-white mb-2">My Practice Tests</h1>
        <p className="text-slate-400">
          Download your purchased SAT practice tests and answer keys
        </p>
      </div>

      {uniqueTests.length === 0 ? (
        /* Empty State */
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-12 text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-slate-800 mb-6">
            <ShoppingBag className="w-8 h-8 text-slate-500" />
          </div>
          <h2 className="text-xl font-semibold text-white mb-3">
            No Tests Yet
          </h2>
          <p className="text-slate-400 mb-6 max-w-md mx-auto">
            You haven&apos;t purchased any practice tests yet. Browse our store
            to find full-length SAT practice tests with detailed answer keys.
          </p>
          <Link
            href="/store"
            className="inline-flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-lg font-medium transition-colors"
          >
            Browse Tests
            <Package className="w-4 h-4" />
          </Link>
        </div>
      ) : (
        /* Tests Grid */
        <div className="space-y-4">
          {uniqueTests.map((test: TestWithPurchaseInfo) => (
            <div
              key={test._id}
              className="bg-slate-900 border border-slate-800 rounded-xl p-5 hover:border-slate-700 transition-colors"
            >
              <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                {/* Test Info */}
                <div className="flex items-start gap-4">
                  <div className="p-3 bg-violet-500/20 rounded-xl shrink-0">
                    <FileText className="w-6 h-6 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-white text-lg">
                      {test.name}
                    </h3>
                    <p className="text-slate-400 text-sm mb-2">
                      {test.description}
                    </p>
                    <div className="flex flex-wrap items-center gap-3 text-sm">
                      <span className="text-slate-500">
                        {test.questionCount} questions
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="capitalize text-slate-500">
                        {test.difficulty} difficulty
                      </span>
                      <span className="text-slate-600">•</span>
                      <span className="flex items-center gap-1 text-slate-500">
                        <Calendar className="w-3.5 h-3.5" />
                        Purchased{" "}
                        {new Date(test.purchaseDate).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Download Buttons */}
                <div className="flex gap-2 lg:shrink-0">
                  <button
                    onClick={() => handleDownload(test._id, "test")}
                    disabled={downloadingTest === test._id}
                    className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 disabled:bg-violet-600/50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
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
                    className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:bg-slate-700/50 text-white px-4 py-2.5 rounded-lg text-sm font-medium transition-colors"
                  >
                    {downloadingAnswers === test._id ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Download className="w-4 h-4" />
                    )}
                    Answer Key
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Get More Tests CTA */}
          <div className="bg-gradient-to-r from-violet-900/30 to-indigo-900/30 border border-violet-800/50 rounded-xl p-6 mt-8">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-semibold text-white mb-1">
                  Want more practice?
                </h3>
                <p className="text-slate-400 text-sm">
                  Get 5 tests for $50 and save 50% on each test
                </p>
              </div>
              <Link
                href="/store"
                className="bg-violet-600 hover:bg-violet-700 text-white px-5 py-2.5 rounded-lg font-medium transition-colors whitespace-nowrap"
              >
                Browse Store
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* Purchase History Section */}
      {purchases.length > 0 && (
        <div className="mt-12">
          <h2 className="text-lg font-semibold text-white mb-4">
            Purchase History
          </h2>
          <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left text-slate-400 text-sm font-medium px-4 py-3">
                    Date
                  </th>
                  <th className="text-left text-slate-400 text-sm font-medium px-4 py-3">
                    Type
                  </th>
                  <th className="text-left text-slate-400 text-sm font-medium px-4 py-3">
                    Tests
                  </th>
                  <th className="text-right text-slate-400 text-sm font-medium px-4 py-3">
                    Amount
                  </th>
                </tr>
              </thead>
              <tbody>
                {(purchases as Purchase[]).map((purchase: Purchase) => (
                  <tr
                    key={purchase._id}
                    className="border-b border-slate-800 last:border-0"
                  >
                    <td className="px-4 py-3 text-slate-300 text-sm">
                      {new Date(purchase.createdAt).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`inline-flex px-2 py-0.5 rounded text-xs font-medium ${
                          purchase.purchaseType === "bundle"
                            ? "bg-violet-500/20 text-violet-300"
                            : "bg-slate-700 text-slate-300"
                        }`}
                      >
                        {purchase.purchaseType === "bundle"
                          ? "5-Test Bundle"
                          : "Single Test"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-300 text-sm">
                      {purchase.tests.length} test
                      {purchase.tests.length !== 1 ? "s" : ""}
                    </td>
                    <td className="px-4 py-3 text-white text-sm text-right font-medium">
                      ${(purchase.amountPaid / 100).toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
