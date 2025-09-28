import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ToastProvider } from "@/components/ui/Toast";
import { ErrorBoundary } from "@/components/error/ErrorBoundary";
import { AppLayout } from "@/components/layout/AppLayout";
import "./globals.css";
import "@/styles/navigation.css";
import "@/styles/pages.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "scrumboard",
  description: "A modern Scrum board for agile project management",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ErrorBoundary>
          <ToastProvider>
            <AppLayout>
              {children}
            </AppLayout>
          </ToastProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
