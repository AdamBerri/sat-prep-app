"use client";

import { useMemo } from "react";
import { InlineMath, BlockMath } from "react-katex";

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * Renders text with embedded LaTeX math expressions.
 * - Inline math: $...$
 * - Display math: $$...$$
 *
 * Example: "If $3x + 7 = 22$, what is $x$?"
 */
export function MathText({ text, className = "" }: MathTextProps) {
  const segments = useMemo(() => {
    const parts: Array<{
      type: "text" | "inline" | "display";
      content: string;
    }> = [];

    // Match $$...$$ (display) first, then $...$ (inline)
    // Using a simple state machine approach to handle nested cases
    let remaining = text;
    let lastIndex = 0;

    while (remaining.length > 0) {
      // Check for display math first ($$...$$)
      const displayMatch = remaining.match(/^\$\$(.+?)\$\$/s);
      if (displayMatch) {
        parts.push({ type: "display", content: displayMatch[1] });
        remaining = remaining.slice(displayMatch[0].length);
        continue;
      }

      // Check for inline math ($...$)
      const inlineMatch = remaining.match(/^\$([^$]+?)\$/);
      if (inlineMatch) {
        parts.push({ type: "inline", content: inlineMatch[1] });
        remaining = remaining.slice(inlineMatch[0].length);
        continue;
      }

      // Find the next $ to know where text ends
      const nextDollar = remaining.indexOf("$");
      if (nextDollar === -1) {
        // No more math, rest is text
        parts.push({ type: "text", content: remaining });
        break;
      } else if (nextDollar > 0) {
        // Text before the next $
        parts.push({ type: "text", content: remaining.slice(0, nextDollar) });
        remaining = remaining.slice(nextDollar);
      } else {
        // Starts with $ but didn't match - treat as text and move on
        parts.push({ type: "text", content: "$" });
        remaining = remaining.slice(1);
      }
    }

    return parts;
  }, [text]);

  return (
    <span className={className}>
      {segments.map((segment, i) => {
        if (segment.type === "text") {
          return <span key={i}>{segment.content}</span>;
        }
        if (segment.type === "inline") {
          try {
            return <InlineMath key={i} math={segment.content} />;
          } catch {
            return (
              <span key={i} className="text-red-500">
                {segment.content}
              </span>
            );
          }
        }
        if (segment.type === "display") {
          try {
            return <BlockMath key={i} math={segment.content} />;
          } catch {
            return (
              <span key={i} className="text-red-500 block">
                {segment.content}
              </span>
            );
          }
        }
        return null;
      })}
    </span>
  );
}
