"use client";

import { HCaptcha } from "@hcaptcha/react-hcaptcha";
import { useRef, useState } from "react";

interface ContactFormModalProps {
  dialogId?: string;
}

type Status = "idle" | "loading" | "success" | "error";
const EMAIL_REGEX = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;

export function ContactFormModal({
  dialogId = "contact-form-modal",
}: ContactFormModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const captchaRef = useRef<HCaptcha>(null);
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const trimmedEmail = form.email.trim();
  const isFormIncomplete =
    !form.name.trim() || !form.email.trim() || !form.message.trim();
  const isEmailInvalid = !!trimmedEmail && !EMAIL_REGEX.test(trimmedEmail);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>,
  ) => {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const resetFormState = () => {
    setForm({ name: "", email: "", message: "" });
    setCaptchaToken(null);
    setStatus("idle");
    setErrorMessage("");
    captchaRef.current?.resetCaptcha();
  };

  const handleClose = () => {
    resetFormState();
    dialogRef.current?.close();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!captchaToken) {
      setStatus("error");
      setErrorMessage("Please complete the hCaptcha verification.");
      return;
    }

    setStatus("loading");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, hcaptchaToken: captchaToken }),
      });

      if (res.ok) {
        setStatus("success");
        setForm({ name: "", email: "", message: "" });
        setCaptchaToken(null);
        captchaRef.current?.resetCaptcha();
      } else {
        const data = await res.json();
        setErrorMessage(data.error ?? "Something went wrong.");
        setStatus("error");
      }
    } catch {
      setErrorMessage("Network error. Please try again.");
      setStatus("error");
    }
  };

  return (
    <dialog ref={dialogRef} id={dialogId} className="modal">
      <div className="modal-box">
        <h1 className="text-2xl font-semibold mb-2 text-zinc-900">
          Get in touch
        </h1>
        <p className="text-zinc-900 mb-8 text-sm">
          I&apos;ll reply to your email directly.
        </p>

        {status === "success" ? (
          <div className="rounded-lg border border-gray-200 p-6 text-center">
            <p className="font-medium text-zinc-900">Message sent.</p>
            <p className="text-sm text-gray-500 mt-1">
              Thanks for reaching out — We&apos;ll get back to you soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-1">
              <label
                htmlFor="name"
                className="text-sm font-medium text-blue-800"
              >
                Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={form.name}
                onChange={handleChange}
                placeholder="Your name"
                className="text-blue-800 rounded-sm border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="email"
                className="text-sm font-medium text-blue-800"
              >
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                value={form.email}
                onChange={handleChange}
                placeholder="your@email.com"
                className="text-blue-800 rounded-sm border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 transition-colors"
              />
            </div>

            <div className="flex flex-col gap-1">
              <label
                htmlFor="message"
                className="text-sm font-medium text-blue-800"
              >
                Message
              </label>
              <textarea
                id="message"
                name="message"
                required
                rows={5}
                value={form.message}
                onChange={handleChange}
                placeholder="How can I help you?"
                className="text-blue-800 rounded-sm border border-gray-300 px-3 py-2 text-sm outline-none focus:border-gray-900 transition-colors resize-none"
              />
            </div>

            <div>
              <HCaptcha
                ref={captchaRef}
                sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                onError={() => setCaptchaToken(null)}
                theme="light"
              />
            </div>

            {status === "error" && (
              <p className="text-sm text-red-600">{errorMessage}</p>
            )}

            <div className="flex gap-4">
              <button
                type="submit"
                disabled={
                  status === "loading" ||
                  !captchaToken ||
                  isFormIncomplete ||
                  isEmailInvalid
                }
                className="rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors max-w-36"
              >
                {status === "loading" ? "Sending…" : "Send message"}
              </button>

              <button
                type="button"
                onClick={handleClose}
                className="rounded-md bg-blue-800 px-4 py-2 text-sm font-medium text-white hover:bg-gray-700 disabled:opacity-50 transition-colors max-w-36"
              >
                Close
              </button>
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}
