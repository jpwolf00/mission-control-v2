# SPEC-ART-Epic1-SEO-Conversion-Foundations.md

# Epic 1: SEO + Conversion Foundations

**Story ID:** dfb1ec7b-70ba-43d2-abe0-eeecea49662b  
**Epic:** ART Epic 1 - SEO + Conversion Foundations  
**Market:** Lexington, KY (local SEO focus)  
**Architect:** Hal (MC2-architect)  
**Date:** 2026-03-09  
**Status:** ARCHITECT COMPLETE - IMPLEMENTER GATE PENDING

---

## 1. Executive Summary

This epic establishes foundational SEO and conversion optimization for the ART Consulting website targeting the Lexington, KY market. Key deliverables include editable SEO metadata, clean URL structure enforcement, local keyword integration, a functional consultation form with lead routing, and Facebook page linking without live feed dependency.

---

## 2. Acceptance Criteria

| # | Criterion | Target |
|---|-----------|--------|
| 2.1 | Editable SEO fields (title, meta description, alt text) available | All pages |
| 2.2 | Clean URLs + heading hierarchy enforced | `/art/` routes |
| 2.3 | Local keyword themes integrated into service/FAQ content | Lexington market focus |
| 2.4 | Consultation form captures required fields and routes leads | Functional backend |
| 2.5 | Facebook linked without live-feed dependency | Static link |

---

## 3. Current State Analysis

### 3.1 Pages Overview

| Page | Route | Current SEO Metadata | Form | Local Keywords |
|------|-------|---------------------|------|----------------|
| Home | `/art/` | ✅ Complete | ❌ None | ❌ No |
| About | `/art/about` | ✅ Complete | ❌ None | ❌ No |
| Services | `/art/services` | ✅ Complete | ❌ None | ❌ No |
| Residential | `/art/services/residential` | ✅ Complete | ❌ None | ❌ No |
| Commercial | `/art/services/commercial` | ✅ Complete | ❌ None | ❌ No |
| Projects | `/art/projects` | ❌ Missing | ❌ None | ❌ No |
| Contact | `/art/contact` | ✅ Complete | ⚠️ UI only | ❌ No |

### 3.2 Gaps Identified

1. **Projects page missing SEO metadata** - Need to add title/description
2. **No editable SEO fields** - Currently hardcoded in page components
3. **No local (Lexington) keywords** - All content targets NYC currently
4. **Contact form is UI-only** - No backend handler, no lead routing
5. **No FAQ section** - Missing opportunity for SEO long-tail keywords
6. **No schema markup** - Missing structured data for local business
7. **Heading hierarchy inconsistent** - Some pages skip H2/H3 levels

---

## 4. Technical Implementation

### 4.1 SEO Fields Architecture

**Approach:** Use Next.js Metadata API with database-backed overrides

```
prisma/
  schema.prisma - Add SEOOverride model

src/
  app/
    api/
      v1/
        seo/overrides/route.ts - CRUD for SEO overrides
  lib/
    seo.ts - SEO field resolution logic
```

**Database Schema (SEOOverride):**
```prisma
model SEOOverride {
  id          String   @id @default(cuid())
  pagePath    String   @unique
  title       String?
  description String?
  keywords    String?
  ogImage     String?
  canonical   String?
  noIndex     Boolean  @default(false)
  updatedAt   DateTime @updatedAt
}
```

**Resolution Logic:**
1. Check database for page-specific SEO override
2. Fall back to hardcoded metadata in page component
3. Merge with defaults from root layout

### 4.2 URL Structure

**Current:** `/art/services/residential` → Clean enough  
**Enforcement:** Use Next.js `generateStaticParams` for static pages

Add to each page:
```typescript
export function generateStaticParams() {
  return [
    { slug: 'about' },
    { slug: 'services' },
    // etc.
  ];
}
```

### 4.3 Heading Hierarchy Rules

| Page | H1 | H2 | H3 |
|------|----|----|----|
| Home | "Premium Art Curation in Lexington" | Services, About CTA | Sub-sections |
| About | "About ART Consulting" | Our Story, Our Approach | Team, Values |
| Services | "Art Services in Lexington" | Residential, Commercial | Sub-services |
| Contact | "Contact Us in Lexington" | Form, Info | - |

**Enforcement:** Linting rule to flag heading skips (H1→H3 without H2)

### 4.4 Local Keyword Themes

**Lexington Market Keywords:**

| Primary | Long-tail | Location |
|---------|-----------|----------|
| Lexington art consultant | Art consultant Lexington KY | Lexington, KY |
| Lexington art curation | Best art curator Lexington | Georgetown, KY |
| Lexington art installation | Lexington art installation services | Nicholasville, KY |
| Lexington wall art | Lexington residential art consulting | Richmond, KY |
| Lexington office art | Lexington corporate art solutions | Lexington metro |

**Implementation:**
- Update page metadata with Lexington-focused keywords
- Add FAQ section with local long-tail queries
- Service pages: "Art Consulting in Lexington, KY"

### 4.5 Consultation Form

**Required Fields:**
- firstName (required)
- lastName (required)
- email (required, validated)
- phone (optional)
- projectType (required): residential | commercial | other
- budget (optional): under$1k | $1k-5k | $5k-10k | $10k+
- message (required)
- referrer (hidden): page where form was submitted

**Backend:**
```
src/app/api/v1/leads/route.ts
```

