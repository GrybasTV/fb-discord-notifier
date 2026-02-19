import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    console.log("[MIGRATE] Starting database migration...");

    // Create test_scrape_requests table
    await db().execute(`
      CREATE TABLE IF NOT EXISTS test_scrape_requests (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        url TEXT NOT NULL,
        status TEXT DEFAULT 'pending',
        posts TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        completed_at DATETIME,
        FOREIGN KEY(user_id) REFERENCES users(id)
      )
    `);

    console.log("[MIGRATE] test_scrape_requests table created");

    // Create indexes
    await db().execute(`
      CREATE INDEX IF NOT EXISTS idx_test_requests_user
      ON test_scrape_requests(user_id)
    `);

    await db().execute(`
      CREATE INDEX IF NOT EXISTS idx_test_requests_status
      ON test_scrape_requests(status)
    `);

    console.log("[MIGRATE] Indexes created");

    return NextResponse.json({
      success: true,
      message: "Migration completed successfully",
      tables: ["test_scrape_requests"],
    });
  } catch (error: any) {
    console.error("[MIGRATE] Error:", error);
    return NextResponse.json(
      {
        error: error.message || "Unknown error",
        hint: "Check if all tables exist in database",
      },
      { status: 500 }
    );
  }
}
