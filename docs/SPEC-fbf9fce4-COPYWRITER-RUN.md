# SPEC: ART Website MC2.1 - Copywriter Run (Explicit)

**Story ID:** fbf9fce4-8201-4f95-a298-a390657a54cb  
**Gate:** architect  
**Date:** March 9, 2026  
**Author:** Hal (Architect Agent)  
**Model:** alibaba/kimi-k2.5

---

## 1. Story Overview

### Description
Restart copy story with explicit copywriter-agent instructions. MUST use copywriter agent at ui-designer gate (no fast-pass). Deliver production website copy into code for Home/About/Services/Contact/Projects, include SEO metadata + CTA variants, and produce deploy-ready output for review URL.

### Business Context
ART Consulting is a premium art curation and installation service based in New York City (founded 2015). The website requires polished, conversion-optimized copy that reflects the brand's sophisticated yet approachable positioning.

**CRITICAL LOCATION NOTE:** Based on existing copy packages, ART Consulting is based in **New York City**, NOT Lexington KY. Some existing metadata incorrectly references Lexington KY (likely copy-paste from another project). This copywriter run MUST standardize all location references to **New York City / NYC**.

---

## 2. Acceptance Criteria (from Story)

- [x] ui-designer gate executes as copywriter role (not generic UX fast-pass)
- [ ] Real copy replaces scaffold placeholder messaging across core pages
- [ ] SEO titles/meta descriptions implemented for core pages
- [ ] Primary + secondary CTA copy variants applied
- [ ] Deployment record created and review URL provided

---

## 3. Current State Analysis

### Existing Pages Structure
```
/art                    → Homepage (has hero, services preview, projects preview, CTA)
/art/about              → About page (has team, values, story)
/art/services           → Services overview (residential + commercial cards)
/art/services/residential  → Residential detail page
/art/services/commercial   → Commercial detail page
/art/contact            → Contact page (form component)
/art/projects           → Projects portfolio page
/art/faq                → FAQ page
/art/updates            → Updates/blog page
```

### Existing Copy Assets
Two copy packages exist in `/docs/`:
1. `ART-COPY-PACKAGE-v1.md` (15KB) - Comprehensive copy with voice/tone guide
2. `copy-pack-v1.md` (19KB) - Similar content, slightly different organization

**Key Finding:** Both packages reference **New York City** as the business location, but some existing page metadata incorrectly says **Lexington KY**. This must be corrected.

### Brand Voice (from existing docs)
| Attribute | Definition |
|-----------|------------|
| Authoritative | Experts in art curation with deep knowledge |
| Refined | Sophisticated, elegant, premium positioning |
| Approachable | Warm, friendly, not pretentious |
| Transformative | Focus on the life-changing impact of art |

**Voice:** A knowledgeable friend who happens to be an art expert  
**Tone:** Confident but not arrogant — "we know art, and we'd love to help you discover it"

---

## 4. Technical Requirements

### 4.1 Pages Requiring Copy Updates

| Page | Current State | Required Work |
|------|---------------|---------------|
| `/art` (Home) | Has placeholder hero text | Apply final copy from copy package, ensure CTAs have variants |
| `/art/about` | Good foundation | Standardize location to NYC, refine team bios |
| `/art/services` | Comprehensive | Ensure CTA variants, check location refs |
| `/art/services/residential` | Good content | Apply CTA variants, verify SEO metadata |
| `/art/services/commercial` | Good content | Apply CTA variants, verify SEO metadata |
| `/art/contact` | Form component exists | Add supporting copy, form field labels, success messaging |
| `/art/projects` | Client component | Add intro copy, project descriptions, SEO |
| `/art/faq` | Unknown | Create FAQ content from common questions |

### 4.2 SEO Metadata Requirements

Each page must have complete Next.js Metadata:

```typescript
export const metadata: Metadata = {
  title: "<Page Title> | ART Consulting NYC",  // Max 60 chars
  description: "<Meta description>",            // Max 160 chars
  keywords: ["art consulting NYC", ...],        // 5-10 relevant keywords
  openGraph: {
    title: "<OG Title>",
    description: "<OG Description>",
    type: "website",
  },
};
```

**Location Standardization:** ALL pages must reference **New York City** or **NYC** (NOT Lexington KY).

### 4.3 CTA Copy Variants

Implement A/B test-ready CTA variants:

