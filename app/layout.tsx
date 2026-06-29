import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import "./globals.css";

export const metadata: Metadata = {
  title: "LogForge",
  description: "Minecraft log analyzer",
};

export default function RootLayout({
                                     children,
                                   }: {
  children: React.ReactNode;
}) {
  return (
      <html lang="en">
      <body
          className={`${GeistSans.className} min-h-screen bg-background text-foreground`}
      >
      {children}
      </body>
      </html>
  );
}