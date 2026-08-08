"use client";
// AUTH DISABLED — SessionProvider removed. Re-enable with Google auth when needed.
// Original used: <SessionProvider refetchInterval={5} refetchOnWindowFocus={true}>

export default function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
