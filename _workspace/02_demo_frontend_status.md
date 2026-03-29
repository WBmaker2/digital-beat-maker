# 리듬 숙제장 - Frontend Implementation Status

## Summary
- Frontend scope is planned but not implemented yet.
- Target stack is Next.js App Router with shared UI components, route-level data fetching, and form-driven interactions.
- Design and API contract are locked enough for implementation to start.

## Owned Paths
- `app/page.tsx`
- `app/teacher/page.tsx`
- `app/teacher/assignments/new/page.tsx`
- `app/teacher/assignments/[assignmentId]/page.tsx`
- `app/student/[assignmentId]/page.tsx`
- `app/parent/status/page.tsx`
- `components/layout/*`
- `components/ui/*`
- `components/assignments/*`
- `components/rhythm/*`
- `lib/api/client.ts`
- `lib/api/types.ts`
- `lib/rhythm/pattern.ts`
- `lib/rhythm/preview.ts`
- `app/loading.tsx` and route-level `loading.tsx` / `error.tsx` files where needed

## Route Plan
- `/`
  - Landing page with role entry points for teacher, student, and parent.
- `/teacher`
  - Dashboard with assignment summary, list, and `새 과제 만들기` CTA.
- `/teacher/assignments/new`
  - Assignment creation form with draft/save and publish actions.
- `/teacher/assignments/[assignmentId]`
  - Teacher-facing assignment detail and status overview.
- `/student/[assignmentId]`
  - Student submission page with assignment detail, rhythm preview, and submit flow.
- `/parent/status`
  - Parent lookup page with student name input and submission status results.

## Shared Components
- `SiteHeader` for product title and role entry.
- `RoleCTA` for the landing page entry buttons.
- `StatsRow` for teacher dashboard summary counts.
- `AssignmentCard` for dashboard list rows.
- `AssignmentForm` for title, description, due date, grade, and example rhythm inputs.
- `RhythmPreview` for showing the example or submitted pattern.
- `StatusBadge` for draft, published, submitted, pending, and error states.
- `EmptyStateCard` for empty lists and missing lookup results.
- `FormField` and `FieldError` for consistent validation display.
- `LoadingSkeleton` variants for list, detail, and form pages.
- `ActionBar` for primary and secondary actions on form pages.

## Data-Fetching Assumptions
- Teacher dashboard and teacher assignment detail should fetch on the server when possible, then hydrate client interactions where needed.
- Student and parent pages should fetch by route param plus access key query/lookup key.
- API client should be thin and typed around the contract in `_workspace/01_demo_api_contracts.md`.
- Teacher requests rely on Supabase session cookies; frontend must preserve cookies on server fetches.
- Student fetch uses `?accessKey=...` and parent fetch uses `?parentLookupKey=...&studentName=...`.
- Form submissions should use client-side submit handlers with explicit pending, success, and error UI states.

## Loading States
- Landing page can render immediately with no data dependency.
- Teacher dashboard should show skeleton cards while the assignment list loads.
- Assignment creation should disable submit buttons and show a short progress message while publishing.
- Student and parent pages should show skeleton panels while route data loads.
- Loading UI should be route-specific, not a single global spinner.

## Empty States
- Landing page should not have a data empty state.
- Teacher dashboard empty state should prompt the user to create the first assignment.
- Student page empty state should show a friendly invalid-link or missing-assignment message.
- Parent status empty state should ask for a different student name or explain that no record was found.
- Search and list components should distinguish “no results” from “still loading”.

## Error States
- API validation errors should surface inline under the relevant fields.
- Auth failures should show a clear teacher-only or invalid-link message, not a generic crash.
- Network errors should offer retry actions on teacher, student, and parent pages.
- Duplicate submission should be rendered as a visible conflict message with recovery guidance.
- Teacher dashboard and detail pages should have route-level error boundaries for fetch failures.

## Implementation Notes
- Use server components for read-heavy pages where practical.
- Keep form controls and preview interactions in client components.
- Keep rhythm example rendering separate from submission state so previews can be reused on teacher and student pages.
- Keep shared design tokens and spacing consistent across all routes.
- Prefer short Korean copy and simple page hierarchy as defined in the design handoff.

## Open Blockers / Questions
- Whether the student submission page should embed a live rhythm editor in v1 or only show a preset/example preview.
- Whether parent lookup should require student name only or student name plus class code in v1.
- Whether teacher dashboard should expose raw access keys or only copyable share links.
- Whether teacher and parent entry points share a common auth surface or remain separate in the first release.
- Whether assignment detail for teachers needs a dedicated edit page in v1 or only read-only detail plus publish flow.
