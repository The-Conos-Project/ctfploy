import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CTFploy",
  description: "One-command CTF platform deployment. Self-hosted, Docker-powered, instant challenge instances.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col font-sans bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
