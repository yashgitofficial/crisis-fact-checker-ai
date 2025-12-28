import { useDistressStore } from "@/store/distressStore";
import { DistressCard } from "./DistressCard";
import { Radio, Filter, LayoutList } from "lucide-react";
import { useState } from "react";
import { VerificationStatus } from "@/types/distress";
import { cn } from "@/lib/utils";

type FilterType = "all" | VerificationStatus;

const filterOptions: { value: FilterType; label: string }[] = [
  { value: "all", label: "All" },
  { value: "Likely Genuine", label: "Genuine" },
  { value: "Needs Verification", label: "Needs Check" },
  { value: "High Scam Probability", label: "Scam Risk" },
];

export function LiveFeed() {
  const { posts } = useDistressStore();
  const [filter, setFilter] = useState<FilterType>("all");

  const filteredPosts = posts.filter((post) => {
    if (filter === "all") return true;
    return post.verificationStatus === filter;
  });

  const genuineCount = posts.filter(
    (p) => p.verificationStatus === "Likely Genuine"
  ).length;
  const warningCount = posts.filter(
    (p) => p.verificationStatus === "Needs Verification"
  ).length;
  const dangerCount = posts.filter(
    (p) => p.verificationStatus === "High Scam Probability"
  ).length;

  return (
    <div className="animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <Radio className="h-5 w-5 text-status-genuine" />
            <span className="absolute -top-0.5 -right-0.5 h-2 w-2 rounded-full bg-status-genuine pulse-live" />
          </div>
          <h2 className="text-lg font-semibold text-foreground">
            Live Feed
          </h2>
          <span className="text-sm text-muted-foreground">
            {posts.length} reports
          </span>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex flex-wrap gap-3 mb-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--status-genuine-bg))] border border-[hsl(var(--status-genuine)/0.2)]">
          <div className="h-2 w-2 rounded-full bg-status-genuine" />
          <span className="text-xs font-medium text-status-genuine">
            {genuineCount} Genuine
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--status-warning-bg))] border border-[hsl(var(--status-warning)/0.2)]">
          <div className="h-2 w-2 rounded-full bg-status-warning" />
          <span className="text-xs font-medium text-status-warning">
            {warningCount} Unverified
          </span>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-[hsl(var(--status-danger-bg))] border border-[hsl(var(--status-danger)/0.2)]">
          <div className="h-2 w-2 rounded-full bg-status-danger" />
          <span className="text-xs font-medium text-status-danger">
            {dangerCount} Scam Risk
          </span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-6 overflow-x-auto pb-2">
        <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
        {filterOptions.map((option) => (
          <button
            key={option.value}
            onClick={() => setFilter(option.value)}
            className={cn(
              "px-3 py-1.5 rounded-full text-sm font-medium transition-all duration-200 whitespace-nowrap",
              filter === option.value
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {option.label}
          </button>
        ))}
      </div>

      {/* Posts List */}
      {filteredPosts.length > 0 ? (
        <div className="space-y-4">
          {filteredPosts.map((post, index) => (
            <DistressCard key={post.id} post={post} index={index} />
          ))}
        </div>
      ) : (
        <div className="card-emergency rounded-xl p-12 text-center border border-border">
          <LayoutList className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
          <p className="text-muted-foreground">
            {filter === "all"
              ? "No distress reports yet"
              : `No reports matching "${filter}"`}
          </p>
        </div>
      )}
    </div>
  );
}
