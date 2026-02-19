import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";
import crypto from "crypto";

// POST - Create test request and trigger GitHub Actions
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await req.json();

  if (!url) {
    return NextResponse.json({ error: "Nenurodytas URL" }, { status: 400 });
  }

  // Validate Facebook URL
  if (!url.includes("facebook.com") && !url.includes("fb.watch")) {
    return NextResponse.json({ error: "Tinkamas Facebook URL" }, { status: 400 });
  }

  // Generate unique request ID
  const requestId = crypto.randomUUID();

  try {
    // Create test request in database
    await db().execute({
      sql: `
        INSERT INTO test_scrape_requests (id, user_id, url, status)
        VALUES (?, ?, ?, 'pending')
      `,
      args: [requestId, session.user.id, url],
    });

    // Trigger GitHub Actions workflow
    // Note: You need to set GITHUB_TOKEN in Vercel environment variables
    const workflowUrl = `https://api.github.com/repos/GrybasTV/fb-discord-notifier/actions/workflows/test-scrape.yaml/dispatches`;

    const githubToken = process.env.GITHUB_TOKEN;

    if (!githubToken) {
      return NextResponse.json(
        {
          error: "GITHUB_TOKEN nenurodytas. Susisiekite su administratorium.",
          note: "Reikia nustatyti GITHUB_TOKEN Vercel environment variables",
        },
        { status: 500 }
      );
    }

    const githubRes = await fetch(workflowUrl, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${githubToken}`,
        Accept: "application/vnd.github.v3+json",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ref: "master", // Arba "main", priklausomai nuo jūsų default branch
        inputs: {
          url: url,
          request_id: requestId,
        },
      }),
    });

    if (!githubRes.ok) {
      const errorText = await githubRes.text();
      console.error(`GitHub API Error: ${githubRes.status} ${errorText}`);
      throw new Error(`GitHub API nepriėmė užklausos: ${githubRes.status} ${errorText}`);
    }

    return NextResponse.json({
      success: true,
      requestId,
      message: "Testas paleistas. Rezultatai bus paruošti po 1-2 minučių.",
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Test scrape error:", message);
    return NextResponse.json({ error: "Nepavyko paleisti testo: " + message }, { status: 500 });
  }
}

// GET - Check test request status
export async function GET(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const requestId = searchParams.get("requestId");

  if (!requestId) {
    return NextResponse.json({ error: "Nenurodytas requestId" }, { status: 400 });
  }

  try {
    const res = await db().execute({
      sql: "SELECT * FROM test_scrape_requests WHERE id = ? AND user_id = ?",
      args: [requestId, session.user.id],
    });

    const request = res.rows[0];

    if (!request) {
      return NextResponse.json({ error: "Request nerastas" }, { status: 404 });
    }

    let posts = null;
    if (request.posts) {
      try {
        posts = JSON.parse(request.posts as string);
      } catch (e) {
        // Invalid JSON
      }
    }

    return NextResponse.json({
      id: request.id,
      status: request.status,
      url: request.url,
      posts,
      created_at: request.created_at,
      completed_at: request.completed_at,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Get test status error:", message);
    return NextResponse.json({ error: "Nepavyko gauti būsenos" }, { status: 500 });
  }
}
