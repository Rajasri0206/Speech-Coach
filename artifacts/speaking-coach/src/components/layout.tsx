import React from "react";
import { Link, useLocation } from "wouter";
import { Mic, LayoutDashboard, History, LineChart, PlayCircle, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";

export function Layout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navItems = [
    { label: "Dashboard", href: "/", icon: LayoutDashboard },
    { label: "Record Session", href: "/record", icon: Mic },
    { label: "History", href: "/sessions", icon: History },
    { label: "Progress", href: "/progress", icon: LineChart },
  ];

  return (
    <div className="flex min-h-screen w-full bg-background">
      {/* Sidebar */}
      <aside className="w-64 border-r border-border bg-card hidden md:flex flex-col">
        <div className="p-6">
          <Link href="/" className="flex items-center gap-3 text-primary font-bold text-xl tracking-tight cursor-pointer">
            <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
              <PlayCircle size={20} className="fill-primary text-card" />
            </div>
            EchoCoach
          </Link>
        </div>

        <nav className="flex-1 px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = location === item.href || (item.href !== "/" && location.startsWith(item.href));
            return (
              <Link key={item.href} href={item.href} className={`flex items-center gap-3 px-3 py-2.5 rounded-md transition-colors ${isActive ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-secondary hover:text-foreground"}`}>
                <item.icon size={18} />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-border">
          <div className="flex items-center gap-3 px-3 py-2 text-sm text-muted-foreground">
            <div className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-foreground font-medium border border-border">
              DU
            </div>
            <div className="flex-1 overflow-hidden">
              <p className="text-foreground font-medium truncate">Demo User</p>
              <p className="text-xs truncate">Daily Learner</p>
            </div>
            <Settings size={16} />
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="h-16 border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10 flex items-center px-6 md:hidden">
          <Link href="/" className="flex items-center gap-2 text-primary font-bold text-lg cursor-pointer">
            <PlayCircle size={20} className="fill-primary text-card" />
            EchoCoach
          </Link>
        </header>
        <div className="flex-1 overflow-auto p-4 md:p-8">
          <div className="max-w-6xl mx-auto w-full h-full">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}
