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

export default function HowItWorks() {
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
