import { useGetUserProgressSummary, useListSessions } from "@workspace/api-client-react";
import { Link } from "wouter";
import { Mic, ArrowRight, Activity, Zap, Trophy, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

export function Home() {
  const { data: summary, isLoading: isLoadingSummary } = useGetUserProgressSummary("demo-user");
  const { data: sessionsData, isLoading: isLoadingSessions } = useListSessions({ userId: "demo-user", limit: 3 });

  return (
    <div className="space-y-8 pb-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Welcome back, Demo User</h1>
          <p className="text-muted-foreground mt-1">Ready for your daily speaking practice?</p>
        </div>
        <Button asChild size="lg" className="rounded-full px-8 shadow-md">
          <Link href="/record">
            <Mic className="mr-2 h-5 w-5" />
            Start New Session
          </Link>
        </Button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
          <div className="h-1 bg-chart-1 w-full" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Zap className="h-4 w-4 text-chart-1" /> Current Streak
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-foreground">{summary?.streak || 0}</span>
                <span className="text-sm font-medium text-muted-foreground">days</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
          <div className="h-1 bg-chart-2 w-full" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Activity className="h-4 w-4 text-chart-2" /> Overall Avg Score
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-foreground">{summary?.avgOverallScore ? Math.round(summary.avgOverallScore) : "-"}</span>
                <span className="text-sm font-medium text-muted-foreground">/ 100</span>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-card border-border/50 shadow-sm overflow-hidden">
          <div className="h-1 bg-chart-4 w-full" />
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Trophy className="h-4 w-4 text-chart-4" /> Improvement
            </CardTitle>
          </CardHeader>
          <CardContent>
            {isLoadingSummary ? (
              <Skeleton className="h-10 w-24" />
            ) : (
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-bold text-foreground">
                  {summary?.improvementPercent ? `${summary.improvementPercent > 0 ? "+" : ""}${Math.round(summary.improvementPercent)}` : "-"}%
                </span>
                <span className="text-sm font-medium text-muted-foreground">vs start</span>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-bold tracking-tight">Recent Sessions</h2>
          <Button variant="ghost" asChild className="text-muted-foreground hover:text-foreground">
            <Link href="/sessions">
              View all <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>

        {isLoadingSessions ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map(i => <Skeleton key={i} className="h-40 rounded-xl" />)}
          </div>
        ) : sessionsData?.sessions && sessionsData.sessions.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {sessionsData.sessions.map((session) => (
              <Link key={session.id} href={`/sessions/${session.id}`}>
                <Card className="group hover:border-primary/50 transition-all cursor-pointer h-full border-border/50 shadow-sm hover:shadow-md">
                  <CardHeader className="pb-2">
                    <div className="flex justify-between items-start">
                      <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                        <PlayCircle className="w-5 h-5" />
                      </div>
                      {session.overallScore && (
                        <div className="font-bold text-lg bg-primary/10 text-primary px-3 py-1 rounded-full">
                          {Math.round(session.overallScore)}
                        </div>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CardTitle className="text-lg mt-2">{format(new Date(session.createdAt), "MMM d, yyyy")}</CardTitle>
                    <CardDescription className="mt-1 flex items-center gap-2">
                      {session.durationSeconds ? `${Math.round(session.durationSeconds)}s` : "Unknown duration"} • 
                      <span className="capitalize">{session.status}</span>
                    </CardDescription>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        ) : (
          <Card className="bg-secondary/50 border-dashed border-border flex flex-col items-center justify-center p-12 text-center">
            <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
              <Mic className="w-8 h-8 text-primary" />
            </div>
            <h3 className="text-lg font-bold">No sessions yet</h3>
            <p className="text-muted-foreground mt-2 max-w-sm">Record your first speaking session to get AI feedback on your fluency and vocabulary.</p>
            <Button asChild className="mt-6">
              <Link href="/record">Record Session</Link>
            </Button>
          </Card>
        )}
      </div>
    </div>
  );
}
