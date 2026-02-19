import { createClient, Client } from "@libsql/client";

let db: Client;

function getDb(): Client {
    if (!db) {
        const url = process.env.TURSO_DATABASE_URL;
        const authToken = process.env.TURSO_AUTH_TOKEN;

        if (!url) {
            throw new Error("TURSO_DATABASE_URL is not defined");
        }

        if (!url.startsWith("file:") && !authToken) {
            throw new Error("TURSO_AUTH_TOKEN is not defined for remote database");
        }

        db = createClient({ url, authToken });
    }
    return db;
}

export { getDb as db };
