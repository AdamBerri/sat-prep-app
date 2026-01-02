import { Metadata } from "next";
import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";
import { getArticleBySlug, getArticleSlugs, getAllArticles } from "@/lib/mdx";
import { MDXComponents } from "@/components/articles/MDXComponents";
import ArticleHeader from "@/components/articles/ArticleHeader";
import ArticleNav from "@/components/articles/ArticleNav";
import ArticleCard from "@/components/articles/ArticleCard";

interface Props {
  params: Promise<{ slug: string }>;
}

// Static generation for all article pages
export async function generateStaticParams() {
  const slugs = getArticleSlugs();
  return slugs.map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article) {
    return { title: "Article Not Found" };
  }

  const { frontmatter } = article;

  return {
    title: `${frontmatter.title} | 1600Club`,
    description: frontmatter.description,
    authors: [{ name: frontmatter.author }],
    openGraph: {
      title: frontmatter.title,
      description: frontmatter.description,
      type: "article",
      publishedTime: frontmatter.date,
      modifiedTime: frontmatter.lastUpdated,
      authors: [frontmatter.author],
      tags: frontmatter.tags,
    },
    twitter: {
      card: "summary_large_image",
      title: frontmatter.title,
      description: frontmatter.description,
    },
  };
}

export default async function ArticlePage({ params }: Props) {
  const { slug } = await params;
  const article = getArticleBySlug(slug);

  if (!article || !article.frontmatter.published) {
    notFound();
  }

  // Get related articles (same category, excluding current)
  const allArticles = getAllArticles();
  const relatedArticles = allArticles
    .filter(
      (a) =>
        a.frontmatter.category === article.frontmatter.category &&
        a.slug !== slug
    )
    .slice(0, 2);

  // JSON-LD structured data
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: article.frontmatter.title,
    description: article.frontmatter.description,
    author: {
      "@type": "Organization",
      name: "1600Club",
    },
    publisher: {
      "@type": "Organization",
      name: "1600Club",
    },
    datePublished: article.frontmatter.date,
    dateModified: article.frontmatter.lastUpdated || article.frontmatter.date,
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <div className="min-h-screen bg-[var(--paper-cream)]">
        <ArticleNav />

        <ArticleHeader
          title={article.frontmatter.title}
          description={article.frontmatter.description}
          date={article.frontmatter.date}
          readingTime={article.readingTime}
          category={article.frontmatter.category}
        />

        {/* Article Content */}
        <article className="py-12 px-6">
          <div className="max-w-3xl mx-auto">
            {/* Back link */}
            <Link
              href="/articles"
              className="inline-flex items-center gap-2 text-[var(--grass-dark)] font-body text-sm mb-8 hover:underline"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Articles
            </Link>

            {/* MDX Content */}
            <div className="article-content">
              <MDXRemote
                source={article.content}
                components={MDXComponents}
              />
            </div>

            {/* Tags */}
            {article.frontmatter.tags.length > 0 && (
              <div className="mt-12 pt-8 border-t border-[var(--paper-lines)]">
                <div className="flex flex-wrap gap-2">
                  {article.frontmatter.tags.map((tag) => (
                    <span
                      key={tag}
                      className="bg-[var(--paper-aged)] text-[var(--ink-faded)] font-body text-xs px-3 py-1 rounded-full"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        </article>

        {/* Related Articles */}
        {relatedArticles.length > 0 && (
          <section className="py-16 px-6 bg-[var(--paper-warm)]">
            <div className="max-w-6xl mx-auto">
              <h2 className="font-display text-2xl font-bold text-[var(--ink-black)] mb-8 text-center">
                Related Articles
              </h2>
              <div className="grid md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                {relatedArticles.map((relatedArticle) => (
                  <ArticleCard
                    key={relatedArticle.slug}
                    article={relatedArticle}
                  />
                ))}
              </div>
            </div>
          </section>
        )}

        {/* Footer */}
        <footer className="py-12 px-6 bg-[var(--forest)] text-white">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row items-center justify-between gap-6">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-white" />
                </div>
                <span className="font-display text-xl font-bold">1600Club</span>
              </div>
              <p className="font-body text-white/60 text-sm">
                © 2024 1600Club. Every question brings you closer to 1600.
              </p>
            </div>
          </div>
        </footer>
      </div>
    </>
  );
}
