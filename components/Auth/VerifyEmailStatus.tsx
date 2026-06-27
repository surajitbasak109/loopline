"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Alert } from "@/components/ui/Alert";

export default function VerifyEmailStatus() {
  const params = useSearchParams();
  const success = params.get("success") === "true";
  const pending = params.get("pending") === "true";
  const error = params.get("error");

  const [email, setEmail] = useState("");
  const [resent, setResent] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleResend(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);

    await fetch("/api/auth/resend-verification", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email }),
    });

    setLoading(false);
    setResent(true);
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <span className="text-2xl font-bold text-indigo-600 tracking-tight">Loopline</span>
        <p className="mt-1 text-sm text-gray-500">Email verification</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-8 text-center">
        {pending && !success && !error && (
          <div className="mb-6 rounded-lg bg-yellow-50 border border-yellow-100 text-yellow-700 text-sm px-4 py-3 text-left">
            You need to verify your email before accessing the dashboard.
            Check your inbox or resend the link below.
          </div>
        )}

        {success && (
          <>
            <div className="text-4xl mb-4">✅</div>
            <h2 className="font-semibold text-gray-900 mb-2">Email verified!</h2>
            <p className="text-sm text-gray-500 mb-6">Your account is now active.</p>
            <Link href="/dashboard">
              <Button className="w-full">Go to dashboard</Button>
            </Link>
          </>
        )}

        {error === "invalid" && (
          <>
            <div className="text-4xl mb-4">❌</div>
            <h2 className="font-semibold text-gray-900 mb-2">Invalid link</h2>
            <p className="text-sm text-gray-500 mb-6">
              This verification link is invalid or already used.
            </p>
          </>
        )}

        {error === "missing" && (
          <>
            <div className="text-4xl mb-4">🔗</div>
            <h2 className="font-semibold text-gray-900 mb-2">Missing token</h2>
            <p className="text-sm text-gray-500 mb-6">
              No verification token found in the link.
            </p>
          </>
        )}

        {!success && (
          resent ? (
            <Alert variant="success">
              If that email exists and is unverified, we&apos;ve sent a new link.
            </Alert>
          ) : (
            <form onSubmit={handleResend} className="mt-4 flex flex-col gap-3 text-left">
              <p className="text-xs text-gray-500 text-center">Resend a verification email</p>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="your@email.com"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400"
              />
              <Button type="submit" loading={loading} variant="secondary" className="w-full">
                Resend verification
              </Button>
            </form>
          )
        )}
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        <Link href="/login" className="text-indigo-600 hover:underline font-medium">
          Back to sign in
        </Link>
      </p>
    </div>
  );
}
