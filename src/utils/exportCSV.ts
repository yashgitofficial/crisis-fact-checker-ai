import { DistressPost } from "@/types/distress";

export function exportToCSV(posts: DistressPost[], filename: string = "distress-reports") {
  if (posts.length === 0) {
    return false;
  }

  // CSV headers
  const headers = [
    "ID",
    "Timestamp",
    "Message",
    "Location",
    "Contact",
    "Verification Status",
    "Confidence Score",
    "AI Reason"
  ];

  // Convert posts to CSV rows
  const rows = posts.map(post => [
    post.id,
    post.timestamp.toISOString(),
    `"${post.message.replace(/"/g, '""')}"`, // Escape quotes in message
    `"${post.location.replace(/"/g, '""')}"`,
    post.contact ? `"${post.contact.replace(/"/g, '""')}"` : "",
    post.verification_status,
    (post.confidence_score * 100).toFixed(1) + "%",
    `"${post.ai_reason.replace(/"/g, '""')}"`
  ]);

  // Combine headers and rows
  const csvContent = [
    headers.join(","),
    ...rows.map(row => row.join(","))
  ].join("\n");

  // Create blob and download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  
  const now = new Date();
  const dateStr = now.toISOString().split("T")[0];
  
  link.setAttribute("href", url);
  link.setAttribute("download", `${filename}-${dateStr}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return true;
}
