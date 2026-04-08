import { useEffect, useState, type ComponentType } from "react";

import { modules as discoveredModules } from "./.generated/mockup-components";

type ModuleMap = Record<string, () => Promise<Record<string, unknown>>>;

function _resolveComponent(
  mod: Record<string, unknown>,
  name: string,
): ComponentType | undefined {
  const fns = Object.values(mod).filter(
    (v) => typeof v === "function",
  ) as ComponentType[];
  return (
    (mod.default as ComponentType) ||
    (mod.Preview as ComponentType) ||
    (mod[name] as ComponentType) ||
    fns[fns.length - 1]
  );
}

function PreviewRenderer({
  componentPath,
  modules,
}: {
  componentPath: string;
  modules: ModuleMap;
}) {
  const [Component, setComponent] = useState<ComponentType | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    setComponent(null);
    setError(null);

    async function loadComponent(): Promise<void> {
      const key = `./components/mockups/${componentPath}.tsx`;
      const loader = modules[key];
      if (!loader) {
        setError(`No component found at ${componentPath}.tsx`);
        return;
      }

      try {
        const mod = await loader();
        if (cancelled) {
          return;
        }
        const name = componentPath.split("/").pop()!;
        const comp = _resolveComponent(mod, name);
        if (!comp) {
          setError(
            `No exported React component found in ${componentPath}.tsx\n\nMake sure the file has at least one exported function component.`,
          );
          return;
        }
        setComponent(() => comp);
      } catch (e) {
        if (cancelled) {
          return;
        }

        const message = e instanceof Error ? e.message : String(e);
        setError(`Failed to load preview.\n${message}`);
      }
    }

    void loadComponent();

    return () => {
      cancelled = true;
    };
  }, [componentPath, modules]);

  if (error) {
    return (
      <pre style={{ color: "red", padding: "2rem", fontFamily: "system-ui" }}>
        {error}
      </pre>
    );
  }

  if (!Component) return null;

  return <Component />;
}

function getBasePath(): string {
  return import.meta.env.BASE_URL.replace(/\/$/, "");
}

function getPreviewExamplePath(): string {
  const basePath = getBasePath();
  return `${basePath}/preview/ComponentName`;
}

function Gallery() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
      <div className="text-center max-w-md">
        <h1 className="text-2xl font-semibold text-gray-900 mb-3">
          Component Preview Server
        </h1>
        <p className="text-gray-500 mb-4">
          This server renders individual components for the workspace canvas.
        </p>
        <p className="text-sm text-gray-400">
          Access component previews at{" "}
          <code className="bg-gray-100 px-1.5 py-0.5 rounded text-gray-600">
            {getPreviewExamplePath()}
          </code>
        </p>
      </div>
    </div>
  );
}

function getPreviewPath(): string | null {
  const basePath = getBasePath();
  const { pathname } = window.location;
  const local =
    basePath && pathname.startsWith(basePath)
      ? pathname.slice(basePath.length) || "/"
      : pathname;
  const match = local.match(/^\/preview\/(.+)$/);
  return match ? match[1] : null;
}

function App() {
  const previewPath = getPreviewPath();

  if (previewPath) {
    return (
      <PreviewRenderer
        componentPath={previewPath}
        modules={discoveredModules}
      />
    );
  }

  return <Gallery />;
}

export default App;





























// import { useState, useRef, useCallback } from "react";

// // ─── Types ───────────────────────────────────────────────────────────────────

// interface Session {
//   id: string;
//   status: "uploaded" | "processing" | "completed" | "failed";
//   createdAt: string;
//   overallScore?: number;
//   fluencyScore?: number;
//   pauseScore?: number;
//   vocabularyScore?: number;
//   wordsPerMinute?: number;
//   totalWords?: number;
//   durationSeconds?: number;
// }

// interface Feedback {
//   sessionId: string;
//   feedback: string;
//   strengths: string[];
//   improvements: string[];
//   scores: {
//     fluencyScore: number;
//     pauseScore: number;
//     vocabularyScore: number;
//     overallScore: number;
//     wordsPerMinute: number;
//     uniqueWordRatio: number;
//     pauseCount: number;
//     totalWords: number;
//     durationSeconds: number;
//   };
//   transcript: string;
//   createdAt: string;
// }

