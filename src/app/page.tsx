"use client";

import { useEffect } from "react";
import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import LandingPage from "@/components/LandingPage";
import { Leaf } from "lucide-react";

export default function HomePage() {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && user) {
      router.replace("/dashboard");
    }
  }, [isLoaded, user, router]);

  // Loading state or redirecting
  if (!isLoaded || user) {
    return (
      <div className="min-h-screen bg-[var(--paper-cream)] flex items-center justify-center">
        <div className="text-center">
          <Leaf className="w-12 h-12 text-[var(--grass-dark)] mx-auto mb-4 animate-pulse" />
          <p className="font-body text-[var(--ink-faded)]">
            {user ? "Redirecting to dashboard..." : "Loading..."}
          </p>
        </div>
      </div>
    );
  }

  // Show landing page for non-authenticated users
  return <LandingPage />;
}
