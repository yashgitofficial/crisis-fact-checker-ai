import { useEffect, useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { DistressPost, VerificationStatus } from "@/types/distress";
import { 
  ArrowLeft, 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  Clock,
  MapPin,
  TrendingUp,
  Activity,
  Download,
  CalendarIcon,
  Sun,
  Moon
} from "lucide-react";
import { exportToCSV } from "@/utils/exportCSV";
import { toast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { format, subDays, startOfDay, endOfDay, isWithinInterval } from "date-fns";
import { cn } from "@/lib/utils";
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from "recharts";

const STATUS_COLORS = {
  "Likely Genuine": "#22c55e",
  "Needs Verification": "#eab308",
  "High Scam Probability": "#ef4444",
  "Pending": "#6b7280",
};

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: React.ReactNode;
  trend?: string;
  trendUp?: boolean;
}

function StatCard({ title, value, subtitle, icon, trend, trendUp }: StatCardProps) {
  return (
    <div className="card-emergency rounded-xl p-6 border border-border">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-muted-foreground mb-1">{title}</p>
          <p className="text-3xl font-bold text-foreground">{value}</p>
          {subtitle && (
            <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
          )}
          {trend && (
            <p className={`text-xs mt-2 flex items-center gap-1 ${trendUp ? 'text-status-genuine' : 'text-status-danger'}`}>
              <TrendingUp className={`h-3 w-3 ${!trendUp && 'rotate-180'}`} />
              {trend}
            </p>
          )}
        </div>
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
          {icon}
        </div>
      </div>
    </div>
  );
}

type DatePreset = "all" | "today" | "7days" | "30days" | "custom";

interface DateRange {
  from: Date | undefined;
  to: Date | undefined;
}

export default function AdminDashboard() {
  const [posts, setPosts] = useState<DistressPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [datePreset, setDatePreset] = useState<DatePreset>("all");
  const [dateRange, setDateRange] = useState<DateRange>({ from: undefined, to: undefined });
  const { theme, toggleTheme } = useTheme();

  // Filter posts based on date range
  const filteredPosts = useMemo(() => {
    if (datePreset === "all") return posts;
    
    let from: Date;
    let to: Date = endOfDay(new Date());
    
    switch (datePreset) {
      case "today":
        from = startOfDay(new Date());
        break;
      case "7days":
        from = startOfDay(subDays(new Date(), 7));
        break;
      case "30days":
        from = startOfDay(subDays(new Date(), 30));
        break;
      case "custom":
        if (!dateRange.from) return posts;
        from = startOfDay(dateRange.from);
        to = dateRange.to ? endOfDay(dateRange.to) : endOfDay(new Date());
        break;
      default:
        return posts;
    }
    
    return posts.filter(post => 
      isWithinInterval(post.timestamp, { start: from, end: to })
    );
  }, [posts, datePreset, dateRange]);

  useEffect(() => {
    async function fetchPosts() {
      const { data, error } = await supabase
        .from("distress_posts")
        .select("*")
        .order("timestamp", { ascending: false });

      if (!error && data) {
        const mappedPosts: DistressPost[] = data.map((post) => ({
          id: post.id,
          message: post.message,
          location: post.location,
          contact: post.contact,
          timestamp: new Date(post.timestamp),
          verification_status: post.verification_status as VerificationStatus,
          confidence_score: Number(post.confidence_score),
          ai_reason: post.ai_reason,
        }));
        setPosts(mappedPosts);
      }
      setLoading(false);
    }
    fetchPosts();
  }, []);

  // Calculate statistics based on filtered posts
  const stats = useMemo(() => {
    const total = filteredPosts.length;
    const genuine = filteredPosts.filter(p => p.verification_status === "Likely Genuine").length;
    const needsCheck = filteredPosts.filter(p => p.verification_status === "Needs Verification").length;
    const scam = filteredPosts.filter(p => p.verification_status === "High Scam Probability").length;
    const pending = filteredPosts.filter(p => p.verification_status === "Pending").length;

    const avgConfidence = filteredPosts.length > 0 
      ? filteredPosts.reduce((sum, p) => sum + p.confidence_score, 0) / filteredPosts.length 
      : 0;

    // Geographic breakdown
    const locationCounts: Record<string, number> = {};
    filteredPosts.forEach(post => {
      const loc = post.location.split(",")[0].trim().substring(0, 20);
      locationCounts[loc] = (locationCounts[loc] || 0) + 1;
    });
    const topLocations = Object.entries(locationCounts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([name, count]) => ({ name, count }));

    // Timeline data (last 7 days)
    const now = new Date();
    const timelineData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(now);
      date.setDate(date.getDate() - i);
      const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' });
      const dayPosts = filteredPosts.filter(p => {
        const postDate = new Date(p.timestamp);
        return postDate.toDateString() === date.toDateString();
      });
      timelineData.push({
        name: dateStr,
        total: dayPosts.length,
        genuine: dayPosts.filter(p => p.verification_status === "Likely Genuine").length,
        scam: dayPosts.filter(p => p.verification_status === "High Scam Probability").length,
      });
    }

    // Status distribution for pie chart
    const statusData = [
      { name: "Likely Genuine", value: genuine, color: STATUS_COLORS["Likely Genuine"] },
      { name: "Needs Verification", value: needsCheck, color: STATUS_COLORS["Needs Verification"] },
      { name: "High Scam Probability", value: scam, color: STATUS_COLORS["High Scam Probability"] },
    ].filter(d => d.value > 0);

    return {
      total,
      genuine,
      needsCheck,
      scam,
      pending,
      avgConfidence,
      topLocations,
      timelineData,
      statusData,
      genuineRate: total > 0 ? ((genuine / total) * 100).toFixed(1) : "0",
      scamRate: total > 0 ? ((scam / total) * 100).toFixed(1) : "0",
    };
  }, [filteredPosts]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <Activity className="h-8 w-8 text-primary animate-pulse mx-auto mb-4" />
          <p className="text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="icon">
                  <ArrowLeft className="h-5 w-5" />
                </Button>
              </Link>
              <div>
                <h1 className="text-xl font-bold text-foreground">
                  Admin Dashboard
                </h1>
                <p className="text-xs text-muted-foreground">
                  Verification Analytics & Trends
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                className="gap-2"
                onClick={() => {
                  const success = exportToCSV(filteredPosts, "crisis-reports");
                  if (success) {
                    toast({
                      title: "Export Complete",
                      description: `${filteredPosts.length} reports exported to CSV`,
                    });
                  } else {
                    toast({
                      title: "Export Failed",
                      description: "No reports to export",
                      variant: "destructive",
                    });
                  }
                }}
                disabled={filteredPosts.length === 0}
              >
                <Download className="h-4 w-4" />
                <span className="hidden sm:inline">Export CSV</span>
              </Button>
              <Button
                variant="outline"
                size="icon"
                onClick={toggleTheme}
                className="h-9 w-9"
                title={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
              >
                {theme === "light" ? (
                  <Moon className="h-4 w-4" />
                ) : (
                  <Sun className="h-4 w-4" />
                )}
              </Button>
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-secondary border border-border">
                <Activity className="h-3.5 w-3.5 text-status-genuine" />
                <span className="text-xs font-medium text-muted-foreground">
                  {stats.total} Total Reports
                </span>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Date Filter Bar */}
        <div className="flex flex-wrap items-center gap-3 mb-6 p-4 rounded-xl bg-card border border-border">
          <span className="text-sm font-medium text-muted-foreground">Filter by:</span>
          <Select value={datePreset} onValueChange={(value: DatePreset) => setDatePreset(value)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="7days">Last 7 Days</SelectItem>
              <SelectItem value="30days">Last 30 Days</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>

          {datePreset === "custom" && (
            <div className="flex items-center gap-2">
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[130px] justify-start text-left font-normal",
                      !dateRange.from && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.from ? format(dateRange.from, "MMM d, yyyy") : "Start date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.from}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, from: date }))}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
              <span className="text-muted-foreground">to</span>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-[130px] justify-start text-left font-normal",
                      !dateRange.to && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dateRange.to ? format(dateRange.to, "MMM d, yyyy") : "End date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dateRange.to}
                    onSelect={(date) => setDateRange(prev => ({ ...prev, to: date }))}
                    disabled={(date) => dateRange.from ? date < dateRange.from : false}
                    initialFocus
                    className="p-3 pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </div>
          )}

          {datePreset !== "all" && (
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setDatePreset("all");
                setDateRange({ from: undefined, to: undefined });
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              Clear filter
            </Button>
          )}

          <div className="ml-auto text-sm text-muted-foreground">
            Showing {filteredPosts.length} of {posts.length} reports
          </div>
        </div>
        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard
            title="Genuine Reports"
            value={stats.genuine}
            subtitle={`${stats.genuineRate}% of total`}
            icon={<ShieldCheck className="h-6 w-6 text-status-genuine" />}
            trend={stats.genuine > 0 ? "Verified authentic" : undefined}
            trendUp
          />
          <StatCard
            title="Needs Verification"
            value={stats.needsCheck}
            subtitle="Awaiting manual review"
            icon={<AlertTriangle className="h-6 w-6 text-status-warning" />}
          />
          <StatCard
            title="Scam Detected"
            value={stats.scam}
            subtitle={`${stats.scamRate}% flagged`}
            icon={<XCircle className="h-6 w-6 text-status-danger" />}
            trend={stats.scam > 0 ? "Blocked automatically" : undefined}
            trendUp={false}
          />
          <StatCard
            title="Avg Confidence"
            value={`${(stats.avgConfidence * 100).toFixed(0)}%`}
            subtitle="AI analysis accuracy"
            icon={<Clock className="h-6 w-6 text-primary" />}
          />
        </div>

        {/* Charts Row */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
          {/* Status Distribution Pie Chart */}
          <div className="card-emergency rounded-xl p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              Status Distribution
            </h3>
            {stats.statusData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie
                    data={stats.statusData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={4}
                    dataKey="value"
                    label={({ name, percent }) => `${(percent * 100).toFixed(0)}%`}
                    labelLine={false}
                  >
                    {stats.statusData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      borderRadius: "8px",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-muted-foreground">
                No data available
              </div>
            )}
            <div className="flex flex-wrap gap-4 mt-4 justify-center">
              {stats.statusData.map((entry) => (
                <div key={entry.name} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-xs text-muted-foreground">{entry.name}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Chart */}
          <div className="card-emergency rounded-xl p-6 border border-border">
            <h3 className="text-lg font-semibold text-foreground mb-4">
              7-Day Activity
            </h3>
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={stats.timelineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  dataKey="name" 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis 
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2}
                  dot={{ fill: "hsl(var(--primary))" }}
                  name="Total"
                />
                <Line
                  type="monotone"
                  dataKey="genuine"
                  stroke="#22c55e"
                  strokeWidth={2}
                  dot={{ fill: "#22c55e" }}
                  name="Genuine"
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Geographic Trends */}
        <div className="card-emergency rounded-xl p-6 border border-border">
          <div className="flex items-center gap-2 mb-6">
            <MapPin className="h-5 w-5 text-accent" />
            <h3 className="text-lg font-semibold text-foreground">
              Top Locations
            </h3>
          </div>
          {stats.topLocations.length > 0 ? (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={stats.topLocations} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis 
                  type="number"
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <YAxis 
                  type="category" 
                  dataKey="name" 
                  width={120}
                  tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
                  axisLine={{ stroke: "hsl(var(--border))" }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Bar 
                  dataKey="count" 
                  fill="hsl(var(--primary))" 
                  radius={[0, 4, 4, 0]}
                  name="Reports"
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-[300px] flex items-center justify-center text-muted-foreground">
              No location data available
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
