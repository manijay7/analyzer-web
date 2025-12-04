import React from 'react';
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Providers } from "./providers";
import { enforceEnvironmentValidation } from "@/lib/env-validation";

// Validate environment configuration at application startup
// This will throw an error and prevent the app from starting if misconfigured
if (typeof window === 'undefined') {
  // Only run on server-side during build/start
  enforceEnvironmentValidation();
}

const inter = Inter({ subsets: ["latin"], variable: '--font-inter' });

export const metadata: Metadata = {
  title: "Analyzer Web - Manual Matching System",
  description: "A professional manual transaction matching and reconciliation system.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          {children}
        </Providers>
      </body>
    </html>
  );
}