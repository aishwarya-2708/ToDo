# TaskMate

TaskMate is a full-stack task manager built with React, Express, MongoDB, and server-side sessions. The five specification documents at the project root define its behavior and test coverage.

## Requirements

- Node.js 20 or newer and npm
- MongoDB 6+ (local installation or a MongoDB service URI)

## Install and configure

1. Copy `.env.example` to `.env` and set `MONGODB_URI` and a unique `SESSION_SECRET` (at least 32 characters). Keep `.env` private.
2. Install dependencies from the project root:

   ```sh
   npm install
   npm install --prefix server
   npm install --prefix client
   ```

3. Ensure MongoDB is running. The default development URI is `mongodb://127.0.0.1:27017/taskmate`.

## Run

Start the API and Vite development client together:

```sh
npm run dev
```

The client runs at <http://localhost:5173> and proxies `/api` calls to the API at <http://localhost:4000>. For production, build the client with `npm run build`, serve the generated `client/dist` from your web server, and reverse-proxy `/api` to the Express service under the same origin. Set `NODE_ENV=production`, `CLIENT_ORIGIN` to the exact browser origin, use HTTPS, and provide a strong secret.

## Publish a free demo

The repository includes a Render Blueprint for a single-origin demo deployment. The Express service serves the built React app and API together so session cookies work without cross-site cookie configuration. The blueprint uses Render's Free web service plan; it is suitable for a mentor demo, not a production service.

1. Push this project to a GitHub repository.
2. Create a free MongoDB Atlas cluster (M0), create a database user, and copy the Node.js connection string. In Atlas Network Access, allow the Render service to connect; for Render's changing outbound addresses, `0.0.0.0/0` is the simple demo setting, so protect it with a unique strong database password and a user scoped to the TaskMate database.
3. In Render, choose **New → Blueprint** and connect the repository. Render reads `render.yaml`; provide the Atlas URI when prompted for `MONGODB_URI`. The Blueprint generates `SESSION_SECRET` for you.
4. Wait for deployment, then open the service's `onrender.com` URL. The health check is `/api/health` and the React app is served from that same URL.

Render's free web service sleeps after 15 minutes without traffic and can take about a minute to wake. Free Atlas storage is limited to 512 MB and a cluster may pause after 30 days with no connections. Render also has monthly usage limits: if exceeded, services are suspended when no payment method is on file. Do not add a payment method if you need to ensure the demo cannot incur a Render overage charge. Check current limits in the provider dashboards before sharing the URL widely.

## Test

```sh
npm test
```

The integration suite uses `mongodb-memory-server` and a real ephemeral MongoDB process. Its first run may download a MongoDB binary. Tests never use mock task or authentication implementations. Manual responsive and keyboard checks are listed in `test-plan.md`.

## Configuration

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development`, `test`, or `production`; controls Secure cookies |
| `PORT` | API port (default 4000) |
| `CLIENT_ORIGIN` | Allowed browser Origin (default local Vite origin) |
| `MONGODB_URI` | MongoDB database and session-store connection |
| `SESSION_SECRET` | Secret used to sign opaque session cookies |
| `SESSION_NAME` | Session cookie name |
| `SESSION_DAYS` | Rolling session lifetime in days (default 7) |
| `VITE_API_URL` | Optional client API base path (defaults to `/api`) |

## Security notes

Passwords use bcrypt with cost 12; session records live in MongoDB and rotate at login/registration; cookies are HTTP-only, SameSite=Lax, and Secure in production. Mutations require a session-bound CSRF token and matching configured Origin. Login and registration have IP-based rate limits. Task queries always scope by the authenticated session owner.
