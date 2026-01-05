import { Metadata } from "next";
import { BookOpen, Sparkles } from "lucide-react";
import { getAllArticles } from "@/lib/mdx";
import ArticleCard from "@/components/articles/ArticleCard";
import ArticleNav from "@/components/articles/ArticleNav";

export const metadata: Metadata = {
  title: "SAT Prep Articles & Strategies | the1600Club",
  description:
    "Expert SAT prep strategies, study tips, and test-taking advice to help you achieve your best score. Free resources from the1600Club.",
  openGraph: {
    title: "SAT Prep Articles & Strategies | the1600Club",
    description: "Expert SAT prep strategies and study tips.",
    type: "website",
  },
};

export default function ArticlesPage() {
  const articles = getAllArticles();

  return (
    <div className="min-h-screen bg-[var(--paper-cream)]">
      <ArticleNav />

      {/* Hero Section */}
      <section className="relative pt-32 pb-16 px-6 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-40 left-10 opacity-10">
          <BookOpen className="w-32 h-32 text-[var(--grass-dark)] float-animation" />
        </div>
        <div className="absolute bottom-10 right-10 opacity-10">
          <Sparkles className="w-24 h-24 text-[var(--sunflower)]" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative">
          <div className="inline-flex items-center gap-2 bg-[var(--grass-light)]/20 border border-[var(--grass-medium)]/30 rounded-full px-4 py-2 mb-8">
            <BookOpen className="w-4 h-4 text-[var(--grass-dark)]" />
            <span className="font-body text-sm text-[var(--grass-dark)] font-medium">
              SAT Prep Resources
            </span>
          </div>

          <h1 className="font-display text-4xl md:text-6xl font-bold text-[var(--ink-black)] leading-tight mb-6">
            Strategies for{" "}
            <span className="text-[var(--grass-dark)]">Success</span>
          </h1>

          <p className="font-body text-xl text-[var(--ink-faded)] max-w-2xl mx-auto">
            Expert advice, proven strategies, and mindset tips to help you reach
            your SAT goals.
          </p>
        </div>
      </section>

      {/* Articles Grid */}
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          {articles.length === 0 ? (
            <div className="text-center py-16">
              <p className="font-body text-[var(--ink-faded)] text-lg">
                Articles coming soon! Check back for SAT prep tips and strategies.
              </p>
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {articles.map((article) => (
                <ArticleCard key={article.slug} article={article} />
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-6 bg-[var(--forest)] text-white mt-16">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <BookOpen className="w-6 h-6 text-white" />
              </div>
              <span className="font-display text-xl font-bold">the1600Club</span>
            </div>
            <p className="font-body text-white/60 text-sm">
              © 2024 the1600Club. Every question brings you closer to 1600.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