| Location | Primary CTA | Secondary CTA |
|----------|-------------|---------------|
| Homepage Hero | "Explore Our Services" | "View Our Work" |
| Homepage Bottom | "Start Your Project" | "Explore Services" |
| About Page | "Meet the Team" | "Schedule Consultation" |
| Services Pages | "Learn More" | "Get Started" |
| Contact Page | "Send Message" | (N/A) |

**CTA Variant System:** Create a copy constants file for easy A/B testing:

```typescript
// src/lib/copy-constants.ts
export const CTAS = {
  primary: {
    explore: "Explore Our Services",
    start: "Start Your Project",
    schedule: "Schedule Consultation",
    learnMore: "Learn More",
    send: "Send Message",
  },
  secondary: {
    viewWork: "View Our Work",
    explore: "Explore Services",
    meetTeam: "Meet the Team",
    getStarted: "Get Started",
  },
};
```

### 4.4 Required Deliverables

1. **Copy Constants File** (`src/lib/copy-constants.ts`)
   - All CTA variants
   - Page titles
   - Hero headlines
   - Value propositions

2. **Updated Page Components** (8 files)
   - Each with complete SEO metadata
   - Real copy (no placeholders)
   - Consistent brand voice

3. **Contact Form Copy** (`src/components/art/ContactForm.tsx`)
   - Form field labels
   - Placeholder text
   - Success/error messages
   - Privacy notice

4. **FAQ Content** (`/art/faq/page.tsx`)
   - 8-12 common questions with answers
   - Organized by category

5. **Projects Page Copy** (`/art/projects/page.tsx`)
   - Intro copy
   - Project descriptions (6 sample projects)
   - Case study teasers

---

## 5. Implementation Approach

### Phase 1: Copy Constants (30 min)
- Extract all copy from existing copy packages
- Create `src/lib/copy-constants.ts`
- Standardize location references (NYC only)
- Define CTA variants

### Phase 2: Page Updates (2 hours)
- Update each page component with real copy
- Implement SEO metadata on all pages
- Replace placeholder text throughout
- Ensure consistent voice/tone

### Phase 3: Contact & FAQ (1 hour)
- Add complete contact form copy
- Create FAQ content (8-12 Q&As)
- Add projects page descriptions

### Phase 4: QA & Verification (30 min)
- Verify all location refs = NYC
- Check SEO metadata completeness
- Test CTA links
- Run `npm run build` to ensure no errors

---

## 6. Acceptance Criteria (Detailed)

### AC1: Copywriter Role Execution
- [ ] ui-designer gate session spawned with explicit copywriter role instructions
- [ ] NOT using fast-pass or generic UX agent
- [ ] Agent focuses on copy quality, brand voice, conversion optimization

### AC2: Real Copy Implementation
- [ ] No placeholder text remains (e.g., "Lorem ipsum", "Studio Image", placeholder colors)
- [ ] All hero sections have compelling headlines + subheads
- [ ] All service descriptions are benefit-focused
- [ ] Team bios are complete and personable
- [ ] Contact form has complete labels, placeholders, success messaging

### AC3: SEO Metadata
- [ ] All 8 pages have unique, descriptive titles (50-60 chars)
- [ ] All pages have meta descriptions (150-160 chars)
- [ ] Keywords are relevant and location-specific (NYC)
- [ ] OpenGraph metadata present for social sharing

### AC4: CTA Variants
- [ ] Primary + secondary CTAs on homepage
- [ ] CTA constants file created for easy A/B testing
- [ ] All CTA links are functional and point to correct routes
- [ ] CTA copy is action-oriented and benefit-focused

### AC5: Deployment & Review
- [ ] Code committed to mission-control-v2 repo
- [ ] `npm run build` succeeds with no errors
- [ ] Deployed to production (192.168.85.205:3004/art)
- [ ] Review URL provided in callback
- [ ] Screenshot evidence from deployed site

---

## 7. Copy Guidelines (for Copywriter Agent)

### Do's
✅ Lead with transformation/outcomes ("Transform your space")  
✅ Use "we" language to emphasize partnership  
✅ Keep paragraphs short (2-3 sentences max)  
✅ Use bullet points for benefits/features  
✅ Include NYC location naturally (not forced)  
✅ Speak to aspirations and emotions  
✅ Make CTAs action-oriented and clear  

