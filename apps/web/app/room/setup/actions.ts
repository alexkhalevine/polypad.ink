"use server"
import { redirect } from "next/navigation";

async function verifyHcaptcha(token: string): Promise<boolean> {
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

export async function setupRoom(formData: FormData) {
  const token = formData.get("token") as string;
  const roomName = formData.get("roomName") as string;

  if (!token || !roomName) {
    console.error("Missing token or room name");
    redirect("/");
  }

  const isValid = await verifyHcaptcha(token);

  if (!isValid) {
    console.error("invalid hCaptcha token");
    redirect("/");
  }

  redirect(`/room/${roomName}?name=${encodeURIComponent(roomName)}`);
}

export { verifyHcaptcha };
