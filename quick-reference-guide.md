# Backend Quick Reference Guide

## 🚀 Quick Start

### Environment Setup
```bash
# Install dependencies
npm install

# Create .env file
PORT=3000
DATABASE_URL=postgresql://user:password@localhost:5432/echocoach
SESSION_SECRET=your-secret-key
OPENAI_API_KEY=sk-...

# Run migrations
npm run migrate

# Start development server
npm run dev
```

### Key Directories
```
artifacts/api-server/src/
├── routes/           ← API endpoints
├── lib/              ← Business logic
│   ├── audioAnalysis.ts    ← Speech metrics
│   ├── gamification.ts     ← XP/Badges
│   └── logger.ts           ← Logging
└── app.ts            ← Express config
```

---

## 🔗 API Endpoints Quick Reference

### Auth
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/api/auth/register` | Create account | None |
| POST | `/api/auth/login` | Get JWT token | None |

### Sessions
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| POST | `/api/sessions/upload` | Upload audio | Required |
| POST | `/api/sessions/:id/analyze` | Analyze audio | Required |
| GET | `/api/sessions` | List sessions | Required |
| GET | `/api/sessions/:id` | Get session details | Required |

### Progress
| Method | Path | Purpose | Auth |
|--------|------|---------|------|
| GET | `/api/progress/:userId` | Timeline (30d default) | Required |
| GET | `/api/progress/:userId/summary` | Aggregate stats | Required |

### Other
| Method | Path | Purpose |
|--------|------|---------|
| GET | `/api/health` | Health check |
| GET | `/api/gamification/stats/:userId` | User stats |
| GET | `/api/gamification/leaderboard` | Top users |

---

## 📊 Key Data Models

### Session Status Lifecycle
```
"uploaded" → "analyzing" → "analyzed"
```

### User Registration Data
```javascript
{
  email: "user@example.com",
  username: "username",
  password: "password123",  // min 8 chars
  role: "student",          // or "teacher"
  purpose: "general"        // learning goal
}
```

### Audio Analysis Response
```javascript
{
  transcript: "Full speech text...",
  scores: {
    fluencyScore: 85,      // WPM-based (0-100)
    pauseScore: 88,        // Filler word control (0-100)
    vocabularyScore: 75,   // Word diversity (0-100)
    confidenceScore: 82,   // Weighted heuristic (0-100)
    overallScore: 82.5,    // Average of above
    wordsPerMinute: 142,
    uniqueWordRatio: 0.34, // 34% unique words
    fillerWordCount: 3,
    totalWords: 245,
    durationSeconds: 103.5
  },
  feedback: "Your speech...",
  strengths: ["Clear pacing", "Good vocabulary"],
  improvements: ["Add more examples"],
  xpEarned: 91,
  newBadges: [
    {
      id: "first_session",
      name: "First Words",
      description: "Complete your first session",
      icon: "mic"
    }
  ],
  newLevel: 2  // null if no level change
}
```

### User Stats
```javascript
{
  userId: "uuid",
  xp: 150,              // Total XP earned
  level: 2,             // Current level (1-10)
  currentStreak: 3,     // Consecutive practice days
  longestStreak: 7,     // Best streak ever
  lastActiveDate: "2024-04-10"
}
```

---

## 🎯 Scoring Details

### Fluency (WPM Optimization)
```
Ideal: 120-160 WPM = 100/100
Slow:  < 90 WPM     = Proportional decrease
Fast:  > 200 WPM    = Penalty score
```

### Vocabulary (Word Diversity)
```
Formula: min(100, uniqueRatio * 200)
Example: 25% unique words = 50/100
```

### Pause Control (Filler Words)
```
< 1%:   100/100 (excellent)
< 3%:   85/100  (good)
< 5%:   70/100  (acceptable)
> 12%:  15/100  (poor)
```

### Confidence (Heuristic)
```
Factors: Pacing (40%) + Vocabulary (30%) + No Fillers (30%)
```

---

## 🎮 Gamification Quick Facts

### XP Per Session
```
Base: 50 XP (always)
Performance: overallScore * 0.5 (0-50)
Streak Bonus: min(streak * 5, 30) (0-30)
Total: 50-110 XP per session
```

### Level Progression
```
Level 1: 0 XP      → Level 5: 1000 XP
Level 2: 100 XP    → Level 6: 1500 XP
Level 3: 300 XP    → Level 7: 2200 XP
Level 4: 600 XP    → Level 8-10: 3000-5200+ XP
```

### 14 Badges Available
```
4 Session Milestones (1, 5, 10, 50 sessions)
3 Streak Achievements (3, 7, 30 days)
5 Score Milestones (fluency/vocab/confidence/overall)
2 Level Achievements (reach level 5, 10)
```

---

## 🔐 Security Details

### Password
- Algorithm: bcryptjs with 10 salt rounds
- Minimum: 8 characters
- Never returned in API responses

### JWT Token
```javascript
{
  payload: {
    userId: "uuid",
    username: "string"
  },
  expiresIn: "30 days"
}
```

### File Upload Limits
- Size: Max 50 MB
- Types: mp3, wav, ogg, m4a, webm, flac, mp4
- Storage: `/uploads/[timestamp]-[random].[ext]`

---

## 🗄️ Database Quick Reference

### Connection
```
URL: postgresql://[user]:[password]@[host]:[port]/[dbname]
ORM: Drizzle (type-safe)
Migrations: Auto-generated from schema changes
```

### Key Queries
```sql
-- Get user
SELECT * FROM users WHERE email = $1

