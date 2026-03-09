# ART Image Prompt Pack v1 - Specification Document

## Overview

This document provides image generation prompts for all placeholder images in the ART Consulting website. The prompts are designed to create cohesive, premium visuals aligned with the ART brand identity.

---

## Brand Direction

### Visual Style
- **Aesthetic:** Sophisticated, modern, gallery-like spaces
- **Mood:** Elegant, aspirational, trustworthy, refined
- **Color Palette:** Neutral tones (warm whites, soft grays, creams) with subtle accent colors
- **Lighting:** Natural, soft, diffused — emphasizing curated spaces

### Photography Style
- Clean, minimalist compositions
- Emphasis on white space and breathing room
- Mix of abstract and architectural elements
- Human elements (subtle, not dominant)

---

## Asset Map

### Page: Homepage (/art)

| ID | Asset Name | Location | Dimensions | Aspect Ratio | Priority |
|----|-----------|----------|------------|--------------|----------|
| IMG-001 | Homepage Hero | Full-width hero background | 1920x1080 min | 16:9 | HIGH |
| IMG-003 | Residential Services Card | Services preview section | 600x400 | 3:2 | HIGH |
| IMG-004 | Commercial Services Card | Services preview section | 600x400 | 3:2 | HIGH |
| IMG-009 | Featured Project: Tribeca | Projects preview | 400x240 | 5:3 | MEDIUM |
| IMG-011 | Featured Project: Financial HQ | Projects preview | 400x240 | 5:3 | MEDIUM |
| IMG-014 | Homepage CTA Background | Contact CTA section | 1920x600 | ~3:1 | MEDIUM |

### Page: About (/art/about)

| ID | Asset Name | Location | Dimensions | Aspect Ratio | Priority |
|----|-----------|----------|------------|--------------|----------|
| IMG-008 | Studio Interior | About hero right side | 600x400 | 3:2 | HIGH |
| IMG-005 | Team: Sarah Mitchell | Team section | 400x500 | 4:5 | HIGH |
| IMG-006 | Team: James Chen | Team section | 400x500 | 4:5 | HIGH |
| IMG-007 | Team: Emily Rodriguez | Team section | 400x500 | 4:5 | HIGH |

### Page: Services - Residential (/art/services/residential)

| ID | Asset Name | Location | Dimensions | Aspect Ratio | Priority |
|----|-----------|----------|------------|--------------|----------|
| IMG-003 | Residential Hero | Hero section right | 500x350 | ~10:7 | HIGH |

### Page: Services - Commercial (/art/services/commercial)

| ID | Asset Name | Location | Dimensions | Aspect Ratio | Priority |
|----|-----------|----------|------------|--------------|----------|
| IMG-004 | Commercial Hero | Hero section right | 500x350 | ~10:7 | HIGH |

### Page: Projects (/art/projects)

| ID | Asset Name | Location | Dimensions | Aspect Ratio | Priority |
|----|-----------|----------|------------|--------------|----------|
| IMG-009 | Modern Tribeca Loft | Project card | 400x240 | 5:3 | HIGH |
| IMG-010 | Brooklyn Brownstone | Project card | 400x240 | 5:3 | HIGH |
| IMG-011 | Financial Services HQ | Project card | 400x240 | 5:3 | HIGH |
| IMG-012 | Boutique Hotel Collection | Project card | 400x240 | 5:3 | HIGH |

### Page: Contact (/art/contact)

| ID | Asset Name | Location | Dimensions | Aspect Ratio | Priority |
|----|-----------|----------|------------|--------------|----------|
| IMG-013 | Location Map Placeholder | Contact info section | 400x200 | 2:1 | LOW |

---

## Image Prompts

### IMG-001: Homepage Hero

**Description:** Full-width hero background showing an elegant, curated living space with contemporary art

**Use Case:** Primary homepage hero — needs to work as background with text overlay

**Crop-Safe Notes:**
- Center-weighted composition — safe zone is center 60%
- Avoid important elements in top 10% (behind headline text)
- Bottom 20% may be obscured by content

