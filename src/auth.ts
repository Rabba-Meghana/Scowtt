import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import { PrismaAdapter } from "@auth/prisma-adapter";
import { prisma } from "@/lib/prisma";

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma),
  providers: [
    Google({
      clientId:     process.env.AUTH_GOOGLE_ID!,
      clientSecret: process.env.AUTH_GOOGLE_SECRET!,
    }),
  ],
  callbacks: {
    // Attach the DB user id to the session so all server components can use it
    session({ session, user }) {
      if (session.user) {
        session.user.id = user.id;
      }
      return session;
    },
    // After sign-in, redirect first-time users to onboarding
    async redirect({ url, baseUrl }) {
      // NextAuth passes the callbackUrl here - honour it if it's on our domain
      if (url.startsWith(baseUrl)) return url;
      if (url.startsWith("/"))     return `${baseUrl}${url}`;
      return baseUrl;
    },
  },
  pages: {
    signIn: "/",
  },
});
