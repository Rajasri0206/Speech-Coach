import { useGetUserProgress, useGetUserProgressSummary } from "@workspace/api-client-react";
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  ResponsiveContainer, Legend 
} from "recharts";
import { format } from "date-fns";
import { TrendingUp, Award, CalendarDays, Mic2 } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export function Progress() {
  const { data: progress, isLoading: isLoadingProgress } = useGetUserProgress("demo-user", { days: 30 });
  const { data: summary, isLoading: isLoadingSummary } = useGetUserProgressSummary("demo-user");

  const chartData = progress?.dataPoints.map(dp => ({
    ...dp,
    formattedDate: format(new Date(dp.date), "MMM d"),
    overall: dp.overallScore ? Math.round(dp.overallScore) : null,
    fluency: dp.fluencyScore ? Math.round(dp.fluencyScore) : null,
    pacing: dp.pauseScore ? Math.round(dp.pauseScore) : null,
    vocabulary: dp.vocabularyScore ? Math.round(dp.vocabularyScore) : null,
  })) || [];

  return (
    <div className="space-y-8 animate-in fade-in duration-500 pb-10">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Your Progress</h1>
        <p className="text-muted-foreground mt-1">Track your speaking improvements over the last 30 days.</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard 
          title="Total Sessions" 
          value={summary?.totalSessions} 
          icon={Mic2} 
          isLoading={isLoadingSummary} 
          trend={null}
        />
        <StatCard 
          title="Days Tracked" 
          value={progress?.daysTracked} 
          icon={CalendarDays} 
          isLoading={isLoadingProgress}
          trend={null}
        />
        <StatCard 
          title="Avg Overall Score" 
          value={summary?.avgOverallScore ? Math.round(summary.avgOverallScore) : null} 
          icon={Award} 
          isLoading={isLoadingSummary}
          suffix="/100"
        />
        <StatCard 
          title="Total Improvement" 
          value={summary?.improvementPercent ? Math.round(summary.improvementPercent) : null} 
          icon={TrendingUp} 
          isLoading={isLoadingSummary}
          suffix="%"
          trend={summary?.improvementPercent ? summary.improvementPercent > 0 ? "up" : "down" : null}
          colorClass={summary?.improvementPercent && summary.improvementPercent > 0 ? "text-green-500" : "text-foreground"}
        />
      </div>

      <Card className="border-border/60 shadow-sm pt-6">
        <CardContent>
          <Tabs defaultValue="overall" className="w-full">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4">
              <CardTitle className="text-xl">Score History</CardTitle>
              <TabsList className="bg-secondary/50">
                <TabsTrigger value="overall">Overall</TabsTrigger>
                <TabsTrigger value="fluency">Fluency</TabsTrigger>
                <TabsTrigger value="pacing">Pacing</TabsTrigger>
                <TabsTrigger value="vocabulary">Vocabulary</TabsTrigger>
              </TabsList>
            </div>

            {isLoadingProgress ? (
              <Skeleton className="w-full h-[400px] rounded-xl" />
            ) : chartData.length > 0 ? (
              <div className="h-[400px] w-full mt-4">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 20, right: 30, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis 
                      dataKey="formattedDate" 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      dy={10}
                    />
                    <YAxis 
                      domain={[0, 100]} 
                      axisLine={false}
                      tickLine={false}
                      tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                      dx={-10}
                    />
                    <RechartsTooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--card))', 
                        borderColor: 'hsl(var(--border))',
                        borderRadius: '8px',
                        boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)'
                      }}
                      itemStyle={{ color: 'hsl(var(--foreground))', fontWeight: 600 }}
                      labelStyle={{ color: 'hsl(var(--muted-foreground))', marginBottom: '4px' }}
                    />
                    
                    <TabsContent value="overall" className="m-0 border-none outline-none">
                      <Line 
                        type="monotone" 
                        dataKey="overall" 
                        name="Overall Score" 
                        stroke="hsl(var(--primary))" 
                        strokeWidth={4} 
                        dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--card))' }} 
                        activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(var(--primary))' }}
                        connectNulls
                      />
                    </TabsContent>
                    
                    <TabsContent value="fluency" className="m-0 border-none outline-none">
                      <Line 
                        type="monotone" 
                        dataKey="fluency" 
                        name="Fluency" 
                        stroke="hsl(var(--chart-2))" 
                        strokeWidth={4} 
                        dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--card))' }} 
                        activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(var(--chart-2))' }}
                        connectNulls
                      />
                    </TabsContent>

                    <TabsContent value="pacing" className="m-0 border-none outline-none">
                      <Line 
                        type="monotone" 
                        dataKey="pacing" 
                        name="Pacing" 
                        stroke="hsl(var(--chart-3))" 
                        strokeWidth={4} 
                        dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--card))' }} 
                        activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(var(--chart-3))' }}
                        connectNulls
                      />
                    </TabsContent>

                    <TabsContent value="vocabulary" className="m-0 border-none outline-none">
                      <Line 
                        type="monotone" 
                        dataKey="vocabulary" 
                        name="Vocabulary" 
                        stroke="hsl(var(--chart-4))" 
                        strokeWidth={4} 
                        dot={{ r: 4, strokeWidth: 2, fill: 'hsl(var(--card))' }} 
                        activeDot={{ r: 6, strokeWidth: 0, fill: 'hsl(var(--chart-4))' }}
                        connectNulls
                      />
                    </TabsContent>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="h-[400px] flex flex-col items-center justify-center text-muted-foreground bg-secondary/20 rounded-xl border border-dashed border-border mt-4">
                <LineChart className="w-12 h-12 mb-4 opacity-20" />
                <p>Not enough data to show progress yet.</p>
                <p className="text-sm mt-1">Complete some practice sessions to see your charts.</p>
              </div>
            )}
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ title, value, icon: Icon, isLoading, suffix = "", trend, colorClass = "text-foreground" }: any) {
  return (
    <Card className="border-border/50 shadow-sm">
      <CardContent className="p-6">
        <div className="flex items-center justify-between space-y-0 pb-2">
          <p className="text-sm font-medium text-muted-foreground">{title}</p>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </div>
        {isLoading ? (
          <Skeleton className="h-8 w-20 mt-1" />
        ) : (
          <div className="flex items-baseline gap-1 mt-1">
            <div className={`text-3xl font-bold tracking-tight ${colorClass}`}>
              {trend === "up" && "+"}{value !== null && value !== undefined ? value : "-"}
            </div>
            {value !== null && value !== undefined && suffix && (
              <div className="text-sm font-medium text-muted-foreground">{suffix}</div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
