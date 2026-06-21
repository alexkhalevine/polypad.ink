"use client";

import { HCaptcha } from "@hcaptcha/react-hcaptcha";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { X, Send } from "lucide-react";

interface ContactFormModalProps {
  dialogId?: string;
}

type Status = "idle" | "loading" | "success" | "error";
const EMAIL_REGEX = /^[\w-.]+@([\w-]+\.)+[\w-]{2,4}$/;

const INPUT_CLASS =
  "w-full rounded-[11px] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] text-[#e7e7ef] outline-none transition-colors placeholder:text-[#6b6b78] focus:border-[rgba(139,109,255,0.6)] focus:bg-[rgba(139,109,255,0.06)]";

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
  const verified = !!captchaToken;

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

  // We use .show() instead of .showModal() (see openFeedbackModal in page.tsx)
  // so the hCaptcha challenge popup can render above us — but that means we
  // lose the browser's native Escape-to-close behavior, so reinstate it here.
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && dialogRef.current?.open) handleClose();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
    // handleClose only touches refs and state setters, both stable — safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
    <dialog
      ref={dialogRef}
      id={dialogId}
      className="hidden open:flex fixed inset-0 z-100 m-0 h-full w-full max-w-none items-center justify-center border-0 p-0"
      style={{ background: "rgba(6,5,12,0.55)", backdropFilter: "blur(4px)", WebkitBackdropFilter: "blur(4px)" }}
      onClick={(e) => {
        if (e.target === dialogRef.current) handleClose();
      }}
    >
      <div
        className="polypad-dark font-display mx-auto w-[480px] max-w-full rounded-[22px] p-[30px] text-[#e7e7ef]"
        style={{
          background: "rgba(18,18,26,0.86)",
          backdropFilter: "blur(26px)",
          WebkitBackdropFilter: "blur(26px)",
          border: "1px solid rgba(255,255,255,0.10)",
          boxShadow: "0 30px 80px rgba(0,0,0,0.6)",
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-[26px] font-bold leading-none tracking-[-0.02em] text-[#f4f4f8]">
              Get in touch
            </h1>
            <p className="mt-1.5 text-[14px] text-[#9a9aa6]">
              I&apos;ll reply to your email directly.
            </p>
          </div>
          <button
            type="button"
            onClick={handleClose}
            aria-label="Close"
            className="flex h-[34px] w-[34px] shrink-0 items-center justify-center rounded-[10px] border border-[rgba(255,255,255,0.08)] bg-[rgba(255,255,255,0.05)] text-[#9a9aa6] transition-colors hover:bg-[rgba(255,255,255,0.1)] hover:text-white"
          >
            <X size={18} strokeWidth={1.8} />
          </button>
        </div>

        {status === "success" ? (
          <div className="mt-[26px] rounded-[14px] border border-[rgba(255,255,255,0.10)] bg-[rgba(255,255,255,0.04)] p-6 text-center">
            <p className="font-semibold text-[#f4f4f8]">Message sent.</p>
            <p className="mt-1 text-[13px] text-[#9a9aa6]">
              Thanks for reaching out — we&apos;ll get back to you soon.
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="mt-[26px] flex flex-col">
            <div className="flex flex-col gap-[18px]">
              <Field label="Name">
                <input
                  id="name"
                  name="name"
                  type="text"
                  required
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Your name"
                  className={`${INPUT_CLASS} font-display h-[48px] px-[15px] text-[15px]`}
                />
              </Field>

              <Field label="Email">
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  value={form.email}
                  onChange={handleChange}
                  placeholder="your@email.com"
                  className={`${INPUT_CLASS} font-tech h-[48px] px-[15px] text-[14px]`}
                />
              </Field>

              <Field label="Message">
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={4}
                  value={form.message}
                  onChange={handleChange}
                  placeholder="How can I help you?"
                  className={`${INPUT_CLASS} font-display min-h-[118px] resize-y px-[15px] py-[13px] leading-[1.5]`}
                />
              </Field>
            </div>

            {/* hCaptcha — real widget, dark-themed, sitting in the spec's dark sub-panel */}
            <div
              className="mt-[20px] rounded-[12px] border border-[rgba(255,255,255,0.08)] px-[16px] py-[14px]"
              style={{ background: "rgba(8,8,12,0.5)" }}
            >
              <HCaptcha
                ref={captchaRef}
                sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
                onVerify={(token) => setCaptchaToken(token)}
                onExpire={() => setCaptchaToken(null)}
                onError={() => setCaptchaToken(null)}
                theme="dark"
              />
            </div>

            {status === "error" && (
              <p className="mt-3 text-[13px] text-[#ff8a8a]">{errorMessage}</p>
            )}

            <div className="mt-[22px] flex items-center gap-[10px]">
              <button
                type="submit"
                disabled={
                  status === "loading" ||
                  !verified ||
                  isFormIncomplete ||
                  isEmailInvalid
                }
                className="flex h-[48px] items-center gap-2 rounded-[12px] px-[22px] text-[15px] font-semibold transition-colors disabled:cursor-not-allowed"
                style={
                  verified
                    ? {
                        background: "linear-gradient(95deg,#8b6dff,#a06bff)",
                        color: "#fff",
                        border: "none",
                        boxShadow: "0 10px 28px rgba(139,109,255,0.32)",
                        cursor: "pointer",
                      }
                    : {
                        background: "rgba(255,255,255,0.05)",
                        color: "#5f5f6c",
                        border: "1px solid rgba(255,255,255,0.08)",
                      }
                }
              >
                <Send size={16} strokeWidth={1.8} />
                {status === "loading" ? "Sending…" : "Send message"}
              </button>

              <button
                type="button"
                onClick={handleClose}
                style={{ background: "rgba(255,255,255,0.04)" }}
                className="flex h-[48px] items-center rounded-[12px] border border-[rgba(255,255,255,0.14)] px-[22px] text-[15px] font-medium text-[#c7c7d1] transition-colors hover:bg-[rgba(255,255,255,0.09)] hover:text-white"
              >
                Close
              </button>

              {!verified && (
                <span className="ml-auto text-[12px] text-[#9a9aa6]">
                  Verify to send
                </span>
              )}
            </div>
          </form>
        )}
      </div>
    </dialog>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col">
      <label className="mb-2 block text-[12px] font-semibold tracking-[0.04em] text-[#c4b5ff]">
        {label}
      </label>
      {children}
    </div>
  );
}
