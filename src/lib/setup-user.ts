import { db } from "@/lib/db";
import bcrypt from "bcrypt";
import { v4 as uuidv4 } from "uuid";
import fs from "fs";
import path from "path";

async function setup() {
  // Inicijuojame lenteles lokalioje DB, jei jų nėra
  const schemaPath = path.join(process.cwd(), "schema.sql");
  if (fs.existsSync(schemaPath)) {
    console.log("Initializing database schema...");
    const schema = fs.readFileSync(schemaPath, "utf8");
    // SQLite/LibSQL gali vykdyti kelis sakinius vienu metu per execute arba batch
    // Bet geriau suskaidyti, jei yra ";"
    const statements = schema.split(";").filter(s => s.trim());
    for (const statement of statements) {
      await db().execute(statement);
    }
  }

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
    console.log("Login: admin@example.com");
    console.log("Password: password123");
  } catch (e) {
    console.error("User might already exist or DB error:", e);
  }
}

setup().catch(console.error);
