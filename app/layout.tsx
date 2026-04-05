import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { FirebaseInitializer } from "@/components/FirebaseInitializer";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Elevate Ventures",
  description: "Manage employee attendance and leaves",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased bg-white text-slate-900 selection:bg-accent/10 selection:text-accent`}
    >
      <body suppressHydrationWarning className="h-full flex overflow-hidden bg-white font-sans">
        <FirebaseInitializer />
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-slate-50 relative">
          <div className="p-6 lg:p-10 max-w-[1600px] mx-auto min-h-screen">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
