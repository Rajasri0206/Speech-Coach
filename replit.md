# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)
- **AI**: OpenAI (Whisper for STT, GPT-4o-mini for feedback)
- **Audio processing**: multer for uploads

## Project: AI-Based Daily Speaking Coach

### Features
- Upload audio files for speech analysis
- Speech-to-text via OpenAI Whisper
- Fluency scoring (words per minute → 0–100)
- Pause/filler word detection
- Vocabulary richness analysis
- AI-generated coaching feedback via GPT-4o-mini
- Progress tracking with charts over time
- Session history with transcripts and scores

### API Endpoints
- `POST /api/sessions/upload` — upload audio file
- `POST /api/sessions/:sessionId/analyze` — transcribe + score + generate feedback
- `GET /api/sessions?userId=X` — list sessions
- `GET /api/sessions/:id` — session detail with scores
- `GET /api/feedback/:sessionId` — feedback detail
- `GET /api/progress/:userId` — progress over time
- `GET /api/progress/:userId/summary` — summary stats

### Architecture
- `artifacts/api-server/src/routes/sessions.ts` — upload + analyze + list routes
- `artifacts/api-server/src/routes/feedback.ts` — feedback detail route
- `artifacts/api-server/src/routes/progress.ts` — progress + summary routes
- `artifacts/api-server/src/lib/audioAnalysis.ts` — scoring logic + OpenAI integration
- `lib/db/src/schema/sessions.ts` — sessions table schema
- `lib/db/src/schema/feedback.ts` — feedback table schema
- `artifacts/speaking-coach/` — React frontend (Vite + Tailwind)

### Frontend Pages
- `/` — Dashboard with streak, avg score, improvement, recent sessions
- `/record` — MediaRecorder with waveform visualization + upload
- `/sessions` — Paginated session history
- `/sessions/:id` — Transcript, circular score gauges, AI feedback
- `/progress` — Recharts line charts of scores over time

### Environment Variables
- `OPENAI_API_KEY` — optional; without it, uses demo transcript + basic feedback
- `DATABASE_URL` — auto-provisioned PostgreSQL

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.
