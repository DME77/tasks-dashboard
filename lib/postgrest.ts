// Server-only helper for talking to PostgREST.
// Bearer token is read from env and never sent to the browser.

const BASE_URL =
  process.env.POSTGREST_URL || "https://asap.homelandgroup.org/api/db";

const TOKEN =
  process.env.POSTGREST_TOKEN ||
  // Fallback to the readonly token shipped in the original prompt so the
  // deployed app works without manual env config. Override in Vercel
  // (POSTGREST_TOKEN) if you rotate the token.
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoicmVhZG9ubHkifQ.05FaqLTM4dxaaEIK0OYSecPGVCiw6luBNV9vzAJnikQ";

export async function pgGet(path: string) {
  const url = `${BASE_URL}${path}`;
  const res = await fetch(url, {
    headers: {
      Authorization: `Bearer ${TOKEN}`,
      Accept: "application/json",
    },
    next: { revalidate: 60 },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(
      `PostgREST ${res.status} for ${path}: ${text.slice(0, 500)}`
    );
  }
  return res.json();
}
