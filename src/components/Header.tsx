import { ShieldCheck, Radio } from "lucide-react";

export function Header() {
  return (
    <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-[hsl(28_92%_45%)] flex items-center justify-center shadow-glow">
                <ShieldCheck className="h-5 w-5 text-primary-foreground" />
              </div>
              <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-status-genuine border-2 border-card pulse-live" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground tracking-tight">
                Crisis Fact-Checker
              </h1>
              <p className="text-xs text-muted-foreground">
                AI-Powered Distress Verification
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border">
            <Radio className="h-3.5 w-3.5 text-status-genuine" />
            <span className="text-xs font-medium text-status-genuine">LIVE</span>
          </div>
        </div>
      </div>
    </header>
  );
}
