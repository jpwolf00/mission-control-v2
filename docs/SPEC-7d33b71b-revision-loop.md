# SPEC: Revision Loop - Comments + Send-Back Flow on Completed Stories

**Story ID:** 7d33b71b-8e07-4503-87ad-2b67cf8b2d91  
**Gate:** architect  
**Created:** 2026-03-09  
**Architect:** MC2-architect

---

## 1. Overview

This story adds user comment/revision workflow to Mission Control, enabling completed stories to receive feedback and be sent back for revisions without creating new stories.

### Goals
- Allow users to add comments on completed/reviewed stories
- Provide "Accept Final" or "Request Revisions" actions
- Route "Request Revisions" back to the appropriate gate (default: implementer)
- Preserve revision history on the same story

---

## 2. Current Implementation Analysis

### 2.1 Story Status Flow
```
draft → approved → active → [gates complete] → completed
                                              ↓
                                      can receive revisions
```

### 2.2 Existing Components

**Database Model (Prisma):**
- `Story` - main entity with status field
- `StoryGate` - tracks gate completion status
- `StoryEvent` - event log for story (already exists, can be used for revision history)

**Existing Status Values:**
- `draft`, `approved`, `active`, `completed`, `blocked`, `paused`, `failed`, `archived`

**Existing Gate Completion Statuses (gate-contracts.ts):**
- `pending`, `approved`, `rejected`, `needs_revision`

### 2.3 Relevant API Endpoints
- `GET /api/v1/stories/[id]` - fetch story details
- `PATCH /api/v1/stories/[id]` - approve/reject requirements
- `POST /api/v1/gates/complete` - complete a gate with status
- `POST /api/v1/orchestration/dispatch` - dispatch to a gate

### 2.4 UI Components
- Story detail page: `/src/app/stories/[id]/page.tsx`
- Shows gate timeline, acceptance criteria, attachments

---

## 3. Data Model Design

### 3.1 New/Extended Models

**Option A: Reuse StoryEvent (Preferred)**
- Use existing `StoryEvent` model with new event types
- No schema changes required

**New Event Types:**
```typescript
type RevisionEventType = 
  | 'comment_added'      // User added a comment
  | 'revision_requested' // User requested revisions
  | 'final_accepted';   // User accepted final output
```

**Comment Payload Structure:**
```typescript
interface CommentPayload {
  type: 'comment_added';
  content: string;        // The comment text
  author: string;         // User identifier
}

interface RevisionRequestPayload {
  type: 'revision_requested';
  content: string;        // Feedback/revision notes
  author: string;
  targetGate: string;    // Gate to route back to (default: implementer)
  revisionNumber: number; // Increment for each revision cycle
}

interface FinalAcceptancePayload {
  type: 'final_accepted';
  author: string;
  revisionNumber: number; // Which revision was accepted
}
```

### 3.2 Story Status Transitions

```
completed (after reviewer-b)
    ↓
[User adds comment] → stays completed
    ↓
[User requests revisions] → status: in_progress, routes to target gate
    ↓
[User accepts final] → status: accepted (new final status)
```

**New Status Value:** `accepted` (final state after all revisions complete)

### 3.3 Gate Routing for Revisions

**Default:** `implementer` gate  
**Alternative options:** Any gate in the pipeline (user can select)

When revision is requested:
1. Update story status from `completed` → `in_progress`
2. Clear any downstream gate approvals (e.g., if going back to implementer, clear reviewer-a, operator, reviewer-b)
3. Dispatch to the target gate with revision context

---

## 4. API Design

### 4.1 New Endpoint: Add Comment

**POST** `/api/v1/stories/[id]/comments`

```typescript
// Request
{
  content: string;        // Comment text (required)
  action?: 'comment' | 'request_revision' | 'accept_final';  // default: 'comment'
  targetGate?: string;    // Only for 'request_revision' - default: 'implementer'
}

// Response
{
  id: string;              // StoryEvent ID
  storyId: string;
  type: 'comment_added' | 'revision_requested' | 'final_accepted';
  payload: {...};
  createdAt: string;
}
```

**Validation:**
- Story must exist
- For `request_revision`: story status must be `completed`
- For `accept_final`: story status must be `completed`
- `content` required for comment and revision_requested
- `targetGate` must be valid gate name

### 4.2 Get Comments

**GET** `/api/v1/stories/[id]/comments`

```typescript
// Response
{
  comments: Array<{
    id: string;
    type: string;
    content?: string;
    author?: string;
    targetGate?: string;
    revisionNumber?: number;
    createdAt: string;
  }>;
}
```

### 4.3 Revision Flow Logic

```typescript
// On 'request_revision' action:
1. Validate story.status === 'completed'
2. Get revision number (max existing + 1)
3. Create StoryEvent with type 'revision_requested'
4. Clear downstream gates (gates after targetGate)
5. Update story.status → 'in_progress'
6. Dispatch to targetGate with revision context

// On 'accept_final' action:
1. Validate story.status === 'completed'
2. Get revision number (max existing + 1)
3. Create StoryEvent with type 'final_accepted'
4. Update story.status → 'accepted'
```

---

## 5. Frontend UI Design

### 5.1 Story Detail Page Updates

**Location:** `/src/app/stories/[id]/page.tsx`

**New Section:** "Review & Revisions" card (visible when story.status === 'completed' or 'accepted')

**UI Components:**

