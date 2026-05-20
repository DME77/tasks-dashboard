import Dashboard from "@/components/Dashboard";

export const dynamic = "force-dynamic";

async function fetchJSON(path: string) {
  const base =
    process.env.VERCEL_URL
      ? `https://${process.env.VERCEL_URL}`
      : "http://localhost:3000";
  // On the server we can also call our own routes directly; but using fetch
  // ensures the route's caching settings apply.
  const res = await fetch(`${base}${path}`, { cache: "no-store" });
  return res.json();
}

export default async function Page() {
  // Render shell on server; the client component fetches data itself so the
  // page is fast and works the same in dev and prod.
  return <Dashboard />;
}
