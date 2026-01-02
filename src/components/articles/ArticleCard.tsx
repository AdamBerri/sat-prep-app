"use client";

import Link from "next/link";
import { Calendar, Clock, ArrowRight } from "lucide-react";
import type { Article } from "@/lib/article-utils";
import { formatCategory, formatDate } from "@/lib/article-utils";

interface ArticleCardProps {
  article: Article;
}

export default function ArticleCard({ article }: ArticleCardProps) {
  const { slug, frontmatter, readingTime } = article;

  return (
    <Link href={`/articles/${slug}`}>
      <article className="card-paper p-6 rounded-xl hover:shadow-lg transition-all group h-full flex flex-col">
        {/* Category badge */}
        <span className="inline-block bg-[var(--grass-light)]/30 text-[var(--grass-dark)] font-body text-xs font-medium px-2 py-1 rounded-full mb-4 self-start">
          {formatCategory(frontmatter.category)}
        </span>

        {/* Title */}
        <h3 className="font-display text-xl font-bold text-[var(--ink-black)] mb-3 group-hover:text-[var(--grass-dark)] transition-colors">
          {frontmatter.title}
        </h3>

        {/* Description */}
        <p className="font-body text-[var(--ink-faded)] text-sm leading-relaxed mb-4 flex-grow">
          {frontmatter.description}
        </p>

        {/* Meta footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[var(--paper-lines)]">
          <div className="flex items-center gap-4 text-[var(--ink-faded)] font-body text-xs">
            <span className="flex items-center gap-1">
              <Calendar className="w-3 h-3" />
              {formatDate(frontmatter.date)}
            </span>
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {readingTime}
            </span>
          </div>

          <ArrowRight className="w-4 h-4 text-[var(--grass-dark)] opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </article>
    </Link>
  );
}
