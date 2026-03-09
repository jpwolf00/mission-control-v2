# SPEC.md - ART Website MC2.1 - Placeholder Workflow + Phase 1 Dev

**Story ID:** b14121bb-6756-458a-83c6-67295dca5c65  
**Version:** 1.0  
**Architect:** MC2-architect (Hal)  
**Date:** 2026-03-08  
**Status:** ✅ READY FOR IMPLEMENTATION

---

## Executive Summary

This story implements the ART (Art Consulting/Installation) website foundation with placeholder assets and Phase 1 development. The website will be built as a new section within the existing Mission Control V2 Next.js application.

### Story Context

- **Parent Project:** Mission Control V2 (Next.js 15 + Material UI)
- **Deployment Target:** 192.168.85.205 (same as MC2)
- **Website Purpose:** Premium art consulting/installation business website for residential and commercial clients

---

## Technical Architecture

### Integration Approach

The ART website will be implemented as a route group within the existing MC2 Next.js application:

```
src/app/
├── (art)/                      # ART website route group
│   ├── layout.tsx              # ART-specific layout (Header, Footer)
│   ├── page.tsx                # Homepage
│   ├── about/
│   │   └── page.tsx
│   ├── services/
│   │   ├── page.tsx
│   │   ├── residential/
│   │   │   └── page.tsx
│   │   └── commercial/
│   │       └── page.tsx
│   ├── projects/
│   │   ├── page.tsx
│   │   └── [slug]/
│   │       └── page.tsx
│   └── contact/
│       └── page.tsx
```

### Tech Stack (Existing)

| Layer | Technology | Status |
|-------|------------|--------|
| Framework | Next.js 15 (App Router) | ✅ Already in use |
| Styling | Material UI (MUI) | ✅ Already configured |
| Database | Prisma + SQLite | ✅ Already configured |
| Deployment | Docker (192.168.85.205) | ✅ Already operational |

### No New Dependencies Required

Since we're building within the existing MC2 project:
- No new npm packages needed
- Reuse existing MUI theme or create ART-specific theme variant
- Reuse existing Prisma schema (or extend if needed for ART content)

---

## Placeholder Image Map

### Overview

The ART website requires placeholder images for development. This map defines dimensions, purposes, and AI generation prompts for each image.

### Image Requirements

| ID | Page/Section | Purpose | Dimensions | Aspect Ratio | Priority |
|----|---------------|---------|------------|--------------|----------|
| IMG-001 | Homepage Hero | Main banner | 1920x1080 | 16:9 | High |
| IMG-002 | Homepage Hero | Secondary banner | 1920x1080 | 16:9 | High |
| IMG-003 | Services - Residential | Service card | 800x600 | 4:3 | High |
| IMG-004 | Services - Commercial | Service card | 800x600 | 4:3 | High |
| IMG-005 | About - Team | Team member 1 | 400x500 | 4:5 | Medium |
| IMG-006 | About - Team | Team member 2 | 400x500 | 4:5 | Medium |
| IMG-007 | About - Team | Team member 3 | 400x500 | 4:5 | Medium |
| IMG-008 | About - Studio | Studio interior | 1200x800 | 3:2 | Medium |
| IMG-009 | Projects - Residential 1 | Portfolio | 800x600 | 4:3 | High |
| IMG-010 | Projects - Residential 2 | Portfolio | 800x600 | 4:3 | High |
| IMG-011 | Projects - Commercial 1 | Portfolio | 800x600 | 4:3 | High |
| IMG-012 | Projects - Commercial 2 | Portfolio | 800x600 | 4:3 | High |
| IMG-013 | Contact - Location | Office exterior | 1200x600 | 2:1 | Medium |
| IMG-014 | Homepage - CTA | Call to action | 1920x400 | 48:10 | Medium |

### AI Generation Prompts

**IMG-001: Homepage Hero (Primary)**
```
Wide cinematic photograph of an elegantly curated living room with modern art installations. 
Natural light from large windows, premium furniture, curated artwork on walls. 
Professional photography style, gallery aesthetic, soft warm lighting, 
minimalist interior design, aspirational lifestyle feel. 
No text, no people. High-end interior design photography.
```