// // ─── Config ───────────────────────────────────────────────────────────────────

// const API_BASE = import.meta.env.VITE_API_URL ?? "http://localhost:3000";
// const USER_ID = "demo-user";

// // ─── Helpers ──────────────────────────────────────────────────────────────────

// function fmt(n: number, decimals = 0) {
//   return n.toFixed(decimals);
// }

// function fmtDuration(s: number) {
//   const m = Math.floor(s / 60);
//   const sec = Math.floor(s % 60);
//   return m > 0 ? `${m}m ${sec}s` : `${sec}s`;
// }

// function scoreColor(score: number) {
//   if (score >= 80) return "#4ade80";
//   if (score >= 60) return "#facc15";
//   return "#f87171";
// }

// function scoreLabel(score: number) {
//   if (score >= 80) return "Excellent";
//   if (score >= 60) return "Good";
//   if (score >= 40) return "Fair";
//   return "Needs Work";
// }

// // ─── Score Ring ───────────────────────────────────────────────────────────────

// function ScoreRing({
//   score,
//   label,
//   size = 80,
// }: {
//   score: number;
//   label: string;
//   size?: number;
// }) {
//   const r = size / 2 - 6;
//   const circ = 2 * Math.PI * r;
//   const dash = (score / 100) * circ;
//   const color = scoreColor(score);

//   return (
//     <div
//       style={{
//         display: "flex",
//         flexDirection: "column",
//         alignItems: "center",
//         gap: 6,
//       }}
//     >
//       <div style={{ position: "relative", width: size, height: size }}>
//         <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
//           <circle
//             cx={size / 2}
//             cy={size / 2}
//             r={r}
//             fill="none"
//             stroke="rgba(255,255,255,0.08)"
//             strokeWidth={5}
//           />
//           <circle
//             cx={size / 2}
//             cy={size / 2}
//             r={r}
//             fill="none"
//             stroke={color}
//             strokeWidth={5}
//             strokeDasharray={`${dash} ${circ - dash}`}
//             strokeLinecap="round"
//             style={{ transition: "stroke-dasharray 0.8s ease" }}
//           />
//         </svg>
//         <div
//           style={{
//             position: "absolute",
//             inset: 0,
//             display: "flex",
//             alignItems: "center",
//             justifyContent: "center",
//             flexDirection: "column",
//           }}
//         >
//           <span
//             style={{
//               fontSize: size < 90 ? 14 : 22,
//               fontWeight: 700,
//               color,
//               fontFamily: "'DM Mono', monospace",
//               lineHeight: 1,
//             }}
//           >
//             {Math.round(score)}
//           </span>
//         </div>
//       </div>
//       <span
//         style={{
//           fontSize: 11,
//           color: "rgba(255,255,255,0.5)",
//           textTransform: "uppercase",
//           letterSpacing: "0.08em",
//           fontWeight: 600,
//         }}
//       >
//         {label}
//       </span>
//     </div>
//   );
// }

// // ─── Stat Card ────────────────────────────────────────────────────────────────

// function StatCard({
//   label,
//   value,
//   unit,
// }: {
//   label: string;
//   value: string | number;
//   unit?: string;
// }) {
//   return (
//     <div
//       style={{
//         background: "rgba(255,255,255,0.04)",
//         border: "1px solid rgba(255,255,255,0.08)",
//         borderRadius: 12,
//         padding: "16px 20px",
//         display: "flex",
//         flexDirection: "column",
//         gap: 4,
//       }}
//     >
//       <span
//         style={{
//           fontSize: 11,
//           color: "rgba(255,255,255,0.4)",
//           textTransform: "uppercase",
//           letterSpacing: "0.1em",
//           fontWeight: 600,
//         }}
//       >
//         {label}
//       </span>
//       <div style={{ display: "flex", alignItems: "baseline", gap: 4 }}>
//         <span
//           style={{
//             fontSize: 28,
//             fontWeight: 700,
//             color: "#fff",
//             fontFamily: "'DM Mono', monospace",
//             lineHeight: 1,
//           }}
//         >
//           {value}
//         </span>
//         {unit && (
//           <span style={{ fontSize: 13, color: "rgba(255,255,255,0.4)" }}>
//             {unit}
//           </span>
//         )}
//       </div>
//     </div>
//   );
// }

