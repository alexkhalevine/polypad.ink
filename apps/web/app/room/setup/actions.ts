"use server"
import { redirect } from "next/navigation";
import { cookies } from "next/headers";

async function verifyHcaptcha(token: string): Promise<boolean> {
  if (process.env.NODE_ENV !== "production") return true;

  const secretKey = process.env.HCAPTCHA_SECRET_KEY;
  if (!secretKey) {
    console.error("HCAPTCHA_SECRET_KEY is not set");
    return false;
  }

  try {
    const response = await fetch("https://hcaptcha.com/siteverify", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: new URLSearchParams({
        secret: secretKey,
        response: token,
      }),
    });

    if (!response.ok) {
      console.error("hCaptcha verification request failed:", response.statusText);
      return false;
    }

    const data = await response.json();
    return data.success === true;
  } catch (error) {
    console.error("hCaptcha verification failed:", error);
    return false;
  }
}

export async function setupRoom(
  _prevState: { error: string } | null,
  formData: FormData
): Promise<{ error: string } | null> {
  const token = formData.get("token") as string;
  const roomName = formData.get("roomName") as string;

  if (!roomName) {
    return { error: "Something went wrong. Please try again." };
  }

  const cookieStore = await cookies();
  const alreadyVerified = cookieStore.get("captcha_verified")?.value === "1";

  if (!alreadyVerified) {
    if (!token) {
      return { error: "Something went wrong. Please try again." };
    }

    const isValid = await verifyHcaptcha(token);
    if (!isValid) {
      return { error: "Verification failed. Please try again from the home page." };
    }

    // Token is single-use and now consumed — persist verification for retries
    cookieStore.set("captcha_verified", "1", {
      httpOnly: true,
      path: "/room/setup",
      maxAge: 600,
    });
  }

  const apiBase = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4000";
  const res = await fetch(`${apiBase}/rooms`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name: roomName }),
    cache: "no-store",
  });

  if (res.status === 409) {
    return { error: "A room with that name already exists. Pick a different name." };
  }
  if (!res.ok) {
    return { error: "Could not create room. Please try again." };
  }

  const { id, inviteCode } = (await res.json()) as { id: string; inviteCode: string };
  cookieStore.delete("captcha_verified");
  redirect(`/room/${encodeURIComponent(id)}?invite=${encodeURIComponent(inviteCode)}`);
}

export { verifyHcaptcha };
