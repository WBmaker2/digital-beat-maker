# Fullstack Harness Workspace

This directory stores structured handoff artifacts for the fullstack website harness.

## Naming Rule

- Format: `{phase}_{owner}_{artifact}.md`
- Prefer one artifact per concern so downstream workers can read only what they need.

## Recommended Pipeline

```text
_workspace/
├── 01_design_wireframes.md
├── 01_design_handoff.md
├── 01_api_contracts.md
├── 02_frontend_status.md
├── 02_backend_status.md
├── 03_qa_findings.md
├── 04_release_plan.md
└── 04_release_notes.md
```

## Artifact Expectations

- `01_design_wireframes.md`
  - page map
  - text wireframes
  - state coverage
- `01_design_handoff.md`
  - component list
  - interaction rules
  - responsive notes
- `01_api_contracts.md`
  - request/response shapes
  - error shapes
  - auth or data assumptions
- `02_frontend_status.md`
  - owned paths
  - completed UI slices
  - open frontend blockers
- `02_backend_status.md`
  - owned paths
  - implemented endpoints
  - open backend blockers
- `03_qa_findings.md`
  - commands
  - reproduction steps
  - findings by severity
- `04_release_plan.md`
  - preview checks
  - production steps
  - rollback notes
- `04_release_notes.md`
  - shipped scope
  - known risks
  - follow-up items

## Working Agreement

- The lead agent keeps global progress in `update_plan`.
- Workers write substantive handoffs here instead of burying them in chat.
- When a file is superseded, update it in place unless the lead explicitly wants a dated snapshot.