// // ─── Upload Zone ──────────────────────────────────────────────────────────────

// function UploadZone({
//   onUploaded,
// }: {
//   onUploaded: (sessionId: string) => void;
// }) {
//   const [dragging, setDragging] = useState(false);
//   const [uploading, setUploading] = useState(false);
//   const [error, setError] = useState<string | null>(null);
//   const [recording, setRecording] = useState(false);
//   const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(
//     null
//   );
//   const [recordingTime, setRecordingTime] = useState(0);
//   const timerRef = useRef<number | null>(null);
//   const chunksRef = useRef<Blob[]>([]);
//   const inputRef = useRef<HTMLInputElement>(null);

//   const uploadFile = useCallback(
//     async (file: File) => {
//       setUploading(true);
//       setError(null);
//       try {
//         const formData = new FormData();
//         formData.append("audio", file);
//         formData.append("userId", USER_ID);
//         const res = await fetch(`${API_BASE}/sessions/upload`, {
//           method: "POST",
//           body: formData,
//         });
//         if (!res.ok) throw new Error(await res.text());
//         const data = await res.json();
//         onUploaded(data.sessionId ?? data.id);
//       } catch (e) {
//         setError(e instanceof Error ? e.message : "Upload failed");
//         setUploading(false);
//       }
//     },
//     [onUploaded]
//   );

//   const startRecording = async () => {
//     try {
//       const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
//       const mr = new MediaRecorder(stream);
//       chunksRef.current = [];
//       mr.ondataavailable = (e) => chunksRef.current.push(e.data);
//       mr.onstop = () => {
//         const blob = new Blob(chunksRef.current, { type: "audio/webm" });
//         const file = new File([blob], "recording.webm", {
//           type: "audio/webm",
//         });
//         stream.getTracks().forEach((t) => t.stop());
//         uploadFile(file);
//       };
//       mr.start();
//       setMediaRecorder(mr);
//       setRecording(true);
//       setRecordingTime(0);
//       timerRef.current = window.setInterval(
//         () => setRecordingTime((t) => t + 1),
//         1000
//       );
//     } catch {
//       setError("Could not access microphone");
//     }
//   };

//   const stopRecording = () => {
//     if (mediaRecorder) {
//       mediaRecorder.stop();
//       setMediaRecorder(null);
//     }
//     setRecording(false);
//     if (timerRef.current) clearInterval(timerRef.current);
//   };

//   return (
//     <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
//       {/* File drop zone */}
//       <div
//         onDragOver={(e) => {
//           e.preventDefault();
//           setDragging(true);
//         }}
//         onDragLeave={() => setDragging(false)}
//         onDrop={(e) => {
//           e.preventDefault();
//           setDragging(false);
//           const file = e.dataTransfer.files[0];
//           if (file) uploadFile(file);
//         }}
//         onClick={() => inputRef.current?.click()}
//         style={{
//           border: `2px dashed ${dragging ? "#a78bfa" : "rgba(255,255,255,0.12)"}`,
//           borderRadius: 16,
//           padding: "48px 32px",
//           textAlign: "center",
//           cursor: "pointer",
//           background: dragging
//             ? "rgba(167,139,250,0.06)"
//             : "rgba(255,255,255,0.02)",
//           transition: "all 0.2s ease",
//         }}
//       >
//         <input
//           ref={inputRef}
//           type="file"
//           accept="audio/*"
//           style={{ display: "none" }}
//           onChange={(e) => {
//             const file = e.target.files?.[0];
//             if (file) uploadFile(file);
//           }}
//         />
//         <div style={{ fontSize: 36, marginBottom: 12 }}>🎙️</div>
//         <p
//           style={{
//             color: "rgba(255,255,255,0.7)",
//             fontSize: 16,
//             fontWeight: 500,
//             marginBottom: 6,
//           }}
//         >
//           {uploading ? "Uploading…" : "Drop audio file here"}
//         </p>
//         <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
//           MP3, WAV, M4A, WebM, FLAC · up to 50 MB
//         </p>
//       </div>

