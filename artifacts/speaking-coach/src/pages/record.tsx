import { useState, useRef, useEffect } from "react";
import { useUploadAudio, useAnalyzeSession } from "@workspace/api-client-react";
import { useLocation } from "wouter";
import { Mic, Square, UploadCloud, Loader2, AlertCircle, Volume2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useToast } from "@/hooks/use-toast";

export function RecordSession() {
  const [, setLocation] = useLocation();
  const { toast } = useToast();
  
  const [isRecording, setIsRecording] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "uploading" | "analyzing" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const analyzerRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | null>(null);

  const uploadAudioMutation = useUploadAudio();
  const analyzeSessionMutation = useAnalyzeSession();

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
        mediaRecorderRef.current.stop();
      }
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      if (audioContextRef.current) audioContextRef.current.close();
    };
  }, []);

  const drawWaveform = () => {
    if (!analyzerRef.current || !canvasRef.current) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const bufferLength = analyzerRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    ctx.clearRect(0, 0, width, height);

    analyzerRef.current.getByteTimeDomainData(dataArray);

    ctx.lineWidth = 2;
    ctx.strokeStyle = "hsl(var(--primary))";
    ctx.beginPath();

    const sliceWidth = (width * 1.0) / bufferLength;
    let x = 0;

    for (let i = 0; i < bufferLength; i++) {
      const v = dataArray[i] / 128.0;
      const y = (v * height) / 2;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }

      x += sliceWidth;
    }

    ctx.lineTo(canvas.width, canvas.height / 2);
    ctx.stroke();

    animationRef.current = requestAnimationFrame(drawWaveform);
  };

  const startRecording = async () => {
    setAudioBlob(null);
    setAudioUrl(null);
    setErrorMessage("");
    setRecordingTime(0);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      // Setup audio analyzer for waveform
      audioContextRef.current = new AudioContext();
      analyzerRef.current = audioContextRef.current.createAnalyser();
      const source = audioContextRef.current.createMediaStreamSource(stream);
      source.connect(analyzerRef.current);
      analyzerRef.current.fftSize = 2048;
      
      if (canvasRef.current) {
        // Fix for retina displays
        const rect = canvasRef.current.getBoundingClientRect();
        canvasRef.current.width = rect.width * window.devicePixelRatio;
        canvasRef.current.height = rect.height * window.devicePixelRatio;
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
      }
      
      drawWaveform();

      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        setAudioBlob(audioBlob);
        const audioUrl = URL.createObjectURL(audioBlob);
        setAudioUrl(audioUrl);
        stream.getTracks().forEach((track) => track.stop());
        
        if (animationRef.current) cancelAnimationFrame(animationRef.current);
        if (canvasRef.current) {
          const ctx = canvasRef.current.getContext("2d");
          if (ctx) ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      };

      mediaRecorder.start();
      setIsRecording(true);

      timerRef.current = setInterval(() => {
        setRecordingTime((prev) => prev + 1);
      }, 1000);
    } catch (err) {
      console.error("Error accessing microphone:", err);
      setErrorMessage("Could not access microphone. Please ensure permissions are granted.");
      toast({
        title: "Microphone Access Denied",
        description: "Please check your browser permissions.",
        variant: "destructive",
      });
    }
  };

  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) clearInterval(timerRef.current);
    }
  };

  const submitRecording = async () => {
    if (!audioBlob) return;

    setUploadStatus("uploading");
    
    try {
      // 1. Upload the audio
      const file = new File([audioBlob], `recording-${Date.now()}.webm`, { type: "audio/webm" });
      const uploadFormData = new FormData();
      uploadFormData.append("audio", file);
      uploadFormData.append("userId", "demo-user");
      
      const uploadResult = await uploadAudioMutation.mutateAsync({ data: { audio: file, userId: "demo-user" } });
      
      // 2. Trigger analysis
      setUploadStatus("analyzing");
      await analyzeSessionMutation.mutateAsync({ sessionId: uploadResult.sessionId });
      
      // 3. Redirect to session detail
      setUploadStatus("success");
      toast({
        title: "Session Analyzed successfully!",
        description: "Your speech scores and feedback are ready.",
      });
      setLocation(`/sessions/${uploadResult.sessionId}`);
      
    } catch (err: any) {
      console.error("Failed to process session", err);
      setUploadStatus("error");
      setErrorMessage(err.message || "Failed to process your recording.");
      toast({
        title: "Processing Failed",
        description: "There was an error analyzing your audio.",
        variant: "destructive",
      });
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
  };

  return (
    <div className="max-w-2xl mx-auto py-8 animate-in fade-in duration-500">
      <div className="text-center mb-10">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">Record Session</h1>
        <p className="text-muted-foreground mt-2">Speak naturally for at least 30 seconds for the best feedback.</p>
      </div>

      <Card className="border-2 border-border/60 shadow-lg relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 to-transparent pointer-events-none" />
        
        <CardContent className="pt-12 pb-10 flex flex-col items-center relative z-10">
          <div className="w-full max-w-md mx-auto h-32 mb-8 relative flex items-center justify-center bg-secondary/50 rounded-xl border border-border/50 overflow-hidden">
            {isRecording ? (
              <canvas ref={canvasRef} className="w-full h-full" style={{ width: '100%', height: '100%' }} />
            ) : audioUrl ? (
              <div className="w-full px-8 py-4 flex flex-col items-center justify-center">
                <Volume2 className="w-8 h-8 text-primary mb-2 opacity-50" />
                <audio src={audioUrl} controls className="w-full" />
              </div>
            ) : (
              <div className="text-muted-foreground flex flex-col items-center justify-center opacity-50">
                <Mic className="w-8 h-8 mb-2" />
                <span className="text-sm font-medium">Ready to record</span>
              </div>
            )}
          </div>

          <div className="text-4xl font-mono tracking-wider font-bold mb-8">
            {formatTime(recordingTime)}
          </div>

          {errorMessage && (
            <Alert variant="destructive" className="mb-6 w-full">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="flex gap-4">
            {!isRecording && !audioBlob && (
              <Button
                size="lg"
                onClick={startRecording}
                className="rounded-full w-32 h-32 flex flex-col gap-2 bg-primary hover:bg-primary/90 shadow-xl"
              >
                <Mic size={32} />
                <span className="font-bold text-lg">Start</span>
              </Button>
            )}

            {isRecording && (
              <Button
                size="lg"
                variant="destructive"
                onClick={stopRecording}
                className="rounded-full w-32 h-32 flex flex-col gap-2 shadow-xl animate-pulse"
              >
                <Square size={32} fill="currentColor" />
                <span className="font-bold text-lg">Stop</span>
              </Button>
            )}

            {!isRecording && audioBlob && (
              <div className="flex gap-4">
                <Button
                  size="lg"
                  variant="outline"
                  onClick={() => { setAudioBlob(null); setAudioUrl(null); setRecordingTime(0); }}
                  disabled={uploadStatus === "uploading" || uploadStatus === "analyzing"}
                  className="rounded-full px-8 h-14"
                >
                  Discard
                </Button>
                <Button
                  size="lg"
                  onClick={submitRecording}
                  disabled={uploadStatus === "uploading" || uploadStatus === "analyzing"}
                  className="rounded-full px-8 h-14 shadow-md bg-primary text-primary-foreground"
                >
                  {(uploadStatus === "uploading" || uploadStatus === "analyzing") ? (
                    <>
                      <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                      {uploadStatus === "uploading" ? "Uploading..." : "Analyzing AI..."}
                    </>
                  ) : (
                    <>
                      <UploadCloud className="w-5 h-5 mr-2" />
                      Get Feedback
                    </>
                  )}
                </Button>
              </div>
            )}
          </div>
        </CardContent>
        <CardFooter className="bg-muted/30 border-t border-border px-6 py-4 text-sm text-center justify-center text-muted-foreground">
          Your audio is processed securely and is only used for your personal feedback.
        </CardFooter>
      </Card>
    </div>
  );
}
