import type React from "react";
import type { Metadata } from "next";
import "./globals.css";
import ThemeRegistry from "@/components/theme-registry";
import { Navigation } from "@/components/navigation";

export const metadata: Metadata = {
  title: "Mission Control 2.0",
  description: "AI-native orchestration for agentic development",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
        />
      </head>
      <body>
        <ThemeRegistry>
          <Navigation />
          {children}
        </ThemeRegistry>
      </body>
    </html>
  );
}
