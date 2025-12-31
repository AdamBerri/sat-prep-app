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
    // Redirect authenticated users to dashboard
    if (isLoaded && user) {
      router.push("/dashboard");
    }
  }, [isLoaded, user, router]);

  // Loading state
  if (!isLoaded) {
    return (
      <div className="min-h-screen bg-[var(--paper-cream)] flex items-center justify-center">
        <div className="text-center">
          <Leaf className="w-12 h-12 text-[var(--grass-dark)] mx-auto mb-4 animate-pulse" />
          <p className="font-body text-[var(--ink-faded)]">Loading...</p>
        </div>
      </div>
    );
  }

  // If user is logged in, show loading while redirecting
  if (user) {
    return (
      <div className="min-h-screen bg-[var(--paper-cream)] flex items-center justify-center">
        <div className="text-center">
          <Leaf className="w-12 h-12 text-[var(--grass-dark)] mx-auto mb-4 animate-pulse" />
          <p className="font-body text-[var(--ink-faded)]">Redirecting to dashboard...</p>
        </div>
      </div>
    );
  }

  // Show landing page for non-authenticated users
  const handleStartPractice = () => {
    // This will trigger Clerk's sign-in modal via the LandingPage button
  };

  return <LandingPage onStartPractice={handleStartPractice} />;
}
