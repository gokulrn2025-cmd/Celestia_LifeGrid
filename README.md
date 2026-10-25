# LifeGrid — Personal Organiser

LifeGrid is a React and Express personal organiser for tasks, notes, documents, bills, subscriptions, and an encrypted password vault. SQLite stores application data on the server. Each account can access only records created for that account.

## Run locally

Requirements: Node.js 24 and npm.

```powershell
npm install
npm --prefix client install
npm --prefix server install
Copy-Item .env.example .env
```

Generate a private vault encryption key and replace the placeholder in `.env`:

```powershell
$key = [Convert]::ToHexString([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
(Get-Content .env -Raw).Replace('replace-with-64-hex-characters', $key) | Set-Content .env
Remove-Variable key
```

Keep `.env` private. Do not put secrets in `VITE_` variables or commit `.env`.

Run the development app:

```powershell
npm run dev
```

Open <http://localhost:5173>. Vite forwards `/api` requests to Express at port 5000. Create an account with a valid email and a password of at least 12 characters.

For a production-style local run:

```powershell
npm run build
npm start
```

Then open <http://localhost:5000>.

## Authentication and data

- Login and signup use server-side password hashing (scrypt) and an HttpOnly session cookie.
- Sessions expire after seven days. Signing out invalidates the session.
- Every private API route requires a session, and record reads, edits, and deletes are scoped to the signed-in account.
- Password vault values are encrypted with AES-256-GCM at rest. Keep the same `VAULT_ENCRYPTION_KEY` backed up securely; without it, vault entries cannot be decrypted.
- Password reset and email verification are not configured because no email delivery provider is connected.
- The first account migration preserves existing SQLite rows as unowned archived data. New accounts start with an empty workspace and cannot see the archived rows. Before applying the migration, LifeGrid creates a backup under `server/data/backups/` and encrypts archived vault values.
- The SQLite file, backups, and `.env` are excluded from Git.

## Build and checks

```powershell
npm run lint
npm run build
```

`npm start` runs the Express server, which serves `client/dist` when the production build exists.

## Deployment notes

LifeGrid is currently a unified Express application. It needs a host that keeps the SQLite file on persistent storage across restarts and deployments. A static-only Vercel deployment cannot provide that storage. If deploying the frontend separately, set `VITE_API_URL` to the API origin and set `CLIENT_ORIGIN` on the API to the frontend origin. For a unified deployment, leave the frontend API URL at `/api`.

Set `PORT`, `VAULT_ENCRYPTION_KEY`, and (if needed) `LIFEGRID_DB_PATH` in the hosting service's private environment settings. Point `LIFEGRID_DB_PATH` to the persistent volume. The database and encryption key must both persist. Deployment has not yet been completed or tested against a public URL.
