import type { Metadata } from "next";

import "./globals.css";

export const metadata: Metadata = {
  title: "UrbanFlow Mobility",
  description:
    "Une mobilité urbaine plus simple, intelligente et responsable.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}