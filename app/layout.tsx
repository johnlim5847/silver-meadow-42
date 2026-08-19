import type { Metadata } from "next";
import { Geist_Mono, Inter } from "next/font/google";
import "./globals.css";

import { Sidebar } from "@/components/shell/sidebar";
import { BuildNotesProvider } from "@/components/shared/build-note";
import { Toaster } from "@/components/ui/sonner";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "DK Bank · Corporate internet banking",
  description: "CIB payments reference demo",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full bg-white text-ink">
        <BuildNotesProvider>
          <div className="flex min-h-screen">
            <Sidebar />
            <main className="min-w-0 flex-1 bg-white">{children}</main>
          </div>
        </BuildNotesProvider>
        <Toaster position="bottom-center" />
      </body>
    </html>
  );
}