```tsx
// Comment/Revision Card
<Card sx={{ mt: 3 }}>
  <CardHeader 
    title="Review Decision" 
    titleTypographyProps={{ variant: 'h6', fontSize: '1rem' }} 
  />
  <CardContent>
    {/* Revision History (if any) */}
    {revisionHistory.length > 0 && (
      <Box sx={{ mb: 2 }}>
        <Typography variant="subtitle2" gutterBottom>
          Revision History
        </Typography>
        {revisionHistory.map((rev, i) => (
          <Chip 
            key={i}
            label={`Rev ${rev.revisionNumber}: ${rev.type}`}
            size="small"
            sx={{ mr: 0.5, mb: 0.5 }}
          />
        ))}
      </Box>
    )}
    
    {/* Comment Input */}
    <TextField
      label="Add a comment or feedback"
      multiline
      rows={3}
      fullWidth
      value={commentText}
      onChange={(e) => setCommentText(e.target.value)}
      sx={{ mb: 2 }}
    />
    
    {/* Action Buttons */}
    <Box display="flex" gap={1}>
      <Button
        variant="outlined"
        onClick={() => handleComment('comment')}
        disabled={!commentText.trim() || submitting}
      >
        Add Comment
      </Button>
      <Button
        variant="contained"
        color="warning"
        onClick={() => handleComment('request_revision')}
        disabled={!commentText.trim() || submitting}
      >
        Request Revisions
      </Button>
      <Button
        variant="contained"
        color="success"
        onClick={() => handleComment('accept_final')}
        disabled={submitting}
      >
        Accept Final
      </Button>
    </Box>
    
    {/* Target Gate Selector (shown when Request Revisions clicked) */}
    {showRevisionOptions && (
      <Box sx={{ mt: 2 }}>
        <FormControl size="small" sx={{ minWidth: 200 }}>
          <InputLabel>Route to Gate</InputLabel>
          <Select
            value={targetGate}
            label="Route to Gate"
            onChange={(e) => setTargetGate(e.target.value)}
          >
            {GATES.map(gate => (
              <MenuItem key={gate} value={gate}>
                {gate.charAt(0).toUpperCase() + gate.slice(1)}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
    )}
  </CardContent>
</Card>
```

### 5.2 State Management

```typescript
const [commentText, setCommentText] = useState('');
const [submitting, setSubmitting] = useState(false);
const [revisionHistory, setRevisionHistory] = useState<Comment[]>([]);
const [targetGate, setTargetGate] = useState('implementer');
const [showRevisionOptions, setShowRevisionOptions] = useState(false);
```

### 5.3 Fetch Revision History

On story load, fetch comments:
```typescript
const fetchComments = async () => {
  const response = await fetch(`/api/v1/stories/${storyId}/comments`);
  const data = await response.json();
  setRevisionHistory(data.comments || []);
};
```

### 5.4 Button Visibility

- **Add Comment:** Always visible for `completed` status
- **Request Revisions:** Visible for `completed` status
- **Accept Final:** Visible for `completed` status
- For `accepted` status: Show "Story Accepted" badge, no actions

---

## 6. Implementation Phases

### Phase 1: Backend API (Implementer)
1. Add new event types to comments service
2. Create `/api/v1/stories/[id]/comments` POST endpoint
3. Create `/api/v1/stories/[id]/comments` GET endpoint
4. Implement revision routing logic
5. Update story status on revision/final acceptance

### Phase 2: Frontend UI (Implementer)
1. Add comment section to story detail page
2. Add revision history display
3. Implement comment submission
4. Implement revision request with gate selection
5. Implement final acceptance action
6. Add "accepted" status chip styling

### Phase 3: Testing (Reviewer)
1. Test comment addition
2. Test revision request routing
3. Test final acceptance
4. Test revision history preservation
5. Test gate clearing on revision

---

## 7. Edge Cases

| Scenario | Handling |
|----------|----------|
| User requests revisions from `accepted` status | Reject - already accepted |
| Multiple revision cycles | Increment revisionNumber, preserve all history |
| Revision to gate that's already approved | Clear that gate's approval, re-run |
| Story in `blocked` status | Show revision UI only if `completed` |
| Empty comment text | Validate, show error |

---

## 8. Acceptance Criteria

- [ ] **AC-1:** User can add comments on completed stories
- [ ] **AC-2:** Comments are stored in StoryEvent and retrievable
- [ ] **AC-3:** "Request Revisions" button visible on completed stories
- [ ] **AC-4:** User can select target gate (defaults to implementer)
- [ ] **AC-5:** Requesting revisions clears downstream gates and dispatches to target
- [ ] **AC-6:** Story status changes from `completed` → `in_progress` on revision request
- [ ] **AC-7:** "Accept Final" button visible on completed stories
- [ ] **AC-8:** Accepting final changes status to `accepted`
- [ ] **AC-9:** Revision history displayed on story detail
- [ ] **AC-10:** Multiple revision cycles increment revisionNumber

---

## 9. Definition of Done

1. Backend API endpoints implemented and tested
2. Frontend UI implemented with all actions
3. Revision history properly preserved
4. All acceptance criteria verified
5. No console errors
6. Works on both desktop and mobile layouts

---

## 10. Handoff to Implementer

**Next Gate:** implementer

**Deliverables:**
- This SPEC.md
- Backend: `/api/v1/stories/[id]/comments` endpoints (GET + POST)
- Frontend: Updated story detail page with revision UI
- Database: No schema changes (reuses StoryEvent)

**Notes for Implementer:**
- Reuse existing StoryEvent model for comment storage
- Default target gate is `implementer`
- Test with existing completed story
- Ensure gate clearing logic works correctly
