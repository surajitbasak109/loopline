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

export default function Features() {
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
