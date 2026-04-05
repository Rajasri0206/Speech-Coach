import { useParams, Link } from "wouter";
import { useGetSession, useGetSessionFeedback } from "@workspace/api-client-react";
import { ArrowLeft, Clock, Calendar, Volume2, FileText, CheckCircle2, AlertTriangle, TrendingUp, RefreshCw, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ScoreGauge } from "@/components/score-gauge";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

export function SessionDetail() {
  const params = useParams();
  const sessionId = params.id ? parseInt(params.id, 10) : 0;

  const { data: sessionDetail, isLoading: isLoadingSession, error: sessionError } = useGetSession(sessionId);
  const { data: feedbackData, isLoading: isLoadingFeedback } = useGetSessionFeedback(sessionId, {
    query: {
      enabled: !!sessionId && sessionDetail?.session?.status === "analyzed"
    }
  });

  if (isLoadingSession) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-1/4 mb-4" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          <Skeleton className="h-40 col-span-1 md:col-span-4 rounded-xl" />
          <Skeleton className="h-64 col-span-1 md:col-span-3 rounded-xl" />
          <Skeleton className="h-64 col-span-1 rounded-xl" />
        </div>
      </div>
    );
  }

  if (sessionError || !sessionDetail) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="w-12 h-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Session not found</h2>
        <p className="text-muted-foreground mt-2 mb-6">We couldn't load the details for this session.</p>
        <Button asChild>
          <Link href="/sessions">Back to Sessions</Link>
        </Button>
      </div>
    );
  }

  const { session } = sessionDetail;
  const isAnalyzing = session.status === "analyzing" || session.status === "uploaded";

  return (
    <div className="space-y-6 animate-in fade-in duration-500 pb-10">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/sessions"><ArrowLeft className="w-5 h-5" /></Link>
        </Button>
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center gap-3">
            Session {session.id}
            {isAnalyzing ? (
              <Badge variant="secondary" className="flex items-center gap-1 font-normal bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                <RefreshCw className="w-3 h-3 animate-spin" /> Processing
              </Badge>
            ) : (
              <Badge variant="default" className="font-normal bg-primary/10 text-primary hover:bg-primary/20">Analyzed</Badge>
            )}
          </h1>
          <div className="flex items-center gap-4 text-sm text-muted-foreground mt-1">
            <span className="flex items-center gap-1.5"><Calendar className="w-4 h-4" /> {format(new Date(session.createdAt), "MMMM d, yyyy")}</span>
            {session.durationSeconds && (
              <span className="flex items-center gap-1.5"><Clock className="w-4 h-4" /> {Math.round(session.durationSeconds)} seconds</span>
            )}
          </div>
        </div>
      </div>

      <Card className="border-border/60 shadow-sm overflow-hidden bg-card">
        <div className="px-6 py-4 border-b border-border flex items-center gap-4 bg-muted/20">
          <div className="p-3 rounded-full bg-primary/10 text-primary">
            <Volume2 className="w-5 h-5" />
          </div>
          <audio src={session.audioPath} controls className="w-full max-w-md h-10" />
        </div>

        {isAnalyzing ? (
          <div className="p-12 flex flex-col items-center justify-center text-center">
            <Loader2 className="w-12 h-12 text-primary animate-spin mb-4" />
            <h3 className="text-xl font-bold">AI is analyzing your speech</h3>
            <p className="text-muted-foreground mt-2 max-w-md">We are currently processing your audio to evaluate fluency, vocabulary, and pacing. This usually takes a few seconds.</p>
          </div>
        ) : (
          <div className="p-6 md:p-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 justify-items-center">
              <ScoreGauge 
                score={session.overallScore} 
                label="Overall Score" 
                size="lg" 
                colorClass="text-primary" 
              />
              <ScoreGauge 
                score={session.fluencyScore} 
                label="Fluency" 
                size="md" 
                colorClass="text-chart-2" 
                className="mt-3 md:mt-6"
              />
              <ScoreGauge 
                score={session.pauseScore} 
                label="Pacing" 
                size="md" 
                colorClass="text-chart-3" 
                className="mt-3 md:mt-6"
              />
              <ScoreGauge 
                score={session.vocabularyScore} 
                label="Vocabulary" 
                size="md" 
                colorClass="text-chart-4" 
                className="mt-3 md:mt-6"
              />
            </div>

            <Separator className="my-8" />

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="md:col-span-2 space-y-6">
                <section>
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <FileText className="w-5 h-5 text-muted-foreground" /> Transcript
                  </h3>
                  <div className="p-5 rounded-xl bg-secondary/50 border border-border/50 text-foreground leading-relaxed font-serif">
                    {session.transcript ? (
                      <p>{session.transcript}</p>
                    ) : (
                      <p className="text-muted-foreground italic">No transcript available.</p>
                    )}
                  </div>
                </section>

                <section>
                  <h3 className="text-lg font-bold flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-muted-foreground" /> Detailed Feedback
                  </h3>
                  {isLoadingFeedback ? (
                    <Skeleton className="h-32 rounded-xl w-full" />
                  ) : feedbackData ? (
                    <div className="p-5 rounded-xl bg-primary/5 border border-primary/10 text-foreground leading-relaxed">
                      <p>{feedbackData.feedback}</p>
                    </div>
                  ) : (
                    <p className="text-muted-foreground">Feedback is not available yet.</p>
                  )}
                </section>
              </div>

              <div className="space-y-6">
                {isLoadingFeedback ? (
                  <>
                    <Skeleton className="h-40 rounded-xl w-full" />
                    <Skeleton className="h-40 rounded-xl w-full" />
                  </>
                ) : feedbackData ? (
                  <>
                    <Card className="border-green-200 bg-green-50/50 shadow-none dark:border-green-900/30 dark:bg-green-900/10">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base text-green-700 dark:text-green-400 flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4" /> Strengths
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {feedbackData.strengths.map((strength, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-green-900 dark:text-green-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-green-500 mt-1.5 shrink-0" />
                              {strength}
                            </li>
                          ))}
                          {feedbackData.strengths.length === 0 && (
                            <li className="text-sm text-green-700/70 dark:text-green-400/70 italic">No specific strengths highlighted in this session.</li>
                          )}
                        </ul>
                      </CardContent>
                    </Card>

                    <Card className="border-orange-200 bg-orange-50/50 shadow-none dark:border-orange-900/30 dark:bg-orange-900/10">
                      <CardHeader className="pb-3">
                        <CardTitle className="text-base text-orange-700 dark:text-orange-400 flex items-center gap-2">
                          <AlertTriangle className="w-4 h-4" /> Areas to Improve
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <ul className="space-y-2">
                          {feedbackData.improvements.map((improvement, i) => (
                            <li key={i} className="flex items-start gap-2 text-sm text-orange-900 dark:text-orange-100">
                              <span className="w-1.5 h-1.5 rounded-full bg-orange-500 mt-1.5 shrink-0" />
                              {improvement}
                            </li>
                          ))}
                          {feedbackData.improvements.length === 0 && (
                            <li className="text-sm text-orange-700/70 dark:text-orange-400/70 italic">No specific areas to improve highlighted.</li>
                          )}
                        </ul>
                      </CardContent>
                    </Card>
                  </>
                ) : null}

                <Card className="border-border/50 shadow-none bg-secondary/20">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2 text-muted-foreground">
                      <BarChart3 className="w-4 h-4" /> Speech Metrics
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <dl className="space-y-3 text-sm">
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Words per minute</dt>
                        <dd className="font-semibold">{session.wordsPerMinute ? Math.round(session.wordsPerMinute) : "-"}</dd>
                      </div>
                      <Separator className="bg-border/50" />
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Total Words</dt>
                        <dd className="font-semibold">{sessionDetail.scores?.totalWords ?? "-"}</dd>
                      </div>
                      <Separator className="bg-border/50" />
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Unique Word Ratio</dt>
                        <dd className="font-semibold">{sessionDetail.scores?.uniqueWordRatio ? `${Math.round(sessionDetail.scores.uniqueWordRatio * 100)}%` : "-"}</dd>
                      </div>
                      <Separator className="bg-border/50" />
                      <div className="flex justify-between">
                        <dt className="text-muted-foreground">Pause Count</dt>
                        <dd className="font-semibold">{sessionDetail.scores?.pauseCount ?? "-"}</dd>
                      </div>
                    </dl>
                  </CardContent>
                </Card>

              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}

function BarChart3(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 3v18h18" />
      <path d="M18 17V9" />
      <path d="M13 17V5" />
      <path d="M8 17v-3" />
    </svg>
  );
}
