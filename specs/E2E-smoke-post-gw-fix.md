# SPEC.md - E2E Smoke Post-GW-Fix

## Story
- **ID**: a2e51c2a-5c14-4e74-aa2a-1806ef943583
- **Title**: E2E smoke post-gw-fix
- **Gate**: architect

## Overview
Run end-to-end smoke tests to verify gateway functionality after a fix has been deployed.

## Context
- This story validates that the gateway fix is working correctly
- "gw-fix" refers to a previously applied gateway patch/update
- Smoke tests verify critical paths work, not full regression

## Scope Definition

### What's Included
1. Run existing E2E test suite against the gateway endpoint
2. Verify basic connectivity and response from gateway
3. Confirm at least 1-2 critical smoke tests pass

### What's Excluded
- Full regression testing (out of scope for smoke)
- Performance/load testing
- Detailed test report generation (beyond pass/fail)

## Implementation Guidance

### For Implementer
1. Identify existing E2E test location in the codebase
2. Run the smoke test subset against the gateway
3. Report pass/fail status to the story

### Test Execution
```bash
# Example smoke test execution (adjust for actual test framework)
npm run test:e2e:smoke -- --gateway=<gw-endpoint>
```

### Success Criteria
- At least 1 smoke test passes confirming gateway is functional
- No critical failures blocking handoff

## Notes
- Story has minimal AC ("handoff") - treat as verification task
- Low priority story - focus on quick validation

## Gate Outcome
- **Decision**: APPROVED
- **Next Gate**: implementer
- **Blockers**: None identified
