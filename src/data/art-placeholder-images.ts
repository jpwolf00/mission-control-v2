/**
 * ART Website Placeholder Image Map
 * 
 * This file documents all placeholder images needed for Phase 1 development.
 * Each entry includes dimensions, aspect ratio, purpose, and AI generation prompts.
 * 
 * Usage: Import this map to get image dimensions for placeholder components.
 * During Phase 1, use colored divs with labels. Replace with actual images in Phase 3.
 */

export interface PlaceholderImage {
  id: string;
  pageSection: string;
  purpose: string;
  dimensions: { width: number; height: number };
  aspectRatio: string;
  priority: 'high' | 'medium' | 'low';
  prompt?: string;
}

export const placeholderImageMap: PlaceholderImage[] = [
  {
    id: 'IMG-001',
    pageSection: 'Homepage Hero',
    purpose: 'Main banner - Primary',
    dimensions: { width: 1920, height: 1080 },
    aspectRatio: '16:9',
    priority: 'high',
    prompt: `Wide cinematic photograph of an elegantly curated living room with modern art installations. 
Natural light from large windows, premium furniture, curated artwork on walls. 
Professional photography style, gallery aesthetic, soft warm lighting, 
minimalist interior design, aspirational lifestyle feel. 
No text, no people. High-end interior design photography.`
  },
  {
    id: 'IMG-002',
    pageSection: 'Homepage Hero',
    purpose: 'Secondary banner',
    dimensions: { width: 1920, height: 1080 },
    aspectRatio: '16:9',
    priority: 'high',
    prompt: `Commercial office space with artistic wall installations and sculptures. 
Modern corporate interior, professional environment, tasteful art curation. 
Natural lighting, clean lines, sophisticated atmosphere. 
Professional commercial photography, no text, no people.`
  },
  {
    id: 'IMG-003',
    pageSection: 'Services - Residential',
    purpose: 'Service card',
    dimensions: { width: 800, height: 600 },
    aspectRatio: '4:3',
    priority: 'high',
    prompt: `Cozy residential living room with statement art piece above fireplace. 
Home interior, warm tones, personal touch, curated artwork. 
Residential photography style, inviting atmosphere, lifestyle feel.`
  },
  {
    id: 'IMG-004',
    pageSection: 'Services - Commercial',
    purpose: 'Service card',
    dimensions: { width: 800, height: 600 },
    aspectRatio: '4:3',
    priority: 'high',
    prompt: `Contemporary corporate lobby with large-scale art installation. 
Professional commercial space, modern architecture, executive aesthetic. 
Business environment, sophisticated, welcoming entrance.`
  },
  {
    id: 'IMG-005',
    pageSection: 'About - Team',
    purpose: 'Team member 1',
    dimensions: { width: 400, height: 500 },
    aspectRatio: '4:5',
    priority: 'medium',
    prompt: `Professional headshot, business portrait, neutral background, 
corporate photography style, friendly but professional, 
modern business attire. Natural lighting, shallow depth of field.`
  },
  {
    id: 'IMG-006',
    pageSection: 'About - Team',
    purpose: 'Team member 2',
    dimensions: { width: 400, height: 500 },
    aspectRatio: '4:5',
    priority: 'medium',
    prompt: `Professional headshot, business portrait, neutral background, 
corporate photography style, friendly but professional, 
modern business attire. Natural lighting, shallow depth of field.`
  },
  {
    id: 'IMG-007',
    pageSection: 'About - Team',
    purpose: 'Team member 3',
    dimensions: { width: 400, height: 500 },
    aspectRatio: '4:5',
    priority: 'medium',
    prompt: `Professional headshot, business portrait, neutral background, 
corporate photography style, friendly but professional, 
modern business attire. Natural lighting, shallow depth of field.`
  },
  {
    id: 'IMG-008',
    pageSection: 'About - Studio',
    purpose: 'Studio interior',
    dimensions: { width: 1200, height: 800 },
    aspectRatio: '3:2',
    priority: 'medium',
    prompt: `Art gallery or studio space with artwork on walls, 
creative workspace atmosphere, natural light, 
professional photography, inspirational environment.`
  },
  {
    id: 'IMG-009',
    pageSection: 'Projects - Residential 1',
    purpose: 'Portfolio',
    dimensions: { width: 800, height: 600 },
    aspectRatio: '4:3',
    priority: 'high',
    prompt: `Residential interior space with art installations. 
Showcase the art pieces as focal points. Professional portfolio photography,
high-end finish, aspirational.`
  },
  {
    id: 'IMG-010',
    pageSection: 'Projects - Residential 2',
    purpose: 'Portfolio',
    dimensions: { width: 800, height: 600 },
    aspectRatio: '4:3',
    priority: 'high',
    prompt: `Residential interior space with art installations. 
Showcase the art pieces as focal points. Professional portfolio photography,
high-end finish, aspirational.`
  },
  {
    id: 'IMG-011',
    pageSection: 'Projects - Commercial 1',
    purpose: 'Portfolio',
    dimensions: { width: 800, height: 600 },
    aspectRatio: '4:3',
    priority: 'high',
    prompt: `Commercial interior space with art installations. 
Showcase the art pieces as focal points. Professional portfolio photography,
high-end finish, aspirational.`
  },
  {
    id: 'IMG-012',
    pageSection: 'Projects - Commercial 2',
    purpose: 'Portfolio',
    dimensions: { width: 800, height: 600 },
    aspectRatio: '4:3',
    priority: 'high',
    prompt: `Commercial interior space with art installations. 
Showcase the art pieces as focal points. Professional portfolio photography,
high-end finish, aspirational.`
  },
  {
    id: 'IMG-013',
    pageSection: 'Contact - Location',
    purpose: 'Office exterior',
    dimensions: { width: 1200, height: 600 },
    aspectRatio: '2:1',
    priority: 'medium',
    prompt: `Professional building exterior, office entrance, 
easy to find location, corporate or gallery aesthetic. 
Natural lighting, clean shot, no people.`
  },
  {
    id: 'IMG-014',
    pageSection: 'Homepage - CTA',
    purpose: 'Call to action banner',
    dimensions: { width: 1920, height: 400 },
    aspectRatio: '48:10',
    priority: 'medium',
    prompt: `Full-width banner style image, elegant design, 
abstract art or minimal interior detail. 
Can be slightly darker/more subdued to let text pop.
Soft gradient overlay friendly.`
  }
];

/**
 * Get a placeholder color based on image priority
 */
export function getPlaceholderColor(priority: 'high' | 'medium' | 'low'): string {
  switch (priority) {
    case 'high': return '#667eea'; // Primary purple/blue
    case 'medium': return '#764ba2'; // Secondary purple
    case 'low': return '#93a5cf'; // Light blue-gray
  }
}

/**
 * Get dimensions for a placeholder by ID
 */
export function getPlaceholderDimensions(id: string): { width: number; height: number } | null {
  const image = placeholderImageMap.find(img => img.id === id);
  return image ? image.dimensions : null;
}
