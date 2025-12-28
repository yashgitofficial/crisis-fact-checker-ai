import { DistressPost, VerificationStatus } from "@/types/distress";
import { StatusBadge } from "./StatusBadge";
import { MapPin, Clock, Phone, Brain } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatDistanceToNow } from "date-fns";

interface DistressCardProps {
  post: DistressPost;
  index: number;
}

const borderColors: Record<VerificationStatus, string> = {
  "Likely Genuine": "border-l-status-genuine",
  "Needs Verification": "border-l-status-warning",
  "High Scam Probability": "border-l-status-danger",
  Pending: "border-l-muted-foreground",
};

export function DistressCard({ post, index }: DistressCardProps) {
  const timeAgo = formatDistanceToNow(post.timestamp, { addSuffix: true });

  return (
    <article
      className={cn(
        "card-emergency rounded-xl p-5 border border-border border-l-4",
        borderColors[post.verificationStatus],
        "animate-fade-in transition-all duration-300 hover:border-border/80"
      )}
      style={{ animationDelay: `${index * 50}ms` }}
    >
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <StatusBadge
          status={post.verificationStatus}
          confidence={post.confidenceScore}
          showConfidence
        />
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <time dateTime={post.timestamp.toISOString()}>{timeAgo}</time>
        </div>
      </div>

      {/* Message */}
      <p className="text-foreground leading-relaxed mb-4">{post.message}</p>

      {/* Meta Info */}
      <div className="flex flex-wrap gap-4 text-sm mb-4">
        <div className="flex items-center gap-2 text-muted-foreground">
          <MapPin className="h-4 w-4 text-accent shrink-0" />
          <span className="break-words">{post.location}</span>
        </div>
        {post.contact && (
          <div className="flex items-center gap-2 text-muted-foreground">
            <Phone className="h-4 w-4 text-accent shrink-0" />
            <span>{post.contact}</span>
          </div>
        )}
      </div>

      {/* AI Reasoning */}
      {post.verificationStatus !== "Pending" && (
        <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2 mb-2">
            <Brain className="h-4 w-4 text-primary" />
            <span className="text-xs font-medium text-primary uppercase tracking-wide">
              AI Analysis
            </span>
            <span className="ml-auto text-xs font-mono text-muted-foreground">
              Confidence: {Math.round(post.confidenceScore * 100)}%
            </span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {post.aiReason}
          </p>
        </div>
      )}

      {post.verificationStatus === "Pending" && (
        <div className="bg-secondary/30 rounded-lg p-4 border border-border/50">
          <div className="flex items-center gap-2">
            <div className="h-4 w-4 rounded-full bg-muted-foreground/30 animate-pulse" />
            <span className="text-sm text-muted-foreground">
              Analyzing message authenticity...
            </span>
          </div>
        </div>
      )}
    </article>
  );
}
