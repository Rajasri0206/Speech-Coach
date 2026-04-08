# AI Daily Speaking Coach

An AI-powered full-stack application that helps users improve their speaking skills through **daily guided practice, real-time speech analysis, and personalized AI feedback**.

---

## Features

### User Management

* Secure authentication (JWT-based)
* Role-based profiles:

  * Student
  * Professional
* Purpose-driven onboarding (interviews, public speaking, etc.)

---

### Personalized Learning

* Adaptive practice sessions based on user performance
* Custom goals and progress tracking
* AI-driven recommendations

---

### AI Voice Feedback System

* Speech-to-text transcription using **Whisper**
* AI feedback using **GPT-4o-mini**
* Analysis includes:

  * Fluency (WPM)
  * Pause & filler detection
  * Vocabulary richness
  * Confidence scoring
* Voice-based feedback (Google Assistant–like experience)

---

### Dashboard & Analytics

* Visual progress tracking using charts
* Performance trends over time
* Speaking metrics breakdown

---

### Gamification

* Streak tracking
* Rewards & badges
* Batch/group participation (future scope)

---

### Notifications

* Daily reminders
* Practice alerts
* Progress updates

---

### Daily Practice Engine

* Daily topic generation
* Timer-based speaking sessions
* Structured prompts for better articulation

---

## Tech Stack

###  Frontend

*  React + Vite
*  TypeScript
*  Tailwind CSS
*  Recharts (data visualization)
*  Wouter (lightweight routing)
*  TanStack React Query (server state management)
*  Framer Motion (animations)
*  Radix UI (accessible components)

---

###  Backend

*  Node.js + Express 5
*  TypeScript
*  Multer (audio uploads)
*  OpenAI SDK:

  * Whisper (speech-to-text)
  * GPT-4o-mini (AI feedback)
*  Pino (structured logging)

---

###  Database

*  PostgreSQL
*  Drizzle ORM
*  drizzle-zod (schema validation)

---

###  API Layer (Contract-First)

*  OpenAPI 3.1 specification
*  Orval (auto-generates React Query hooks + Zod schemas)
*  Zod (runtime validation)

---

###  Monorepo & Tooling

*  pnpm workspaces
*  esbuild (fast backend bundling)
*  TypeScript project references

---

###  Audio Processing Pipeline

*  Browser MediaRecorder API (audio capture)
*  Multer (upload handling)
*  Whisper API (transcription)
*  Custom scoring algorithms:

  * Words per minute (WPM)
  * Pause detection
  * Filler words analysis
  * Vocabulary richness

---

##  System Architecture

```id="xoy8ph"
User speaks → MediaRecorder captures audio →
Upload via API → Multer processes file →
Whisper → transcription →
GPT-4o-mini → feedback →
Custom scoring → metrics →
Stored in PostgreSQL →
Dashboard updates via React Query
```

---

##  Project Structure (Monorepo)

```id="rcsywa"
apps/
  frontend/   # React + Vite app
  backend/    # Express server

packages/
  api/        # OpenAPI spec + Orval generated hooks
  db/         # Drizzle schema + database logic
```

---

##  Installation

```bash
# Clone repository
git clone https://github.com/Rajasri0206/Speech-Coach.git

cd Speech-Coach

# Install dependencies
pnpm install

# Run backend
pnpm --filter backend dev

# Run frontend
pnpm --filter frontend dev
```

---



##  Future Enhancements

* Real-time pronunciation correction
* Emotion & tone detection
* AI conversation partner
* Interview simulation mode
* Multi-language feedback engine

---



##  Contributing

Contributions are welcome!
Fork the repo and create a pull request.

---

##  License

MIT License

---



