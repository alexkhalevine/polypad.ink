"use client";

import { useEffect } from "react";
import { useErrorStore, AppError } from "../error-store";

const DISMISS_MS = 5000;

function ErrorAlert({ error }: { error: AppError }) {
  const removeError = useErrorStore((s) => s.removeError);

  useEffect(() => {
    const timer = setTimeout(() => removeError(error.id), DISMISS_MS);
    return () => clearTimeout(timer);
  }, [error.id, removeError]);

  return (
    <div role="alert" className="alert alert-error">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6 shrink-0 stroke-current"
        fill="none"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span>{error.message}</span>
    </div>
  );
}

export function ErrorStack() {
  const errors = useErrorStore((s) => s.errors);

  if (errors.length === 0) return null;

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2 w-80">
      {errors.map((error) => (
        <ErrorAlert key={error.id} error={error} />
      ))}
    </div>
  );
}