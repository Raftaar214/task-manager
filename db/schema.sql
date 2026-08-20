-- Run this once in Supabase SQL editor (Project -> SQL Editor -> New query -> Run)
-- Minimal schema: one manager, employees, tasks. Deleting an employee auto-deletes their tasks.

create extension if not exists "pgcrypto";

create table if not exists managers (
  id uuid primary key default gen_random_uuid(),
  username text unique not null,
  password_hash text not null,
  name text not null,
  created_at timestamptz default now()
);

create table if not exists employees (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references managers(id) on delete cascade,
  name text not null,
  username text unique not null,
  password_hash text not null,
  created_at timestamptz default now()
);

create table if not exists tasks (
  id uuid primary key default gen_random_uuid(),
  manager_id uuid not null references managers(id) on delete cascade,
  employee_id uuid not null references employees(id) on delete cascade,
  title text not null,
  description text,
  -- pending: assigned, not opened yet
  -- open: employee opened it, working on it
  -- completed: employee marked done, waiting for manager review
  -- history: manager reviewed + approved
  status text not null default 'pending' check (status in ('pending','open','completed','history')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists idx_tasks_employee on tasks(employee_id);
create index if not exists idx_employees_manager on employees(manager_id);

-- Row Level Security stays off / default deny — the app never talks to Supabase
-- from the browser. Only the Node server (using the service-role key) touches
-- this database, so no client-side key or credential is ever exposed.
