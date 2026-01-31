import { Link, useLocation } from "wouter";
import { MessageSquare, Cpu, FileText, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

export function Navigation() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", label: "Training", icon: Cpu },
    { href: "/chat", label: "Chat", icon: MessageSquare },
    { href: "/files", label: "Dataset", icon: FileText },
  ];

  return (
    <aside className="fixed left-0 top-0 h-screen w-20 md:w-64 glass-panel border-r border-white/5 z-50 flex flex-col">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-primary to-purple-400 flex items-center justify-center shadow-lg shadow-primary/20">
          <Cpu className="w-5 h-5 text-white" />
        </div>
        <span className="text-xl font-bold font-display text-white hidden md:block tracking-tight">
          Neuro<span className="text-primary">Lab</span>
        </span>
      </div>

      <nav className="flex-1 px-4 py-8 space-y-2">
        {navItems.map((item) => {
          const isActive = location === item.href;
          return (
            <Link key={item.href} href={item.href} className="block group">
              <div
                className={cn(
                  "flex items-center gap-3 px-3 py-3 rounded-xl transition-all duration-300",
                  isActive
                    ? "bg-primary text-white shadow-lg shadow-primary/25 translate-x-1"
                    : "text-muted-foreground hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className={cn("w-5 h-5", isActive && "animate-pulse")} />
                <span className="font-medium hidden md:block">{item.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      <div className="p-4 border-t border-white/5">
        <button className="flex items-center gap-3 w-full px-3 py-3 rounded-xl text-muted-foreground hover:bg-white/5 hover:text-white transition-all group">
          <Settings className="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
          <span className="font-medium hidden md:block">Settings</span>
        </button>
      </div>
    </aside>
  );
}
