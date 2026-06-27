type Variant = "error" | "success" | "info";

const styles: Record<Variant, string> = {
  error: "bg-red-50 border-red-100 text-red-600",
  success: "bg-green-50 border-green-100 text-green-700",
  info: "bg-blue-50 border-blue-100 text-blue-700",
};

export function Alert({ variant = "error", children }: { variant?: Variant; children: React.ReactNode }) {
  return (
    <div className={`rounded-lg border px-4 py-3 text-sm ${styles[variant]}`}>
      {children}
    </div>
  );
}
