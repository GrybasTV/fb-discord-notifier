import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  try {
    console.log("[MIGRATE] Adding last_viewed_post_url column...");

    // SQLite doesn't support ALTER TABLE ADD COLUMN IF NOT EXISTS
    // So we need to check if the column exists first
    const checkColumn = await db().execute({
      sql: "PRAGMA table_info(monitored_pages)",
    });

    const hasColumn = checkColumn.rows.some(
      (row: any) => row.name === "last_viewed_post_url"
    );

    if (hasColumn) {
      console.log("[MIGRATE] Column already exists");
      return NextResponse.json({
        success: true,
        message: "Column already exists",
      });
    }

    // Add the column
    await db().execute({
      sql: "ALTER TABLE monitored_pages ADD COLUMN last_viewed_post_url TEXT",
    });

    console.log("[MIGRATE] Column added successfully");

    return NextResponse.json({
      success: true,
      message: "last_viewed_post_url column added successfully",
    });
  } catch (error: any) {
    console.error("[MIGRATE] Error:", error);
    return NextResponse.json(
      {
        error: error.message || "Unknown error",
      },
      { status: 500 }
    );
  }
}
