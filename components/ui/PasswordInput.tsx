"use client";

import { useState, InputHTMLAttributes } from "react";

type Props = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label: string;
  error?: string;
};

function EyeIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.477 0 8.268 2.943 9.542 7-1.274 4.057-5.065 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M13.875 18.825A10.05 10.05 0 0112 19c-4.477 0-8.268-2.943-9.542-7a9.97 9.97 0 012.189-3.651M6.477 6.477A9.97 9.97 0 0112 5c4.477 0 8.268 2.943 9.542 7a9.97 9.97 0 01-1.366 2.57M6.477 6.477L3 3m3.477 3.477l7.046 7.046M17.523 17.523L21 21m-3.477-3.477l-7.046-7.046" />
    </svg>
  );
}

export function PasswordInput({ label, error, id, className = "", ...props }: Props) {
  const [visible, setVisible] = useState(false);
  const inputId = id ?? label.toLowerCase().replace(/\s+/g, "-");

  return (
    <div>
      <label htmlFor={inputId} className="block text-xs font-medium text-gray-600 mb-1.5">
        {label}
        {props.required && <span className="text-red-400 ml-0.5">*</span>}
      </label>

      <div className={`flex items-center rounded-lg border ${error ? "border-red-300 bg-red-50" : "border-gray-200"} focus-within:ring-2 focus-within:ring-indigo-400 focus-within:border-transparent transition overflow-hidden`}>
        <input
          id={inputId}
          type={visible ? "text" : "password"}
          className={`flex-1 px-3 py-2.5 text-sm text-gray-900 placeholder-gray-400 bg-transparent focus:outline-none ${className}`}
          {...props}
        />
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="px-3 text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
          aria-label={visible ? "Hide password" : "Show password"}
          tabIndex={-1}
        >
          {visible ? <EyeOffIcon /> : <EyeIcon />}
        </button>
      </div>

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
