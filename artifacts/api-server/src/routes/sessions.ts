import { Router, type IRouter } from "express";
import multer from "multer";
import path from "path";
import fs from "fs";
import { eq, desc, and, gte, sql } from "drizzle-orm";
import { db, sessionsTable, feedbackTable } from "@workspace/db";
import {
  AnalyzeSessionParams,
  ListSessionsQueryParams,
  GetSessionParams,
} from "@workspace/api-zod";
import { analyzeAudioFile } from "../lib/audioAnalysis";

const router: IRouter = Router();

const UPLOADS_DIR = path.join(process.cwd(), "uploads");
if (!fs.existsSync(UPLOADS_DIR)) {
  fs.mkdirSync(UPLOADS_DIR, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, UPLOADS_DIR),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    cb(null, `${unique}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ["audio/mpeg", "audio/wav", "audio/ogg", "audio/mp4", "audio/webm", "audio/flac", "audio/m4a", "video/webm", "application/octet-stream"];
    if (allowed.includes(file.mimetype) || file.originalname.match(/\.(mp3|wav|ogg|m4a|webm|flac|mp4)$/i)) {
      cb(null, true);
    } else {
      cb(new Error("Unsupported audio format"));
    }
  },
});

router.post("/sessions/upload", upload.single("audio"), async (req, res): Promise<void> => {
  if (!req.file) {
    res.status(400).json({ error: "No audio file provided" });
    return;
  }

  const rawUserId = Array.isArray(req.body.userId) ? req.body.userId[0] : req.body.userId;
  if (!rawUserId) {
    res.status(400).json({ error: "userId is required" });
    return;
  }

  const [session] = await db
    .insert(sessionsTable)
    .values({
      userId: rawUserId,
      audioPath: req.file.path,
      status: "uploaded",
    })
    .returning();

  req.log.info({ sessionId: session.id, userId: rawUserId }, "Audio uploaded");

  res.status(201).json({
    sessionId: session.id,
    userId: session.userId,
    audioPath: session.audioPath,
    status: session.status,
    createdAt: session.createdAt,
  });
});

router.post("/sessions/:sessionId/analyze", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
  const params = AnalyzeSessionParams.safeParse({ sessionId: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, params.data.sessionId));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  await db
    .update(sessionsTable)
    .set({ status: "analyzing" })
    .where(eq(sessionsTable.id, session.id));

  req.log.info({ sessionId: session.id }, "Starting analysis");

  const result = await analyzeAudioFile(session.audioPath);

  const [updated] = await db
    .update(sessionsTable)
    .set({
      transcript: result.transcript,
      fluencyScore: result.scores.fluencyScore,
      pauseScore: result.scores.pauseScore,
      vocabularyScore: result.scores.vocabularyScore,
      overallScore: result.scores.overallScore,
      wordsPerMinute: result.scores.wordsPerMinute,
      uniqueWordRatio: result.scores.uniqueWordRatio,
      pauseCount: result.scores.pauseCount,
      totalWords: result.scores.totalWords,
      durationSeconds: result.scores.durationSeconds,
      status: "analyzed",
      analyzedAt: new Date(),
    })
    .where(eq(sessionsTable.id, session.id))
    .returning();

  const [existingFeedback] = await db
    .select()
    .from(feedbackTable)
    .where(eq(feedbackTable.sessionId, session.id));

  if (existingFeedback) {
    await db
      .update(feedbackTable)
      .set({
        feedback: result.feedback,
        strengths: result.strengths,
        improvements: result.improvements,
      })
      .where(eq(feedbackTable.sessionId, session.id));
  } else {
    await db.insert(feedbackTable).values({
      sessionId: session.id,
      feedback: result.feedback,
      strengths: result.strengths,
      improvements: result.improvements,
    });
  }

  req.log.info({ sessionId: session.id }, "Analysis complete");

  res.json({
    sessionId: updated.id,
    transcript: result.transcript,
    scores: result.scores,
    feedback: result.feedback,
    status: "analyzed",
    analyzedAt: updated.analyzedAt,
  });
});

router.get("/sessions", async (req, res): Promise<void> => {
  const parsed = ListSessionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const { userId, limit = 10, offset = 0 } = parsed.data;

  const [countResult] = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(sessionsTable)
    .where(eq(sessionsTable.userId, userId));

  const sessions = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.userId, userId))
    .orderBy(desc(sessionsTable.createdAt))
    .limit(limit)
    .offset(offset);

  res.json({ sessions, total: countResult?.count ?? 0 });
});

router.get("/sessions/:sessionId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.sessionId) ? req.params.sessionId[0] : req.params.sessionId;
  const params = GetSessionParams.safeParse({ sessionId: rawId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [session] = await db
    .select()
    .from(sessionsTable)
    .where(eq(sessionsTable.id, params.data.sessionId));

  if (!session) {
    res.status(404).json({ error: "Session not found" });
    return;
  }

  const [fb] = await db
    .select()
    .from(feedbackTable)
    .where(eq(feedbackTable.sessionId, session.id));

  res.json({
    session,
    feedback: fb?.feedback ?? null,
    scores: session.overallScore != null
      ? {
          fluencyScore: session.fluencyScore,
          pauseScore: session.pauseScore,
          vocabularyScore: session.vocabularyScore,
          overallScore: session.overallScore,
          wordsPerMinute: session.wordsPerMinute,
          uniqueWordRatio: session.uniqueWordRatio,
          pauseCount: session.pauseCount,
          totalWords: session.totalWords,
          durationSeconds: session.durationSeconds,
        }
      : null,
  });
});

export default router;
