# Task Manager (Manager ↔ Employee)

Simple app: Shubham (manager) logs in, adds/removes employees, and assigns
tasks. Each employee logs in and sees **only their own** tasks, moving
through: **Pending → Open → Completed (awaiting review) → History**.

- Employee opens a pending task → it becomes **Open**.
- Employee marks it done → it becomes **Completed**, waiting on the manager.
- Manager reviews: **Approve** → **History**. **Send back** → returns to Open.
- Manager removes an employee → that employee's login and all their tasks
  are deleted from the database (foreign-key cascade), nothing orphaned.

## Why credentials aren't visible in "inspect element"

The frontend (`public/`) is plain HTML/CSS/JS with **no Supabase keys and no
passwords in it at all**. The browser only ever talks to your own small
Express server (`/api/...`). The server is the only thing that holds the
Supabase service key and the JWT secret (from `.env`, never sent to the
browser). Login sessions are stored in an `httpOnly` cookie, which JavaScript
in the page (and therefore "inspect") cannot read either.

## 1. Create the Supabase project

1. Go to supabase.com → New project.
2. Open the **SQL Editor** → paste the contents of `db/schema.sql` → Run.
   This creates 3 tables (`managers`, `employees`, `tasks`) and nothing else
   — kept intentionally minimal.
3. Go to **Project Settings → API** and copy:
   - **Project URL**
   - **service_role key** (not the `anon` key — the service key stays
     server-side only, so this is safe)

## 2. Local setup

```bash
cd task-manager-app
npm install
cp .env.example .env
# edit .env: paste SUPABASE_URL, SUPABASE_SERVICE_KEY, and a random JWT_SECRET
npm run seed     # creates Shubham + the 5 employee logins, prints passwords ONCE
npm start        # runs on http://localhost:3000
```

Save the printed usernames/passwords from `npm run seed` somewhere safe (a
password manager, not this repo) — they won't be shown again. Share each
person's login with them directly.

People to seed (already wired into `seed.js` — edit the list there if it
changes): Rahul, Rama Shankar, Nikhil, Naresh, Abhishek Khandal, managed by
Shubham.

## 3. Deploy on Render

1. Push this folder to a GitHub repo.
2. Render dashboard → **New → Web Service** → connect the repo.
3. Build command: `npm install` · Start command: `npm start`.
4. Under **Environment**, add the same three variables from your `.env`:
   `SUPABASE_URL`, `SUPABASE_SERVICE_KEY`, `JWT_SECRET` (plus `NODE_ENV=production`).
5. Deploy. Once live, run `npm run seed` **once** from your local machine
   (pointed at the same Supabase project) to create the accounts — you don't
   need to seed from Render itself.
6. Visit your Render URL, log in with the manager or employee credentials.

## Forgot a password?

- **An employee forgot theirs:** Shubham logs in → next to that employee's
  name → **Reset password** → type a new one → share it with them directly.
- **Shubham forgot his own:** run this locally, where your `.env` (with the
  Supabase service key) lives:

  Works for any username, manager or employee — useful as a backup even for
  employees if you'd rather not do it through the browser.

## Storage footprint

Only 3 tables, no duplicate/merged data, and deleting an employee cascades
to delete their tasks automatically — nothing accumulates beyond what's
actively in use.

## Project structure

```
task-manager-app/
  server.js              Express app entry point
  seed.js                One-time script: creates manager + 5 employees
  db/
    schema.sql            Run once in Supabase SQL editor
    supabase.js            Server-side Supabase client (service key)
  middleware/
    auth.js                 Verifies the session cookie
  routes/
    auth.js                 Login / logout / who-am-i
    manager.js               Add/remove employees, assign tasks, review
    employee.js               View own tasks, open, complete
  public/                  Static frontend (no secrets)
    index.html               Login
    manager.html              Manager dashboard
    employee.html             Employee dashboard
    css/style.css
    js/login.js, manager.js, employee.js
```