-- Get sessions
SELECT * FROM sessions WHERE user_id = $1 ORDER BY created_at DESC

-- Get stats
SELECT * FROM user_stats WHERE user_id = $1

-- Check badge
SELECT * FROM user_badges 
WHERE user_id = $1 AND badge_id = $2
```

### Relationships
```
users ←→ user_stats (1:1)
users ←→ sessions (1:N)
users ←→ user_badges ←→ badges (M:N)
sessions ←→ feedback (1:1)
```

---

## 🤖 AI Integration

### Whisper API (Transcription)
```javascript
Input: Audio file
Model: whisper-1
Output: Full transcript text
Cost: $0.02 per minute
Fallback: Demo transcript if no API key
```

### GPT-4 Mini (Feedback)
```javascript
Input: Transcript + metrics
Model: gpt-4o-mini
Output: JSON {feedback, strengths[], improvements[]}
Max tokens: 600
Fallback: Rule-based feedback
```

---

## 📈 Performance Notes

### Indexes for Speed
```
PRIMARY: users.id, sessions.id, feedback.id
UNIQUE: users.email, users.username, user_badges(userId, badgeId)
REGULAR: sessions(userId, status, createdAt), feedback(sessionId)
```

### Optimization Patterns
```
✓ Batch badge insertion
✓ Aggregate queries for stats
✓ Pagination for session lists (LIMIT 10)
✓ Connection pooling via Drizzle
✗ Avoid N+1 queries
```

---

## 🐛 Common Issues & Solutions

### Audio Not Analyzing
**Problem**: Session stuck in "uploading" status
**Solution**: 
```bash
1. Check OpenAI API key in .env
2. Verify audio file format (mp3, wav, etc.)
3. Check file size < 50 MB
4. Review server logs for errors
```

### Badges Not Appearing
**Problem**: User earned conditions but no badge awarded
**Solution**:
```bash
1. Check user_stats (xp, level, streak)
2. Verify badge conditions in gamification.ts
3. Check user_badges table for duplicates
4. Re-run badge seeding
```

### Streak Resetting Unexpectedly
**Problem**: currentStreak goes to 1 when expected to increment
**Solution**:
```bash
1. Check lastActiveDate is yesterday's date (YYYY-MM-DD)
2. Verify timezone handling is correct
3. Ensure new session update happens in same transaction
```

### Database Connection Failing
**Problem**: "connect ECONNREFUSED"
**Solution**:
```bash
1. Verify PostgreSQL is running
2. Check DATABASE_URL format
3. Verify credentials (user/password)
4. Test with psql: psql $DATABASE_URL
```

---

## 🧪 Testing API Endpoints

### Using cURL

```bash
# Register
curl -X POST http://localhost:3000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "password123"
  }'

# Login
curl -X POST http://localhost:3000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "password": "password123"
  }'

# Upload audio
curl -X POST http://localhost:3000/api/sessions/upload \
  -F "audio=@/path/to/audio.mp3" \
  -F "userId=550e8400-e29b-41d4-a716-446655440000" \
  -F "durationSeconds=120"

