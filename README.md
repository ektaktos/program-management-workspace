# Program Management Workspace

A multi-user program management web app built with Next.js 14, Prisma (MySQL), Zustand, and Tailwind CSS. Each person signs in and sees only their own projects, tasks and planner.

## Getting started

```bash
npm install
cp .env.example .env.local   # fill in DATABASE_URL and NEXTAUTH_SECRET
npm run db:migrate:deploy
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) and create an account.

## Authentication

- Sign in with **email + password**, or with **Google** when `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` are set (redirect URI: `{NEXTAUTH_URL}/api/auth/callback/google`).
- Built on Auth.js (`next-auth` v4) with JWT sessions; users and linked accounts live in MySQL.
- Every API route requires a session and filters by the signed-in user. Projects and planner rows carry a `userId`; tasks, phases, milestones and notes are owned through their project.
- **Existing data:** rows created before auth was added have no owner. The first account created on the instance claims them. Later accounts start with an empty workspace.
- **Forgot password:** `/forgot-password` emails a one-time link (valid 60 minutes; only its SHA-256 hash is stored) to `/reset-password`. The response is the same whether or not the email has an account, and a new link can be requested once a minute per account.

## Email

Transactional email goes through [Zoho CPaaS](https://www.zoho.com/zeptomail/help/api/email-sending.html) (formerly ZeptoMail) — see `lib/email.ts`. Set `ZOHO_CPAAS_TOKEN` (the agent's Send Mail token) and `EMAIL_FROM_ADDRESS` (an address on a domain verified in Zoho CPaaS). Without them, development builds print each email, including the reset link, to the server log; production refuses to send.

## Stack

- **Next.js 14** (App Router)
- **Prisma** + MySQL for persistence
- **Auth.js** for authentication
- **Zustand** for client state
- **Tailwind CSS** + CSS custom properties for theming
- No icon libraries — all SVGs hand-crafted inline

## Features

- Dashboard with stat cards, active projects, upcoming deadlines, recent notes
- All Projects grid with progress bars and quick-edit
- All Tasks list with cross-project search
- Upcoming Deadlines view (tasks + milestones)
- Project Detail with Tasks / Phases / Milestones / Notes tabs
- Weekly Planner and Archive
- Alert reminders with browser notifications
- Auto-overdue marking (checked every 60 seconds)
- Installable PWA
