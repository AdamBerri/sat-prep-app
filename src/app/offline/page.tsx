"use client";

import { WifiOff, RefreshCw } from "lucide-react";

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--paper-cream)] p-4">
      <div className="max-w-md w-full text-center">
        <div className="mb-8">
          <div className="inline-flex items-center justify-center w-24 h-24 rounded-full bg-[var(--barn-red)]/10 mb-6">
            <WifiOff className="w-12 h-12 text-[var(--barn-red)]" />
          </div>
          <h1 className="text-3xl font-bold text-[var(--wood-brown)] mb-4">
            You're Offline
          </h1>
          <p className="text-[var(--wood-brown)]/70 text-lg mb-8">
            It looks like you've lost your internet connection. Check your connection and try again.
          </p>
        </div>

        <button
          onClick={handleRetry}
          className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-[var(--grass-green)] text-white font-semibold rounded-lg hover:bg-[var(--grass-green)]/90 transition-colors"
        >
          <RefreshCw className="w-5 h-5" />
          Try Again
        </button>

        <p className="mt-8 text-sm text-[var(--wood-brown)]/50">
          1600Club needs an internet connection to load your practice questions and sync your progress.
        </p>
      </div>
    </div>
  );
}
