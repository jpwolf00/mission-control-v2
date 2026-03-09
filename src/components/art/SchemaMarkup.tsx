'use client';

import { useEffect } from 'react';

const schemaData = {
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "ART Consulting",
  "image": "https://artconsulting.com/logo.png",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Lexington",
    "addressRegion": "KY",
    "addressCountry": "US"
  },
  "telephone": "+1-555-123-4567",
  "areaServed": {
    "@type": "GeoCircle",
    "geoMidpoint": {
      "@type": "GeoCoordinates",
      "latitude": 38.0406,
      "longitude": -84.5037
    },
    "geoRadius": "50000"
  },
  "priceRange": "$$$",
  "openingHours": "Mo-Fr 09:00-18:00",
  "serviceArea": [
    "Lexington, KY",
    "Georgetown, KY",
    "Nicholasville, KY",
    "Richmond, KY",
    "Winchester, KY"
  ]
};

const faqSchemaData = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "How much does art consultation cost in Lexington?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Our initial consultation typically starts at $500 for residential projects."
      }
    },
    {
      "@type": "Question",
      "name": "What areas do you serve in Kentucky?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "We proudly serve Lexington and the surrounding areas including Georgetown, Nicholasville, Richmond, Winchester, and the greater Lexington-Fayette metropolitan area."
      }
    },
    {
      "@type": "Question",
      "name": "How long does art installation take?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Timeline varies by project scope. Small residential installations typically take 1-2 days. Larger projects can take 1-3 weeks."
      }
    },
    {
      "@type": "Question",
      "name": "Do you work with commercial clients in Lexington?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "Absolutely! We have extensive experience with corporate offices, hotels, restaurants, retail spaces, and other commercial properties in Lexington."
      }
    }
  ]
};

export function SchemaMarkup() {
  useEffect(() => {
    // Add main local business schema
    const mainScript = document.createElement('script');
    mainScript.type = 'application/ld+json';
    mainScript.text = JSON.stringify(schemaData);
    mainScript.id = 'schema-local-business';
    document.head.appendChild(mainScript);

    return () => {
      const existing = document.getElementById('schema-local-business');
      if (existing) existing.remove();
    };
  }, []);

  return null;
}
