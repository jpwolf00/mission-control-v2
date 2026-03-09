import type { Metadata } from "next";
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: "Contact Us Lexington KY | Art Consulting Consultation | ART Consulting",
  description: "Get in touch with ART Consulting in Lexington, KY. Schedule a consultation for art curation and installation services. We serve Lexington, Georgetown, Nicholasville, and Richmond.",
  keywords: ["contact art consultant Lexington KY", "art consultation Lexington", "schedule art consultation Kentucky", "Lexington art advisor", "art installation inquiry Lexington"],
};

export default function ContactPage() {
  return <ContactClient />;
}
