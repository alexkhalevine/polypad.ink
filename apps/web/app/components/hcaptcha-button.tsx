"use client";

import { HCaptcha } from "@hcaptcha/react-hcaptcha";
import { useRef, useState } from "react";

interface HcaptchaButtonProps {
  onVerify: (token: string) => void;
  theme?: "light" | "dark";
}

export function HcaptchaButton({ onVerify, theme = "light" }: HcaptchaButtonProps) {
  const captchaRef = useRef<HCaptcha>(null);
  const [token, setToken] = useState<string | null>(null);

  function handleVerify(captchaToken: string) {
    setToken(captchaToken);
    onVerify(captchaToken);
  }

  return (
    <div>
      <HCaptcha
        ref={captchaRef}
        sitekey={process.env.NEXT_PUBLIC_HCAPTCHA_SITE_KEY!}
        onVerify={handleVerify}
        theme={theme}
      />
      {token && (
        <p className="text-sm text-green-600 mt-2">Verified!</p>
      )}
    </div>
  );
}