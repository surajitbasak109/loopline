import Link from "next/link";

// ── Nav ───────────────────────────────────────────────────────────────────────

function Nav() {
  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-white/80 backdrop-blur border-b border-gray-100">
      <div className="max-w-5xl mx-auto px-6 h-14 flex items-center justify-between">
        <span className="font-bold text-indigo-600 text-lg tracking-tight">Loopline</span>
        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            Sign in
          </Link>
          <Link
            href="/register"
            className="text-sm bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-4 py-1.5 rounded-lg transition-colors cursor-pointer"
          >
            Get started
          </Link>
        </div>
      </div>
    </header>
  );
}

// ── Hero ──────────────────────────────────────────────────────────────────────

function Hero() {
  return (
    <section className="pt-32 pb-20 px-6 text-center">
      <div className="max-w-3xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-indigo-50 text-indigo-600 text-xs font-semibold px-3 py-1 rounded-full mb-6">
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
          Now in beta
        </div>

        <h1 className="text-4xl sm:text-5xl font-bold text-gray-900 leading-tight tracking-tight mb-5">
          Collect feedback,{" "}
          <span className="text-indigo-500">ship better products</span>
        </h1>

        <p className="text-lg text-gray-500 max-w-xl mx-auto mb-8">
          Add an embeddable feedback widget to any website with one script tag.
          Let users vote on ideas, track progress, and read your changelog —
          without leaving your page.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
          <Link
            href="/register"
            className="w-full sm:w-auto bg-indigo-500 hover:bg-indigo-600 text-white font-semibold px-6 py-3 rounded-xl transition-colors text-sm cursor-pointer"
          >
            Get started free →
          </Link>
          <Link
            href="#how-it-works"
            className="w-full sm:w-auto bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold px-6 py-3 rounded-xl transition-colors text-sm cursor-pointer"
          >
            See how it works
          </Link>
        </div>

        {/* Embed code snippet */}
        <div className="inline-block text-left bg-gray-900 rounded-xl px-5 py-4 text-sm font-mono shadow-lg">
          <p className="text-gray-500 text-xs mb-2 uppercase tracking-wide">Embed in 30 seconds</p>
          <p>
            <span className="text-pink-400">&lt;script</span>
            <span className="text-yellow-300"> src</span>
            <span className="text-gray-300">=</span>
            <span className="text-green-300">&quot;https://loopline.app/widget.js&quot;</span>
          </p>
          <p className="pl-9">
            <span className="text-yellow-300">data-key</span>
            <span className="text-gray-300">=</span>
            <span className="text-green-300">&quot;pk_your_key&quot;</span>
            <span className="text-pink-400">&gt;&lt;/script&gt;</span>
          </p>
        </div>
      </div>
    </section>
  );
}

// ── Features ──────────────────────────────────────────────────────────────────

const features = [
  {
    icon: "🔌",
    title: "One script tag",
    description:
      "Paste a single line of HTML into your site. The widget loads asynchronously and never slows your page down.",
  },
  {
    icon: "🔒",
    title: "Security-first",
    description:
      "Two isolated trust contexts — public keys for the widget, session auth for the dashboard. Tenant data never crosses org boundaries.",
  },
  {
    icon: "📬",
    title: "Feedback & voting",
    description:
      "Users submit ideas and upvote existing requests. Vote counts are deduplicated at the database level — no double-votes, ever.",
  },
  {
    icon: "📣",
    title: "Built-in changelog",
    description:
      "Publish updates alongside your feedback board. Draft, preview, and publish changelog entries from your dashboard.",
  },
  {
    icon: "🛡️",
    title: "Rate limiting",
    description:
      "IP-based and cookie-based rate limits protect public endpoints from spam — out of the box, no extra config needed.",
  },
  {
    icon: "⚡",
    title: "Built on Next.js 16",
    description:
      "App Router, Turbopack, Tailwind v4, Prisma 7. Production-grade stack with TypeScript strict mode throughout.",
  },
];

function Features() {
  return (
    <section className="py-20 px-6 bg-gray-50">
      <div className="max-w-5xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-3">
          Everything you need, nothing you don&apos;t
        </h2>
        <p className="text-gray-500 text-center mb-12 max-w-lg mx-auto">
          Loopline is focused on doing one thing well — connecting your users&apos; ideas to your roadmap.
        </p>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {features.map((f) => (
            <div
              key={f.title}
              className="bg-white rounded-2xl border border-gray-100 p-6 hover:shadow-sm transition-shadow"
            >
              <div className="text-2xl mb-3">{f.icon}</div>
              <h3 className="font-semibold text-gray-900 mb-1">{f.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{f.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── How it works ──────────────────────────────────────────────────────────────

const steps = [
  {
    number: "01",
    title: "Create your account",
    description:
      "Sign up in under a minute. You get a dashboard and a publishable API key instantly.",
  },
  {
    number: "02",
    title: "Embed the widget",
    description:
      "Add one script tag to your site with your API key. No build step, no npm package.",
  },
  {
    number: "03",
    title: "Collect & act on feedback",
    description:
      "Users submit ideas and vote. You manage status, publish updates, and close the loop.",
  },
];

function HowItWorks() {
  return (
    <section id="how-it-works" className="py-20 px-6">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl sm:text-3xl font-bold text-gray-900 text-center mb-3">
          Up and running in minutes
        </h2>
        <p className="text-gray-500 text-center mb-14 max-w-lg mx-auto">
          No complex setup. No SDK to install. Just a script tag and a dashboard.
        </p>
        <div className="grid sm:grid-cols-3 gap-8">
          {steps.map((step, i) => (
            <div key={step.number} className="relative text-center">
              {i < steps.length - 1 && (
                <div className="hidden sm:block absolute top-6 left-[60%] w-full h-px bg-gray-200" />
              )}
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-full bg-indigo-50 text-indigo-600 font-bold text-sm mb-4 relative z-10">
                {step.number}
              </div>
              <h3 className="font-semibold text-gray-900 mb-2">{step.title}</h3>
              <p className="text-sm text-gray-500 leading-relaxed">{step.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── CTA ───────────────────────────────────────────────────────────────────────

function CTA() {
  return (
    <section className="py-20 px-6 bg-indigo-500">
      <div className="max-w-2xl mx-auto text-center">
        <h2 className="text-2xl sm:text-3xl font-bold text-white mb-4">
          Ready to close the feedback loop?
        </h2>
        <p className="text-indigo-100 mb-8">
          Get started for free. No credit card required.
        </p>
        <Link
          href="/register"
          className="inline-block bg-white hover:bg-gray-50 text-indigo-600 font-semibold px-8 py-3 rounded-xl transition-colors text-sm cursor-pointer"
        >
          Create your free account →
        </Link>
      </div>
    </section>
  );
}

// ── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer className="py-10 px-6 border-t border-gray-100">
      <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
        <span className="font-bold text-indigo-600 tracking-tight">Loopline</span>
        <div className="flex items-center gap-6 text-sm text-gray-500">
          <Link href="/login" className="hover:text-gray-900 transition-colors">Sign in</Link>
          <Link href="/register" className="hover:text-gray-900 transition-colors">Get started</Link>
          <Link href="/widget-test.html" className="hover:text-gray-900 transition-colors">Widget demo</Link>
        </div>
        <p className="text-xs text-gray-400">© {new Date().getFullYear()} Loopline</p>
      </div>
    </footer>
  );
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function HomePage() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <Features />
        <HowItWorks />
        <CTA />
      </main>
      <Footer />
    </>
  );
}
