import Link from "next/link";
import type { ComponentPropsWithoutRef, ReactNode } from "react";

// Custom callout components
function Tip({
  children,
  title = "Pro Tip",
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <div className="card-paper p-6 rounded-xl border-2 border-[var(--grass-medium)] my-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 bg-[var(--grass-light)] rounded-full flex items-center justify-center">
          <span className="text-lg">💡</span>
        </span>
        <span className="font-display font-bold text-[var(--grass-dark)]">
          {title}
        </span>
      </div>
      <div className="font-body text-[var(--ink-black)]">{children}</div>
    </div>
  );
}

function Warning({
  children,
  title = "Important",
}: {
  children: ReactNode;
  title?: string;
}) {
  return (
    <div className="card-paper p-6 rounded-xl border-2 border-[var(--barn-red)] my-8">
      <div className="flex items-center gap-2 mb-3">
        <span className="w-8 h-8 bg-[var(--barn-red)]/10 rounded-full flex items-center justify-center">
          <span className="text-lg">⚠️</span>
        </span>
        <span className="font-display font-bold text-[var(--barn-red)]">
          {title}
        </span>
      </div>
      <div className="font-body text-[var(--ink-black)]">{children}</div>
    </div>
  );
}

function Highlight({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <div className="bg-[var(--sunflower)]/10 border-l-4 border-[var(--sunflower)] pl-6 py-4 pr-4 my-6 rounded-r-lg">
      <div className="font-body text-[var(--ink-black)] font-medium">{children}</div>
    </div>
  );
}

export const MDXComponents = {
  // Headings
  h1: (props: ComponentPropsWithoutRef<"h1">) => (
    <h1
      className="font-display text-3xl font-bold text-[var(--ink-black)] mt-12 mb-6"
      {...props}
    />
  ),
  h2: (props: ComponentPropsWithoutRef<"h2">) => (
    <h2
      className="font-display text-2xl font-bold text-[var(--ink-black)] mt-10 mb-4"
      {...props}
    />
  ),
  h3: (props: ComponentPropsWithoutRef<"h3">) => (
    <h3
      className="font-display text-xl font-semibold text-[var(--ink-black)] mt-8 mb-3"
      {...props}
    />
  ),

  // Paragraphs
  p: (props: ComponentPropsWithoutRef<"p">) => (
    <p
      className="font-body text-[var(--ink-black)] leading-relaxed mb-6"
      {...props}
    />
  ),

  // Lists
  ul: (props: ComponentPropsWithoutRef<"ul">) => (
    <ul
      className="font-body text-[var(--ink-black)] list-disc pl-6 mb-6 space-y-2"
      {...props}
    />
  ),
  ol: (props: ComponentPropsWithoutRef<"ol">) => (
    <ol
      className="font-body text-[var(--ink-black)] list-decimal pl-6 mb-6 space-y-2"
      {...props}
    />
  ),
  li: (props: ComponentPropsWithoutRef<"li">) => (
    <li className="leading-relaxed" {...props} />
  ),

  // Blockquote
  blockquote: (props: ComponentPropsWithoutRef<"blockquote">) => (
    <blockquote
      className="border-l-4 border-[var(--grass-dark)] bg-[var(--grass-light)]/10 pl-6 py-4 pr-4 my-6 rounded-r-lg font-body text-[var(--ink-black)] italic"
      {...props}
    />
  ),

  // Code
  code: ({
    className,
    ...props
  }: ComponentPropsWithoutRef<"code">) => {
    const isInline = !className;
    if (isInline) {
      return (
        <code
          className="bg-[var(--paper-aged)] text-[var(--barn-red)] px-1.5 py-0.5 rounded font-mono text-sm"
          {...props}
        />
      );
    }
    return <code className={className} {...props} />;
  },

  pre: (props: ComponentPropsWithoutRef<"pre">) => (
    <pre
      className="bg-[var(--ink-black)] text-[var(--paper-cream)] p-4 rounded-lg overflow-x-auto my-6 font-mono text-sm"
      {...props}
    />
  ),

  // Links
  a: ({
    href,
    ...props
  }: ComponentPropsWithoutRef<"a">) => {
    const isExternal = href?.startsWith("http");
    if (isExternal) {
      return (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="text-[var(--grass-dark)] underline hover:text-[var(--forest)] transition-colors"
          {...props}
        />
      );
    }
    return (
      <Link
        href={href || "#"}
        className="text-[var(--grass-dark)] underline hover:text-[var(--forest)] transition-colors"
        {...props}
      />
    );
  },

  // Strong and emphasis
  strong: (props: ComponentPropsWithoutRef<"strong">) => (
    <strong className="font-semibold text-[var(--ink-black)]" {...props} />
  ),
  em: (props: ComponentPropsWithoutRef<"em">) => (
    <em className="italic" {...props} />
  ),

  // Horizontal rule
  hr: () => <hr className="border-t border-[var(--paper-lines)] my-12" />,

  // Custom components
  Tip,
  Warning,
  Highlight,
};
