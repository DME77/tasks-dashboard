import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Tasks Dashboard — Homeland Group",
  description: "All tasks across projects, towers, areas and sub-areas.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