### Don'ts
❌ Don't use pretentious or overly academic language  
❌ Don't say "artwork" — use "art" or "pieces"  
❌ Don't say "client" — use "you" or "homeowners/businesses"  
❌ Don't use passive voice  
❌ Don't include Lexington KY references (NYC only)  
❌ Don't leave placeholder text or image IDs visible  

### Brand Vocabulary
**Use:** curated, transform, thoughtful, bespoke, personalized, bring to life, elevate  
**Avoid:** artwork, client, art advisory, leverage, utilize

---

## 8. File Map

### Files to Create
- `src/lib/copy-constants.ts` - Centralized copy for A/B testing

### Files to Update
- `src/app/art/page.tsx` - Homepage copy + SEO
- `src/app/art/about/page.tsx` - About page copy + SEO
- `src/app/art/services/page.tsx` - Services overview + SEO
- `src/app/art/services/residential/page.tsx` - Residential detail + SEO
- `src/app/art/services/commercial/page.tsx` - Commercial detail + SEO
- `src/app/art/contact/page.tsx` - Contact form copy + SEO
- `src/app/art/contact/ContactClient.tsx` - Form labels, placeholders, messages
- `src/app/art/projects/page.tsx` - Projects intro + SEO
- `src/app/art/projects/ProjectsClient.tsx` - Project descriptions
- `src/app/art/faq/page.tsx` - FAQ content + SEO

---

## 9. Testing & Verification

### Build Test
```bash
cd /Users/jpwolf00/.openclaw/workspace/mission-control-v2
npm run build
# Must succeed with 0 errors
```

### Deploy Verification
```bash
# Check deployed site responds
curl -I http://192.168.85.205:3004/art
# HTTP/1.1 200 OK
```

### Content Verification Checklist
- [ ] Visit `/art` - Hero copy present, CTAs working
- [ ] Visit `/art/about` - Team bios complete, no placeholders
- [ ] Visit `/art/services` - Both service cards have full copy
- [ ] Visit `/art/contact` - Form has labels, placeholders, success message
- [ ] Visit `/art/projects` - Project descriptions present
- [ ] Visit `/art/faq` - FAQ questions and answers visible
- [ ] All pages show "NYC" or "New York" (NOT "Lexington KY")

---

## 10. Risks & Blockers

### Known Risks
1. **Location Inconsistency:** Some existing metadata says Lexington KY, copy packages say NYC
   - **Mitigation:** Standardize to NYC across all pages (per existing copy packages)

2. **Placeholder Images:** Some components show "IMG-005" badges and placeholder colors
   - **Mitigation:** Replace with actual image components or remove visible image IDs

3. **Copy Package Conflicts:** Two slightly different copy packages exist
   - **Mitigation:** Use `copy-pack-v1.md` as primary source (more comprehensive)

### Potential Blockers
- If copywriter agent is not available, escalate to Jason for manual assignment
- If build fails due to TypeScript errors, implementer must fix before deploy

---

## 11. Success Metrics

### Quantitative
- 100% of pages have complete SEO metadata
- 0 instances of "Lexington KY" in codebase (should be NYC)
- 0 placeholder text strings remaining
- Build succeeds with 0 errors

### Qualitative
- Copy reads naturally and reflects brand voice (authoritative, refined, approachable)
- CTAs are compelling and action-oriented
- No jargon or pretentious language
- Location references are consistent (NYC throughout)

---

## 12. Handoff Notes

### For Implementer (Next Gate)
- This spec defines the copy requirements
- Use existing copy packages as source material (`docs/copy-pack-v1.md`)
- Create `src/lib/copy-constants.ts` for maintainability
- Focus on replacing placeholders with real copy
- Standardize all location refs to NYC

### For Reviewer (Future Gate)
- Verify deployed site at `http://192.168.85.205:3004/art`
- Check all 8 pages for complete copy
- Confirm no "Lexington KY" references remain
- Test all CTA links
- Verify SEO metadata in page source

---

## 13. References

- Existing Copy Package: `/docs/copy-pack-v1.md`
- Alternative Copy Package: `/docs/ART-COPY-PACKAGE-v1.md`
- Agent Roles: `/docs/AGENT_ROLES.md`
- Story: fbf9fce4-8201-4f95-a298-a390657a54cb

---

**SPEC COMPLETE. Ready for implementer gate.**
