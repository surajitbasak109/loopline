"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Alert } from "@/components/ui/Alert";

export default function LoginForm() {
  const router = useRouter();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password.");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <span className="text-2xl font-bold text-indigo-600 tracking-tight">Loopline</span>
        <p className="mt-1 text-sm text-gray-500">Sign in to your dashboard</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-8">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          {error && <Alert variant="error">{error}</Alert>}

          <Input
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={form.email}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            placeholder="you@example.com"
          />

          <Input
            label="Password"
            type="password"
            required
            autoComplete="current-password"
            value={form.password}
            onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))}
            placeholder="••••••••"
          />

          <Button type="submit" loading={loading} className="mt-1 w-full">
            Sign in
          </Button>
        </form>
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        Not a member?{" "}
        <Link href="/register" className="text-indigo-600 hover:underline font-medium">
          Create an account
        </Link>
      </p>
    </div>
  );
}
