"use client";

import Link from "next/link";
import { Leaf } from "lucide-react";
import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";

export default function ArticleNav() {
  return (
    <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--paper-cream)]/95 backdrop-blur-sm border-b border-[var(--paper-lines)]">
      <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-[var(--grass-medium)] to-[var(--forest)] rounded-lg flex items-center justify-center">
            <Leaf className="w-6 h-6 text-white" />
          </div>
          <span className="font-display text-2xl font-bold text-[var(--ink-black)]">
            the1600club
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-8">
          <Link
            href="/articles"
            className="font-body text-[var(--grass-dark)] font-medium"
          >
            Articles
          </Link>
          <Link
            href="/#features"
            className="font-body text-[var(--ink-faded)] hover:text-[var(--grass-dark)] transition-colors"
          >
            Features
          </Link>
          <Link
            href="/#pricing"
            className="font-body text-[var(--ink-faded)] hover:text-[var(--grass-dark)] transition-colors"
          >
            Pricing
          </Link>
        </div>

        <div className="flex items-center gap-4">
          <SignedOut>
            <SignInButton mode="modal">
              <button className="btn-grass">Start Practicing</button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link href="/dashboard" className="btn-grass">
              Dashboard
            </Link>
            <UserButton
              appearance={{
                elements: {
                  avatarBox: "w-10 h-10",
                },
              }}
            />
          </SignedIn>
        </div>
      </div>
    </nav>
  );
}