//       {/* Record button */}
//       <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
//         <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
//         <span style={{ color: "rgba(255,255,255,0.3)", fontSize: 12, textTransform: "uppercase", letterSpacing: "0.1em" }}>or</span>
//         <div style={{ flex: 1, height: 1, background: "rgba(255,255,255,0.08)" }} />
//       </div>

//       <button
//         onClick={recording ? stopRecording : startRecording}
//         style={{
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "center",
//           gap: 10,
//           padding: "14px 24px",
//           borderRadius: 12,
//           border: "none",
//           cursor: "pointer",
//           fontSize: 15,
//           fontWeight: 600,
//           background: recording
//             ? "rgba(248,113,113,0.15)"
//             : "rgba(167,139,250,0.15)",
//           color: recording ? "#f87171" : "#a78bfa",
//           border: `1px solid ${recording ? "rgba(248,113,113,0.3)" : "rgba(167,139,250,0.3)"}`,
//           transition: "all 0.2s",
//         }}
//       >
//         {recording ? (
//           <>
//             <span
//               style={{
//                 width: 10,
//                 height: 10,
//                 borderRadius: 2,
//                 background: "#f87171",
//                 display: "inline-block",
//               }}
//             />
//             Stop Recording · {fmtDuration(recordingTime)}
//           </>
//         ) : (
//           <>
//             <span
//               style={{
//                 width: 10,
//                 height: 10,
//                 borderRadius: "50%",
//                 background: "#a78bfa",
//                 display: "inline-block",
//               }}
//             />
//             Record Audio
//           </>
//         )}
//       </button>

//       {error && (
//         <div
//           style={{
//             background: "rgba(248,113,113,0.1)",
//             border: "1px solid rgba(248,113,113,0.3)",
//             borderRadius: 10,
//             padding: "12px 16px",
//             color: "#f87171",
//             fontSize: 14,
//           }}
//         >
//           {error}
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── Analysis Panel ───────────────────────────────────────────────────────────

// function AnalysisPanel({ sessionId }: { sessionId: string }) {
//   const [status, setStatus] = useState<
//     "idle" | "analyzing" | "done" | "error"
//   >("idle");
//   const [feedback, setFeedback] = useState<Feedback | null>(null);
//   const [error, setError] = useState<string | null>(null);
//   const [activeTab, setActiveTab] = useState<"scores" | "transcript">("scores");

//   const analyze = async () => {
//     setStatus("analyzing");
//     setError(null);
//     try {
//       // Trigger analysis
//       const res = await fetch(`${API_BASE}/sessions/${sessionId}/analyze`, {
//         method: "POST",
//       });
//       if (!res.ok) throw new Error(await res.text());

//       // Poll for feedback
//       let attempts = 0;
//       while (attempts < 30) {
//         await new Promise((r) => setTimeout(r, 2000));
//         const fbRes = await fetch(`${API_BASE}/feedback/${sessionId}`);
//         if (fbRes.ok) {
//           const fb = await fbRes.json();
//           setFeedback(fb);
//           setStatus("done");
//           return;
//         }
//         attempts++;
//       }
//       throw new Error("Analysis timed out");
//     } catch (e) {
//       setError(e instanceof Error ? e.message : "Analysis failed");
//       setStatus("error");
//     }
//   };

//   if (status === "idle") {
//     return (
//       <div
//         style={{
//           display: "flex",
//           flexDirection: "column",
//           alignItems: "center",
//           gap: 20,
//           padding: "40px 24px",
//           textAlign: "center",
//         }}
//       >
//         <div style={{ fontSize: 40 }}>✅</div>
//         <div>
//           <p
//             style={{
//               color: "#fff",
//               fontSize: 18,
//               fontWeight: 600,
//               marginBottom: 6,
//             }}
//           >
//             Audio uploaded successfully
//           </p>
//           <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
//             Session ID:{" "}
//             <code
//               style={{
//                 fontFamily: "'DM Mono', monospace",
//                 color: "#a78bfa",
//                 fontSize: 12,
//               }}
//             >
//               {sessionId}
//             </code>
//           </p>
//         </div>
//         <button
//           onClick={analyze}
//           style={{
//             padding: "14px 32px",
//             borderRadius: 12,
//             border: "none",
//             background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
//             color: "#fff",
//             fontSize: 15,
//             fontWeight: 600,
//             cursor: "pointer",
//             boxShadow: "0 4px 24px rgba(124,58,237,0.4)",
//           }}
//         >
//           Analyze My Speech →
//         </button>
//       </div>
//     );
//   }

