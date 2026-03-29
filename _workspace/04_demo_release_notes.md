# 리듬 숙제장 - Release Notes

## Scope
- Planning-only release note for the first version of the fullstack website.
- The release package covers landing, teacher dashboard, assignment creation, student submission, and parent status flows.

## Included
- Role-based entry from the landing page.
- Teacher-facing assignment creation and dashboard surfaces.
- Student submission flow with rhythm preview.
- Parent status lookup flow.
- Contracted API surface for assignments, submissions, and parent lookup.

## Not Included
- Production deployment.
- Editing or deleting assignments.
- Teacher grading and comments.
- File attachments or audio uploads.
- Parent multi-student lookup.
- Notification systems or analytics dashboards.

## Release Status
- Not ready for production.
- Preview only after implementation and QA gates are satisfied.

## Known Risks
- Frontend and backend are not yet implemented.
- Student submission interaction details still have an open decision.
- Parent lookup scope still needs a final v1 decision.
- Access-key disclosure strategy must be confirmed during implementation.

## Notes for Operators
- Do not promote to production until the QA gate is clean.
- Verify Supabase auth, access-key handling, and duplicate submission behavior before release.
- Keep rollback to the last known good preview or production deployment available.
