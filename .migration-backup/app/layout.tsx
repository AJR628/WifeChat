import type { Metadata } from "next";
import "./globals.css";
import { ClientShell } from "@/components/ClientShell";

export const metadata: Metadata = {
  title: "Wife Chat",
  description: "Mobile-first chat",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <ClientShell>{children}</ClientShell>
      </body>
    </html>
  );
}
