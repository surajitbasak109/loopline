"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { z } from "zod";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { Alert } from "@/components/ui/Alert";
import { registerSchema } from "@/lib/validations/register";

type FieldErrors = Partial<Record<string, string[]>>;
type Step = 1 | 2;

const step1Schema = registerSchema.pick({ name: true, email: true, password: true });

function StepIndicator({ step }: { step: Step }) {
  return (
    <div className="flex items-center justify-center gap-2 mb-6">
      {([1, 2] as Step[]).map((s) => (
        <div
          key={s}
          className={`h-2 rounded-full transition-all duration-300 ${
            s === step ? "w-6 bg-indigo-500" : "w-2 bg-gray-200"
          }`}
        />
      ))}
    </div>
  );
}

export default function RegisterForm() {
  const router = useRouter();
  const [step, setStep] = useState<Step>(1);
  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    orgName: "",
    orgSlug: "",
  });
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  function set(field: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      setFieldErrors((fe) => ({ ...fe, [field]: undefined }));

      if (field === "orgName") {
        setForm((f) => ({
          ...f,
          orgName: value,
          orgSlug: value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""),
        }));
      } else {
        setForm((f) => ({ ...f, [field]: value }));
      }
    };
  }

  function handleContinue(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError(null);

    const result = step1Schema.safeParse(form);
    if (!result.success) {
      const { fieldErrors } = z.flattenError(result.error);
      setFieldErrors(fieldErrors as FieldErrors);
      return;
    }

    setFieldErrors({});
    setStep(2);
  }

  async function handleSubmit(e: React.SubmitEvent<HTMLFormElement>) {
    e.preventDefault();
    setGlobalError(null);

    const result = registerSchema.safeParse(form);
    if (!result.success) {
      const { fieldErrors } = z.flattenError(result.error);
      setFieldErrors(fieldErrors as FieldErrors);
      return;
    }

    setFieldErrors({});
    setLoading(true);

    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.status === 422) {
      const { error } = await res.json();
      setFieldErrors(error.fieldErrors ?? {});
      setLoading(false);
      return;
    }

    if (!res.ok) {
      const { error } = await res.json();
      setGlobalError(typeof error === "string" ? error : "Registration failed.");
      setLoading(false);
      return;
    }

    const signInResult = await signIn("credentials", {
      email: form.email,
      password: form.password,
      redirect: false,
    });

    setLoading(false);

    if (signInResult?.error) {
      setGlobalError("Account created but sign-in failed. Please log in manually.");
      router.push("/login");
    } else {
      router.push("/dashboard");
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="mb-8 text-center">
        <span className="text-2xl font-bold text-indigo-600 tracking-tight">Loopline</span>
        <p className="mt-1 text-sm text-gray-500">Create your account</p>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-gray-100 px-8 py-8">
        <StepIndicator step={step} />

        {globalError && <Alert variant="error">{globalError}</Alert>}

        {step === 1 && (
          <form onSubmit={handleContinue} className="flex flex-col gap-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Your account
            </p>

            <Input
              label="Full name"
              required
              value={form.name}
              onChange={set("name")}
              placeholder="Jane Smith"
              error={fieldErrors.name?.[0]}
            />
            <Input
              label="Email"
              type="email"
              required
              autoComplete="email"
              value={form.email}
              onChange={set("email")}
              placeholder="you@example.com"
              error={fieldErrors.email?.[0]}
            />
            <PasswordInput
              label="Password"
              required
              autoComplete="new-password"
              value={form.password}
              onChange={set("password")}
              placeholder="Min. 8 characters"
              error={fieldErrors.password?.[0]}
            />

            <Button type="submit" className="mt-1 w-full">
              Continue →
            </Button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">
              Your organization
            </p>

            <Input
              label="Organization name"
              required
              value={form.orgName}
              onChange={set("orgName")}
              placeholder="Acme Inc."
              error={fieldErrors.orgName?.[0]}
            />
            <Input
              label="Slug"
              required
              value={form.orgSlug}
              onChange={set("orgSlug")}
              placeholder="acme-inc"
              prefix="loopline/"
              hint="Used in your public widget URL"
              error={fieldErrors.orgSlug?.[0]}
            />

            <Button type="submit" loading={loading} className="mt-1 w-full">
              Create account
            </Button>

            <button
              type="button"
              onClick={() => { setStep(1); setFieldErrors({}); }}
              className="text-sm text-gray-400 hover:text-gray-600 text-center transition-colors cursor-pointer"
            >
              ← Back
            </button>
          </form>
        )}
      </div>

      <p className="mt-6 text-center text-sm text-gray-500">
        Already have an account?{" "}
        <Link href="/login" className="text-indigo-600 hover:underline font-medium">
          Sign in
        </Link>
      </p>
    </div>
  );
}
