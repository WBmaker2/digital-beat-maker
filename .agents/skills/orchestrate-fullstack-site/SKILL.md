---
name: orchestrate-fullstack-site
description: Lead-agent playbook for coordinating a fullstack website project from wireframes through React/Next.js frontend, backend/API, QA, and deployment.
---

# Orchestrate Fullstack Site

Use this skill when the lead agent needs to coordinate a website project across design, frontend, backend, QA, and release.

## Companion Files
- Use `LEAD_PROMPT_TEMPLATE.md` when you need a copyable leader kickoff prompt.
- Use `EXAMPLE_RUN.md` when you want a worked example of the harness in action.

## Trigger
- The user asks for end-to-end product delivery, not just a single isolated code patch.
- The work spans design decisions, implementation, testing, and deployment planning.
- Multiple workers can operate independently once contracts are written.

## Do Not Trigger
- A small single-file bug fix
- Purely visual polish with no backend or QA coordination
- Research-only tasks without implementation planning

## Inputs
- Product brief
- Routes or features in scope
- Technical stack and deployment target
- Time or quality constraints

## Outputs
- `update_plan` with phase status
- `_workspace/01_design_wireframes.md`
- `_workspace/01_design_handoff.md`
- `_workspace/01_api_contracts.md`
- `_workspace/02_frontend_status.md`
- `_workspace/02_backend_status.md`
- `_workspace/03_qa_findings.md`
- `_workspace/04_release_plan.md`
- `_workspace/04_release_notes.md`

## Workflow

### 1. Frame the job
- Write the goal, non-goals, and acceptance checks into `update_plan`.
- Create or refresh `_workspace/` artifact paths for the current run.
- Decide whether the backend is required or whether a static/mock path is enough.

### 2. Write contracts before fan-out
- Capture page map, user flow, and state coverage in `_workspace/01_design_wireframes.md`.
- Capture component/route handoff in `_workspace/01_design_handoff.md`.
- Capture API shapes, auth assumptions, and error states in `_workspace/01_api_contracts.md`.

### 3. Spawn workers
- Design tasks go to `product-design-architect`.
- Frontend tasks go to `nextjs-frontend-builder`.
- Backend tasks go to `api-backend-builder`.
- QA and release happen after implementation reaches a usable boundary.

### 4. Coordinate in flight
- Use `send_input` only to correct scope, add evidence, or refine acceptance criteria.
- Wait only when a downstream task is blocked on that output.
- Keep the current source of truth in `_workspace/`, not only in chat.

### 5. Gate quality
- Ask QA to compare UI behavior with API contracts.
- Ask release to convert QA status into a preview-to-production plan.
- Integrate findings before recommending deploy.

## Spawn Template

For each worker, provide:
- goal
- owned paths or responsibilities
- required inputs and files to read
- artifact path to write
- success criteria

## Review Checklist
- Frontend and backend do not disagree on payload shape
- Empty, loading, and error states are covered
- QA artifacts include commands and repro steps
- Release notes include preview check and rollback guidance
