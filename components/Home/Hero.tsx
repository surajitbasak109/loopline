import Link from "next/link";

export default function Hero() {
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
