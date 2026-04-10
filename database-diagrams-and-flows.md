# Backend Architecture - Visual Diagrams & Schema

## Database Entity Relationship Diagram (ERD)

```
┌─────────────────────────────────────────────────────────────────────┐
│                         DATABASE SCHEMA                             │
└─────────────────────────────────────────────────────────────────────┘

                              ┌──────────────┐
                              │    users     │
                              ├──────────────┤
                              │ id (PK)      │◄──────────────────┐
                              │ email        │                   │
                              │ username     │                   │
                              │ passwordHash │                   │
                              │ role         │                   │
                              │ purpose      │                   │
                              │ createdAt    │                   │
                              └──────────────┘                   │
                                    │                            │
                    ┌───────────────┼───────────────┐            │
                    │               │               │            │
                    ▼               ▼               ▼            │
            ┌────────────────┐  ┌──────────────┐  ┌──────────┐  │
            │  user_stats    │  │  sessions    │  │  badges  │  │
            ├────────────────┤  ├──────────────┤  ├──────────┤  │
            │ userId (FK,PK) │  │ id (PK)      │  │ id (PK)  │  │
            │ xp             │  │ userId (FK)  │──┤ name     │  │
            │ level          │  │ audioPath    │  │ desc     │  │
            │ currentStreak  │  │ status       │  │ icon     │  │
            │ longestStreak  │  │ transcript   │  │ condition│  │
            │ lastActiveDate │  │ fluencyScore │  └──────────┘  │
            │ updatedAt      │  │ pauseScore   │        ▲        │
            └────────────────┘  │ vocabScore   │        │        │
                                │ confScore    │        │        │
                                │ overallScore │        │        │
                                │ wordsPerMin  │        │        │
                                │ uniqueRatio  │        │        │
                                │ fillerCount  │        │        │
                                │ totalWords   │        │        │
                                │ durationSecs │        │        │
                                │ xpEarned     │        │        │
                                │ topicUsed    │        │        │
                                │ createdAt    │        │        │
                                │ analyzedAt   │        │        │
                                └──────────────┘        │        │
                                      │                 │        │
                                      ▼                 │        │
                                ┌────────────────┐      │        │
                                │   feedback     │      │        │
                                ├────────────────┤      │        │
                                │ id (PK)        │      │        │
                                │ sessionId (FK) │      │        │
                                │ feedback       │      │        │
                                │ strengths[]    │      │        │
                                │ improvements[] │      │        │
                                │ fillerWords[]  │      │        │
                                │ audioFeedback  │      │        │
                                │ createdAt      │      │        │
                                └────────────────┘      │        │
                                                        │        │
                                                        │        │
                      ┌─────────────────────────────────┘        │
                      │                                          │
                      ▼                                          ▼
                ┌──────────────┐                         ┌──────────────┐
                │ user_badges  │                         │   (FK to)    │
                ├──────────────┤                         │   users.id   │
                │ id (PK)      │                         └──────────────┘
                │ userId (FK)  │──────────────┐
                │ badgeId (FK) │──┐            │
                │ earnedAt     │  │            │
                └──────────────┘  │            │
                                  │         (Unique constraint:
                                  │          userId + badgeId)
                                  │
                                  └────to badges.id


INDEXES CREATED:
├── users_email_idx        (email)
├── users_username_idx     (username)
├── sessions_user_id_idx   (userId)
├── sessions_status_idx    (status)
├── sessions_created_at_idx (createdAt)
├── user_badges_user_id_idx (userId)
├── feedback_session_id_idx (sessionId)
```

---

## Request-Response Flow Diagrams

### 1. Registration Flow

