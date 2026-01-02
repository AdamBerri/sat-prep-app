import { Calendar, Clock } from "lucide-react";
import type { ArticleCategory } from "@/lib/article-utils";
import { formatCategory, formatDate } from "@/lib/article-utils";

interface ArticleHeaderProps {
  title: string;
  description: string;
  date: string;
  readingTime: string;
  category: ArticleCategory;
}

export default function ArticleHeader({
  title,
  description,
  date,
  readingTime,
  category,
}: ArticleHeaderProps) {
  return (
    <header className="relative pt-24 pb-12 px-6 bg-gradient-to-br from-[var(--forest)] to-[var(--grass-dark)]">
      <div className="max-w-4xl mx-auto text-center">
        {/* Category badge */}
        <span className="inline-block bg-white/20 text-white font-body text-sm px-3 py-1 rounded-full mb-6">
          {formatCategory(category)}
        </span>

        {/* Title */}
        <h1 className="font-display text-3xl md:text-5xl font-bold text-white mb-6 leading-tight">
          {title}
        </h1>

        {/* Description */}
        <p className="font-body text-lg text-white/80 max-w-2xl mx-auto mb-8">
          {description}
        </p>

        {/* Meta info */}
        <div className="flex items-center justify-center gap-6 text-white/60 font-body text-sm">
          <span className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {formatDate(date)}
          </span>
          <span className="flex items-center gap-2">
            <Clock className="w-4 h-4" />
            {readingTime}
          </span>
        </div>
      </div>
    </header>
  );
}
