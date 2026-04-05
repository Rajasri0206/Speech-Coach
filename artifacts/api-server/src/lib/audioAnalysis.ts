import OpenAI from "openai";
import { logger } from "./logger";

let _openai: OpenAI | null = null;
function getOpenAI(): OpenAI | null {
  if (!process.env.OPENAI_API_KEY) return null;
  if (!_openai) {
    _openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return _openai;
}

export interface SpeechScores {
  fluencyScore: number;
  pauseScore: number;
  vocabularyScore: number;
  overallScore: number;
  wordsPerMinute: number;
  uniqueWordRatio: number;
  pauseCount: number;
  totalWords: number;
  durationSeconds: number;
}

export interface AnalysisResult {
  transcript: string;
  scores: SpeechScores;
  feedback: string;
  strengths: string[];
  improvements: string[];
}

export async function transcribeAudio(audioPath: string): Promise<string> {
  const openai = getOpenAI();
  if (!openai) throw new Error("No OpenAI API key configured");

  const fs = await import("fs");
  const audioStream = fs.createReadStream(audioPath);

  const transcription = await openai.audio.transcriptions.create({
    file: audioStream as Parameters<typeof openai.audio.transcriptions.create>[0]["file"],
    model: "whisper-1",
    response_format: "verbose_json",
    timestamp_granularities: ["segment"],
  });

  return transcription.text;
}

export function computeScores(
  transcript: string,
  durationSeconds: number,
): Omit<SpeechScores, "fluencyScore" | "pauseScore"> & { pauseCount: number } {
  const words = transcript.trim().split(/\s+/).filter(Boolean);
  const totalWords = words.length;
  const wordsPerMinute = durationSeconds > 0 ? (totalWords / durationSeconds) * 60 : 0;

  const uniqueWords = new Set(words.map((w) => w.toLowerCase().replace(/[^a-z]/g, "")));
  const uniqueWordRatio = totalWords > 0 ? uniqueWords.size / totalWords : 0;

  const fillerWords = ["um", "uh", "like", "you know", "basically", "literally", "actually", "so"];
  const fillerCount = words.filter((w) =>
    fillerWords.includes(w.toLowerCase().replace(/[^a-z]/g, ""))
  ).length;

  const pauseCount = fillerCount;

  return { wordsPerMinute, uniqueWordRatio, pauseCount, totalWords, durationSeconds };
}

function scoreWPM(wpm: number): number {
  if (wpm >= 120 && wpm <= 160) return 100;
  if (wpm >= 90 && wpm < 120) return 70 + ((wpm - 90) / 30) * 30;
  if (wpm > 160 && wpm <= 200) return 100 - ((wpm - 160) / 40) * 30;
  if (wpm < 90) return Math.max(0, (wpm / 90) * 70);
  return Math.max(0, 100 - ((wpm - 200) / 50) * 50);
}

function scorePauses(pauseCount: number, totalWords: number): number {
  const ratio = totalWords > 0 ? pauseCount / totalWords : 0;
  if (ratio <= 0.02) return 100;
  if (ratio <= 0.05) return 80;
  if (ratio <= 0.10) return 60;
  if (ratio <= 0.15) return 40;
  return 20;
}

function scoreVocabulary(uniqueWordRatio: number): number {
  return Math.min(100, uniqueWordRatio * 200);
}

export function buildFullScores(
  transcript: string,
  durationSeconds: number,
): SpeechScores {
  const base = computeScores(transcript, durationSeconds);
  const fluencyScore = Math.round(scoreWPM(base.wordsPerMinute));
  const pauseScore = Math.round(scorePauses(base.pauseCount, base.totalWords));
  const vocabularyScore = Math.round(scoreVocabulary(base.uniqueWordRatio));
  const overallScore = Math.round((fluencyScore + pauseScore + vocabularyScore) / 3);

  return {
    ...base,
    fluencyScore,
    pauseScore,
    vocabularyScore,
    overallScore,
  };
}

export async function generateFeedback(
  transcript: string,
  scores: SpeechScores,
): Promise<{ feedback: string; strengths: string[]; improvements: string[] }> {
  const openai = getOpenAI();
  if (!openai) {
    return {
      feedback: "AI feedback is unavailable (no API key configured). Your session has been analyzed with automated scoring.",
      strengths: ["Session recorded and analyzed successfully"],
      improvements: ["Configure OpenAI API key for personalized AI feedback"],
    };
  }

  const prompt = `You are an expert speaking coach. Analyze this speech transcript and scores, then provide concise, actionable feedback.

Transcript:
"${transcript}"

Scores:
- Fluency (words per minute): ${scores.fluencyScore}/100 (${scores.wordsPerMinute.toFixed(0)} WPM)
- Pause/Filler control: ${scores.pauseScore}/100 (${scores.pauseCount} filler words detected)
- Vocabulary richness: ${scores.vocabularyScore}/100 (${(scores.uniqueWordRatio * 100).toFixed(0)}% unique words)
- Overall score: ${scores.overallScore}/100

Respond in JSON format with exactly these fields:
{
  "feedback": "2-3 sentence overall assessment",
  "strengths": ["strength 1", "strength 2"],
  "improvements": ["improvement 1", "improvement 2"]
}`;

  try {
    const response = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
      response_format: { type: "json_object" },
      max_tokens: 500,
    });

    const content = response.choices[0].message.content ?? "{}";
    const parsed = JSON.parse(content);
    return {
      feedback: parsed.feedback ?? "Great speaking session! Keep practicing.",
      strengths: Array.isArray(parsed.strengths) ? parsed.strengths : [],
      improvements: Array.isArray(parsed.improvements) ? parsed.improvements : [],
    };
  } catch (err) {
    logger.error({ err }, "Failed to generate AI feedback");
    return {
      feedback: "Your speaking session has been analyzed. Keep practicing to improve your fluency and vocabulary.",
      strengths: ["Completed a speaking session"],
      improvements: ["Practice regularly to build confidence"],
    };
  }
}

export async function analyzeAudioFile(audioPath: string): Promise<AnalysisResult> {
  const fs = await import("fs");
  const stat = fs.statSync(audioPath);
  const fileSizeBytes = stat.size;
  const estimatedDurationSeconds = Math.max(10, fileSizeBytes / 16000);

  let transcript: string;
  if (!process.env.OPENAI_API_KEY) {
    transcript = "This is a sample transcript generated for demo purposes. The audio file was uploaded but the OpenAI API key is not configured for actual speech recognition.";
  } else {
    transcript = await transcribeAudio(audioPath);
  }

  const scores = buildFullScores(transcript, estimatedDurationSeconds);
  const { feedback, strengths, improvements } = await generateFeedback(transcript, scores);

  return { transcript, scores, feedback, strengths, improvements };
}