```
CLIENT                           SERVER                        DATABASE
  │                                │                                │
  │─ POST /auth/register ────────►│                                │
  │  {email, username, password}  │                                │
  │                               │─ Validate input               │
  │                               │  (email format, pwd length)   │
  │                               │                                │
  │                               │─ Check duplicate email ──────►│
  │                               │                            Query
  │                               │◄────────────── (not found)     │
  │                               │                                │
  │                               │─ Check duplicate username ───►│
  │                               │                            Query
  │                               │◄────────────── (not found)     │
  │                               │                                │
  │                               │─ Hash password                │
  │                               │  (bcryptjs, 10 salt rounds)   │
  │                               │                                │
  │                               │─ Create UUID                  │
  │                               │                                │
  │                               │─ Insert user ────────────────►│
  │                               │                            INSERT
  │                               │◄────────────────── new user    │
  │                               │                                │
  │                               │─ Insert user_stats ──────────►│
  │                               │  (xp=0, level=1, streak=0)  INSERT
  │                               │◄────────────────────────────   │
  │                               │                                │
  │                               │─ Seed badges ────────────────►│
  │                               │  (insert if not exists)   INSERT
  │                               │◄────────────────────────────   │
  │                               │                                │
  │                               │─ Generate JWT token           │
  │                               │  (expires 30d)                │
  │                               │                                │
  │◄────────── 201 Created ───────│                                │
  │  {token, userId, username,   │                                │
  │   email, role, purpose}      │                                │
  │                               │                                │
```

### 2. Audio Upload & Analysis Flow

```
CLIENT                    SERVER                      DATABASE         OPENAI
  │                         │                              │               │
  │─ Multipart Upload ─────►│                              │               │
  │  (audio file)          │─ Save to /uploads/          │               │
  │                        │  (unique filename)           │               │
  │                        │                              │               │
  │◄─ sessionId (201) ─────│─ Insert session ───────────►│               │
  │  (status: uploaded)    │  (status=uploaded)       INSERT              │
  │                        │◄─────────────────────────────                │
  │                        │                              │               │
  │─ POST analyze ─────────►│                              │               │
  │                        │─ Update status=analyzing ───►│               │
  │                        │                          UPDATE              │
  │                        │◄─────────────────────────────                │
  │                        │                              │               │
  │                        │─ Transcribe audio ─────────────────────────►│
  │                        │  (Whisper API)                         CALL   │
  │                        │◄──────────────────────────────────────────── │
  │                        │  (transcript text)                      RESPONSE
  │                        │                              │               │
  │                        │─ Build metrics:             │               │
  │                        │  • WPM calculation         │               │
  │                        │  • Unique word ratio       │               │
  │                        │  • Filler word detection   │               │
  │                        │  • Score calculations      │               │
  │                        │                              │               │
  │                        │─ Generate feedback ──────────────────────────►│
  │                        │  (GPT-4o-mini API)                     CALL   │
  │                        │◄──────────────────────────────────────────── │
  │                        │  {feedback, strengths[],              RESPONSE
  │                        │   improvements[]}                           │
  │                        │                              │               │
  │                        │─ Update session ───────────►│               │
  │                        │  (all metrics, status)  UPDATE              │
  │                        │◄─────────────────────────────                │
  │                        │                              │               │
  │                        │─ Get session count ────────►│               │
  │                        │  (for badges)          SELECT               │
  │                        │◄─────────────────────────────                │
  │                        │                              │               │
  │                        │─ Award XP ─────────────────►│               │
  │                        │  • Calculate XP earned                   UPDATE
  │                        │  • Update user_stats                         │
  │                        │  • Check badge conditions  │               │
  │                        │  • Award badges            │               │
  │                        │◄─────────────────────────────                │
  │                        │                              │               │
  │                        │─ Insert feedback ──────────►│               │
  │                        │  (strengths, improvements) INSERT            │
  │                        │◄─────────────────────────────                │
  │                        │                              │               │
  │◄─ Analysis Complete ───│                              │               │
  │  {scores, feedback,   │                              │               │
  │   xpEarned, newBadges}│                              │               │
  │                        │                              │               │
```

### 3. Session Retrieval & Progress Tracking

