# SPEC.md - model-fix smoke

## Story ID
3638062a-c565-4320-8486-2007651336d2

## Overview
Fix model-related issues in the Mission Control dispatch and budget system, then verify with smoke tests.

## Problem Statement

The current dispatch system passes model information through the workflow, but there are potential issues with:
1. Model validation - no explicit validation of model parameter format
2. Error handling - model failures may not be properly recorded
3. Testing - lack of smoke tests for model-related dispatch scenarios

## Requirements

### 1. Model Validation (P0)
- Validate model parameter format before dispatch
- Ensure model is properly passed to OpenClaw trigger
- Add error handling for invalid model specifications

### 2. Error Handling Enhancement (P0)
- Improve error messages when model issues occur
- Ensure provider failure recording works with model parameter
- Add proper logging for model-related dispatch failures

### 3. Smoke Tests (P1)
- Add smoke tests for model dispatch scenarios:
  - Successful dispatch with valid model
  - Dispatch with invalid model (should fail gracefully)
  - Provider failure recording with model info
- Tests should cover the happy path and error paths

## Technical Implementation

### Files to Modify
- `src/services/dispatch-service.ts` - Add model validation
- `src/services/budget-service.ts` - Ensure model in failure recording
- New: `src/services/__tests__/model-smoke.test.ts` - Smoke tests

### Model Validation Logic
```typescript
function validateModel(provider: string, model?: string): { valid: boolean; error?: string } {
  if (!model) return { valid: true }; // model is optional
  
  // Basic format validation
  if (typeof model !== 'string') {
    return { valid: false, error: 'Model must be a string' };
  }
  
  if (model.length === 0 || model.length > 100) {
    return { valid: false, error: 'Model name length must be 1-100 characters' };
  }
  
  return { valid: true };
}
```

### Smoke Test Scenarios
1. **Valid model dispatch** - Dispatch with provider + model should succeed
2. **Invalid model rejection** - Invalid model should be rejected with clear error
3. **Model in provider failure** - Provider failures should record model info
4. **Missing model handling** - Dispatch without model should work normally

## Acceptance Criteria

- [ ] Model validation added to dispatch service
- [ ] Invalid models are rejected with clear error messages
- [ ] Provider failures correctly record model information
- [ ] Smoke tests pass for all scenarios
- [ ] No regressions in existing tests

## Test Plan

```bash
# Run existing tests
npm test

# Run new smoke tests specifically
npm test -- model-smoke
```

## Dependencies
- None (uses existing test infrastructure)
- Requires running database for full integration tests
