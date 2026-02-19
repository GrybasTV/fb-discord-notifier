import NextAuth, { DefaultSession, User } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/lib/db";
import bcrypt from "bcrypt";
import { JWT } from "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    user: {
      id: string;
    } & DefaultSession["user"];
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
  }
}

// Check required environment variables
if (!process.env.NEXTAUTH_SECRET) {
  console.error("[NEXTAUTH] NEXTAUTH_SECRET is not defined!");
}
if (!process.env.NEXTAUTH_URL) {
  console.warn("[NEXTAUTH] NEXTAUTH_URL is not defined, using default");
}
console.log("[NEXTAUTH] Env check - SECRET:", !!process.env.NEXTAUTH_SECRET, "URL:", !!process.env.NEXTAUTH_URL);

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        try {
          console.log("[NEXTAUTH] Authorize attempt:", credentials?.email);

          if (!credentials?.email || !credentials?.password) {
            console.log("[NEXTAUTH] Missing credentials");
            return null;
          }

          // Check env vars
          if (!process.env.TURSO_DATABASE_URL || !process.env.TURSO_AUTH_TOKEN) {
            console.error("[NEXTAUTH] Missing TURSO env vars");
            return null;
          }

          console.log("[NEXTAUTH] Querying DB for user:", credentials.email);
          const res = await db().execute({
            sql: "SELECT * FROM users WHERE email = ? LIMIT 1",
            args: [credentials.email]
          });

          const user = res.rows[0];
          console.log("[NEXTAUTH] User found:", !!user);

          if (!user || typeof user.password_hash !== 'string') {
            console.log("[NEXTAUTH] Invalid user or password hash");
            return null;
          }

          console.log("[NEXTAUTH] Comparing password...");
          const isPasswordCorrect = await bcrypt.compare(
            credentials.password,
            user.password_hash
          );

          if (!isPasswordCorrect) {
            console.log("[NEXTAUTH] Password incorrect");
            return null;
          }

          console.log("[NEXTAUTH] Login successful:", user.email);
          return {
            id: user.id as string,
            email: user.email as string,
          };
        } catch (error) {
          console.error("[NEXTAUTH] Authorize error:", error);
          return null;
        }
      }
    })
  ],
  session: {
    strategy: "jwt" as const,
  },
  callbacks: {
    async jwt({ token, user }: { token: JWT; user: User | null }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }: { session: any; token: JWT }) {
      if (session.user) {
        session.user.id = token.id;
      }
      return session;
    },
  },
  pages: {
    signIn: "/login",
  },
  secret: process.env.NEXTAUTH_SECRET,
};

const handler = NextAuth(authOptions);

export { handler as GET, handler as POST };
