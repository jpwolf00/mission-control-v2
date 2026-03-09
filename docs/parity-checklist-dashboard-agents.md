# MC2 Dashboard vs OpenClaw Monitor - Parity Checklist

## Story: Wire dashboard gate pipeline/agents panel to live runtime state
- **Story ID**: a97486df-90e3-4008-8164-3faecd788e50
- **Gate**: ui-designer
- **Analyzed**: 2026-03-09

---

## Current MC2 Dashboard Fields

### Gate Pipeline Panel
| Field | Status | Source |
|-------|--------|--------|
| Gate name | ✅ Implemented | GATES array |
| Status (active/pending/idle) | ✅ Implemented | Derived from activeSessions + story gate status |
| Active story title | ✅ Implemented | story.title |
| Model | ✅ Implemented (but null in DB) | runSession.model |
| Last event timestamp | ✅ Implemented | runSession.startedAt |
| Provider | ✅ Implemented (but null in DB) | runSession.provider |

### Active Agents Panel
| Field | Status | Source |
|-------|--------|--------|
| Gate name | ✅ Implemented | session.gate |
| Story title | ✅ Implemented | story.title |
| Model | ✅ Implemented (but null) | session.model |
| StartedAt/Timestamp | ✅ Implemented | session.startedAt |
| Provider | ✅ Implemented (but null) | session.provider |

---

## OpenClaw Monitor Reference Fields

| Field | MC2 Status | Notes |
|-------|------------|-------|
| agent_id/session_id | ✅ Partial | MC2 has sessionId in activeStory |
| last_tool | ❌ Missing | Tool call name not stored |
| last_tool_ts | ❌ Missing | Tool call timestamp not stored |
| last_model | ✅ Present | session.model (often null) |
| last_provider | ✅ Present | session.provider (often null) |
| tokens_in | ❌ Missing | Token counts not tracked |
| tokens_out | ❌ Missing | Token counts not tracked |
| tokens_cache | ❌ Missing | Token counts not tracked |
| last_event_ts | ✅ Present | startedAt |
| last_thought | ❌ Missing | AI thinking not stored |
| last_user_text | ❌ Missing | Last user message not stored |
| session_kind | ⚠️ Partial | MC2 uses gate instead |

---

## Acceptance Criteria Analysis

### ✅ Criteria 1: Dashboard shows active story being worked per agent
**Status**: PASSED
- Gate Pipeline panel shows active story per gate
- Active Agents panel lists all active sessions with story titles

### ⚠️ Criteria 2: Dashboard shows last event, model, and last message per agent
**Status**: PARTIAL
- Last event (timestamp): ✅ Implemented
- Model: ✅ Implemented (but null in DB)
- Last message: ❌ NOT Implemented - requires backend enhancement

### ✅ Criteria 3: Data updates from live runtime/event stream
**Status**: PASSED
- Data fetched from `/api/v1/runtime/state` (live DB queries)
- No static/mock data used
- Note: No auto-refresh/polling (fetches once on mount)

### ⚠️ Criteria 4: Parity checklist against OpenClaw monitor
**Status**: DOCUMENTED (see above)
- Some fields not available in MC2 due to data model differences
- OpenClaw reads session JSONL files directly; MC2 uses Prisma DB

---

## Findings

### This is primarily a BACKEND data availability issue, not a UI design issue.

The existing UI components already handle:
- Displaying model (even though null)
- Displaying last event timestamp
- Displaying active story
- Displaying gate/status

**Missing from UI perspective:**
1. **Last message display** - UI could render it if API provided it
2. **Auto-refresh** - Could add polling for live updates

**Root cause of "null" fields:**
- runSession model doesn't store model/provider when not populated by dispatch
- Last message/thought/tool not captured in current schema

---

## Recommendation

The UI is already designed to display available data. The gaps are:
1. Backend needs to populate model/provider in runSession records
2. Backend needs to expose "last message" (last user text or last AI response)
3. Optional: Add polling for live updates

**UI-Designer Gate Conclusion**: No significant UI changes required. The existing components properly display all data that the API provides. The story's missing features are backend data limitations, not UI gaps.
