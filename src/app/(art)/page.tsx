import type { Metadata } from "next";
import { ARTHero, ARTServicesPreview, ARTProjectsPreview, ARTContactCTA } from "@/components/art/sections";

export const metadata: Metadata = {
  title: "ART - Professional Art Consulting & Installation",
  description: "Transform your space with expert art curation and installation. Serving residential and commercial clients with personalized service.",
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
