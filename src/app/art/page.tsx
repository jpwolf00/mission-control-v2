import type { Metadata } from "next";
import { ARTHero, ARTServicesPreview, ARTProjectsPreview, ARTContactCTA } from "@/components/art/sections";

export const metadata: Metadata = {
  title: "ART Consulting Lexington KY | Premium Art Curation & Installation",
  description: "Transform your space with expert art curation and professional installation in Lexington, KY. Serving residential and commercial clients across Central Kentucky since 2015.",
  keywords: ["art consulting Lexington KY", "Lexington art consultant", "Lexington art curation", "art installation Lexington Kentucky", "Lexington residential art", "Lexington commercial art"],
  openGraph: {
    title: "ART Consulting Lexington KY | Premium Art Curation & Installation",
    description: "Transform your space with expert art curation and professional installation in Lexington, KY.",
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
