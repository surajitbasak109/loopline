"use client";

import { useState } from "react";

type Org = { name: string; slug: string; publicApiKey: string };

export default function OrgSettings({ org }: { org: Org }) {
  const [copied, setCopied] = useState(false);

  async function copyKey() {
    await navigator.clipboard.writeText(org.publicApiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="max-w-lg flex flex-col gap-4">
      <Section label="Organization name">
        <p className="text-sm text-gray-900">{org.name}</p>
      </Section>

      <Section label="Slug">
        <p className="text-sm font-mono text-gray-900">{org.slug}</p>
      </Section>

      <Section label="Publishable API key">
        <p className="text-xs text-gray-500 mb-3">
          Embed this in your widget script. It is safe to expose in client-side
          code — its safety comes from scoping, not secrecy.
        </p>
        <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 rounded-lg px-4 py-3">
          <code className="text-sm font-mono text-gray-800 flex-1 break-all">
            {org.publicApiKey}
          </code>
          <button
            onClick={copyKey}
            className="text-xs font-medium text-indigo-600 hover:text-indigo-800 flex-shrink-0 cursor-pointer transition-colors"
          >
            {copied ? "Copied!" : "Copy"}
          </button>
        </div>
      </Section>
    </div>
  );
}

function Section({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-gray-100 px-6 py-5">
      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">
        {label}
      </p>
      {children}
    </div>
  );
}
