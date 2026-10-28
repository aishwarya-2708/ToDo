# TaskMate Requirements

## Purpose and scope

TaskMate is a single-user-account-per-session task manager. The application consists of a React client, an Express REST API, and MongoDB persistence. The browser communicates with the API using same-origin JSON requests and a server-managed session cookie.

## Functional requirements

### Account and session

- **FR-1 Registration:** A visitor can register with name, email, password, and password confirmation. Name is trimmed (2–80 characters); email is trimmed, normalized to lowercase, and validated; passwords are 10–128 characters and must match. Email is unique.
- **FR-2 Login:** A visitor can log in with email and password. Invalid credentials produce one generic error and do not reveal whether an account exists.
- **FR-3 Password security:** Passwords are hashed with bcrypt (cost factor 12 or a documented compatible setting). Plaintext passwords and hashes are never returned or logged.
- **FR-4 Session security:** Successful registration/login establishes a server-side session. The browser receives only an opaque, HTTP-only cookie. Sessions use MongoDB storage, regenerate on authentication, and have a rolling 7-day inactivity lifetime (cookie expiry and store TTL are refreshed on authenticated activity). Logout destroys the session. Production cookies are Secure and SameSite=Lax; local HTTP development may disable Secure.
- **FR-5 CSRF:** State-changing requests require a session-bound CSRF token in `X-CSRF-Token`. The token is obtained from an authenticated/anonymous CSRF endpoint and rotated when the session changes. Requests with invalid/missing tokens or disallowed origins are rejected. Safe methods are GET and HEAD.
- **FR-6 Rate limiting:** Login attempts are rate-limited by client IP (maximum 10 per 15 minutes); registration is rate-limited (maximum 5 per hour). Responses include standard rate-limit status and retry guidance.
- **FR-7 Logout:** An authenticated user can log out; the server invalidates the session and clears the cookie. Subsequent protected requests are unauthorized.
- **FR-8 Protected dashboard:** Dashboard and task data are only available to authenticated users. The client redirects unauthenticated users to login and provides loading/error states while checking session state.

### Tasks

- **FR-9 Create:** Create a task with required title (1–160 characters), optional description (up to 2,000 characters), priority (`low`, `medium`, `high`, default `medium`), and optional due date.
- **FR-10 View:** List only the authenticated user's tasks. A task includes its id, title, description, priority, due date, completion state/timestamp, and created/updated timestamps.
- **FR-11 Edit:** Update any editable task fields. Partial updates are supported; omitted fields remain unchanged. Completing/reopening uses the same validated update semantics and records/clears `completedAt`.
- **FR-12 Complete:** Users can mark a task complete or pending. A completed task has `completedAt`; a pending task has null `completedAt`.
- **FR-13 Delete:** A user can delete only their own task. A task id belonging to another user is indistinguishable from a nonexistent task.
- **FR-14 Search/filter/sort:** List supports case-insensitive title/description search, status (`all`, `pending`, `completed`), priority, and sort by `createdAt`, `dueDate`, `priority`, or `title`, with `asc`/`desc` direction. Priority order is `high`, `medium`, `low` for descending and the reverse for ascending. Defaults: all statuses/priorities, newest created first. Null due dates sort last in either direction.
- **FR-14a Pagination:** Task lists are paginated with 20 items by default, maximum 100 per page. Invalid page/limit values are rejected. Response metadata includes total matching count, page, limit, and page count.
- **FR-15 Statistics:** Dashboard totals are computed for the authenticated user's entire task collection, not just the current list filters. `total` is all tasks; `completed` is completed tasks; `pending = total - completed`; `overdue` is pending tasks whose due-date calendar day is earlier than the current UTC calendar day. Due dates are date-only values.
- **FR-16 Empty and error states:** The interface handles no tasks, no search matches, validation failures, expired sessions, and API/network errors without losing already saved data.

## Non-functional requirements

- **NFR-1 Architecture:** Keep client and server in separate folders. Server code separates routes, controllers, models, and middleware.
- **NFR-2 Validation:** Validate and normalize all untrusted API inputs on the server; reject unknown fields and malformed identifiers/query values.
- **NFR-3 Ownership:** Derive owner exclusively from the authenticated server session. Every task read, update, and delete query is scoped by both task id and session user id.
- **NFR-4 Data minimization:** API responses use explicit public projections and never include password hashes, session identifiers, or internal secrets.
- **NFR-5 Configuration:** Secrets and environment-specific connection settings are environment variables. Provide `.env.example` with placeholders only.
- **NFR-6 Reliability:** Handle MongoDB unavailability and unexpected errors with stable JSON error envelopes; do not leak stack traces in production.
- **NFR-7 Accessibility/responsiveness:** Forms have labels and keyboard-operable controls; layout works at mobile and desktop widths; status is not conveyed by color alone.
- **NFR-8 Maintainability:** Use readable, modular code and document local setup, configuration, tests, and execution.
- **NFR-9 Testing:** Automated tests cover documented acceptance criteria, including authentication, CRUD, filtering, validation, session/CSRF behavior, rate limiting, and cross-user isolation.

## Scope decisions

- One task title is required; descriptions and due dates are optional.
- Due dates are stored and displayed as `YYYY-MM-DD` calendar dates and overdue comparison uses UTC calendar day to avoid client timezone shifts.
- Task due dates must be real Gregorian calendar dates, not merely strings matching the date pattern.
- The API is same-origin by default; production deployment should serve client and API under one origin. CORS is not enabled by default.
- No password-reset, email-verification, multi-factor authentication, or account deletion flow is included in this initial scope.
