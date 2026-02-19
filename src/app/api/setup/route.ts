import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

export async function GET() {
  try {
    const email = "admin@example.com";
    const password = "password123";

    // Check if user exists
    const existing = await db().execute({
      sql: "SELECT * FROM users WHERE email = ?",
      args: [email],
    });

    if (existing.rows.length > 0) {
      return NextResponse.json({
        success: true,
        message: "User already exists",
        email,
        password,
      });
    }

    // Create user
    const hash = await bcrypt.hash(password, 10);
    const id = uuidv4();

    await db().execute({
      sql: "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
      args: [id, email, hash],
    });

    return NextResponse.json({
      success: true,
      message: "User created",
      email,
      password,
    });
  } catch (error: any) {
    console.error("[SETUP] Error:", error);
    return NextResponse.json(
      { error: error.message || "Unknown error" },
      { status: 500 }
    );
  }
}