//   if (status === "analyzing") {
//     return (
//       <div
//         style={{
//           display: "flex",
//           flexDirection: "column",
//           alignItems: "center",
//           gap: 20,
//           padding: "60px 24px",
//         }}
//       >
//         <div
//           style={{
//             width: 48,
//             height: 48,
//             border: "3px solid rgba(167,139,250,0.2)",
//             borderTop: "3px solid #a78bfa",
//             borderRadius: "50%",
//             animation: "spin 1s linear infinite",
//           }}
//         />
//         <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
//         <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 15 }}>
//           Analyzing your speech…
//         </p>
//         <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 13 }}>
//           Transcribing · Scoring · Generating feedback
//         </p>
//       </div>
//     );
//   }

//   if (status === "error") {
//     return (
//       <div
//         style={{
//           padding: 24,
//           background: "rgba(248,113,113,0.08)",
//           border: "1px solid rgba(248,113,113,0.2)",
//           borderRadius: 12,
//           color: "#f87171",
//         }}
//       >
//         <p style={{ fontWeight: 600, marginBottom: 6 }}>Analysis failed</p>
//         <p style={{ fontSize: 13, opacity: 0.8 }}>{error}</p>
//         <button
//           onClick={() => setStatus("idle")}
//           style={{
//             marginTop: 12,
//             padding: "8px 16px",
//             borderRadius: 8,
//             border: "1px solid rgba(248,113,113,0.3)",
//             background: "transparent",
//             color: "#f87171",
//             cursor: "pointer",
//             fontSize: 13,
//           }}
//         >
//           Try again
//         </button>
//       </div>
//     );
//   }

//   if (!feedback) return null;
//   const { scores } = feedback;
//   const overallColor = scoreColor(scores.overallScore);

//   return (
//     <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
//       {/* Overall score hero */}
//       <div
//         style={{
//           display: "flex",
//           alignItems: "center",
//           gap: 24,
//           padding: "24px",
//           background: `linear-gradient(135deg, rgba(124,58,237,0.15), rgba(167,139,250,0.05))`,
//           border: "1px solid rgba(167,139,250,0.2)",
//           borderRadius: 16,
//         }}
//       >
//         <ScoreRing score={scores.overallScore} label="Overall" size={100} />
//         <div>
//           <p
//             style={{
//               color: overallColor,
//               fontSize: 22,
//               fontWeight: 700,
//               marginBottom: 4,
//             }}
//           >
//             {scoreLabel(scores.overallScore)}
//           </p>
//           <p style={{ color: "rgba(255,255,255,0.5)", fontSize: 14 }}>
//             {fmtDuration(scores.durationSeconds)} · {scores.totalWords} words ·{" "}
//             {Math.round(scores.wordsPerMinute)} WPM
//           </p>
//         </div>
//       </div>

//       {/* Sub-scores */}
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(3, 1fr)",
//           gap: 16,
//         }}
//       >
//         <ScoreRing score={scores.fluencyScore} label="Fluency" />
//         <ScoreRing score={scores.pauseScore} label="Pauses" />
//         <ScoreRing score={scores.vocabularyScore} label="Vocabulary" />
//       </div>

//       {/* Stats row */}
//       <div
//         style={{
//           display: "grid",
//           gridTemplateColumns: "repeat(2, 1fr)",
//           gap: 12,
//         }}
//       >
//         <StatCard
//           label="Words per Minute"
//           value={Math.round(scores.wordsPerMinute)}
//           unit="wpm"
//         />
//         <StatCard
//           label="Filler Words"
//           value={scores.pauseCount}
//           unit="detected"
//         />
//         <StatCard
//           label="Unique Word Ratio"
//           value={fmt(scores.uniqueWordRatio * 100, 1)}
//           unit="%"
//         />
//         <StatCard
//           label="Duration"
//           value={fmtDuration(scores.durationSeconds)}
//         />
//       </div>

