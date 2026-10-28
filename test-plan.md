# TaskMate Test Plan

## Test setup

- Use a dedicated test MongoDB database configured by `MONGODB_URI`; never point destructive test setup at a production database.
- Integration tests run the Express app with a real MongoDB connection, isolated collections, and HTTP requests that retain cookies. Do not stub authentication, models, database operations, or security middleware.
- Unit tests are appropriate for pure validators, serializers, and date/sort helpers. Use deterministic clock injection where overdue boundaries require it.
- Reset only test-owned records between test cases. Rate-limit tests use isolated limiter state or a dedicated app instance.

## Functional tests

1. Register valid user; verify normalized email, password hash storage, authenticated response, and public response fields only.
2. Register invalid values, mismatched confirmation, unknown key, and duplicate case-insensitive email.
3. Login success; wrong password and unknown email have equivalent status/error message.
4. Fetch current user; logout and verify protected route denial and cookie clearing.
5. Create task with defaults and full fields; read list/detail; edit partial fields; complete/reopen; delete.
6. Validate title length/blank, description limit, priority enum, strict due-date calendar format, invalid id, and unknown keys.
7. Seed owned tasks with varied titles/descriptions/status/priorities/due dates; verify search, composable filters, all sort fields/directions, null due-date ordering, and default ordering.
8. Verify pagination defaults, boundaries, metadata, and invalid page/limit handling.
9. Verify statistics for empty, pending, completed, due-today, overdue, and completed-overdue tasks.

## Integration and security tests

1. Requests without session receive 401 for protected endpoints.
2. Session cookie has HttpOnly/SameSite settings and Secure in production configuration; session id rotates after register/login.
3. Missing and incorrect CSRF tokens, and disallowed Origin, receive 403 for state-changing requests; valid token succeeds.
4. Logout removes server-side session document and prevents cookie replay.
5. Two-user isolation: attempt cross-user detail/update/delete; verify 404 and unchanged data. Verify list and stats remain owner-scoped.
6. Send forged owner/user id in task body/query; reject unknown field and never assign ownership from it.
7. Exceed login and registration thresholds; verify 429 and retry metadata.
8. Verify API never emits password hashes, session secrets, or stack traces in production error response.
9. Simulate database connection/query failure; verify stable 5xx envelope and no partial success.

## Client/manual checks

- Exercise signup/login/logout and task workflows in a browser against the configured API/database.
- At narrow phone and wide desktop viewports, check navigation, forms, task list, stats, and dialogs/actions for clipping or horizontal scrolling.
- Keyboard-only pass: tab order, visible focus, form labels/errors, task actions, and modal behavior if used.
- Verify loading, no-task, no-match, expired-session, validation-error, and server-error messages.

## Completion rule

Do not mark a criterion complete if its implementation or corresponding automated/manual verification is missing. Record any environment-dependent test that could not be run and why.