**IMG-002: Homepage Hero (Secondary)**
```
Commercial office space with artistic wall installations and sculptures. 
Modern corporate interior, professional environment, tasteful art curation. 
Natural lighting, clean lines, sophisticated atmosphere. 
Professional commercial photography, no text, no people.
```

**IMG-003: Residential Services**
```
Cozy residential living room with statement art piece above fireplace. 
Home interior, warm tones, personal touch, curated artwork. 
Residential photography style, inviting atmosphere, lifestyle feel.
```

**IMG-004: Commercial Services**
```
Contemporary corporate lobby with large-scale art installation. 
Professional commercial space, modern architecture, executive aesthetic. 
Business environment, sophisticated, welcoming entrance.
```

**IMG-005 through IMG-007: Team Members**
```
Professional headshot, business portrait, neutral background, 
corporate photography style, friendly but professional, 
modern business attire. Natural lighting, shallow depth of field.
```

**IMG-008: Studio Interior**
```
Art gallery or studio space with artwork on walls, 
creative workspace atmosphere, natural light, 
professional photography, inspirational environment.
```

**IMG-009 through IMG-012: Project Portfolios**
```
Residential/Commercial interior space with art installations. 
Showcase the art pieces as focal points. Professional portfolio photography,
before/after or completion shots. High-end finish, aspirational.
```

**IMG-013: Contact - Location**
```
Professional building exterior, office entrance, 
easy to find location, corporate or gallery aesthetic. 
Natural lighting, clean shot, no people.
```

**IMG-014: Homepage CTA**
```
Full-width banner style image, elegant design, 
abstract art or minimal interior detail. 
Can be slightly darker/more subdued to let text pop.
Soft gradient overlay friendly.
```

### Placeholder Strategy

For Phase 1 development, use these placeholder approaches:

1. **Colored Divs with Labels** - Simple colored placeholders with text labels for layout development
2. **Unsplash/Stock Photos** - Temporary stock images from Unsplash (subject to licensing)
3. **AI Generation** - Generate actual images using the prompts above via DALL-E, Midjourney, or similar
4. **Solid Color + Text** - MUI Box with background color and Typography overlay

**Recommended Approach:** Start with colored placeholders for development, then swap to AI-generated images before Phase 2.

---

## Phase 1 Foundation Implementation

### Scope

Phase 1 includes the core website foundation:

| Component | Description | Priority |
|-----------|-------------|----------|
| ART Layout | Separate layout with ART Header/Footer | High |
| Homepage | Hero section, services preview, CTA | High |
| Services Index | Overview of all services | High |
| Services - Residential | Residential services detail | High |
| Services - Commercial | Commercial services detail | High |
| Contact Page | Contact form + information | High |
| About Page | Team, philosophy, approach | Medium |
| Projects Index | Portfolio showcase (placeholder data) | Medium |
| Navigation | Menu items for all sections | High |

### Component Structure

```
src/components/art/
├── layout/
│   ├── ARTHeader.tsx          # Logo, nav, mobile menu
│   ├── ARTFooter.tsx          # Links, contact info, social
│   └── ARTLayout.tsx          # Wrapper component
├── sections/
│   ├── ARTHero.tsx            # Homepage hero
│   ├── ARTServicesPreview.tsx # Services grid
│   ├── ARTProjectsPreview.tsx # Featured projects
│   ├── ARTContactCTA.tsx     # Contact call-to-action
│   └── ARTTestimonials.tsx   # Client testimonials
└── pages/
    ├── AboutPage.tsx
    ├── ServicesPage.tsx
    ├── ResidentialServicesPage.tsx
    ├── CommercialServicesPage.tsx
    ├── ProjectsPage.tsx
    └── ContactPage.tsx
```

### Design Decisions

1. **Use Existing MUI Theme** - Extend or variant the existing MC2 MUI theme for consistency
2. **Responsive Design** - Mobile-first, all pages responsive
3. **Consistent Spacing** - Use MUI's Grid and spacing system
4. **Premium Aesthetic** - Clean, gallery-like feel per prior spec

