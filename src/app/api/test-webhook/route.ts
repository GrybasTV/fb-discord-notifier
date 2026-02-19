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

  // Get page details for the report (refetch if needed or use existing page obj)
  let pageDetails = {
    last_checked: "Niekada",
    last_post: "Nėra",
    status: "Nežinoma"
  };

  if (pageId) {
     const res = await db().execute({
       sql: "SELECT * FROM monitored_pages WHERE id = ?",
       args: [pageId]
     });
     const row = res.rows[0];
     if (row) {
        pageDetails = {
            last_checked: row.last_checked ? new Date(row.last_checked as string).toLocaleString('lt-LT') : "Niekada",
            last_post: (row.last_post_id as string) || "Nėra",
            status: (row.status as string) === 'active' ? '✅ Aktyvus' : '❌ Klaida/Sustabdytas'
        };
     }
  }

  try {
    const payload = {
      embeds: [{
        title: `🟢 Ryšio Testas: ${pageName}`,
        description: "Discord Webhook veikia teisingai! Štai ką mato Scraperis duomenų bazėje:",
        color: 3066993, // Green
        fields: [
            { name: "Paskutinis tikrinimas", value: pageDetails.last_checked, inline: true },
            { name: "Statusas", value: pageDetails.status, inline: true },
            { name: "Paskutinis rastas įrašas", value: pageDetails.last_post }
        ],
        timestamp: new Date().toISOString(),
        footer: { text: "FB Notifier • Status Report" }
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
