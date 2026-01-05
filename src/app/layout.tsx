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
          <title>the1600Club - Join the club. Get the score.</title>
          <meta name="description" content="Your path to the perfect SAT score. Gamified practice, adaptive learning, unlimited questions. Level up to 1600." />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <meta name="theme-color" content="#8B4513" />
          <meta name="apple-mobile-web-app-capable" content="yes" />
          <meta name="apple-mobile-web-app-status-bar-style" content="default" />
          <meta name="apple-mobile-web-app-title" content="the1600Club" />
          <link rel="manifest" href="/manifest.json" />
          <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
          <link rel="icon" type="image/png" sizes="32x32" href="/icon-32.png" />
          <link rel="icon" type="image/png" sizes="16x16" href="/icon-16.png" />
        </head>
        <body className="min-h-screen">
          <ConvexProvider client={convex}>{children}</ConvexProvider>
        </body>
      </html>
    </ClerkProvider>
  );
}
