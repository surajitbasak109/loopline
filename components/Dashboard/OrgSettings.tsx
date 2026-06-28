"use client";

import { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";

type Org = { name: string; slug: string; publicApiKey: string };

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 012.189-3.651M6.477 6.477A9.97 9.97 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.97 9.97 0 01-1.366 2.57M6.477 6.477L3 3m3.477 3.477l7.046 7.046M17.523 17.523L21 21m-3.477-3.477l-7.046-7.046" />
    </svg>
  );
}

export default function OrgSettings({ org }: { org: Org }) {
  const [apiKey, setApiKey] = useState(org.publicApiKey);
  const [visible, setVisible] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [regenerating, setRegenerating] = useState(false);

  const maskedKey = apiKey.replace(/^(pk_).+$/, (_, prefix) =>
    prefix + "•".repeat(apiKey.length - prefix.length),
  );

  async function copyKey() {
    await navigator.clipboard.writeText(apiKey);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  async function regenerateKey() {
    setRegenerating(true);
    const res = await fetch("/api/admin/org/regenerate-key", { method: "POST" });
    if (res.ok) {
      const { publicApiKey } = await res.json();
      setApiKey(publicApiKey);
      setCopied(false);
    }
    setRegenerating(false);
    setShowConfirm(false);
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
            {visible ? apiKey : maskedKey}
          </code>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setVisible((v) => !v)}
              className="text-gray-400 hover:text-gray-600 cursor-pointer transition-colors"
              aria-label={visible ? "Hide API key" : "Show API key"}
            >
              {visible ? <EyeOffIcon /> : <EyeIcon />}
            </button>
            <button
              onClick={copyKey}
              className="text-xs font-medium text-indigo-600 hover:text-indigo-800 cursor-pointer transition-colors"
            >
              {copied ? "Copied!" : "Copy"}
            </button>
          </div>
        </div>
        <button
          onClick={() => setShowConfirm(true)}
          className="mt-3 text-xs text-red-500 hover:text-red-700 cursor-pointer transition-colors"
        >
          Regenerate key
        </button>
      </Section>

      <Modal
        open={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="Regenerate API key?"
      >
        <p className="text-sm text-gray-500 mt-1">
          Your existing widget embeds will stop working immediately. You will
          need to update them with the new key before they resume.
        </p>
        <div className="flex justify-end gap-3 mt-6">
          <Button
            variant="secondary"
            onClick={() => setShowConfirm(false)}
            disabled={regenerating}
          >
            Cancel
          </Button>
          <Button
            variant="danger"
            onClick={regenerateKey}
            loading={regenerating}
          >
            Regenerate
          </Button>
        </div>
      </Modal>
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
