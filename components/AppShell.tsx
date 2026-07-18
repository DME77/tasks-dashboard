"use client";
import { useSession } from "next-auth/react";
import LoginPage from "./LoginPage";
import Dashboard from "./Dashboard";

export default function AppShell() {
  const { data: session, status } = useSession();

  // While NextAuth is checking the session show nothing (avoids flash)
  if (status === "loading") return null;

  if (!session) return <LoginPage />;

  return <Dashboard />;
}
