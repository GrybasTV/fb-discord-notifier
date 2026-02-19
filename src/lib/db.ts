import { createClient, Client } from "@libsql/client";

let db: Client;

function getDb(): Client {
    if (!db) {
        const url = process.env.TURSO_DATABASE_URL;
        const authToken = process.env.TURSO_AUTH_TOKEN;

        console.log("[DB] Initializing connection...");
        console.log("[DB] URL present:", !!url);
        console.log("[DB] Auth token present:", !!authToken);

        if (!url) {
            console.error("[DB] TURSO_DATABASE_URL is not defined");
            throw new Error("TURSO_DATABASE_URL is not defined");
        }

        if (!url.startsWith("file:") && !authToken) {
            console.error("[DB] TURSO_AUTH_TOKEN is not defined for remote database");
            throw new Error("TURSO_AUTH_TOKEN is not defined for remote database");
        }

        db = createClient({ url, authToken });
        console.log("[DB] Connection established");
    }
    return db;
}

export { getDb as db };
