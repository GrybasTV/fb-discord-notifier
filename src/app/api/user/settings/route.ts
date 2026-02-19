import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

export async function GET() {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = (session.user as any).id;
  if (!userId) {
    return NextResponse.json({ error: "Vartotojo ID nerastas sesijoje" }, { status: 400 });
  }

  const res = await db().execute({
    sql: "SELECT default_discord_webhook_url FROM users WHERE id = ?",
    args: [userId]
  });

  return NextResponse.json(res.rows[0] || { default_discord_webhook_url: null });
}

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { default_discord_webhook_url } = await req.json();

  await db().execute({
    sql: "UPDATE users SET default_discord_webhook_url = ? WHERE id = ?",
    args: [default_discord_webhook_url || null, (session.user as any).id]
  });

  return NextResponse.json({ success: true });
}
