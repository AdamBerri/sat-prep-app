"use client";

import "./globals.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
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
