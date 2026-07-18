"use client";
import { useSession, signOut } from "next-auth/react";
import { useEffect } from "react";
import LoginPage from "./LoginPage";
import Dashboard from "./Dashboard";

export default function AppShell() {
  const { data: session, status } = useSession();

  // If the user had a valid session but their email was later removed from
  // the whitelist sheet, the JWT callback sets authorized=false.
  // Detect that here and sign them out immediately.
  const authorized = (session as any)?.authorized as boolean | undefined;

  useEffect(() => {
    if (session && authorized === false) {
      // Redirect to login with the AccessDenied error so the page shows
      // "You are not authorized."
      signOut({ callbackUrl: "/?error=AccessDenied" });
    }
  }, [session, authorized]);

  // While NextAuth is checking the session, show nothing (avoids flash)
  if (status === "loading") return null;

  // Not signed in → login page
  if (!session) return <LoginPage />;

  // Signed in but whitelist check pending (authorized still undefined) →
  // wait for the next render cycle (effect will fire or dashboard renders)
  if (authorized === false) return null;

  return <Dashboard />;
}
