import { InputHTMLAttributes, ReactNode } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
  hint?: ReactNode;
  prefix?: ReactNode;
};

export function Input({ label, error, hint, prefix, className = "", id, ...props }: Props) {
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  const inputClass = `w-full px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 bg-white
    focus:outline-none
    ${error ? "border-red-300 bg-red-50" : ""}
    ${!prefix ? `rounded-lg border ${error ? "border-red-300 bg-red-50" : "border-gray-200"} focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition` : ""}
    ${className}`;

  return (
    <div>
      <label htmlFor={inputId} className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
        {props.required && <span className="text-red-400 ml-0.5">*</span>}
      </label>

      {prefix ? (
        <div className={`flex items-center rounded-lg border ${error ? "border-red-300" : "border-gray-200"} focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-transparent transition overflow-hidden`}>
          <span className="px-3 py-2.5 text-sm text-gray-400 bg-gray-50 border-r border-gray-200 select-none whitespace-nowrap">
            {prefix}
          </span>
          <input id={inputId} className={inputClass} {...props} />
        </div>
      ) : (
        <input id={inputId} className={inputClass} {...props} />
      )}

      {hint && !error && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
