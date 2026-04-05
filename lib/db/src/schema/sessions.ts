import { pgTable, text, serial, timestamp, real, integer } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const sessionsTable = pgTable("sessions", {
  id: serial("id").primaryKey(),
  userId: text("user_id").notNull(),
  audioPath: text("audio_path").notNull(),
  status: text("status").notNull().default("uploaded"),
  transcript: text("transcript"),
  fluencyScore: real("fluency_score"),
  pauseScore: real("pause_score"),
  vocabularyScore: real("vocabulary_score"),
  overallScore: real("overall_score"),
  wordsPerMinute: real("words_per_minute"),
  uniqueWordRatio: real("unique_word_ratio"),
  pauseCount: integer("pause_count"),
  totalWords: integer("total_words"),
  durationSeconds: real("duration_seconds"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  analyzedAt: timestamp("analyzed_at", { withTimezone: true }),
});

export const insertSessionSchema = createInsertSchema(sessionsTable).omit({
  id: true,
  createdAt: true,
});
export type InsertSession = z.infer<typeof insertSessionSchema>;
export type Session = typeof sessionsTable.$inferSelect;