```
GET /api/sessions (List User Sessions)
  │
  ├─ Query sessions table
  │  WHERE userId = ? AND status = 'analyzed'
  │  ORDER BY createdAt DESC
  │  LIMIT 10 OFFSET 0
  │
  └─ Return: [{id, transcript, scores, xpEarned, ...}]


GET /api/sessions/:sessionId (Get Session Details)
  │
  ├─ Query sessions by ID
  ├─ Query feedback by sessionId
  │
  └─ Return: {
      session: {...all fields},
      feedback: "string",
      strengths: ["str1", "str2"],
      improvements: ["imp1", "imp2"],
      scores: {fluency, pause, vocab, confidence, overall, wpm, ...}
    }


GET /api/progress/:userId?days=30 (Timeline Data)
  │
  ├─ Calculate date cutoff (30 days ago)
  ├─ Query sessions WHERE userId AND createdAt > cutoff
  │  AND status = 'analyzed'
  │
  └─ Return: {
      dataPoints: [
        {date, sessionId, fluencyScore, pauseScore, ...},
        ...
      ],
      totalSessions: N,
      daysTracked: 30
    }


GET /api/progress/:userId/summary (Aggregate Stats)
  │
  ├─ Query all analyzed sessions for user
  ├─ Calculate aggregates:
  │  • AVG(fluencyScore)
  │  • AVG(pauseScore)
  │  • AVG(vocabularyScore)
  │  • AVG(confidenceScore)
  │  • AVG(overallScore)
  │  • MAX(overallScore)
  │
  ├─ Calculate streak:
  │  • Get unique dates from sessions
  │  • Count consecutive days backwards
  │
  ├─ Calculate improvement:
  │  • (Last 3 avg - First 3 avg) / First 3 avg * 100
  │
  └─ Return: {
      totalSessions, avgScores, bestSession,
      latestSession, streak, improvementPercent
    }
```

---

## XP & Gamification Flow

```
AFTER AUDIO ANALYSIS:

┌─ Session Analyzed
│  overall_score = 82
│
├─ XP Calculation:
│  base_xp = 50
│  performance_xp = 82 * 0.5 = 41
│  streak_bonus = min(current_streak * 5, 30)
│             = min(2 * 5, 30) = 10
│  total_xp_earned = 50 + 41 + 10 = 101
│
├─ Update user_stats:
│  xp: 150 → 251
│  level: 1 → 2 (if xp > 100)
│  currentStreak: 2 → 3 (if lastActiveDate = yesterday)
│  lastActiveDate: "2024-04-10"
│
├─ Check Badge Conditions:
│  ├─ sessions_1: totalSessions >= 1? YES ✓
│  ├─ sessions_5: totalSessions >= 5? NO
│  ├─ sessions_10: totalSessions >= 10? NO
│  ├─ streak_3: currentStreak >= 3? YES ✓
│  ├─ fluency_90: fluencyScore >= 90? NO
│  ├─ vocab_85: vocabularyScore >= 85? NO
│  ├─ confidence_85: confidenceScore >= 85? NO
│  ├─ overall_85: overallScore >= 85? NO
│  ├─ overall_95: overallScore >= 95? NO
│  ├─ level_5: level >= 5? NO
│  └─ level_10: level >= 10? NO
│
├─ Award New Badges:
│  ├─ Check if already earned (unique constraint)
│  ├─ Insert: {userId, badgeId="streak_3", earnedAt=now}
│  └─ Return: [{id: "streak_3", name: "3-Day Habit", ...}]
│
└─ Response to Client:
   {
     xpEarned: 101,
     newBadges: [
       {id: "streak_3", name: "3-Day Habit", icon: "lightning"}
     ],
     newLevel: 2  // null if no level change
   }
```

---

## Score Calculation Algorithms

### Fluency Score (WPM-based)

```
Input: Words Per Minute (WPM)
Output: Score 0-100

wpm >= 120 && wpm <= 160
  → 100  (optimal zone)

wpm >= 90 && wpm < 120
  → 70 + ((wpm - 90) / 30) * 30
  → Examples: 90→70, 105→80, 120→100

wpm > 160 && wpm <= 200
  → 100 - ((wpm - 160) / 40) * 30
  → Examples: 160→100, 180→77.5, 200→55

wpm < 90
  → max(0, (wpm / 90) * 70)
  → Examples: 45→35, 90→70

wpm > 200
  → max(0, 100 - ((wpm - 200) / 50) * 50)
  → Examples: 200→100, 225→75, 250→50
```

