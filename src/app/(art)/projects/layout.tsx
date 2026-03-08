import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Portfolio | Featured Projects - ART Consulting",
  description: "Explore our portfolio of residential and commercial art installation projects. From luxury Manhattan apartments to corporate headquarters, see our work.",
  keywords: ["art portfolio", "art installation projects", "residential art projects", "commercial art installations", "NYC art consultant portfolio"],
};

export default function ProjectsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
