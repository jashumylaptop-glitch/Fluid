# Fluid Frontend

This frontend is the React and Vite client for Fluid. It provides student and teacher interfaces for dashboard views, timetable, attendance, marks, assignments, resources, profile, messages, and chatbot interactions.

## Requirements

- Node.js 18+
- npm
- Backend API running locally on port 5000

## Install

From `frontend/`:

```bash
npm install
```

## Development

Start the Vite dev server:

```bash
npm run dev
```

The app is typically available at `http://localhost:5173`.

## Build

Create a production build:

```bash
npm run build
```

Preview the production build locally:

```bash
npm run preview
```

## Lint

Run ESLint:

```bash
npm run lint
```

## Notes

- This app is built with React 19 and Vite.
- Dashboard and flow components live under `src/components/`.
- Route-level pages live under `src/pages/`.
- Sample dashboard content used by the UI lives under `src/data/`.