**Dimensions:** 1920x1080 (16:9)

**Prompt - Variant 1:**
```
Elegant modern living room with soaring ceilings, soft natural lighting from floor-to-ceiling windows, minimalist cream-colored walls, curated contemporary art on walls, luxurious cream sofa, marble coffee table, warm ambient atmosphere, professional photography, architectural digest style, 8k resolution
```

**Prompt - Variant 2:**
```
Sophisticated NYC penthouse living space, floor-to-ceiling windows with city views, curated gallery wall with abstract contemporary paintings, designer furniture in neutral tones, warm lighting, marble floors, refined elegant atmosphere, high-end interior design photography, Architectural Digest, ultra-detailed
```

**Negative Prompt (shared):**
```
cluttered, messy, bright harsh lighting, saturated colors, people, furniture, TV screens, toys, pets, dark shadows, grainy, low quality, watermark, text
```

---

### IMG-003: Residential Services Card

**Description:** Preview image for residential art consulting services

**Use Case:** Card in services preview grid (600x400)

**Crop-Safe Notes:**
- Subject centered — works in 1:1 and 4:3 crops
- Avoid edges with important details

**Dimensions:** 600x400 (3:2)

**Prompt - Variant 1:**
```
Beautiful residential dining room with curated wall art, elegant wooden dining table, modern chandelier, warm neutral color palette, professional interior photography, gallery wall with framed contemporary paintings, sophisticated home atmosphere, Architectural Digest style
```

**Prompt - Variant 2:**
```
Cozy living room featuring curated art collection, comfortable sectional sofa, floor lamp, neutral cream and beige tones, large window with soft natural light, curated gallery wall with mixed media art, refined residential space, high-end home design photography
```

**Negative Prompt (shared):**
```
outdoor, commercial, office, cluttered, bright harsh lighting, saturated colors, people, children, pets, TV, mess, outdated furniture, low quality
```

---

### IMG-004: Commercial Services Card

**Description:** Preview image for commercial art consulting services

**Use Case:** Card in services preview grid (600x400)

**Dimensions:** 600x400 (3:2)

**Prompt - Variant 1:**
```
Sleek corporate lobby with contemporary art installations, polished marble floors, modern reception desk, designer lighting, professional business environment, abstract sculptures and large-scale paintings, sophisticated commercial space, Architectural Digest commercial style
```

**Prompt - Variant 2:**
```
Modern hotel lobby with curated art collection, elegant seating area, statement light fixture, neutral sophisticated color palette, gallery-quality artworks on walls, upscale hospitality interior, professional interior photography, luxury hotel design
```

**Negative Prompt (shared):**
```
residential, home, cluttered, bright harsh lighting, saturated colors, people, children, pets, mess, outdated, low quality, restaurant specific
```

---

### IMG-005: Team - Sarah Mitchell

**Description:** Professional headshot or action shot of Sarah Mitchell, Founder & Principal Curator

**Use Case:** Team section card (400x500)

**Dimensions:** 400x500 (4:5, portrait)

**Prompt - Variant 1:**
```
Professional female art curator in elegant business attire, standing in contemporary art gallery, soft natural lighting, sophisticated modern setting, warm smile, professional portrait photography, 8k resolution, shallow depth of field
```

**Prompt - Variant 2:**
```
Female art consultant examining artwork in a gallery, professional attire, thoughtful expression, art collection visible in background, soft diffused lighting, professional headshot style, Architectural Digest editorial aesthetic
```

**Negative Prompt (shared):**
```
casual, messy background, harsh lighting, bright saturated colors, sunglasses, formal wear, multiple people, crowded, low quality, watermark
```

---

### IMG-006: Team - James Chen

**Description:** Professional headshot or action shot of James Chen, Art Director

**Use Case:** Team section card (400x500)

**Dimensions:** 400x500 (4:5, portrait)

**Prompt - Variant 1:**
```
Professional male art director in modern gallery space, smart casual attire, contemporary art on walls in background, soft natural lighting, confident expression, professional portrait photography, 8k resolution, shallow depth of field
```

