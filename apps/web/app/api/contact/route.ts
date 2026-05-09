import { Resend } from "resend";
import { NextResponse } from "next/server";

const resend = new Resend(process.env.RESEND_API_KEY);
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const HEADER_INJECTION_REGEX = /[\r\n]/;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 254;
const MAX_MESSAGE_LENGTH = 4000;

interface HcaptchaVerifyResponse {
  success: boolean;
  "error-codes"?: string[];
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON payload." }, { status: 400 });
  }

  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body." }, { status: 400 });
  }

  const { name, email, message, hcaptchaToken } = body as Record<string, unknown>;

  if (!isNonEmptyString(name) || !isNonEmptyString(email) || !isNonEmptyString(message)) {
    return NextResponse.json(
      { error: "Name, email, and message are required." },
      { status: 400 }
    );
  }

  if (!isNonEmptyString(hcaptchaToken)) {
    return NextResponse.json(
      { error: "hCaptcha verification is required." },
      { status: 400 }
    );
  }

  const normalizedName = name.trim();
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedMessage = message.trim();
  const normalizedCaptchaToken = hcaptchaToken.trim();

  if (
    HEADER_INJECTION_REGEX.test(normalizedName) ||
    HEADER_INJECTION_REGEX.test(normalizedEmail)
  ) {
    return NextResponse.json(
      { error: "Invalid characters in name or email." },
      { status: 400 }
    );
  }

  if (
    normalizedName.length > MAX_NAME_LENGTH ||
    normalizedEmail.length > MAX_EMAIL_LENGTH ||
    normalizedMessage.length > MAX_MESSAGE_LENGTH
  ) {
    return NextResponse.json(
      { error: "Input is too long." },
      { status: 400 }
    );
  }

  if (!EMAIL_REGEX.test(normalizedEmail)) {
    return NextResponse.json(
      { error: "Invalid email format." },
      { status: 400 }
    );
  }

  const hcaptchaSecret = process.env.HCAPTCHA_SECRET_KEY;

  if (!hcaptchaSecret) {
    return NextResponse.json(
      { error: "Server is missing hCaptcha configuration." },
      { status: 500 }
    );
  }

  const verifyPayload = new URLSearchParams({
    secret: hcaptchaSecret,
    response: normalizedCaptchaToken,
  });

  const forwardedFor = request.headers.get("x-forwarded-for") ?? "";
  const remoteip = forwardedFor.split(",")[0]?.trim();

  if (remoteip) {
    verifyPayload.append("remoteip", remoteip);
  }

  let verifyResult: HcaptchaVerifyResponse;

  try {
    const verifyRes = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: verifyPayload.toString(),
    });

    if (!verifyRes.ok) {
      return NextResponse.json(
        { error: "Failed to verify hCaptcha. Please try again." },
        { status: 502 }
      );
    }

    verifyResult = (await verifyRes.json()) as HcaptchaVerifyResponse;
  } catch {
    return NextResponse.json(
      { error: "Could not verify hCaptcha. Please try again." },
      { status: 502 }
    );
  }

  if (!verifyResult.success) {
    return NextResponse.json(
      {
        error: "hCaptcha verification failed.",
        details: verifyResult["error-codes"] ?? [],
      },
      { status: 403 }
    );
  }

  try {
    await resend.emails.send({
      from: "Polypad Contact <onboarding@resend.dev>",
      to: process.env.TO_EMAIL!,
      replyTo: normalizedEmail,
      subject: `Polypad: message from ${normalizedName}`,
      text: `Name: ${normalizedName}\nEmail: ${normalizedEmail}\n\nMessage:\n${normalizedMessage}`,
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json(
      { error: "Failed to send message. Please try again." },
      { status: 500 }
    );
  }
}
