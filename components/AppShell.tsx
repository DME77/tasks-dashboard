"use client";
// AUTH DISABLED — dashboard is public (anyone with the link can access).
// To re-enable Google auth, restore the original AppShell.tsx from git history:
//   git show HEAD~1:components/AppShell.tsx
import Dashboard from "./Dashboard";

export default function AppShell() {
  return <Dashboard />;
}