//       {/* Tabs: Feedback / Transcript */}
//       <div>
//         <div
//           style={{
//             display: "flex",
//             gap: 4,
//             background: "rgba(255,255,255,0.04)",
//             borderRadius: 10,
//             padding: 4,
//             marginBottom: 16,
//           }}
//         >
//           {(["scores", "transcript"] as const).map((tab) => (
//             <button
//               key={tab}
//               onClick={() => setActiveTab(tab)}
//               style={{
//                 flex: 1,
//                 padding: "8px 16px",
//                 borderRadius: 8,
//                 border: "none",
//                 cursor: "pointer",
//                 fontSize: 13,
//                 fontWeight: 600,
//                 textTransform: "capitalize",
//                 transition: "all 0.15s",
//                 background:
//                   activeTab === tab ? "rgba(167,139,250,0.2)" : "transparent",
//                 color:
//                   activeTab === tab
//                     ? "#a78bfa"
//                     : "rgba(255,255,255,0.4)",
//               }}
//             >
//               {tab === "scores" ? "Feedback" : "Transcript"}
//             </button>
//           ))}
//         </div>

//         {activeTab === "scores" && (
//           <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
//             {/* AI Feedback */}
//             <div
//               style={{
//                 background: "rgba(255,255,255,0.03)",
//                 border: "1px solid rgba(255,255,255,0.07)",
//                 borderRadius: 12,
//                 padding: 20,
//               }}
//             >
//               <p
//                 style={{
//                   color: "rgba(255,255,255,0.4)",
//                   fontSize: 11,
//                   textTransform: "uppercase",
//                   letterSpacing: "0.1em",
//                   fontWeight: 600,
//                   marginBottom: 10,
//                 }}
//               >
//                 AI Feedback
//               </p>
//               <p
//                 style={{
//                   color: "rgba(255,255,255,0.8)",
//                   fontSize: 14,
//                   lineHeight: 1.7,
//                 }}
//               >
//                 {feedback.feedback}
//               </p>
//             </div>

//             {/* Strengths */}
//             {feedback.strengths.length > 0 && (
//               <div
//                 style={{
//                   background: "rgba(74,222,128,0.05)",
//                   border: "1px solid rgba(74,222,128,0.15)",
//                   borderRadius: 12,
//                   padding: 20,
//                 }}
//               >
//                 <p
//                   style={{
//                     color: "#4ade80",
//                     fontSize: 12,
//                     fontWeight: 600,
//                     textTransform: "uppercase",
//                     letterSpacing: "0.08em",
//                     marginBottom: 10,
//                   }}
//                 >
//                   ✓ Strengths
//                 </p>
//                 <ul style={{ margin: 0, paddingLeft: 20 }}>
//                   {feedback.strengths.map((s, i) => (
//                     <li
//                       key={i}
//                       style={{
//                         color: "rgba(255,255,255,0.7)",
//                         fontSize: 14,
//                         lineHeight: 1.7,
//                       }}
//                     >
//                       {s}
//                     </li>
//                   ))}
//                 </ul>
//               </div>
//             )}

//             {/* Improvements */}
//             {feedback.improvements.length > 0 && (
//               <div
//                 style={{
//                   background: "rgba(250,204,21,0.05)",
//                   border: "1px solid rgba(250,204,21,0.15)",
//                   borderRadius: 12,
//                   padding: 20,
//                 }}
//               >
//                 <p
//                   style={{
//                     color: "#facc15",
//                     fontSize: 12,
//                     fontWeight: 600,
//                     textTransform: "uppercase",
//                     letterSpacing: "0.08em",
//                     marginBottom: 10,
//                   }}
//                 >
//                   ↗ Areas to Improve
//                 </p>
//                 <ul style={{ margin: 0, paddingLeft: 20 }}>
//                   {feedback.improvements.map((s, i) => (
//                     <li
//                       key={i}
//                       style={{
//                         color: "rgba(255,255,255,0.7)",
//                         fontSize: 14,
//                         lineHeight: 1.7,
//                       }}
//                     >
//                       {s}
//                     </li>
//                   ))}
//                 </ul>
//               </div>
//             )}
//           </div>
//         )}