**Prompt - Variant 2:**
```
Male creative director examining abstract artwork, professional but creative attire, gallery environment, soft diffused lighting, thoughtful expression, editorial photography style, sophisticated aesthetic
```

**Negative Prompt (shared):**
```
casual, messy background, harsh lighting, bright saturated colors, sunglasses, formal suit, multiple people, crowded, low quality, watermark
```

---

### IMG-007: Team - Emily Rodriguez

**Description:** Professional headshot or action shot of Emily Rodriguez, Senior Installation Specialist

**Use Case:** Team section card (400x500)

**Dimensions:** 400x500 (4:5, portrait)

**Prompt - Variant 1:**
```
Professional female installation specialist in art gallery, smart casual work attire, installing artwork on wall, safety equipment optional, focused expression, soft professional lighting, professional portrait photography, 8k resolution
```

**Prompt - Variant 2:**
```
Female art installer working in contemporary museum space, professional attire, carefully handling framed artwork, gallery environment with proper lighting, concentrated expression, documentary photography style, authentic work atmosphere
```

**Negative Prompt (shared):**
```
messy, informal clothing, harsh lighting, bright saturated colors, multiple people, not working, low quality, watermark, casual street wear
```

---

### IMG-008: Studio Interior

**Description:** Studio space showing ART Consulting's office/gallery

**Use Case:** About page hero section (600x400)

**Dimensions:** 600x400 (3:2)

**Prompt - Variant 1:**
```
Elegant art consulting studio interior, curated gallery walls with diverse artworks, comfortable client consultation area, modern designer furniture, warm ambient lighting, professional interior photography, sophisticated workspace, Architectural Digest style
```

**Prompt - Variant 2:**
```
Contemporary art gallery and office space, floor-to-ceiling shelves with art books and sculptures, comfortable seating area for client meetings, neutral cream and white color palette, soft natural and artificial lighting, professional photography, refined professional environment
```

**Negative Prompt (shared):**
```
cluttered, messy, bright harsh lighting, people working, computers, desks, industrial, warehouse, dark, low quality, watermark
```

---

### IMG-009: Modern Tribeca Loft

**Description:** Featured project image — Modern Tribeca Loft residential

**Use Case:** Project card (400x240)

**Dimensions:** 400x240 (5:3)

**Prompt - Variant 1:**
```
Luxury Tribeca loft living space, floor-to-ceiling windows with city views, curated contemporary art collection, designer furniture, open floor plan, warm sophisticated atmosphere, professional interior photography, NYC penthouse style
```

**Prompt - Variant 2:**
```
Modern Manhattan loft with exposed brick accent walls, large contemporary paintings, sleek modern furniture, open concept living area, natural light from tall windows, refined residential space, high-end interior photography
```

**Negative Prompt (shared):**
```
outdoor, commercial, cluttered, bright harsh lighting, saturated colors, people, children, pets, outdated furniture, low quality, watermark
```

---

### IMG-010: Brooklyn Brownstone

**Description:** Featured project image — Brooklyn Brownstone residential

**Use Case:** Project card (400x240)

**Dimensions:** 400x240 (5:3)

**Prompt - Variant 1:**
```
Brooklyn brownstone interior, restored original details blended with contemporary art, elegant living room, curated artwork, classic architectural elements with modern touches, warm sophisticated atmosphere, professional interior photography
```

**Prompt - Variant 2:**
```
Historic Brooklyn townhouse living space, modern art collection on walls, blend of classic and contemporary furniture, large windows, refined residential interior, professional photography, sophisticated New York home
```

**Negative Prompt (shared):**
```
outdoor, commercial, cluttered, bright harsh lighting, saturated colors, people, children, pets, modern high-rise, low quality, watermark
```

---

### IMG-011: Financial Services Headquarters

**Description:** Featured project image — Commercial corporate office

**Use Case:** Project card (400x240)

**Dimensions:** 400x240 (5:3)

