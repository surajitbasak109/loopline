"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Alert } from "@/components/ui/Alert";

export default function ResetPasswordForm() {
  const router = useRouter();
  const params = useSearchParams();
  const token = params.get("token") ?? "";

  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);

    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);

    const res = await fetch("/api/auth/reset-password", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token, password }),
    });

    setLoading(false);

    if (res.ok) {
      router.push("/login?reset=success");
    } else {
      const data = await res.json();
      setError(typeof data.error === "string" ? data.error : "Something went wrong.");
    }
  }

  if (!token) {
    return (
      <div className="w-full max-w-sm text-center">
        <Alert variant="error">Invalid or missing reset token.</Alert>
        <Link href="/forgot-password" className="mt-4 inline-block text-sm text-indigo-600 hover:underline">
          Request a new link
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <span className="text-2xl font-bold text-indigo-600 tracking-tight">Loopline</span>
        <p className="mt-1 text-sm text-gray-500">Set a new password</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <Alert variant="error">{error}</Alert>}

          <PasswordInput
            label="New password"
            required
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Min. 8 characters"
          />

          <PasswordInput
            label="Confirm password"
            required
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            placeholder="Same as above"
          />

          <Button type="submit" loading={loading} className="mt-1 w-full">
            Set new password
          </Button>
        </form>
      </div>
    </div>
  );
}
