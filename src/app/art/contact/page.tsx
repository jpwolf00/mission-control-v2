import type { Metadata } from "next";
import ContactClient from './ContactClient';

export const metadata: Metadata = {
  title: "Contact Us Lexington KY | Art Consulting Consultation | ART Home Systems",
  description: "Get in touch with ART Home Systems in Lexington, KY. Schedule a consultation for home technology and installation services. We serve Lexington, Georgetown, Nicholasville, and Richmond.",
  keywords: ["contact AV consultant Lexington KY", "AV consultation Lexington", "schedule AV consultation Kentucky", "Lexington AV advisor", "AV installation inquiry Lexington"],
};

export default function ContactPage() {
  return <ContactClient />;
}