### Pause Score (Filler Word Ratio)

```
Input: fillerWordCount, totalWords
Output: Score 0-100

fillerRatio = fillerWordCount / totalWords

ratio <= 0.01 (1%)      → 100
ratio <= 0.03 (3%)      → 85
ratio <= 0.05 (5%)      → 70
ratio <= 0.08 (8%)      → 55
ratio <= 0.12 (12%)     → 35
ratio > 0.12            → 15
```

### Vocabulary Score

```
Input: uniqueWordRatio (0-1)
Output: Score 0-100

score = min(100, uniqueWordRatio * 200)

Examples:
  0.25 (25%) → 50
  0.50 (50%) → 100
  0.75 (75%) → 100 (capped)
```

### Confidence Score (Heuristic)

```
Input: wpm, uniqueWordRatio, fillerRatio
Output: Score 0-100

pacingFactor = 1.0 if (wpm >= 100 && wpm <= 180) else 0.7
vocabularyFactor = min(1.0, uniqueWordRatio * 2)
fillerPenalty = max(0, 1.0 - fillerRatio * 5)

confidenceScore = (
  pacingFactor * 0.4 +
  vocabularyFactor * 0.3 +
  fillerPenalty * 0.3
) * 100

Example:
  wpm=140 → pacingFactor=1.0
  uniqueRatio=0.35 → vocabularyFactor=0.7
  fillerRatio=0.02 → fillerPenalty=0.9
  
  score = (1.0*0.4 + 0.7*0.3 + 0.9*0.3) * 100
        = (0.4 + 0.21 + 0.27) * 100
        = 88
```

### Overall Score

```
overallScore = average(fluency, pause, vocabulary, confidence)
            = (fluency + pause + vocab + confidence) / 4

Example:
  fluency=85, pause=88, vocab=75, confidence=82
  overall = (85 + 88 + 75 + 82) / 4 = 82.5
```

---

## Data State Transitions

```
SESSION STATUS FLOW:

        ┌──────────────────────────────────────┐
        │ uploaded                              │
        │ (file saved, waiting for analysis)   │
        └──────────────────────────────────────┘
                          │
                    POST /analyze
                          │
                          ▼
        ┌──────────────────────────────────────┐
        │ analyzing                             │
        │ (transcribing, calculating metrics)  │
        └──────────────────────────────────────┘
                          │
                  Analysis complete
                          │
                          ▼
        ┌──────────────────────────────────────┐
        │ analyzed                              │
        │ (complete with all scores & feedback)│
        └──────────────────────────────────────┘
                    (terminal state)


STREAK STATE TRANSITIONS:

User takes session today:
  lastActiveDate = null
    → currentStreak = 1
    → lastActiveDate = "2024-04-10"

User takes session tomorrow:
  lastActiveDate = "2024-04-10"
    → currentStreak = 2
    → lastActiveDate = "2024-04-11"

User skips a day:
  lastActiveDate = "2024-04-10"
  nextSession on 2024-04-12
    → currentStreak = 1 (reset)
    → lastActiveDate = "2024-04-12"
```

---

## Database Query Patterns

### Common SELECT Queries

```sql
-- Get user for login
SELECT * FROM users WHERE email = ?

-- Get session with feedback
SELECT s.*, f.feedback, f.strengths, f.improvements
FROM sessions s
LEFT JOIN feedback f ON s.id = f.session_id
WHERE s.id = ?

-- List user's sessions (paginated)
SELECT * FROM sessions
WHERE user_id = ?
ORDER BY created_at DESC
LIMIT 10 OFFSET 0

-- Get user stats
SELECT * FROM user_stats WHERE user_id = ?

-- Check if badge earned
SELECT * FROM user_badges
WHERE user_id = ? AND badge_id = ?

-- Get leaderboard (top 10)
SELECT u.username, us.xp, us.level, COUNT(s.id) as total_sessions
FROM users u
JOIN user_stats us ON u.id = us.user_id
LEFT JOIN sessions s ON u.id = s.user_id
GROUP BY u.id
ORDER BY us.xp DESC, u.username
LIMIT 10
```

