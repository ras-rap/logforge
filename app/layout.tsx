import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";

export const metadata: Metadata = {
    title: "LogForge",
    description: "Minecraft crash log analyzer",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="dark">
        <body className={`${GeistSans.variable} ${GeistMono.variable} antialiased`}>
        {children}
        </body>
        </html>
    );
}