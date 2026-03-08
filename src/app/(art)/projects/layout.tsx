import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio - ART Consulting",
  description: "Browse our portfolio of art installations. Residential and commercial projects showcasing thoughtful curation and professional installation.",
};

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
