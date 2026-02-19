import { db } from "@/lib/db";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";

// This is a simple script to create an initial user
// In a real app, you'd have a registration page or an admin command
async function setup() {
  const email = "admin@example.com";
  const password = "password123";
  const hash = await bcrypt.hash(password, 10);
  const id = uuidv4();

  try {
    await db().execute({
      sql: "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
      args: [id, email, hash]
    });
    console.log("Initial user created:", email);
  } catch (e) {
    console.error("User might already exist or DB error:", e);
  }
}

// setup();
