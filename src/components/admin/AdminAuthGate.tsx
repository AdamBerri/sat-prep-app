"use client";

import { useUser } from "@clerk/nextjs";
import { useRouter } from "next/navigation";
import { ReactNode, useEffect } from "react";
import { Leaf, ShieldAlert } from "lucide-react";

// Add your Clerk user ID(s) here
// You can find your user ID in the Clerk dashboard or by logging user.id
const ADMIN_USER_IDS = [
  // TODO: Replace with your actual Clerk user ID
  "user_37cskzgq1J7XSMYvkCq6JOQD7ep",
];

interface AdminAuthGateProps {
  children: ReactNode;
}

export function AdminAuthGate({ children }: AdminAuthGateProps) {
  const { user, isLoaded } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (isLoaded && user) {
      // Log user ID to help find it
      console.log("Current user ID:", user.id);
    }
  }, [isLoaded, user]);

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

  // Not authenticated
  if (!user) {
    return (
      <div className="min-h-screen bg-[var(--paper-cream)] flex items-center justify-center">
        <div className="text-center">
          <ShieldAlert className="w-12 h-12 text-[var(--barn-red)] mx-auto mb-4" />
          <h1 className="font-display text-xl font-bold text-[var(--ink-black)] mb-2">
            Authentication Required
          </h1>
          <p className="font-body text-[var(--ink-faded)] mb-4">
            Please sign in to access the admin dashboard.
          </p>
          <button
            onClick={() => router.push("/sign-in")}
            className="btn-grass"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Not an admin
  if (!ADMIN_USER_IDS.includes(user.id)) {
    return (
      <div className="min-h-screen bg-[var(--paper-cream)] flex items-center justify-center">
        <div className="text-center max-w-md">
          <ShieldAlert className="w-12 h-12 text-[var(--barn-red)] mx-auto mb-4" />
          <h1 className="font-display text-xl font-bold text-[var(--ink-black)] mb-2">
            Access Denied
          </h1>
          <p className="font-body text-[var(--ink-faded)] mb-4">
            You don&apos;t have permission to access the admin dashboard.
          </p>
          <p className="font-body text-xs text-[var(--ink-faded)] mb-4 font-mono bg-[var(--paper-lines)] p-2 rounded">
            Your ID: {user.id}
          </p>
          <button
            onClick={() => router.push("/dashboard")}
            className="btn-grass"
          >
            Go to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
