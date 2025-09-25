import { NextResponse } from "next/server";

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;
const APP_BASE_URL = process.env.APP_BASE_URL; // e.g., https://prepmymeeting.vercel.app

export async function POST() {
  try {
    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_WEBHOOK_SECRET || !APP_BASE_URL) {
      return NextResponse.json({ error: "Missing env: TELEGRAM_BOT_TOKEN/TELEGRAM_WEBHOOK_SECRET/APP_BASE_URL" }, { status: 500 });
    }

    const webhookUrl = `${APP_BASE_URL}/api/telegram?secret=${encodeURIComponent(TELEGRAM_WEBHOOK_SECRET)}`;
    const res = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/setWebhook`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: webhookUrl }),
      cache: "no-store",
    });
    const data = await res.json();
    if (!res.ok || data?.ok !== true) {
      return NextResponse.json({ error: "Failed to set webhook", response: data }, { status: 500 });
    }

    return NextResponse.json({ ok: true, url: webhookUrl, telegram: data });
  } catch (error: unknown) {
    console.error("set-webhook error", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
} 