### Common INSERT/UPDATE Queries

```sql
-- Register user
INSERT INTO users (id, email, username, password_hash, role, purpose, created_at)
VALUES (?, ?, ?, ?, ?, ?, NOW())

-- Create user stats
INSERT INTO user_stats (user_id, xp, level, current_streak)
VALUES (?, 0, 1, 0)

-- Upload session
INSERT INTO sessions (user_id, audio_path, status, topic_used, duration_seconds)
VALUES (?, ?, 'uploaded', ?, ?)

-- Update with analysis results
UPDATE sessions
SET transcript = ?, fluency_score = ?, pause_score = ?, ...,
    status = 'analyzed', analyzed_at = NOW()
WHERE id = ?

-- Award XP
UPDATE user_stats
SET xp = xp + ?, level = ?, current_streak = ?,
    longest_streak = ?, last_active_date = ?, updated_at = NOW()
WHERE user_id = ?

-- Award badge
INSERT INTO user_badges (user_id, badge_id, earned_at)
VALUES (?, ?, NOW())
ON CONFLICT DO NOTHING  -- Prevents duplicate awards
```

---

## File Storage Structure

```
PROJECT_ROOT/
└── uploads/
    ├── 1712000000000-a7k3j2.mp3      ← Session 1
    ├── 1712010000000-x9m2k5.wav      ← Session 2
    ├── 1712020000000-b4l3j8.mp3      ← Session 3
    └── ...

Database stores:
  sessions.audioPath = "/uploads/1712000000000-a7k3j2.mp3"
  sessions.userId = "550e8400-e29b-41d4-a716-446655440000"

Path Resolution:
  Full Path = process.cwd() + audioPath
            = /app/uploads/1712000000000-a7k3j2.mp3
```

---

## Error Handling Patterns

```
VALIDATION ERRORS (400):
├─ Missing required fields
├─ Invalid email format
├─ Password too short
├─ Username already taken
├─ Email already registered
├─ Unsupported file format
└─ File too large

AUTHENTICATION ERRORS (401):
├─ Invalid email/password combo
├─ Expired JWT token
└─ Missing authorization header

NOT FOUND ERRORS (404):
├─ User not found
├─ Session not found
└─ File not found

SERVER ERRORS (500):
├─ Database connection failure
├─ OpenAI API failure
├─ File storage failure
└─ Unexpected exceptions
```

---

## Performance Considerations

### Indexes for Speed
```
PRIMARY KEYS: users.id, sessions.id, feedback.id, etc.
  → O(1) lookups

Indexes on:
  users.email, users.username
    → Fast login/registration checks
  sessions.user_id
    → Fast session list retrieval
  sessions.status
    → Fast "need analysis" queries
  sessions.created_at
    → Fast time-range queries
```

### Query Optimization
```
Batch operations:
  ├─ Award multiple badges in single INSERT
  ├─ Calculate aggregates with single query
  └─ Seed badges with ON CONFLICT clause

Connection pooling:
  └─ Drizzle ORM manages connection pool

Pagination:
  ├─ LIMIT 10 OFFSET 0
  └─ Prevents loading entire result set
```

---

## Summary of Data Storage

| Table | Purpose | Key Operations | Example Count |
|-------|---------|-----------------|---------------|
| users | User accounts | INSERT (register), SELECT (login) | Per registration |
| user_stats | Gamification metrics | UPDATE (xp, level), SELECT | 1 per user |
| sessions | Speech recordings | INSERT (upload), UPDATE (analyze), SELECT | 1+ per user |
| feedback | Analysis results | INSERT/UPDATE (after analysis), SELECT | 1 per session |
| badges | Achievement definitions | INSERT (seed), SELECT | 14 total |
| user_badges | User achievements | INSERT (award), SELECT | Varies |

**Total Data Growth per User Session:**
- Database: ~2-5 KB (metadata, metrics, feedback text)
- File Storage: ~5-50 MB (audio file)
- Typical User: 50 sessions = 250 KB DB + 250-2500 MB storage
