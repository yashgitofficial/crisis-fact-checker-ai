import { AlertTriangle } from "lucide-react";

export function DisclaimerBanner() {
  return (
    <div className="bg-[hsl(var(--status-warning-bg))] border border-[hsl(var(--status-warning)/0.3)] rounded-lg p-4 mb-6 animate-fade-in">
      <div className="flex items-start gap-3">
        <AlertTriangle className="h-5 w-5 text-status-warning shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-medium text-status-warning">
            AI-Based Probability Check
          </p>
          <p className="text-sm text-muted-foreground mt-1">
            This system uses AI analysis to estimate message authenticity. 
            Results are NOT official verification and should be used alongside 
            other verification methods. Always prioritize official emergency services.
          </p>
        </div>
      </div>
    </div>
  );
}
