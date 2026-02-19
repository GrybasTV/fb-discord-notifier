import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const res = await db().execute({
    sql: "SELECT * FROM monitored_pages WHERE user_id = ? ORDER BY created_at DESC",
    args: [session.user.id as string]
  });

  return NextResponse.json(res.rows);
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url, name, discord_webhook_url } = await req.json();

  if (!url) {
    return NextResponse.json({ error: "Nuoroda yra privaloma" }, { status: 400 });
  }

  const id = uuidv4();

  await db().execute({
    sql: "INSERT INTO monitored_pages (id, user_id, url, name, discord_webhook_url, status) VALUES (?, ?, ?, ?, ?, 'active')",
    args: [id, session.user.id as string, url, name || null, discord_webhook_url || null]
  });

  return NextResponse.json({ success: true, id });
}

export async function DELETE(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");

  if (!id) {
    return NextResponse.json({ error: "ID mirror privalomas" }, { status: 400 });
  }

  await db().execute({
    sql: "DELETE FROM monitored_pages WHERE id = ? AND user_id = ?",
    args: [id, session.user.id as string]
  });

  return NextResponse.json({ success: true });
}
