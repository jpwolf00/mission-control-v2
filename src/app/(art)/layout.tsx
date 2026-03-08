import type React from "react";
import type { Metadata } from "next";
import { ARTLayout } from "@/components/art/layout";

export const metadata: Metadata = {
  title: "ART Consulting | Premium Art Curation & Installation",
  description: "Premium art consulting and installation services for residential and commercial spaces. Transform your environment with curated art.",
};

export default function ARTGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ARTLayout>
      {children}
    </ARTLayout>
  );
}
