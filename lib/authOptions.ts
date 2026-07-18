import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const ADMIN_EMAIL   = "dme@homelandgroup.org";
const AUTH_SHEET_ID = process.env.AUTH_SHEET_ID ?? "";
const WHITELIST_TAB = "HGP Auth Users";

/** Fetch allowed emails from Google Sheet (column A). Cached 60 s via Next.js fetch. */
async function fetchWhitelist(): Promise<Set<string>> {
  const allowed = new Set<string>([ADMIN_EMAIL.toLowerCase()]);
  if (!AUTH_SHEET_ID) return allowed;
  try {
    const url =
      `https://docs.google.com/spreadsheets/d/${AUTH_SHEET_ID}/gviz/tq` +
      `?tqx=out:json&sheet=${encodeURIComponent(WHITELIST_TAB)}`;
    const res  = await fetch(url, { next: { revalidate: 5 } });
    const text = await res.text();
    const json = JSON.parse(text.replace(/^[^(]+\(/, "").replace(/\);?\s*$/, ""));
    const rows: any[] = json?.table?.rows ?? [];
    for (const row of rows) {
      const val = row?.c?.[0]?.v;
      if (typeof val === "string" && val.includes("@")) {
        allowed.add(val.trim().toLowerCase());
      }
    }
  } catch {
    // Sheet unreachable — fall back to admin-only
  }
  return allowed;
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId:     process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    }),
  ],

  callbacks: {
    /** Gate sign-in: only whitelisted emails may proceed. */
    async signIn({ user }) {
      const email = user.email?.toLowerCase() ?? "";
      if (!email) return false;
      const whitelist = await fetchWhitelist();
      return whitelist.has(email);
    },

    /**
     * Re-check whitelist on every JWT refresh.
     * If the email was removed from the sheet after sign-in,
     * we mark the token as unauthorised so the client can react.
     */
    async jwt({ token }) {
      const email = (token.email as string | undefined)?.toLowerCase() ?? "";
      if (email) {
        const whitelist = await fetchWhitelist();
        token.authorized = whitelist.has(email);
      } else {
        token.authorized = false;
      }
      return token;
    },

    /** Forward the authorisation flag to the client-side session. */
    async session({ session, token }) {
      (session as any).authorized = token.authorized ?? false;
      return session;
    },
  },

  pages: {
    signIn: "/",
    error:  "/",   // NextAuth sends ?error=AccessDenied back to "/"
  },

  secret: process.env.NEXTAUTH_SECRET,
};
