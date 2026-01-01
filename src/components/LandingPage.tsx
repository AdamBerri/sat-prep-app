"use client";

import { SignInButton, SignedIn, SignedOut, UserButton } from "@clerk/nextjs";
import Link from "next/link";
import {
  Leaf,
  BookOpen,
  Target,
  TrendingUp,
  RefreshCw,
  Timer,
  CheckCircle2,
  Star,
  Sparkles,
  ArrowRight,
  Brain,
  Heart,
  Zap,
  Shield,
  Clock,
  DollarSign,
  BookMarked,
  GraduationCap,
  ChevronDown,
  Smartphone,
} from "lucide-react";

interface LandingPageProps {
  onStartPractice?: () => void;
}

export default function LandingPage({ onStartPractice }: LandingPageProps) {
  return (
    <div className="min-h-screen">
      {/* ═══════════════════════════════════════════════════════════════
          NAVIGATION
          ═══════════════════════════════════════════════════════════════ */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-[var(--paper-cream)]/95 backdrop-blur-sm border-b border-[var(--paper-lines)]">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-[var(--grass-medium)] to-[var(--forest)] rounded-lg flex items-center justify-center">
              <Leaf className="w-6 h-6 text-white" />
            </div>
            <span className="font-display text-2xl font-bold text-[var(--ink-black)]">
              1600Club
            </span>
          </div>

          <div className="hidden md:flex items-center gap-8">
            <a href="#features" className="font-body text-[var(--ink-faded)] hover:text-[var(--grass-dark)] transition-colors">Features</a>
            <a href="#pricing" className="font-body text-[var(--ink-faded)] hover:text-[var(--grass-dark)] transition-colors">Pricing</a>
            <a href="#coaching" className="font-body text-[var(--ink-faded)] hover:text-[var(--grass-dark)] transition-colors">Coaching</a>
          </div>

          <div className="flex items-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="btn-outline-wood">Sign In</button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <UserButton
                appearance={{
                  elements: {
                    avatarBox: "w-10 h-10",
                  },
                }}
              />
            </SignedIn>
          </div>
        </div>
      </nav>

      {/* ═══════════════════════════════════════════════════════════════
          HERO SECTION
          ═══════════════════════════════════════════════════════════════ */}
      <section className="relative pt-32 pb-20 px-6 overflow-hidden">
        {/* Decorative elements */}
        <div className="absolute top-40 left-10 opacity-10">
          <Leaf className="w-32 h-32 text-[var(--grass-dark)] sway-animation" />
        </div>
        <div className="absolute bottom-20 right-10 opacity-10">
          <BookOpen className="w-24 h-24 text-[var(--wood-medium)] float-animation" />
        </div>
        <div className="absolute top-60 right-1/4 opacity-5">
          <Star className="w-16 h-16 text-[var(--sunflower)]" />
        </div>

        <div className="max-w-5xl mx-auto text-center relative">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 bg-[var(--grass-light)]/20 border border-[var(--grass-medium)]/30 rounded-full px-4 py-2 mb-8">
            <Sparkles className="w-4 h-4 text-[var(--grass-dark)]" />
            <span className="font-body text-sm text-[var(--grass-dark)] font-medium">
              Your path to the perfect score
            </span>
          </div>

          {/* Main headline */}
          <h1 className="font-display text-5xl md:text-7xl font-bold text-[var(--ink-black)] leading-tight mb-6">
            Join the Club.{" "}
            <span className="text-[var(--grass-dark)]">Get the Score.</span>
          </h1>

          <p className="font-body text-xl text-[var(--ink-faded)] max-w-2xl mx-auto mb-8 leading-relaxed">
            Level up your SAT prep with gamified practice, adaptive learning, and
            unlimited questions. Study in bed, on the bus home from practice, or
            anywhere—every session brings you closer to 1600.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="btn-grass text-lg px-8 py-4 flex items-center gap-2">
                  <span>Start Your Journey to 1600</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/dashboard"
                className="btn-grass text-lg px-8 py-4 flex items-center gap-2"
              >
                <span>Go to Dashboard</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </SignedIn>
            <a href="#coaching" className="btn-outline-wood text-lg px-8 py-4">
              Learn Our Philosophy
            </a>
          </div>

          {/* Trust indicators */}
          <div className="flex flex-wrap items-center justify-center gap-8 text-[var(--ink-faded)]">
            <div className="flex items-center gap-2">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-5 h-5 text-[var(--sunflower)] fill-[var(--sunflower)]" />
                ))}
              </div>
              <span className="font-body text-sm">5-Star Experience</span>
            </div>
            <div className="flex items-center gap-2">
              <Target className="w-5 h-5 text-[var(--grass-dark)]" />
              <span className="font-body text-sm">Unlimited Questions</span>
            </div>
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-[var(--grass-dark)]" />
              <span className="font-body text-sm">Real SAT Simulation</span>
            </div>
            <div className="flex items-center gap-2">
              <Smartphone className="w-5 h-5 text-[var(--grass-dark)]" />
              <span className="font-body text-sm">Study Anywhere</span>
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
          <ChevronDown className="w-8 h-8 text-[var(--grass-medium)]" />
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FEATURES GRID
          ═══════════════════════════════════════════════════════════════ */}
      <section id="features" className="py-24 px-6 bg-[var(--paper-warm)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-[var(--ink-black)] mb-4">
              Everything You Need to Succeed
            </h2>
            <p className="font-body text-lg text-[var(--ink-faded)] max-w-2xl mx-auto">
              We've planted the seeds of success. You just need to show up.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {/* Feature 1 */}
            <div className="card-paper p-8 rounded-xl hover:shadow-lg transition-shadow">
              <div className="feature-icon mb-6">
                <BookMarked className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-display text-xl font-bold text-[var(--ink-black)] mb-3">
                We Keep Track For You
              </h3>
              <p className="font-body text-[var(--ink-faded)] leading-relaxed">
                Never lose your place. Every question answered, every topic mastered—we remember
                it all so you can focus on learning, not logging.
              </p>
            </div>

            {/* Feature 2 */}
            <div className="card-paper p-8 rounded-xl hover:shadow-lg transition-shadow">
              <div className="feature-icon mb-6">
                <Star className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-display text-xl font-bold text-[var(--ink-black)] mb-3">
                Five-Star Experience
              </h3>
              <p className="font-body text-[var(--ink-faded)] leading-relaxed">
                A beautiful, distraction-free environment that makes studying feel less like
                work and more like progress. Clean, calm, focused.
              </p>
            </div>

            {/* Feature 3 */}
            <div className="card-paper p-8 rounded-xl hover:shadow-lg transition-shadow">
              <div className="feature-icon mb-6">
                <RefreshCw className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-display text-xl font-bold text-[var(--ink-black)] mb-3">
                Unlimited Questions
              </h3>
              <p className="font-body text-[var(--ink-faded)] leading-relaxed">
                You'll never run out of practice. Our question bank keeps growing,
                and so will your confidence. Practice until perfection.
              </p>
            </div>

            {/* Feature 4 */}
            <div className="card-paper p-8 rounded-xl hover:shadow-lg transition-shadow">
              <div className="feature-icon mb-6">
                <Brain className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-display text-xl font-bold text-[var(--ink-black)] mb-3">
                Smart Topic Recycling
              </h3>
              <p className="font-body text-[var(--ink-faded)] leading-relaxed">
                Struggling with algebra? We notice. Keep practicing and we'll intelligently
                resurface topics you're weak in until they become strengths.
              </p>
            </div>

            {/* Feature 5 */}
            <div className="card-paper p-8 rounded-xl hover:shadow-lg transition-shadow">
              <div className="feature-icon mb-6">
                <Timer className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-display text-xl font-bold text-[var(--ink-black)] mb-3">
                Real SAT Simulation
              </h3>
              <p className="font-body text-[var(--ink-faded)] leading-relaxed">
                Go into test mode and experience the real thing. Timed sections,
                authentic question formats, and actual scaled scores.
              </p>
            </div>

            {/* Feature 6 */}
            <div className="card-paper p-8 rounded-xl hover:shadow-lg transition-shadow">
              <div className="feature-icon mb-6">
                <CheckCircle2 className="w-7 h-7 text-white" />
              </div>
              <h3 className="font-display text-xl font-bold text-[var(--ink-black)] mb-3">
                Easy Wrong Answer Review
              </h3>
              <p className="font-body text-[var(--ink-faded)] leading-relaxed">
                Made a mistake? Good—that's where learning happens. Review every wrong
                answer with clear explanations and never repeat it.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          COACHING / PHILOSOPHY SECTION
          ═══════════════════════════════════════════════════════════════ */}
      <section id="coaching" className="py-24 px-6 relative overflow-hidden">
        {/* Background decoration */}
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--forest)] to-[var(--grass-dark)] opacity-95" />
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-20 left-20">
            <Leaf className="w-40 h-40 text-white" />
          </div>
          <div className="absolute bottom-20 right-20">
            <Heart className="w-32 h-32 text-white" />
          </div>
        </div>

        <div className="max-w-4xl mx-auto relative text-center">
          <div className="inline-flex items-center gap-2 bg-white/10 border border-white/20 rounded-full px-4 py-2 mb-8">
            <Heart className="w-4 h-4 text-white" />
            <span className="font-body text-sm text-white font-medium">
              Our Philosophy
            </span>
          </div>

          <h2 className="font-display text-4xl md:text-5xl font-bold text-white mb-8">
            We Don't Believe in Tutoring.
            <br />
            <span className="text-[var(--grass-light)]">We Believe in You.</span>
          </h2>

          <div className="space-y-6 text-white/90 font-body text-lg leading-relaxed max-w-3xl mx-auto mb-12">
            <p>
              Here's the thing: you don't need someone holding your hand through every problem.
              You don't need expensive tutors or counselors telling you what you already know deep down.
            </p>
            <p className="text-xl font-medium text-white">
              You are capable of doing this on your own.
            </p>
            <p>
              What you need is the right tools, the right practice, and a system that adapts to
              <em> your </em> learning. That's exactly what we built. Not another tutoring platform—a
              self-empowerment engine.
            </p>
            <p>
              Every great achiever had to sit down, put in the work, and trust themselves.
              We're just here to make that journey smoother.
            </p>
          </div>

          <SignedOut>
            <SignInButton mode="modal">
              <button className="bg-white text-[var(--forest)] px-8 py-4 rounded-lg font-body font-semibold text-lg hover:bg-[var(--paper-cream)] transition-colors inline-flex items-center gap-2">
                <Zap className="w-5 h-5" />
                <span>Start Your Self-Guided Journey</span>
              </button>
            </SignInButton>
          </SignedOut>
          <SignedIn>
            <Link
              href="/practice"
              className="bg-white text-[var(--forest)] px-8 py-4 rounded-lg font-body font-semibold text-lg hover:bg-[var(--paper-cream)] transition-colors inline-flex items-center gap-2"
            >
              <Zap className="w-5 h-5" />
              <span>Start Your Self-Guided Journey</span>
            </Link>
          </SignedIn>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          WHY US / PRICING COMPARISON
          ═══════════════════════════════════════════════════════════════ */}
      <section id="pricing" className="py-24 px-6 bg-[var(--paper-cream)]">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="font-display text-4xl md:text-5xl font-bold text-[var(--ink-black)] mb-4">
              Why We're the Smarter Choice
            </h2>
            <p className="font-body text-lg text-[var(--ink-faded)] max-w-2xl mx-auto">
              Let's talk real numbers. Your success shouldn't cost a fortune.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 mb-16">
            {/* Competitor 1: Tutoring */}
            <div className="card-paper p-8 rounded-xl border-2 border-[var(--paper-lines)]">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[var(--barn-red)]/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <GraduationCap className="w-8 h-8 text-[var(--barn-red)]" />
                </div>
                <h3 className="font-display text-xl font-bold text-[var(--ink-black)]">
                  Private Tutoring
                </h3>
              </div>
              <div className="text-center mb-6">
                <span className="font-display text-4xl font-bold text-[var(--barn-red)]">$2,000+</span>
                <p className="font-body text-sm text-[var(--ink-faded)]">for 3 months</p>
              </div>
              <ul className="space-y-3 text-[var(--ink-faded)] font-body text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--barn-red)]">✕</span>
                  <span>Expensive hourly rates ($50-150/hr)</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--barn-red)]">✕</span>
                  <span>Limited scheduling flexibility</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--barn-red)]">✕</span>
                  <span>Depends on tutor quality</span>
                </li>
              </ul>
            </div>

            {/* Our Solution */}
            <div className="card-paper p-8 rounded-xl border-2 border-[var(--grass-dark)] relative scale-105 shadow-xl">
              <div className="absolute -top-4 left-1/2 -translate-x-1/2">
                <span className="bg-[var(--grass-dark)] text-white font-body text-sm font-semibold px-4 py-1 rounded-full">
                  Best Value
                </span>
              </div>
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-gradient-to-br from-[var(--grass-light)] to-[var(--grass-dark)] rounded-full flex items-center justify-center mx-auto mb-4">
                  <Leaf className="w-8 h-8 text-white" />
                </div>
                <h3 className="font-display text-xl font-bold text-[var(--ink-black)]">
                  1600Club
                </h3>
              </div>
              <div className="text-center mb-6">
                <span className="font-display text-4xl font-bold text-[var(--grass-dark)]">$240</span>
                <p className="font-body text-sm text-[var(--ink-faded)]">for 3 months ($80/mo)</p>
              </div>
              <ul className="space-y-3 text-[var(--ink-black)] font-body text-sm">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--grass-dark)] mt-0.5 flex-shrink-0" />
                  <span>Unlimited practice questions</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--grass-dark)] mt-0.5 flex-shrink-0" />
                  <span>Smart adaptive learning</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--grass-dark)] mt-0.5 flex-shrink-0" />
                  <span>Real SAT simulations</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--grass-dark)] mt-0.5 flex-shrink-0" />
                  <span>Progress tracking & analytics</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[var(--grass-dark)] mt-0.5 flex-shrink-0" />
                  <span>Practice 24/7, your schedule</span>
                </li>
              </ul>
              <SignedOut>
                <SignInButton mode="modal">
                  <button className="btn-grass w-full mt-6">
                    Get Started
                  </button>
                </SignInButton>
              </SignedOut>
              <SignedIn>
                <Link href="/practice" className="btn-grass w-full mt-6 block text-center">
                  Get Started
                </Link>
              </SignedIn>
            </div>

            {/* Competitor 2: Books */}
            <div className="card-paper p-8 rounded-xl border-2 border-[var(--paper-lines)]">
              <div className="text-center mb-6">
                <div className="w-16 h-16 bg-[var(--wood-light)]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                  <BookOpen className="w-8 h-8 text-[var(--wood-dark)]" />
                </div>
                <h3 className="font-display text-xl font-bold text-[var(--ink-black)]">
                  Prep Books
                </h3>
              </div>
              <div className="text-center mb-6">
                <span className="font-display text-4xl font-bold text-[var(--wood-dark)]">$30-80</span>
                <p className="font-body text-sm text-[var(--ink-faded)]">one-time purchase</p>
              </div>
              <ul className="space-y-3 text-[var(--ink-faded)] font-body text-sm">
                <li className="flex items-start gap-2">
                  <span className="text-[var(--barn-red)]">✕</span>
                  <span>Static, limited questions</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--barn-red)]">✕</span>
                  <span>No adaptive learning</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--barn-red)]">✕</span>
                  <span>No progress tracking</span>
                </li>
                <li className="flex items-start gap-2">
                  <span className="text-[var(--barn-red)]">✕</span>
                  <span>Quickly becomes outdated</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Bottom CTA */}
          <div className="text-center">
            <p className="font-body text-[var(--ink-faded)] mb-6">
              <span className="font-semibold text-[var(--grass-dark)]">$240 for 3 months</span> vs.
              <span className="line-through ml-2">$2,000+ for tutoring</span>
            </p>
            <p className="font-display text-2xl text-[var(--ink-black)] mb-8">
              Same results. 10x less cost. Your pace.
            </p>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          MORE BENEFITS STRIP
          ═══════════════════════════════════════════════════════════════ */}
      <section className="py-16 px-6 bg-[var(--paper-warm)] border-y border-[var(--paper-lines)]">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="w-14 h-14 bg-[var(--grass-light)]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Smartphone className="w-7 h-7 text-[var(--grass-dark)]" />
              </div>
              <h4 className="font-display text-lg font-bold text-[var(--ink-black)] mb-2">
                Study Anywhere
              </h4>
              <p className="font-body text-sm text-[var(--ink-faded)]">
                In bed, on the bus, between classes.
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 bg-[var(--grass-light)]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <TrendingUp className="w-7 h-7 text-[var(--grass-dark)]" />
              </div>
              <h4 className="font-display text-lg font-bold text-[var(--ink-black)] mb-2">
                Track Progress
              </h4>
              <p className="font-body text-sm text-[var(--ink-faded)]">
                Watch your scores grow over time.
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 bg-[var(--grass-light)]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <Target className="w-7 h-7 text-[var(--grass-dark)]" />
              </div>
              <h4 className="font-display text-lg font-bold text-[var(--ink-black)] mb-2">
                Targeted Practice
              </h4>
              <p className="font-body text-sm text-[var(--ink-faded)]">
                Focus on what matters most to you.
              </p>
            </div>

            <div className="text-center">
              <div className="w-14 h-14 bg-[var(--grass-light)]/30 rounded-full flex items-center justify-center mx-auto mb-4">
                <DollarSign className="w-7 h-7 text-[var(--grass-dark)]" />
              </div>
              <h4 className="font-display text-lg font-bold text-[var(--ink-black)] mb-2">
                Money-Back Guarantee
              </h4>
              <p className="font-body text-sm text-[var(--ink-faded)]">
                Not satisfied? Full refund, no questions.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FINAL CTA
          ═══════════════════════════════════════════════════════════════ */}
      <section className="py-24 px-6 bg-[var(--paper-cream)]">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="font-display text-4xl md:text-5xl font-bold text-[var(--ink-black)] mb-6">
            Ready to Join the Club?
          </h2>
          <p className="font-body text-xl text-[var(--ink-faded)] mb-8">
            Join thousands of students leveling up their SAT scores every day.
          </p>
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <SignedOut>
              <SignInButton mode="modal">
                <button className="btn-grass text-lg px-10 py-5 flex items-center gap-2">
                  <span>Start Free Today</span>
                  <ArrowRight className="w-5 h-5" />
                </button>
              </SignInButton>
            </SignedOut>
            <SignedIn>
              <Link
                href="/practice"
                className="btn-grass text-lg px-10 py-5 flex items-center gap-2"
              >
                <span>Continue Practicing</span>
                <ArrowRight className="w-5 h-5" />
              </Link>
            </SignedIn>
          </div>
        </div>
      </section>

      {/* ═══════════════════════════════════════════════════════════════
          FOOTER
          ═══════════════════════════════════════════════════════════════ */}
      <footer className="py-12 px-6 bg-[var(--forest)] text-white">
        <div className="max-w-6xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-white/20 rounded-lg flex items-center justify-center">
                <Leaf className="w-6 h-6 text-white" />
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
  );
}
