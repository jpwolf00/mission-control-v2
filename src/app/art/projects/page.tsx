import type { Metadata } from "next";
import ProjectsClient from './ProjectsClient';

export const metadata: Metadata = {
  title: "Our Portfolio | Featured Art Installation Projects | ART Consulting",
  description: "Browse our collection of residential and commercial art installation projects in Lexington, KY. From luxury homes to corporate offices, see our curated work.",
  keywords: ["art portfolio", "art installation projects Lexington", "residential art", "commercial art", "art consulting portfolio Kentucky"],
};

export default function ProjectsPage() {
  return <ProjectsClient />;
}