//         {activeTab === "transcript" && (
//           <div
//             style={{
//               background: "rgba(255,255,255,0.03)",
//               border: "1px solid rgba(255,255,255,0.07)",
//               borderRadius: 12,
//               padding: 20,
//               maxHeight: 320,
//               overflowY: "auto",
//             }}
//           >
//             <p
//               style={{
//                 color: "rgba(255,255,255,0.7)",
//                 fontSize: 14,
//                 lineHeight: 1.8,
//                 fontFamily: "'DM Mono', monospace",
//                 whiteSpace: "pre-wrap",
//               }}
//             >
//               {feedback.transcript || "No transcript available."}
//             </p>
//           </div>
//         )}
//       </div>

//       {/* New session */}
//       <button
//         onClick={() => window.location.reload()}
//         style={{
//           padding: "12px 24px",
//           borderRadius: 10,
//           border: "1px solid rgba(255,255,255,0.1)",
//           background: "transparent",
//           color: "rgba(255,255,255,0.5)",
//           fontSize: 14,
//           cursor: "pointer",
//         }}
//       >
//         ← Analyze another recording
//       </button>
//     </div>
//   );
// }

// // ─── Sessions History ─────────────────────────────────────────────────────────

// function SessionHistory({
//   onSelect,
// }: {
//   onSelect: (id: string) => void;
// }) {
//   const [sessions, setSessions] = useState<Session[] | null>(null);
//   const [loading, setLoading] = useState(false);
//   const [open, setOpen] = useState(false);

//   const load = async () => {
//     setLoading(true);
//     try {
//       const res = await fetch(`${API_BASE}/sessions?userId=${USER_ID}&limit=10`);
//       if (res.ok) setSessions(await res.json());
//     } finally {
//       setLoading(false);
//     }
//   };

//   const toggle = () => {
//     if (!open && !sessions) load();
//     setOpen((o) => !o);
//   };

//   return (
//     <div>
//       <button
//         onClick={toggle}
//         style={{
//           width: "100%",
//           padding: "10px 16px",
//           borderRadius: 10,
//           border: "1px solid rgba(255,255,255,0.08)",
//           background: "rgba(255,255,255,0.03)",
//           color: "rgba(255,255,255,0.5)",
//           fontSize: 13,
//           cursor: "pointer",
//           display: "flex",
//           alignItems: "center",
//           justifyContent: "space-between",
//         }}
//       >
//         <span>Past sessions</span>
//         <span>{open ? "▲" : "▼"}</span>
//       </button>

//       {open && (
//         <div
//           style={{
//             marginTop: 8,
//             background: "rgba(255,255,255,0.02)",
//             border: "1px solid rgba(255,255,255,0.07)",
//             borderRadius: 12,
//             overflow: "hidden",
//           }}
//         >
//           {loading && (
//             <p
//               style={{
//                 padding: 16,
//                 color: "rgba(255,255,255,0.3)",
//                 fontSize: 13,
//               }}
//             >
//               Loading…
//             </p>
//           )}
//           {sessions?.length === 0 && (
//             <p
//               style={{
//                 padding: 16,
//                 color: "rgba(255,255,255,0.3)",
//                 fontSize: 13,
//               }}
//             >
//               No past sessions found.
//             </p>
//           )}
//           {sessions?.map((s) => (
//             <div
//               key={s.id}
//               onClick={() => s.status === "completed" && onSelect(s.id)}
//               style={{
//                 padding: "12px 16px",
//                 borderBottom: "1px solid rgba(255,255,255,0.05)",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "space-between",
//                 cursor: s.status === "completed" ? "pointer" : "default",
//                 opacity: s.status === "completed" ? 1 : 0.5,
//               }}
//             >
//               <div>
//                 <p
//                   style={{
//                     color: "rgba(255,255,255,0.8)",
//                     fontSize: 13,
//                     fontFamily: "'DM Mono', monospace",
//                   }}
//                 >
//                   {s.id.slice(0, 8)}…
//                 </p>
//                 <p style={{ color: "rgba(255,255,255,0.3)", fontSize: 11 }}>
//                   {new Date(s.createdAt).toLocaleDateString()}
//                 </p>
//               </div>
//               {s.overallScore != null ? (
//                 <span
//                   style={{
//                     fontSize: 18,
//                     fontWeight: 700,
//                     color: scoreColor(s.overallScore),
//                     fontFamily: "'DM Mono', monospace",
//                   }}
//                 >
//                   {Math.round(s.overallScore)}
//                 </span>
//               ) : (
//                 <span
//                   style={{
//                     fontSize: 11,
//                     color: "rgba(255,255,255,0.3)",
//                     textTransform: "uppercase",
//                   }}
//                 >
//                   {s.status}
//                 </span>
//               )}
//             </div>
//           ))}
//         </div>
//       )}
//     </div>
//   );
// }

