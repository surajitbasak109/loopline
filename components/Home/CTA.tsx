import Link from "next/link";

export default function CTA() {
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