# Analyze session
curl -X POST http://localhost:3000/api/sessions/1/analyze

# Get sessions
curl "http://localhost:3000/api/sessions?userId=550e8400-e29b-41d4-a716-446655440000"

# Get progress
curl "http://localhost:3000/api/progress/550e8400-e29b-41d4-a716-446655440000?days=30"
```

---

## 📝 Code Snippets

### Calculate Level from XP
```typescript
import { calculateLevel } from "@workspace/db/gamification";

const { level, name, xpToNextLevel } = calculateLevel(userXP);
console.log(`Level ${level}: ${name}`);
console.log(`${xpToNextLevel} XP until next level`);
```

### Build Scores from Transcript
```typescript
import { buildFullScores } from "@workspace/api-server/lib/audioAnalysis";

const scores = buildFullScores(transcript, durationSeconds);
console.log(`Overall: ${scores.overallScore}/100`);
console.log(`WPM: ${scores.wordsPerMinute}`);
```

### Award XP & Check Badges
```typescript
import { awardXpAndUpdateStreak } from "@workspace/db/gamification";

const result = await awardXpAndUpdateStreak(userId, xpEarned, {
  overallScore: 82,
  fluencyScore: 85,
  vocabularyScore: 75,
  confidenceScore: 82,
  totalSessions: 5
});

console.log(`New badges: ${result.newBadges.map(b => b.name)}`);
console.log(`New level: ${result.newLevel}`);
```

---

## 📚 File Locations

### Source Files
```
artifacts/api-server/src/
  ├── routes/
  │   ├── auth.ts           ← Register/Login
  │   ├── sessions.ts       ← Upload/Analyze
  │   ├── progress.ts       ← Stats/Timeline
  │   ├── gamification.ts   ← Leaderboard
  │   ├── feedback.ts       ← User feedback
  │   ├── topics.ts         ← Speaking topics
  │   ├── tts.ts            ← Text-to-speech
  │   └── health.ts         ← Health checks
  │
  ├── lib/
  │   ├── audioAnalysis.ts  ← Speech metrics (200+ lines)
  │   ├── gamification.ts   ← XP/Badges (200+ lines)
  │   └── logger.ts         ← Pino logging
  │
  ├── index.ts              ← Entry point
  └── app.ts                ← Express setup
```

### Database Schema
```
lib/db/src/schema/index.ts
  ├── users table
  ├── user_stats table
  ├── sessions table
  ├── feedback table
  ├── badges table
  └── user_badges table
```

---

## 🔗 External Resources

### API Specifications
```
OpenAPI spec: lib/api-spec/openapi.yaml
Generated client: lib/api-client-react/
Zod schemas: lib/api-zod/src/generated/
```

### Environment Configuration
```
Development: .env (local)
Production: Environment variables (Docker, Cloud)
Database migrations: lib/db/drizzle.config.ts
```

---

## 📊 Data Volume Estimates

### Per User Session
- Database: 2-5 KB (metadata + metrics + text)
- Audio Storage: 5-50 MB (depending on duration/quality)

### Per User (50 Sessions)
- Database: ~250 KB
- Storage: ~250-2500 MB (varies)
- Total: ~500MB-2.5GB per active user

### Server with 1000 Users
- Database Size: ~250 MB
- Total Storage: ~500GB-2.5TB
- Backup Strategy: Daily incremental

---

## ✅ Deployment Checklist

- [ ] DATABASE_URL configured
- [ ] SESSION_SECRET changed from default
- [ ] OPENAI_API_KEY configured
- [ ] PORT set (avoid 3000 for prod)
- [ ] Database migrations run
- [ ] SSL/TLS enabled
- [ ] CORS configured for frontend domain
- [ ] Logging configured
- [ ] Backups configured
- [ ] Error monitoring setup
- [ ] Rate limiting enabled
- [ ] File storage mounted to persistent volume

---

## 🎓 Learning Path

1. **Start**: Understand registration flow (auth.ts)
2. **Next**: Learn session upload & storage (sessions.ts)
3. **Then**: Study audio analysis (audioAnalysis.ts)
4. **Advanced**: Gamification system (gamification.ts)
5. **Final**: Progress tracking & stats (progress.ts)

Each component builds on the previous one!
