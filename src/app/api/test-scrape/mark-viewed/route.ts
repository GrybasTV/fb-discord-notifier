import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { db } from "@/lib/db";

// POST - Mark first post from test-scrape as viewed
export async function POST(req: Request) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { requestId } = await req.json();

  if (!requestId) {
    return NextResponse.json({ error: "Nenurodytas requestId" }, { status: 400 });
  }

  try {
    // Get the test scrape request
    const testRes = await db().execute({
      sql: "SELECT * FROM test_scrape_requests WHERE id = ? AND user_id = ?",
      args: [requestId, session.user.id],
    });

    const testRequest = testRes.rows[0];

    if (!testRequest) {
      return NextResponse.json({ error: "Request nerastas" }, { status: 404 });
    }

    if (testRequest.status !== "completed") {
      return NextResponse.json({ error: "Testas dar nebaigtas" }, { status: 400 });
    }

    if (!testRequest.posts) {
      return NextResponse.json({ error: "Nėra postų" }, { status: 400 });
    }

    const posts = JSON.parse(testRequest.posts as string);

    if (!Array.isArray(posts) || posts.length === 0) {
      return NextResponse.json({ error: "Netinkami postų duomenys" }, { status: 400 });
    }

    // Get the first (newest) post URL
    const firstPostUrl = posts[0].postUrl;

    if (!firstPostUrl) {
      return NextResponse.json({ error: "Pirmas postas neturi URL" }, { status: 400 });
    }

    // Find the monitored page by URL
    const pageRes = await db().execute({
      sql: "SELECT * FROM monitored_pages WHERE url = ? AND user_id = ?",
      args: [testRequest.url, session.user.id],
    });

    const monitoredPage = pageRes.rows[0];

    if (!monitoredPage) {
      return NextResponse.json({ error: "Stebimas puslapis nerastas" }, { status: 404 });
    }

    // Update last_viewed_post_url
    await db().execute({
      sql: "UPDATE monitored_pages SET last_viewed_post_url = ? WHERE id = ?",
      args: [firstPostUrl, monitoredPage.id],
    });

    console.log(`[MARK-VIEWED] Marked ${firstPostUrl} as viewed for page ${monitoredPage.name || monitoredPage.url}`);

    return NextResponse.json({
      success: true,
      message: "Pirmas postas pažymėtas kaip peržiūrėtas",
      viewedUrl: firstPostUrl,
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error("Mark viewed error:", message);
    return NextResponse.json({ error: "Nepavyko pažymėti" }, { status: 500 });
  }
}
