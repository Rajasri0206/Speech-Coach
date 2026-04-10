# File-Sync Editor Backend Architecture Guide

## 📋 Overview

This is a **Speaking Coach Application** backend built with Node.js/Express that handles speech analysis, user authentication, gamification, and progress tracking. Users upload audio files for their speaking practice, and the system analyzes them using AI and provides feedback.

---

## 🏗️ System Architecture

### Tech Stack
- **Framework**: Express.js (Node.js)
- **Database**: PostgreSQL with Drizzle ORM
- **Authentication**: JWT (JSON Web Tokens)
- **Password Security**: bcryptjs for hashing
- **AI Services**: OpenAI (Whisper for transcription, GPT-4 for feedback)
- **File Upload**: Multer
- **Logging**: Pino

### Project Structure
```
api-server/
├── src/
│   ├── index.ts           # Server entry point
│   ├── app.ts             # Express app configuration
│   ├── lib/               # Utility libraries
│   │   ├── audioAnalysis.ts    # Audio processing & speech analysis
│   │   ├── gamification.ts     # XP, levels, badges system
│   │   └── logger.ts           # Logging setup
│   └── routes/            # API endpoints
│       ├── auth.ts        # Registration & Login
│       ├── sessions.ts    # Audio upload & analysis
│       ├── feedback.ts    # User feedback management
│       ├── progress.ts    # Progress tracking
│       ├── gamification.ts # User stats & leaderboard
│       ├── topics.ts      # Daily speaking topics
│       ├── tts.ts         # Text-to-speech
│       └── health.ts      # Health check
```

---

## 🗄️ Database Schema

### Tables Overview

#### 1. **users** Table
Stores user account information
```
- id: UUID (Primary Key)
- email: Text (Unique)
- username: Text (Unique)
- passwordHash: Text (bcrypt hashed)
- role: Text (Default: "student") - user type (student/teacher)
- purpose: Text (Default: "general") - learning purpose
- createdAt: Timestamp
```

#### 2. **user_stats** Table
Tracks user progression and gamification metrics
```
- userId: UUID (Foreign Key → users.id)
- xp: Integer (Experience points, Default: 0)
- level: Integer (1-10, Default: 1)
- currentStreak: Integer (Consecutive days of practice, Default: 0)
- longestStreak: Integer (Best streak ever, Default: 0)
- lastActiveDate: Text (YYYY-MM-DD format for streak tracking)
- updatedAt: Timestamp
```

#### 3. **sessions** Table
Main table storing all speaking practice sessions
```
- id: Serial (Primary Key)
- userId: UUID (Foreign Key)
- audioPath: Text (File path to uploaded audio)
- status: Text (uploaded → analyzing → analyzed)
- transcript: Text (Speech-to-text output)
- fluencyScore: Real (0-100) - pacing/WPM metric
- pauseScore: Real (0-100) - filler word control
- vocabularyScore: Real (0-100) - word variety metric
- confidenceScore: Real (0-100) - derived from pacing & vocab
- overallScore: Real (0-100) - average of all metrics
- wordsPerMinute: Real - speaking pace
- uniqueWordRatio: Real (0-1) - vocabulary diversity
- fillerWordCount: Integer - detected filler words
- totalWords: Integer - word count
- durationSeconds: Real - session length
- xpEarned: Integer - XP awarded for this session
- topicUsed: Text - the topic they spoke about (optional)
- createdAt: Timestamp
- analyzedAt: Timestamp
```

#### 4. **feedback** Table
Detailed feedback for each session (related to sessions table)
```
- id: Serial (Primary Key)
- sessionId: Integer (Foreign Key → sessions.id)
- feedback: Text (Overall assessment from AI)
- strengths: Text[] (Array of strength points)
- improvements: Text[] (Array of improvement suggestions)
- fillerWords: Text[] (List of detected filler words)
- audioFeedbackBase64: Text (Optional voice feedback)
- createdAt: Timestamp
```

#### 5. **badges** Table
Predefined achievement badges
```
- id: Text (Primary Key - e.g., "first_session")
- name: Text (Display name)
- description: Text (What user needs to do)
- icon: Text (Icon identifier)
- condition: Text (Trigger condition code)
```

