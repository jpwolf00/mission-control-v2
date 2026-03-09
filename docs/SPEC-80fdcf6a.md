# SPEC.md - Story Creative Flags Feature

## Story
- **ID**: 80fdcf6a-3c0d-45f7-b4f7-f8b80683fd94
- **Title**: Checkbox test story
- **Description**: test creative flags
- **Gate**: architect

---

## Overview

Add creative/behavior control flags to the Mission Control story creation UI via checkboxes. These flags allow users to configure agent behavior options when creating stories.

## Requirements

### UI Changes (Story Creation Form)
Add a "Creative Flags" section with checkboxes for:
- **Fast-pass UI Designer**: Skip UI-designer gate for simple stories
- **Use Creative Agent**: Enable creative/copywriter mode at UI-designer gate  
- **Auto-approve**: Skip human approval for this story
- **High Creativity**: Use more creative/imaginative models for generation

### Data Model Changes
Extend story schema to include:
```typescript
interface StoryFlags {
  fastPassUiDesigner?: boolean;
  useCreativeAgent?: boolean;
  autoApprove?: boolean;
  highCreativity?: boolean;
}
```

### API Changes
- Update `POST /api/v1/stories` schema to accept `flags` field
- Update story response to include `flags` in metadata

## Acceptance Criteria
1. Story creation form displays checkbox options for flags
2. Flags are saved to database and returned in story API
3. Flags are visible on story detail page
4. Flags can be edited after creation
5. Orchestration respects relevant flags (e.g., fast-pass skips gates)

## Implementation Notes
- Use Material UI Checkbox component
- Group flags in a Card component with "Creative Options" header
- Store flags in metadata.flags field for backward compatibility
