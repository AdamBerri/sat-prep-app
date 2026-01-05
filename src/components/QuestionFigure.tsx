"use client";

import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";

type FigureType = "graph" | "geometric" | "data_display" | "diagram" | "table";

interface QuestionFigureProps {
  imageId: Id<"images">;
  figureType?: FigureType;
  caption?: string;
  className?: string;
}

/**
 * Display a figure/graph image for a question.
 * Fetches the image URL from Convex storage and displays it.
 */
export function QuestionFigure({
  imageId,
  figureType,
  caption,
  className = "",
}: QuestionFigureProps) {
  const imageUrl = useQuery(api.images.getImageUrl, { imageId });

  // Loading state
  if (imageUrl === undefined) {
    return (
      <div
        className={`bg-[var(--paper-aged)] rounded-lg animate-pulse ${className}`}
      >
        <div className="aspect-[3/2] flex items-center justify-center">
          <span className="text-[var(--ink-faded)] text-sm font-body">
            Loading figure...
          </span>
        </div>
      </div>
    );
  }

  // Error state - image not found
  if (imageUrl === null) {
    return (
      <div
        className={`bg-[var(--paper-warm)] rounded-lg border border-[var(--paper-lines)] ${className}`}
      >
        <div className="aspect-[3/2] flex items-center justify-center">
          <span className="text-[var(--ink-faded)] text-sm font-body">
            Figure unavailable
          </span>
        </div>
      </div>
    );
  }

  return (
    <figure className={className}>
      <div className="bg-white rounded-lg border border-[var(--paper-lines)] overflow-hidden shadow-sm">
        <img
          src={imageUrl}
          alt={caption || `${figureType || "Figure"} for this question`}
          className="w-full h-auto"
          loading="lazy"
        />
      </div>
      {caption && (
        <figcaption className="text-sm text-[var(--ink-faded)] mt-2 text-center font-body italic">
          {caption}
        </figcaption>
      )}
    </figure>
  );
}