#### 6. **user_badges** Table
Junction table tracking which badges each user has earned
```
- id: Serial (Primary Key)
- userId: UUID (Foreign Key → users.id)
- badgeId: Text (Foreign Key → badges.id)
- earnedAt: Timestamp
```

### Database Indexes
- `users_email_idx` on email (for quick login lookup)
- `users_username_idx` on username (for uniqueness checks)
- `sessions_user_id_idx` (for fetching user's sessions)
- `sessions_status_idx` (for finding sessions in specific status)
- `sessions_created_at_idx` (for time-range queries)
- `user_badges_user_id_idx` (for fetching user's badges)
- `feedback_session_id_idx` (for quick feedback lookup)

---

## 🔄 API Workflow & Flow

### 1. User Registration Flow
```
POST /api/auth/register
  ↓
Validate email, username, password format
  ↓
Check for duplicate email/username
  ↓
Hash password with bcryptjs (salt rounds: 10)
  ↓
Insert into users table
  ↓
Create user_stats record with initial values (level 1, xp 0)
  ↓
Seed badges (insert predefined badges if not exists)
  ↓
Generate JWT token (expires in 30 days)
  ↓
Return: token, userId, username, email, role, purpose
```

### 2. User Login Flow
```
POST /api/auth/login
  ↓
Find user by email
  ↓
Compare password with stored hash
  ↓
Generate JWT token
  ↓
Return: token, user details
```

### 3. Audio Upload Flow
```
POST /api/sessions/upload (multipart form-data)
  ↓
Validate audio file (mp3, wav, ogg, m4a, webm, flac)
  ↓
Save to /uploads directory with unique filename
  ↓
Create session record in database
  ├─ status: "uploaded"
  ├─ audioPath: /uploads/[unique-timestamp].mp3
  ├─ userId: provided user ID
  └─ durationSeconds: client-provided duration
  ↓
Return: sessionId, audioPath, status, createdAt
```

### 4. Audio Analysis Flow (Core Feature)
```
POST /api/sessions/:sessionId/analyze
  ↓
Fetch session from database
  ↓
Update session status to "analyzing"
  ↓
AUDIO TRANSCRIPTION (if OpenAI key exists):
  ├─ Use OpenAI Whisper API
  ├─ Get full transcript
  └─ If no API key: use demo transcript
  ↓
BUILD SPEECH METRICS:
  ├─ Calculate WPM (words/duration * 60)
  ├─ Count unique words → vocabulary ratio
  ├─ Detect filler words (um, uh, like, etc.)
  ├─ Score each metric (0-100):
  │  ├─ fluencyScore: based on WPM (optimal: 120-160)
  │  ├─ pauseScore: inverse of filler words
  │  ├─ vocabularyScore: unique word ratio * 200
  │  └─ confidenceScore: weighted combo of pacing + vocab + fillers
  ├─ overallScore: average of all 4 metrics
  ↓
GENERATE AI FEEDBACK:
  ├─ If OpenAI available:
  │  ├─ Send transcript + metrics to GPT-4o-mini
  │  └─ Get JSON: {feedback, strengths[], improvements[]}
  └─ Fallback: rule-based feedback generation
  ↓
UPDATE SESSION with all metrics
  ├─ transcript
  ├─ all scores
  ├─ totalWords, wordsPerMinute, etc.
  └─ status: "analyzed"
  ↓
AWARD XP & CHECK BADGES:
  ├─ Calculate XP earned: 50 base + (overallScore * 0.5) + streak bonus
  ├─ Update user_stats:
  │  ├─ Add XP
  │  ├─ Update level based on total XP
  │  ├─ Update streak (reset if gap > 1 day)
  │  └─ Update lastActiveDate
  ├─ Check badge conditions:
  │  ├─ session milestones (1, 5, 10, 50 sessions)
  │  ├─ streak milestones (3, 7, 30 days)
  │  ├─ score achievements (fluency 90+, vocab 85+, etc.)
  │  └─ level milestones (reach level 5, 10)
  └─ Award new badges to user
  ↓
INSERT/UPDATE FEEDBACK:
  ├─ Create or update feedback record
  └─ Store strengths, improvements, filler words
  ↓
Return: scores, feedback, newBadges, xpEarned
```

### 5. Get Session Details Flow
```
GET /api/sessions/:sessionId
  ↓
Fetch session by ID
  ↓
Fetch feedback for that session
  ↓
Return: session data + feedback + scores (if analyzed)
```

### 6. List User Sessions Flow
```
GET /api/sessions?userId=X&limit=10&offset=0
  ↓
Count total sessions for user
  ↓
Fetch sessions ordered by newest first
  ↓
Apply pagination (limit, offset)
  ↓
Return: sessions array + total count
```

### 7. Progress Tracking Flow
```
GET /api/progress/:userId?days=30
  ↓
Fetch all analyzed sessions in last N days
  ↓
Format data points: {date, scores, WPM, etc.}
  ↓
Return: timeline data for charts

GET /api/progress/:userId/summary
  ↓
Calculate aggregate statistics:
  ├─ Average scores over all time
  ├─ Best session overall
  ├─ Latest session
  ├─ Current streak
  ├─ Improvement %= (last 3 avg - first 3 avg) / first 3 avg
  ↓
Return: user summary data
```

---

## 🎮 Gamification System

### XP Calculation
```
XP Earned = Base XP + Performance XP + Streak Bonus
  where:
  - Base XP = 50 (fixed for completing a session)
  - Performance XP = overallScore * 0.5 (0-50 points)
  - Streak Bonus = min(currentStreak * 5, 30) (0-30 points)
  
  Total Range: 50-110 XP per session
```

### Level System
10 levels with progressive XP requirements:
```
Level 1: Novice      (0 XP)
Level 2: Beginner    (100 XP)
Level 3: Developing  (300 XP)
Level 4: Intermediate (600 XP)
Level 5: Proficient  (1000 XP)
Level 6: Advanced    (1500 XP)
Level 7: Expert      (2200 XP)
Level 8: Master      (3000 XP)
Level 9: Champion    (4000 XP)
Level 10: Legend     (5200 XP)
```

### Badge System
14 predefined badges organized by category:

**Session Milestones:**
- First Words (1 session)
- Getting Warmed Up (5 sessions)
- Dedicated Speaker (10 sessions)
- Marathon Speaker (50 sessions)

**Streak Achievements:**
- 3-Day Habit (3 day streak)
- Week Warrior (7 day streak)
- Monthly Champion (30 day streak)

**Score Achievements:**
- Fluency Master (fluency 90+)
- Vocabulary Pro (vocab 85+)
- Confidence King (confidence 85+)
- High Achiever (overall 85+)
- Perfectionist (overall 95+)

**Level Milestones:**
- Halfway There (reach level 5)
- Legend (reach level 10)

### Streak Logic
- Increments when practicing on consecutive days
- Resets if gap > 1 day
- Tracked via `lastActiveDate` in user_stats
- Uses date string (YYYY-MM-DD) for day-level tracking

---

## 📊 Speech Analysis Metrics

### Scoring System (0-100)

#### Fluency Score
Based on Words Per Minute (WPM):
```
WPM 120-160: 100/100 (optimal)
WPM 90-120:  70-100 (accelerating scale)
WPM 160-200: 70-100 (decelerating scale)
WPM < 90:    0-70 (too slow)
WPM > 200:   0-50 (too fast)
```

#### Pause Score (Filler Word Control)
Based on filler word ratio (count / totalWords):
```
≤1%:    100/100 (excellent)
≤3%:    85/100  (good)
≤5%:    70/100  (acceptable)
≤8%:    55/100  (needs work)
≤12%:   35/100  (poor)
>12%:   15/100  (very poor)

Common filler words tracked:
um, uh, like, you know, basically, literally, actually, 
so, right, okay, well, kind of, sort of, i mean, etc.
```

#### Vocabulary Score
Based on unique word ratio:
```
score = min(100, uniqueWordRatio * 200)
Range: 0-100
Example: 25% unique words = 50/100
```

#### Confidence Score
Weighted combination (heuristic):
```
score = (
  pacingFactor * 0.4 +       // WPM in ideal range?
  vocabularyFactor * 0.3 +   // Vocabulary diversity?
  fillerPenalty * 0.3        // Few filler words?
) * 100

Factors normalized to 0-1 scale
```

#### Overall Score
```
overall = average(fluency, pause, vocabulary, confidence)
```

### Additional Metrics
- **Words Per Minute**: (totalWords / durationSeconds) * 60
- **Unique Word Ratio**: uniqueWords.size / totalWords
- **Filler Word Count**: total count of detected fillers
- **Total Words**: word count in transcript

---

## 🔐 Authentication & Security

### JWT Token
```
{
  payload: {
    userId: UUID,
    username: string
  },
  secret: process.env.SESSION_SECRET || "echocoach-dev-secret-change-in-prod",
  expiresIn: "30 days"
}
```

### Password Security
- Hashing: bcryptjs with 10 salt rounds
- Requirements: Minimum 8 characters
- Validation: Checked on registration, never sent back

### Request Validation
- Email format validation (must contain @)
- Username minimum 2 characters
- File size limit: 50 MB for audio
- Allowed audio formats: mp3, wav, ogg, m4a, webm, flac, mp4

---

## 📁 File Storage

### Upload Configuration
```
Directory: /uploads (relative to current working directory)
Naming: {timestamp}-{random}.{extension}
Example: 1712000000000-a7k3j2m1.mp3

File Size Limit: 50 MB
Allowed Types:
  - audio/mpeg, audio/wav, audio/ogg, audio/mp4
  - audio/webm, audio/flac, audio/m4a
  - video/webm (some formats detected as video)
  - application/octet-stream
```

Files are stored as paths in the database and referenced by sessions.

---

## 🤖 AI Integration

### OpenAI Whisper (Speech-to-Text)
```
Model: whisper-1
Input: Audio file from /uploads
Output: Full transcript text
Response Format: verbose_json with segment timestamps
Fallback: Demo transcript if API key missing
```

### OpenAI GPT-4 (Feedback Generation)
```
Model: gpt-4o-mini
Input: Transcript + metrics
Output: JSON {feedback, strengths[], improvements[]}
Max Tokens: 600

Fallback: Rule-based feedback if:
- API key missing
- API call fails
```

---

## 📡 API Endpoints Summary

### Authentication
- `POST /api/auth/register` - Register new user
- `POST /api/auth/login` - Login & get JWT

### Sessions
- `POST /api/sessions/upload` - Upload audio file
- `POST /api/sessions/:sessionId/analyze` - Analyze audio
- `GET /api/sessions` - List user's sessions
- `GET /api/sessions/:sessionId` - Get session details

### Progress
- `GET /api/progress/:userId` - Get timeline data
- `GET /api/progress/:userId/summary` - Get aggregate stats

### Gamification
- `GET /api/gamification/stats/:userId` - Get user stats
- `GET /api/gamification/leaderboard` - Global leaderboard

### Other
- `GET /api/health` - Health check
- `GET /api/topics` - Get daily topics
- `POST /api/tts` - Text-to-speech
- `POST /api/feedback` - Submit user feedback

---

## 🔄 Data Flow Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     CLIENT (Website/App)                    │
└────────┬────────────────────────────────────────────┬───────┘
         │                                            │
         │ 1. REGISTER/LOGIN                          │ 4. GET JWT
         │                                            │
         ▼                                            ▼
    ┌─────────────────────────────────────────────────────────┐
    │              EXPRESS API SERVER                         │
    │  ┌──────────────────────────────────────────────────┐  │
    │  │  Routes: auth, sessions, progress, etc.        │  │
    │  │  Middleware: JWT, CORS, Logging               │  │
    │  └──────────────────────────────────────────────────┘  │
    └────┬──────────┬──────────┬──────────┬──────────┬────────┘
         │          │          │          │          │
         │ 2.       │ 3. UPLOAD│ 4.       │ 5.       │ 6. TRACK
         │ STORE    │ AUDIO    │ ANALYZE  │ AWARD    │ PROGRESS
         │ USER     │          │ AUDIO    │ XP/BADGE │
         │          │          │          │          │
         ▼          ▼          ▼          ▼          ▼
    ┌────────────────────────────────────┐
    │        POSTGRESQL DATABASE         │
    │  ┌──────────────────────────────┐  │
    │  │ Tables:                      │  │
    │  │ - users                      │  │
    │  │ - user_stats                 │  │
    │  │ - sessions                   │  │
    │  │ - feedback                   │  │
    │  │ - badges, user_badges        │  │
    │  └──────────────────────────────┘  │
    └────────────────────────────────────┘

         │
         │ 7. TRANSCRIBE & ANALYZE
         │
         ▼
    ┌────────────────────────────────────┐
    │      OPENAI WHISPER & GPT-4        │
    │  - Speech-to-text transcription    │
    │  - AI feedback generation          │
    └────────────────────────────────────┘

    ┌────────────────────────────────────┐
    │      FILE SYSTEM (/uploads)        │
    │  - Store audio files               │
    │  - Reference by path in DB         │
    └────────────────────────────────────┘
```

---

## 💾 Data Persistence Examples

### After User Registration
```json
{
  "users": [{
    "id": "550e8400-e29b-41d4-a716-446655440000",
    "email": "john@example.com",
    "username": "john_speaker",
    "passwordHash": "$2a$10$...[hashed]...",
    "role": "student",
    "purpose": "interview_prep",
    "createdAt": "2024-04-10T10:30:00Z"
  }],
  "user_stats": [{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "xp": 0,
    "level": 1,
    "currentStreak": 0,
    "longestStreak": 0,
    "lastActiveDate": null
  }]
}
```

### After Audio Upload
```json
{
  "sessions": [{
    "id": 1,
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "audioPath": "/uploads/1712768400000-a7k3j2.mp3",
    "status": "uploaded",
    "transcript": null,
    "fluencyScore": null,
    ... [all other scores null]
    "topicUsed": "Technology in Education",
    "createdAt": "2024-04-10T10:30:00Z",
    "analyzedAt": null
  }]
}
```

### After Analysis Complete
```json
{
  "sessions": [{
    "id": 1,
    "status": "analyzed",
    "transcript": "Technology in education has revolutionized...",
    "fluencyScore": 85.5,
    "pauseScore": 88.0,
    "vocabularyScore": 75.5,
    "confidenceScore": 82.0,
    "overallScore": 82.8,
    "wordsPerMinute": 142.3,
    "uniqueWordRatio": 0.342,
    "fillerWordCount": 3,
    "totalWords": 245,
    "durationSeconds": 103.5,
    "xpEarned": 91,
    "analyzedAt": "2024-04-10T10:35:00Z"
  }],
  "feedback": [{
    "id": 1,
    "sessionId": 1,
    "feedback": "Excellent delivery with clear pacing and vocabulary diversity...",
    "strengths": [
      "Well-structured delivery with smooth transitions",
      "Strong vocabulary choices and varied sentence structure",
      "Minimal use of filler words"
    ],
    "improvements": [
      "Consider adding more specific examples to support main points",
      "Work on vocal variety to maintain listener engagement"
    ],
    "fillerWords": ["um", "like"]
  }],
  "user_stats": [{
    "userId": "550e8400-e29b-41d4-a716-446655440000",
    "xp": 91,
    "level": 1,
    "currentStreak": 1,
    "longestStreak": 1,
    "lastActiveDate": "2024-04-10"
  }]
}
```

---

## 🚀 Running the Backend

### Prerequisites
```bash
Node.js (v18+)
PostgreSQL (v13+)
OpenAI API Key (optional, for AI features)
```

### Environment Variables
```
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/echocoach
SESSION_SECRET=your-secret-key-change-in-production
OPENAI_API_KEY=sk-...
```

### Startup Sequence
```bash
1. npm install              # Install dependencies
2. npm run migrate          # Run database migrations
3. npm run dev             # Start development server
   or
   npm run build && npm start # Production build & start
```

Server listens on configured PORT (default 3000)

---

## 📝 Summary

This backend is a complete speaking practice platform that:

1. **Manages Users** - Secure authentication with JWT tokens
2. **Processes Audio** - File upload, transcription via OpenAI Whisper
3. **Analyzes Speech** - Metrics for fluency, vocabulary, confidence, etc.
4. **Generates Feedback** - AI-powered insights using GPT-4
5. **Gamifies Learning** - XP system, 10 levels, 14 achievement badges
6. **Tracks Progress** - Historical data, streaks, improvement metrics
7. **Persists Data** - PostgreSQL with normalized schema

The entire workflow enables users to practice speaking, receive instant feedback, track improvements, and stay motivated through gamification.
