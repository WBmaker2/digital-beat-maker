# Demo Backend Status

## Summary
- Backend scope is planned but not implemented yet.
- The minimum API contract is locked for teacher assignment creation, assignment fetch, student submission, and parent status lookup.
- Implementation target is Next.js Route Handlers with Supabase-backed persistence and auth.

## Owned Paths
- `app/api/assignments/route.ts`
- `app/api/assignments/[assignmentId]/route.ts`
- `app/api/assignments/[assignmentId]/submissions/route.ts`
- `app/api/assignments/[assignmentId]/parent-status/route.ts`
- `lib/supabase/server.ts`
- `lib/api/errors.ts`
- `lib/validation/assignment.ts`
- `lib/validation/submission.ts`

## Data Assumptions
- `assignments` table stores `id`, `title`, `description`, `due_at`, `example_pattern`, `status`, `public_access_key`, `parent_lookup_key`, `created_by`, `created_at`, `updated_at`.
- `submissions` table stores `id`, `assignment_id`, `student_name`, `pattern`, `submitted_at`, `status`.
- Teacher ownership is checked through Supabase auth before write operations.
- Student and parent access is key-based and does not require a full login flow for MVP.

## Planned Implementation Order
1. Build shared error helpers and validation schemas.
2. Implement `POST /api/assignments` with teacher auth and key generation.
3. Implement `GET /api/assignments/[assignmentId]` with teacher or key-based public access.
4. Implement `POST /api/assignments/[assignmentId]/submissions` with duplicate-name conflict handling.
5. Implement `GET /api/assignments/[assignmentId]/parent-status` with `parentLookupKey` and `studentName`.
6. Add smoke checks for success, validation failure, auth failure, and not-found cases.

## Handoff Notes
- Keep error payloads stable across all routes.
- Return `400` for validation issues, not `500`.
- Prefer explicit `403` when keys or ownership do not match.
- Reject duplicate submissions for the same assignment and student name with `409 CONFLICT` for the MVP.
- Public read responses should omit secret keys.
- Teacher create responses should include both keys so the frontend can display them once.

## Open Decisions
- Whether student submissions should support resubmission is deferred.
- Whether assignment `published` state is separate from `draft` is deferred.
- Whether the teacher dashboard shows raw keys or only shareable links is a frontend decision.
- Whether a parent lookup should be rate-limited is deferred to release hardening.

## QA Handoff
- Verify teacher create returns both access keys.
- Verify student fetch works with `accessKey` and fails without it.
- Verify submission create rejects invalid `pattern` payloads.
- Verify duplicate student submissions return `409`.
- Verify parent status lookup succeeds only with the correct `parentLookupKey`.
- Verify not-found and forbidden cases do not leak internal data.

## Release Readiness
- No blockers from the contract side.
- Remaining work is route implementation, DB wiring, and smoke testing.
- If the Supabase schema is not present yet, that becomes the first implementation dependency.
