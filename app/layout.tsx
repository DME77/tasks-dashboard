import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Homeland Global Park — Homeland Group",
  description: "Project dashboard for Homeland Global Park — tasks across towers, areas and sub-areas.",
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