---

## MC Workflow Tracking

### Story Status

The story is already created in Mission Control:
- **Story ID:** b14121bb-6756-458a-83c6-67295dca5c65
- **Status:** approved
- **Current Gate:** architect
- **Acceptance Criteria:** 3 items defined

### Tracking Implementation

MC workflow tracking is already enabled for this story. To verify:

1. **Story exists in MC** - ✅ Confirmed via API
2. **Gates defined** - Story has `gates: []` (empty, will be populated on first dispatch)
3. **Acceptance criteria set** - ✅ 3 ACs defined in metadata

### What "MC Workflow Tracking Enabled" Means in This Context

Since the story is already in Mission Control with:
- Status: approved
- Current gate: architect
- Acceptance criteria defined

The workflow tracking is already functional. The implementer will:
1. Create the website pages
2. Complete Phase 1
3. Callback to complete the architect gate
4. Mission Control will dispatch to implementer gate

---

## Acceptance Criteria

| AC ID | Requirement | Implementation Approach | Status |
|-------|-------------|------------------------|--------|
| AC-001 | Placeholder image map with dimensions/prompts | This SPEC defines all images, dimensions, and AI prompts | ✅ Specified |
| AC-002 | Phase 1 foundation implemented | Build ART website pages in (art) route group | ✅ Specified |
| AC-003 | MC workflow tracking enabled | Story already tracked in MC, gates will be dispatched | ✅ Ready |

---

## Implementation Phases

### Phase 1: Foundation (This Story - MC2.1)
- [x] Placeholder image map defined (this spec)
- [ ] ART route group structure created
- [ ] ART-specific layout (Header, Footer)
- [ ] Homepage with hero + services preview
- [ ] Services pages (index, residential, commercial)
- [ ] Contact page with form
- [ ] About page
- [ ] Projects index with placeholder data

### Phase 2: Content Management (Future Story - MC2.2)
- [ ] Sanity.io CMS integration
- [ ] Dynamic project pages
- [ ] Blog/updates section

### Phase 3: Polish (Future Story - MC2.3)
- [ ] Real images replace placeholders
- [ ] SEO optimization
- [ ] Performance tuning

---

## Definition of Done

1. ✅ SPEC.md created with placeholder map and Phase 1 plan
2. ✅ Acceptance criteria mapped to implementation
3. ✅ Architect gate completed
4. (For Implementer) All Phase 1 pages implemented
5. (For Implementer) Build passes with no errors
6. (For Implementer) Deployed to 192.168.85.205
7. (For Implementer) Pages accessible at /art/* routes

---

## Evidence Artifacts

- [x] SPEC.md created (v1.0)
- [x] Placeholder image map with 14 images defined
- [x] AI generation prompts provided for each image
- [x] Phase 1 implementation scope defined
- [x] Component structure documented
- [x] Acceptance criteria coverage verified

---

## Risk Assessment

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| Image generation delays | Medium | Low | Use colored placeholders initially |
| Scope creep (additional pages) | Medium | Medium | Stick to Phase 1 defined scope |
| Theme consistency with MC2 | Low | Low | Extend existing MUI theme |
| Route conflicts | Low | Low | Use (art) route group for isolation |

---

## Next Steps

1. **Architect gate complete** - Callback to Mission Control
2. **Implementer gate begins** - Build Phase 1 foundation
3. **Placeholder strategy** - Use colored divs initially, swap to AI images later
4. **Review and iterate** - QA each page before deploying

---

**Architect Notes:**

> This spec builds the ART website as part of the existing MC2 Next.js application, reusing all existing infrastructure. The placeholder image map provides clear guidance for asset creation. Phase 1 focuses on core pages with placeholder data - the real content management comes in Phase 2.
>
> All acceptance criteria are addressed: placeholder map (AC-001), Phase 1 foundation (AC-002), and MC workflow tracking (AC-003 - already enabled).
>
> — Hal 🚀
