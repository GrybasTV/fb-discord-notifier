import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import axios from "axios";
import { db } from "@/lib/db";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { pageId, webhookUrl } = await req.json();

  let targetWebhook = webhookUrl;

  // Jei nurodytas pageId, paimame informaciją iš DB
  let pageName = "Testinis Puslapis";
  if (pageId) {
    const res = await db().execute({
      sql: "SELECT * FROM monitored_pages WHERE id = ? AND user_id = ?",
      args: [pageId, session.user.id]
    });
    const page = res.rows[0];
    if (page) {
      pageName = (page.name as string) || (page.url as string);
      if (!targetWebhook) {
        targetWebhook = page.discord_webhook_url;
      }
    }
  }

  // Jei vis dar nėra webhook, bandom paimti bendrą vartotojo webhook
  if (!targetWebhook) {
    const userRes = await db().execute({
      sql: "SELECT default_discord_webhook_url FROM users WHERE id = ?",
      args: [session.user.id]
    });
    targetWebhook = userRes.rows[0]?.default_discord_webhook_url;
  }

  if (!targetWebhook) {
    return NextResponse.json({ error: "Nenurodytas Discord Webhook URL" }, { status: 400 });
  }

  try {
    const payload = {
      embeds: [{
        title: `Testinis pranešimas: ${pageName}`,
        description: "Jei matote šią žinutę, vadinasi Jūsų FB Notifier ryšys su Discord veikia teisingai! ✅",
        color: 3066993, // Green
        timestamp: new Date().toISOString(),
        footer: { text: "FB Notifier Test" }
      }]
    };

    await axios.post(targetWebhook, payload);
    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Test webhook error:", message);
    return NextResponse.json({ error: "Nepavyko išsiųsti pranešimo į Discord: " + message }, { status: 500 });
  }
}
