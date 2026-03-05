# Story API Slice Documentation

## MC2-E1-S1 & E1-S2: Story CRUD and Domain Validation

### Overview

This document describes the Story API vertical slice - a thin vertical layer implementing story management with domain validation and dispatch preconditions.

### Domain Model

#### Story Entity

```typescript
interface Story {
  id: string;                    // Generated unique identifier
  status: StoryStatus;          // Current lifecycle status
  metadata: StoryMetadata;       // Story details
  createdAt: Date;              // Creation timestamp
  updatedAt: Date;              // Last update timestamp
}

type StoryStatus = 
  | "draft" 
  | "pending_approval" 
  | "approved" 
  | "active" 
  | "completed" 
  | "archived";
```

#### Story Metadata

```typescript
interface StoryMetadata {
  title: string;                              // Required
  description: string;                         // Required
  requirementsArtifactId?: string;            // UUID (optional)
  approvedRequirementsArtifact: boolean;     // Must be true to dispatch
  acceptanceCriteria?: string[];              // Array of criteria
  priority?: "low" | "medium" | "high" | "critical";
}
```

### API Endpoints

#### POST /api/v1/stories - Create Story

**Request:**
```json
{
  "title": "Implement user authentication",
  "description": "Add OAuth2 login flow with Google and GitHub providers",
  "requirementsArtifactId": "123e4567-e89b-12d3-a456-426614174000",
  "acceptanceCriteria": [
    "User can sign in with Google",
    "User can sign in with GitHub",
    "Session persists across page refreshes"
  ],
  "priority": "high"
}
```

**Response (Success - 201):**
```json
{
  "success": true,
  "story": {
    "id": "story_abc123def456",
    "status": "draft",
    "metadata": {
      "title": "Implement user authentication",
      "description": "Add OAuth2 login flow...",
      "requirementsArtifactId": "123e4567-e89b-12d3-a456-426614174000",
      "approvedRequirementsArtifact": false,
      "acceptanceCriteria": ["..."],
      "priority": "high"
    },
    "createdAt": "2026-03-05T12:00:00.000Z",
    "updatedAt": "2026-03-05T12:00:00.000Z"
  }
}
```

**Response (Validation Error - 400):**
```json
{
  "success": false,
  "error": "Validation failed",
  "validationErrors": [
    { "field": "title", "message": "title is required and must be a non-empty string" }
  ]
}
```

#### GET /api/v1/stories - List Stories

**Response:**
```json
{
  "success": true,
  "stories": [...],
  "count": 2
}
```

#### POST /api/v1/stories/:id/approve - Approve Requirements

**Purpose:** Sets `approvedRequirementsArtifact` to `true` - required before dispatch.

**Response:**
```json
{
  "success": true,
  "story": {
    "id": "story_abc123def456",
    "metadata": {
      "approvedRequirementsArtifact": true,
      ...
    }
  }
}
```

#### GET /api/v1/stories/:id/dispatch-check - Check Dispatch Preconditions

**Purpose:** Validates if a story can be dispatched (has approved requirements artifact).

**Response (Valid):**
```json
{
  "valid": true,
  "story": { ... }
}
```

**Response (Invalid):**
```json
{
  "valid": false,
  "error": "Story \"story_abc123def456\" cannot be dispatched: requirements artifact not approved. Provide approvedRequirementsArtifact: true."
}
```

### Dispatch Precondition Rules

A story **cannot be dispatched** unless:
1. `metadata.approvedRequirementsArtifact === true`

This is enforced via the `validateDispatchPreconditions()` function in the domain layer.

### Validation Rules

#### Create Story Input

| Field | Required | Type | Constraints |
|-------|----------|------|-------------|
| title | Yes | string | Non-empty, trimmed |
| description | Yes | string | Non-empty, trimmed |
| requirementsArtifactId | No | string | Must be valid UUID if provided |
| acceptanceCriteria | No | string[] | Each must be non-empty string |
| priority | No | string | One of: low, medium, high, critical |

### Implementation Notes

- **In-Memory Store:** Currently uses a `Map<string, Story>` for temporary storage
- **ID Generation:** Uses `story_<timestamp>_<random>` format
- **Default Values:** 
  - `status`: "draft"
  - `approvedRequirementsArtifact`: false
  - `priority`: "medium"
- **Approval Flow:** The `approvedRequirementsArtifact` flag can ONLY be set to true via the `/approve` endpoint - it cannot be set directly during story creation

### File Structure

```
src/
├── domain/
│   ├── story.ts           # Story type and validation
│   ├── story.test.ts      # Domain tests
│   └── utils/
│       └── uuid.ts        # UUID validation utility
└── api/
    └── v1/
        └── stories.ts     # API handlers
```

### Running Tests

```bash
npm test
```

Expected output: All tests pass including:
- Input validation (required fields, types, UUID format)
- Story creation with defaults
- Dispatch precondition rejection (unapproved)
- Dispatch precondition acceptance (approved)
- List and create operations
