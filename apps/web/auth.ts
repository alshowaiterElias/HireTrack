import NextAuth from "next-auth";
import Google from "next-auth/providers/google";
import GitHub from "next-auth/providers/github";
import Credentials from "next-auth/providers/credentials";
import { api } from "@/lib/api";

// ─── Debug Logging ───────────────────────────────────────

const nextAuth = NextAuth({
  debug: process.env.NODE_ENV === "development", // Enable NextAuth debug logs in dev
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "hiretrack-dev-secret-change-in-production-32chars",
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    }),
    GitHub({
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    }),
    Credentials({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email" },
        name: { label: "Name", type: "text" },
        accessToken: { label: "Access Token", type: "text" },
        refreshToken: { label: "Refresh Token", type: "text" },
        userId: { label: "User ID", type: "text" },
      },
      async authorize(credentials) {
        console.log("[auth] Credentials authorize called with email:", credentials?.email);
        if (!credentials?.email || !credentials?.accessToken) return null;
        return {
          id: credentials.userId as string,
          email: credentials.email as string,
          name: (credentials.name as string) || null,
          image: null,
          accessToken: credentials.accessToken as string,
          refreshToken: credentials.refreshToken as string,
        } as any;
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      console.log(`[auth] signIn callback — provider: ${account?.provider}, email: ${user?.email}`);
      return true;
    },
    async jwt({ token, user, account, trigger, session: updatedSession }) {
      // Handle session updates (e.g., name change from settings)
      if (trigger === "update" && updatedSession) {
        if (updatedSession.name) token.name = updatedSession.name;
        return token;
      }

      if (user && account) {
        console.log(`[auth] JWT callback — initial sign-in via ${account.provider}`);
        if (account.provider === "credentials") {
          token.userId = user.id;
          token.email = user.email;
          // accessToken and refreshToken are passed from the login page via credentials
          // They need to be retrieved from the raw credentials
          const creds = (account as any).credentials || {};
          // The tokens are passed through the authorize return but NextAuth doesn't forward them
          // So we use a workaround: store them on the user object from authorize
          token.accessToken = (user as any).accessToken;
          token.refreshToken = (user as any).refreshToken;
          token.accessTokenExpires = Date.now() + 14 * 60 * 1000;
        } else {
          // OAuth flow — register with NestJS backend
          try {
            console.log(`[auth] Registering OAuth user with backend API...`);
            const result = await api.login({
              email: user.email!,
              name: user.name || undefined,
              avatarUrl: user.image || undefined,
              provider: account.provider,
              providerId: account.providerAccountId || user.id || "",
            });
            token.accessToken = result.accessToken;
            token.refreshToken = result.refreshToken;
            token.userId = result.user.id;
            token.accessTokenExpires = Date.now() + 14 * 60 * 1000;
            console.log(`[auth] ✅ Backend registration successful — userId: ${result.user.id}`);
          } catch (error) {
            console.error("[auth] ❌ Failed to register with backend:", error);
          }
        }
      }

      // Refresh token if expired
      if (
        token.accessTokenExpires &&
        Date.now() > (token.accessTokenExpires as number) &&
        token.refreshToken
      ) {
        try {
          const refreshed = await api.refreshTokens(token.refreshToken as string);
          token.accessToken = refreshed.accessToken;
          token.refreshToken = refreshed.refreshToken;
          token.accessTokenExpires = Date.now() + 14 * 60 * 1000;
          console.log("[auth] 🔄 Token refreshed successfully");
        } catch {
          console.error("[auth] ❌ Token refresh failed");
          token.accessToken = undefined;
          token.refreshToken = undefined;
        }
      }

      return token;
    },
    async session({ session, token }: { session: any; token: any }) {
      session.accessToken = token.accessToken;
      session.refreshToken = token.refreshToken;
      if (token.userId) {
        session.user.id = token.userId;
      }
      return session;
    },
  },
  session: {
    strategy: "jwt" as const,
    maxAge: 7 * 24 * 60 * 60, // 7 days
  },
});

export const handlers: typeof nextAuth.handlers = nextAuth.handlers;
export const auth: typeof nextAuth.auth = nextAuth.auth;
export const signIn: typeof nextAuth.signIn = nextAuth.signIn;
export const signOut: typeof nextAuth.signOut = nextAuth.signOut;
