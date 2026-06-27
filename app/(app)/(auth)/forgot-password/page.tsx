import { Suspense } from "react";
import ForgotPasswordForm from "@/components/Auth/ForgotPasswordForm";

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
