"use client";

import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const clerkAppearance = {
  variables: {
    fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
    fontFamilyButtons: "'Inter', system-ui, -apple-system, sans-serif",
  },
  elements: {
    formButtonPrimary: {
      backgroundColor: "#5a8f4e",
      "&:hover": {
        backgroundColor: "#3d6b35",
      },
    },
    card: {
      boxShadow: "0 2px 8px rgba(44, 36, 22, 0.1)",
      border: "1px solid #e0d6c8",
    },
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en">
        <head>
          <title>GreenScore - SAT Prep That Grows With You</title>
          <meta name="description" content="The fresh, natural way to prepare for the SAT. Unlimited practice, smart learning, real results." />
        </head>
        <body className="min-h-screen">
          <ConvexProvider client={convex}>{children}</ConvexProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
