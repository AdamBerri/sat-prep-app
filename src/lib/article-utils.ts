// Client-safe article utilities (no fs imports)

export type ArticleCategory =
  | "philosophy"
  | "strategy"
  | "math"
  | "reading-writing"
  | "test-day";

export interface ArticleFrontmatter {
  title: string;
  description: string;
  date: string;
  lastUpdated?: string;
  author: string;
  category: ArticleCategory;
  tags: string[];
  featuredImage?: string;
  published: boolean;
}

export interface Article {
  slug: string;
  frontmatter: ArticleFrontmatter;
  content: string;
  readingTime: string;
}

export function formatCategory(category: ArticleCategory): string {
  const labels: Record<ArticleCategory, string> = {
    philosophy: "Philosophy",
    strategy: "Strategy",
    math: "Math",
    "reading-writing": "Reading & Writing",
    "test-day": "Test Day",
  };
  return labels[category] || category;
}

export function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}
