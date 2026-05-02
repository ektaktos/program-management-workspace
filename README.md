# Program Management Workspace

A single-user program management web app built with Next.js 14, Zustand, and Tailwind CSS. All data is persisted in `localStorage` — no backend or database required.

## Getting started

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

## Stack

- **Next.js 14** (App Router)
- **Zustand** for global state + localStorage sync
- **Tailwind CSS** + CSS custom properties for theming
- **Google Fonts** — Instrument Serif + Outfit
- No icon libraries — all SVGs hand-crafted inline

## Features

- Dashboard with stat cards, active projects, upcoming deadlines, recent notes
- All Projects grid with progress bars and quick-edit
- All Tasks list with cross-project search
- Upcoming Deadlines view (tasks + milestones)
- Project Detail with Tasks / Phases / Milestones / Notes tabs
- Alert reminders with browser notifications
- Auto-overdue marking (checked every 60 seconds)
- Full CRUD for projects, tasks, phases, milestones, and notes
- Seed data pre-loaded on first run