**Prompt - Variant 1:**
```
Corporate headquarters lobby, professional art collection, sleek modern design, polished marble floors, statement artwork, sophisticated business environment, executive reception area, commercial interior photography, luxury corporate style
```

**Prompt - Variant 2:**
```
Modern financial services office, curated contemporary art throughout space, open floor plan, professional workstations in background, designer lighting, neutral sophisticated color palette, high-end corporate interior photography
```

**Negative Prompt (shared):**
```
residential, home, cluttered, bright harsh lighting, saturated colors, people working, casual, low quality, watermark, bright fluorescent
```

---

### IMG-012: Boutique Hotel Collection

**Description:** Featured project image — Boutique hotel art installation

**Use Case:** Project card (400x240)

**Dimensions:** 400x240 (5:3)

**Prompt - Variant 1:**
```
Boutique hotel lobby with statement art installation, elegant hospitality design, sculptural pieces, sophisticated color palette, designer furniture, warm ambient lighting, luxury hotel interior photography, memorable guest experience
```

**Prompt - Variant 2:**
```
Upscale boutique hotel common area, curated art collection, gallery-worthy installations, comfortable seating, unique lighting design, refined hospitality atmosphere, professional interior photography, distinctive hotel design
```

**Negative Prompt (shared):**
```
residential, home, cluttered, bright harsh lighting, saturated colors, people, guests, casual, low quality, watermark, generic motel
```

---

### IMG-013: Contact - Location

**Description:** Location placeholder — can be map or exterior shot

**Use Case:** Contact page info section (400x200)

**Dimensions:** 400x200 (2:1)

**Prompt - Variant 1:**
```
New York City streetscape exterior, elegant building facade, professional location photography, sophisticated urban setting, clean modern architecture, high-end commercial building, shallow depth of field
```

**Prompt - Variant 2:**
```
Stylized location map with elegant pins, minimal design, neutral color palette, modern infographic style, professional graphic design, clean and clear
```

**Negative Prompt (shared):**
```
messy, cluttered, bright harsh lighting, people, cars, construction, dirty, low quality, watermark, text overlay
```

---

### IMG-014: Homepage CTA

**Description:** Background for contact CTA section on homepage

**Use Case:** CTA section background (1920x600)

**Dimensions:** 1920x600 (~3:1)

**Crop-Safe Notes:**
- Center-weighted — safe zone is center 50% width
- Needs to work as subtle background

**Prompt - Variant 1:**
```
Elegant abstract art installation, soft neutral colors, sophisticated minimal composition, gallery wall texture, warm ambient lighting, professional photography, subtle refined background, no focal point, calm atmosphere
```

**Prompt - Variant 2:**
```
Contemporary art gallery hallway, soft diffused lighting, neutral cream and warm gray tones, minimalist aesthetic, elegant architectural details, subtle depth, professional interior photography, sophisticated background
```

**Negative Prompt (shared):**
```
bright, cluttered, harsh lighting, saturated colors, people, furniture, bold focal point, text, low quality, watermark
```

---

## Technical Notes

### Generation Settings (Recommended)
- **Aspect Ratio:** Match asset dimensions above
- **Resolution:** 1024x1024 minimum, 2048x2048 preferred for hero images
- **Style Preset:** Architectural, Interior Design, or Photographic
- **Quality:** High (for detailed textures)

### File Naming Convention
```
art-{page}-{asset-id}-{variant}.{format}
Examples:
art-homepage-hero-001.webp
art-homepage-services-residential-003v1.webp
art-about-team-sarah-005.webp
```

### Delivery Format
- WebP format recommended for web optimization
- Fallback to JPEG for photos
- Generate 2 variants per image for A/B testing flexibility

---

## Review Checklist

- [ ] All 14 image slots covered
- [ ] Each image has 2 prompt variants
- [ ] Dimensions and aspect ratios specified
- [ ] Crop-safe guidance provided
- [ ] Brand consistency maintained across prompts
- [ ] Negative prompts included for each variant
- [ ] Technical delivery notes included

---

*Document Version: 1.0*
*Created: 2026-03-08*
*For: ART Consulting Website*
