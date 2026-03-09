import type { Metadata } from "next";
import { ARTHero, ARTServicesPreview, ARTProjectsPreview, ARTContactCTA } from "@/components/art/sections";

export const metadata: Metadata = {
  title: "ART Consulting | Premium Art Curation & Installation in NYC",
  description: "Transform your space with expert art curation and professional installation. Serving residential and commercial clients in New York City since 2015.",
  keywords: ["art consulting", "art curation", "art installation", "residential art", "commercial art", "New York art consultant"],
  openGraph: {
    title: "ART Consulting | Premium Art Curation & Installation in NYC",
    description: "Transform your space with expert art curation and professional installation. Serving residential and commercial clients in New York City since 2015.",
    type: "website",
  },
};

export default function ARTHomepage() {
  return (
    <>
      <ARTHero />
      <ARTServicesPreview />
      <ARTProjectsPreview />
      <ARTContactCTA />
    </>
  );
}
