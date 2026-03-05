# Environments (Mission Control 2.0)

## dev
- Host: Jason's Mac mini (OpenClaw host)
- Purpose: active implementation and rapid iteration
- Data: non-production data only

## qa
- Host: isolated pre-production runtime
- Purpose: full workflow validation by agents/reviewers
- Rules: required validation gate before prod promotion

## prod
- Host: production runtime
- Purpose: live usage
- Rules: operator-gated promotion only; rollback must be SHA-addressable
