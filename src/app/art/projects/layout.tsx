import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Our Portfolio | Featured Projects | ART Consulting NYC",
  description: "Explore our collection of residential and commercial art installations in New York. Each project reflects our commitment to transforming spaces through curated art.",
  keywords: ["art portfolio", "residential art projects", "commercial art installations", "NYC art projects", "art consulting examples"],
};

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
