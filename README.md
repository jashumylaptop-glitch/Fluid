# Fluid

Fluid is a full-stack school management project with a React frontend and an Express/MongoDB backend. It includes student and teacher flows for login, dashboard views, timetable, assignments, attendance, marks, resources, messages, and seeded demo data.

## Stack

- Frontend: React 19, Vite, React Router, Chart.js
- Backend: Express 5, Mongoose, JWT, bcrypt
- Database: MongoDB

## Project Structure

```text
.
|-- backend/
|-- frontend/
|-- .gitignore
`-- README.md
```

## Prerequisites

- Node.js 18+
- npm
- MongoDB running locally on `mongodb://127.0.0.1:27017/Fluid` or an equivalent connection string

## Backend Setup

From `backend/`:

```bash
npm install
```

Create a `.env` file from `backend/.env.example`:

```env
MONGO=mongodb://127.0.0.1:27017/Fluid
JWT_SECRET=dev-secret
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.0-flash
```

Start the backend:

```bash
node server.js
```

The API runs on `http://localhost:5000`.

## Seed Demo Data

From `backend/`:

```bash
node seed.js
```

Default seeded accounts:

- Student: `test.student@example.com` / `pass123`
- Teacher: `test.teacher@example.com` / `pass123`

## Frontend Setup

From `frontend/`:

```bash
npm install
npm run dev
```

The frontend runs on the local Vite dev server, typically `http://localhost:5173`.

## Available Frontend Commands

From `frontend/`:

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## Typical Local Workflow

1. Start MongoDB.
2. Run `node server.js` inside `backend/`.
3. Run `npm run dev` inside `frontend/`.
4. Optionally run `node seed.js` inside `backend/` to load demo data.

## Notes

- The chatbot can run without Gemini configured, but it falls back to basic replies.
- The backend currently starts with `node server.js`; there is no npm start script yet.
- Root `node_modules` are ignored from Git, along with frontend and backend dependency folders.
