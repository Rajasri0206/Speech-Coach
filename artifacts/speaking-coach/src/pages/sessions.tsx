import { useState } from "react";
import { useListSessions } from "@workspace/api-client-react";
import { Link } from "wouter";
import { format } from "date-fns";
import { Mic, PlayCircle, Clock, Calendar, BarChart3, ChevronLeft, ChevronRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";

export function Sessions() {
  const [page, setPage] = useState(0);
  const limit = 10;
  
  const { data, isLoading } = useListSessions({ 
    userId: "demo-user", 
    limit, 
    offset: page * limit 
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Session History</h1>
          <p className="text-muted-foreground mt-1">Review your past practice sessions and feedback.</p>
        </div>
        <Button asChild>
          <Link href="/record">
            <Mic className="mr-2 h-4 w-4" />
            New Session
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {[...Array(5)].map((_, i) => (
            <Skeleton key={i} className="h-24 w-full rounded-xl" />
          ))}
        </div>
      ) : data?.sessions && data.sessions.length > 0 ? (
        <>
          <div className="space-y-4">
            {data.sessions.map((session) => (
              <Link key={session.id} href={`/sessions/${session.id}`}>
                <Card className="group hover:border-primary/50 transition-all cursor-pointer border-border/50 shadow-sm hover:shadow-md p-4 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-secondary flex items-center justify-center text-foreground group-hover:bg-primary group-hover:text-primary-foreground transition-colors shrink-0">
                      <PlayCircle className="w-6 h-6" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-lg flex items-center gap-2">
                        Session {session.id}
                        {session.status === "analyzed" ? (
                          <Badge variant="default" className="bg-primary/10 text-primary hover:bg-primary/20 font-normal">Analyzed</Badge>
                        ) : (
                          <Badge variant="secondary" className="font-normal capitalize">{session.status}</Badge>
                        )}
                      </h3>
                      <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground mt-1">
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          {format(new Date(session.createdAt), "MMM d, yyyy 'at' h:mm a")}
                        </span>
                        {session.durationSeconds && (
                          <span className="flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            {Math.round(session.durationSeconds)}s
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  
                  {session.overallScore && (
                    <div className="flex items-center gap-6 md:pl-4 md:border-l border-border/50 self-end md:self-center">
                      <div className="text-right">
                        <div className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1 flex items-center justify-end gap-1">
                          <BarChart3 className="w-3 h-3" /> Overall
                        </div>
                        <div className="text-2xl font-bold text-foreground">
                          {Math.round(session.overallScore)}
                          <span className="text-sm font-normal text-muted-foreground">/100</span>
                        </div>
                      </div>
                    </div>
                  )}
                </Card>
              </Link>
            ))}
          </div>

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-4">
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setPage(p => Math.max(0, p - 1))}
                disabled={page === 0}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="text-sm font-medium text-muted-foreground px-4">
                Page {page + 1} of {totalPages}
              </div>
              <Button 
                variant="outline" 
                size="icon" 
                onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                disabled={page >= totalPages - 1}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          )}
        </>
      ) : (
        <Card className="flex flex-col items-center justify-center p-16 text-center border-dashed">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-4">
            <Mic className="w-8 h-8 text-primary" />
          </div>
          <h3 className="text-xl font-bold">No sessions found</h3>
          <p className="text-muted-foreground mt-2 max-w-md">You haven't recorded any sessions yet. Start practicing to get detailed feedback and track your progress.</p>
          <Button asChild className="mt-6">
            <Link href="/record">Start First Session</Link>
          </Button>
        </Card>
      )}
    </div>
  );
}
