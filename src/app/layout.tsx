"use client";

import "./globals.css";
import "katex/dist/katex.min.css";
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ReactNode } from "react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

const clerkAppearance = {
  variables: {
    colorPrimary: "#5a8f4e",
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider appearance={clerkAppearance}>
      <html lang="en">
        <head>
          <title>1600Club - Join the club. Get the score.</title>
          <meta name="description" content="Your path to the perfect SAT score. Gamified practice, adaptive learning, unlimited questions. Level up to 1600." />
        </head>
        <body className="min-h-screen">
          <ConvexProvider client={convex}>{children}</ConvexProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
