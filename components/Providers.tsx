"use client";
import { SessionProvider } from "next-auth/react";

export default function Providers({ children }: { children: React.ReactNode }) {
  // refetchInterval: poll the session every 5 s so removed users are signed out quickly
  return <SessionProvider refetchInterval={5} refetchOnWindowFocus={true}>{children}</SessionProvider>;
}
