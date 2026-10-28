# TaskMate Acceptance Criteria

Each criterion is verifiable through automated API/UI tests or a documented manual browser check.

## Registration and sessions

- **AC-1.1:** Registering valid name/email/password/confirmation creates one user, returns a public user and authenticated session, and never returns a hash.
- **AC-1.2:** Invalid email/name/password, confirmation mismatch, unknown fields, and duplicate normalized email are rejected with the specified status and useful field errors where applicable.
- **AC-1.3:** Login with correct credentials authenticates; incorrect email and incorrect password return the same generic `401` envelope.
- **AC-1.4:** Login/register session id changes; session cookie is HTTP-only, SameSite=Lax, and Secure in production.
- **AC-1.5:** Missing/wrong CSRF token and disallowed Origin cannot mutate data; a valid session token permits mutation.
- **AC-1.6:** Login and registration limits return `429` at configured thresholds.
- **AC-1.7:** Logout destroys the backing session, clears cookie, and makes subsequent protected calls return `401`.
- **AC-1.8:** `/api/auth/me`, dashboard, and task routes reject unauthenticated callers; authenticated caller receives their public identity.

## Task operations

- **AC-2.1:** Create accepts valid task fields and applies documented defaults; invalid/unknown fields are rejected.
- **AC-2.2:** List and detail return only the caller's tasks and the documented public task shape.
- **AC-2.3:** Partial edits preserve omitted fields; completion sets a timestamp; reopening clears it.
- **AC-2.4:** Delete removes an owned task and returns the documented confirmation.
- **AC-2.5:** A second user cannot read, update, or delete another user's task; these cases return the same `404` as missing tasks.
- **AC-2.6:** Search is case-insensitive across title and description; status and priority filters combine correctly.
- **AC-2.7:** All supported sort fields and directions work; priority ordering is high/medium/low; null due dates remain last; defaults are newest first.
- **AC-2.7a:** Pagination defaults to page 1/20 items, enforces limit 100, and reports matching count/page/pageCount; invalid values are rejected.
- **AC-2.8:** Dashboard counts include all owned tasks regardless of list filters; overdue excludes completed tasks and tasks due today.

## Client and quality

- **AC-3.1:** Registration, login, dashboard, task create/edit/complete/delete, search/filter/sort, and logout work against the real API and MongoDB.
- **AC-3.2:** Dashboard shows loading, empty, filtered-empty, validation, expired-session, and server-error states.
- **AC-3.3:** Responsive layout remains usable at mobile and desktop widths; forms and actions work by keyboard and have accessible labels.
- **AC-3.4:** Production setup can be completed using README and `.env.example`, without source-code secrets.
- **AC-3.5:** Automated tests exercise every acceptance criterion that can be verified without manual visual inspection; manual checks are listed for responsive/accessibility review.
