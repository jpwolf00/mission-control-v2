import type { Metadata } from "next";
import { ARTHero, ARTServicesPreview, ARTProjectsPreview, ARTContactCTA } from "@/components/art/sections";

export const metadata: Metadata = {
  title: "ART Home Systems Lexington KY | Premium Home Entertainment & AV Installation",
  description: "Transform your space with expert home audio/video installation and smart home technology in Lexington, KY. Serving residential and commercial clients across Central Kentucky.",
  keywords: ["home theater Lexington KY", "Lexington AV installer", "Lexington home automation", "Lexington smart home", "Lexington residential AV", "Lexington commercial AV"],
  openGraph: {
    title: "ART Home Systems Lexington KY | Premium Home Entertainment & AV Installation",
    description: "Transform your space with expert home audio/video installation and smart home technology in Lexington, KY.",
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
