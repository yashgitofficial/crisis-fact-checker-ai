import { VerificationStatus } from "@/types/distress";
import { CheckCircle2, AlertCircle, XCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface StatusBadgeProps {
  status: VerificationStatus;
  confidence?: number;
  showConfidence?: boolean;
  size?: "sm" | "md" | "lg";
}

const statusConfig: Record<
  VerificationStatus,
  {
    icon: React.ComponentType<{ className?: string }>;
    label: string;
    className: string;
  }
> = {
  "Likely Genuine": {
    icon: CheckCircle2,
    label: "Likely Genuine",
    className: "status-badge-genuine",
  },
  "Needs Verification": {
    icon: AlertCircle,
    label: "Needs Verification",
    className: "status-badge-warning",
  },
  "High Scam Probability": {
    icon: XCircle,
    label: "High Scam Risk",
    className: "status-badge-danger",
  },
  Pending: {
    icon: Loader2,
    label: "Analyzing...",
    className: "bg-secondary text-muted-foreground border border-border",
  },
};

const sizeClasses = {
  sm: "text-xs px-2 py-1",
  md: "text-sm px-3 py-1.5",
  lg: "text-base px-4 py-2",
};

export function StatusBadge({
  status,
  confidence,
  showConfidence = false,
  size = "md",
}: StatusBadgeProps) {
  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div
      className={cn(
        "inline-flex items-center gap-2 rounded-full font-medium",
        config.className,
        sizeClasses[size]
      )}
    >
      <Icon
        className={cn(
          "shrink-0",
          status === "Pending" && "animate-spin",
          size === "sm" && "h-3.5 w-3.5",
          size === "md" && "h-4 w-4",
          size === "lg" && "h-5 w-5"
        )}
      />
      <span>{config.label}</span>
      {showConfidence && confidence !== undefined && status !== "Pending" && (
        <span className="opacity-75 font-mono">
          {Math.round(confidence * 100)}%
        </span>
      )}
    </div>
  );
}