**Lead Storage:**
```prisma
model Lead {
  id          String   @id @default(cuid())
  firstName   String
  lastName    String
  email       String
  phone       String?
  projectType String
  budget      String?
  message     String
  referrer    String?
  status      String   @default("new") // new, contacted, qualified, lost
  source      String   @default("website")
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

**Lead Routing:**
- Auto-create lead in database
- Log to console (future: email notification)
- Return success/error to form UI

### 4.6 Facebook Integration

**Approach:** Static link with fallback content
- Facebook Page URL: `https://www.facebook.com/ARTConsulting` (placeholder)
- Link in footer and contact page
- No live feed - avoids API dependencies
- Graceful degradation if link unavailable

### 4.7 Schema Markup

**LocalBusiness Schema (JSON-LD):**
```json
{
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
  "priceRange": "$$$"
}
```

---

## 5. FAQ Section (SEO Enhancement)

### 5.1 Questions to Add

| Question | Answer (Short) | Keywords |
|----------|----------------|----------|
| How much does art consultation cost in Lexington? | Starting at $500 for initial consultation | Lexington art consultation cost |
| What areas do you serve in Kentucky? | Lexington, Georgetown, Nicholasville, Richmond, and surrounding areas | art consultant Kentucky |
| How long does art installation take? | Typically 1-3 days depending on scope | Lexington art installation |
| Do you work with commercial clients? | Yes, offices, hotels, restaurants, retail spaces | Lexington commercial art |
| Can you help with art selection for new construction? | Absolutely, we work with homeowners and builders | Lexington new construction art |

### 5.2 Implementation

- Create `/art/faq` page with accordion UI
- Add to navigation (footer)
- Each FAQ as separate FAQPage schema entry

---

## 6. File Changes Summary

### New Files

| File | Purpose |
|------|---------|
| `prisma/schema.prisma` | Add SEOOverride and Lead models |
| `src/app/api/v1/seo/overrides/route.ts` | CRUD for SEO overrides |
| `src/app/api/v1/leads/route.ts` | Lead submission handler |
| `src/app/art/faq/page.tsx` | FAQ page with local keywords |
| `src/components/art/FAQAccordion.tsx` | Reusable FAQ component |
| `src/lib/seo.ts` | SEO resolution utilities |
| `src/app/art/projects/page.tsx` | Add missing metadata |

### Modified Files

| File | Change |
|------|--------|
| `src/app/art/layout.tsx` | Add schema.org JSON-LD |
| `src/app/art/services/page.tsx` | Add Lexington keywords |
| `src/app/art/services/residential/page.tsx` | Add local SEO |
| `src/app/art/services/commercial/page.tsx` | Add local SEO |
| `src/app/art/contact/page.tsx` | Connect form to API |
| `src/components/art/layout/ARTFooter.tsx` | Add Facebook link + FAQ link |

---

## 7. Build & Verification

### 7.1 Pre-Implementation

- [ ] `npm run build` passes ✅ (confirmed from prior run)

### 7.2 Post-Implementation

- [ ] `npm run build` passes
- [ ] All pages have SEO metadata (title + description)
- [ ] FAQ page loads with accordion
- [ ] Contact form submits to API and stores lead
- [ ] Schema.org JSON-LD present in page source
- [ ] No heading hierarchy skips (H1→H2→H3)
- [ ] URLs are clean (no query params, no trailing slashes)
- [ ] Facebook link present in footer

---

## 8. Gate Instructions

### Implementer Gate Tasks

1. **Database Updates**
   - Add SEOOverride and Lead models to prisma/schema.prisma
   - Run `npx prisma db push`

2. **API Routes**
   - Create `/api/v1/seo/overrides` for CRUD operations
   - Create `/api/v1/leads` for form submissions
   - Implement validation (Zod)

3. **SEO Components**
   - Create `src/lib/seo.ts` with resolution logic
   - Create FAQ component with accordion
   - Create FAQ page

4. **Page Updates**
   - Add metadata to Projects page
   - Update all service pages with Lexington keywords
   - Connect contact form to leads API
   - Add schema.org to root layout

5. **Footer Updates**
   - Add Facebook link
   - Add FAQ link

6. **Verification**
   - Build passes
   - Curl test all pages for 200 OK
   - Test form submission

### Reviewer Gate Tasks

1. Verify `npm run build` succeeds
2. Verify all acceptance criteria met
3. Curl test `/api/v1/leads` with sample payload
4. Verify FAQ page renders
5. Check schema.org in page source
6. Confirm heading hierarchy on all pages

---

## 9. Dependencies

| Package | Purpose | Status |
|---------|---------|--------|
| @prisma/client | Database ORM | Existing |
| prisma | Database schema | Existing |
| zod | API validation | May need to add |
| lucide-react | Icons (existing) | ✅ |

---

## 10. Timeline Estimate

| Gate | Estimate |
|------|----------|
| Implementer | 45-60 min |
| Reviewer | 15-20 min |
| **Total** | **~75 min** |

---

## 11. Risk Factors

| Risk | Mitigation |
|------|------------|
| Form validation complexity | Use Zod for schema validation |
| Prisma migration issues | Backup DB before push |
| Heading hierarchy enforcement | Manual review + comment guidelines |
| Schema.org errors | Use JSON-LD validator |

---

## 12. Next Steps

1. **Implementer gate** executes spec
2. **Reviewer gate** validates implementation
3. If passed, epic complete ✅
4. If blocked, document blocker in callback evidence

---

**Architect Notes:**

> This epic establishes the SEO and conversion infrastructure. The key focus is making the site discoverable for Lexington, KY searches while providing a functional lead capture path. The editable SEO fields future-proof the site for content changes without code deploys.

> Primary risks: form validation edge cases, schema markup errors. Mitigate with Zod and JSON-LD testing.

> Build status: ✅ Passing (pre-implementation)
> Dependencies: Minimal (mostly existing Next.js/MUI stack)

— Hal 🚀
