// Server-only MDX utilities (uses fs)
import fs from "fs";
import path from "path";
import matter from "gray-matter";
import readingTime from "reading-time";

export type {
  ArticleCategory,
  ArticleFrontmatter,
  Article,
} from "./article-utils";
export { formatCategory, formatDate } from "./article-utils";

import type { Article, ArticleFrontmatter } from "./article-utils";

const ARTICLES_PATH = path.join(process.cwd(), "src/content/articles");

export function getArticleSlugs(): string[] {
  if (!fs.existsSync(ARTICLES_PATH)) {
    return [];
  }
  return fs
    .readdirSync(ARTICLES_PATH)
    .filter((file) => file.endsWith(".mdx"))
    .map((file) => file.replace(/\.mdx$/, ""));
}

export function getArticleBySlug(slug: string): Article | null {
  const filePath = path.join(ARTICLES_PATH, `${slug}.mdx`);

  if (!fs.existsSync(filePath)) {
    return null;
  }

  const fileContents = fs.readFileSync(filePath, "utf8");
  const { data, content } = matter(fileContents);
  const stats = readingTime(content);

  return {
    slug,
    frontmatter: data as ArticleFrontmatter,
    content,
    readingTime: stats.text,
  };
}

export function getAllArticles(): Article[] {
  const slugs = getArticleSlugs();
  return slugs
    .map((slug) => getArticleBySlug(slug))
    .filter(
      (article): article is Article =>
        article !== null && article.frontmatter.published
    )
    .sort(
      (a, b) =>
        new Date(b.frontmatter.date).getTime() -
        new Date(a.frontmatter.date).getTime()
    );
}

export function getArticlesByCategory(
  category: Article["frontmatter"]["category"]
): Article[] {
  return getAllArticles().filter(
    (article) => article.frontmatter.category === category
  );
}
