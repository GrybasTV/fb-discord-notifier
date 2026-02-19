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

export const authOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const res = await db().execute({
          sql: "SELECT * FROM users WHERE email = ? LIMIT 1",
          args: [credentials.email]
        });

        const user = res.rows[0];

        if (!user || typeof user.password_hash !== 'string') {
          return null;
        }

        const isPasswordCorrect = await bcrypt.compare(
          credentials.password,
          user.password_hash
        );

        if (!isPasswordCorrect) {
          return null;
        }

        return {
          id: user.id as string,
          email: user.email as string,
        };
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