// // ─── App ──────────────────────────────────────────────────────────────────────

// export default function App() {
//   const [sessionId, setSessionId] = useState<string | null>(null);

//   return (
//     <>
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=DM+Mono:wght@400;500&family=Syne:wght@400;600;700;800&display=swap');
//         *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
//         body {
//           background: #0c0c12;
//           min-height: 100vh;
//           font-family: 'Syne', sans-serif;
//           color: #fff;
//         }
//         ::-webkit-scrollbar { width: 4px; }
//         ::-webkit-scrollbar-track { background: transparent; }
//         ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 4px; }
//       `}</style>

//       <div
//         style={{
//           minHeight: "100vh",
//           background:
//             "radial-gradient(ellipse 80% 60% at 50% -10%, rgba(124,58,237,0.25) 0%, transparent 60%), #0c0c12",
//           display: "flex",
//           flexDirection: "column",
//           alignItems: "center",
//           padding: "40px 16px 80px",
//         }}
//       >
//         {/* Header */}
//         <div style={{ width: "100%", maxWidth: 520, marginBottom: 40 }}>
//           <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 6 }}>
//             <div
//               style={{
//                 width: 36,
//                 height: 36,
//                 borderRadius: 10,
//                 background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
//                 display: "flex",
//                 alignItems: "center",
//                 justifyContent: "center",
//                 fontSize: 18,
//               }}
//             >
//               🎙
//             </div>
//             <h1
//               style={{
//                 fontSize: 22,
//                 fontWeight: 800,
//                 background: "linear-gradient(90deg, #fff, rgba(255,255,255,0.6))",
//                 WebkitBackgroundClip: "text",
//                 WebkitTextFillColor: "transparent",
//               }}
//             >
//               SpeechCoach
//             </h1>
//           </div>
//           <p style={{ color: "rgba(255,255,255,0.35)", fontSize: 14, paddingLeft: 48 }}>
//             AI-powered speech analysis & feedback
//           </p>
//         </div>

//         {/* Main card */}
//         <div
//           style={{
//             width: "100%",
//             maxWidth: 520,
//             background: "rgba(255,255,255,0.03)",
//             border: "1px solid rgba(255,255,255,0.08)",
//             borderRadius: 20,
//             padding: 28,
//             backdropFilter: "blur(12px)",
//             display: "flex",
//             flexDirection: "column",
//             gap: 24,
//           }}
//         >
//           {sessionId ? (
//             <AnalysisPanel sessionId={sessionId} />
//           ) : (
//             <>
//               <div>
//                 <h2
//                   style={{
//                     fontSize: 18,
//                     fontWeight: 700,
//                     marginBottom: 6,
//                   }}
//                 >
//                   Upload your speech
//                 </h2>
//                 <p style={{ color: "rgba(255,255,255,0.4)", fontSize: 14 }}>
//                   Get instant AI feedback on fluency, pacing, vocabulary, and
//                   more.
//                 </p>
//               </div>
//               <UploadZone onUploaded={setSessionId} />
//               <SessionHistory onSelect={setSessionId} />
//             </>
//           )}
//         </div>
//       </div>
//     </>
//   );
// }