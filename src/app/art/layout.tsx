import type React from "react";
import type { Metadata } from "next";
import { ARTLayout } from "@/components/art/layout";
import { SchemaMarkup } from "@/components/art/SchemaMarkup";

export const metadata: Metadata = {
  title: "ART Home Systems | Premium Home Entertainment & AV Installation",
  description: "Expert home audio/video installation and smart home technology services in Lexington, KY. Residential and commercial AV solutions.",
};

export default function ARTGroupLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ARTLayout>
      <SchemaMarkup />
      {children}
    </ARTLayout>
  );
}
