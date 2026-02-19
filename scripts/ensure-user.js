const { createClient } = require("@libsql/client");
const bcrypt = require("bcrypt");
const { v4: uuidv4 } = require("uuid");
require("dotenv").config();

async function ensureUser() {
  const db = createClient({
    url: process.env.TURSO_DATABASE_URL,
    authToken: process.env.TURSO_AUTH_TOKEN,
  });

  const email = "admin@example.com";
  const password = "password123";

  console.log("Checking if user exists...");

  const res = await db.execute({
    sql: "SELECT * FROM users WHERE email = ?",
    args: [email],
  });

  if (res.rows.length > 0) {
    console.log("✅ User already exists:", email);
    console.log("Login:", email);
    console.log("Password:", password);
    return;
  }

  console.log("Creating user...");
  const hash = await bcrypt.hash(password, 10);
  const id = uuidv4();

  await db.execute({
    sql: "INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)",
    args: [id, email, hash],
  });

  console.log("✅ User created successfully!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("📧 Email:", email);
  console.log("🔑 Password:", password);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n🌐 Login at: https://fb-discord-notifier.vercel.app/login\n");
}

ensureUser().catch(console.error);
