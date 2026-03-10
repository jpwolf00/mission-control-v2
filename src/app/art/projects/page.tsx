import type { Metadata } from "next";
import ProjectsClient from './ProjectsClient';

export const metadata: Metadata = {
  title: "Our Portfolio | Featured Art Installation Projects | ART Home Systems",
  description: "Browse our collection of residential and commercial AV installation projects in Lexington, KY. From luxury homes to corporate offices, see our curated work.",
  keywords: ["art portfolio", "AV installation projects Lexington", "residential art", "commercial art", "home systems portfolio Kentucky"],
};

export default function ProjectsPage() {
  return <ProjectsClient />;
}
