import { AlertTriangle, CheckCircle, XCircle, Clock } from "lucide-react";

export interface ScanData {
  id: string;
  url: string;
  timestamp: Date;
  riskScore: number;
  vulnerabilities: number;
  status: "completed" | "in-progress" | "failed";
}

interface ScanHistoryCardProps {
  scan: ScanData;
  onClick: () => void;
}

export function ScanHistoryCard({ scan, onClick }: ScanHistoryCardProps) {
  const getRiskColor = (score: number) => {
    if (score >= 80) return "text-red-600";
    if (score >= 50) return "text-orange-600";
    if (score >= 30) return "text-yellow-600";
    return "text-green-600";
  };

  const getRiskBadge = (score: number) => {
    if (score >= 80) return { label: "Critical", bg: "bg-red-100", text: "text-red-700" };
    if (score >= 50) return { label: "High", bg: "bg-orange-100", text: "text-orange-700" };
    if (score >= 30) return { label: "Medium", bg: "bg-yellow-100", text: "text-yellow-700" };
    return { label: "Low", bg: "bg-green-100", text: "text-green-700" };
  };

  const badge = getRiskBadge(scan.riskScore);

  return (
    <div
      onClick={onClick}
      className="bg-card border border-border rounded-lg p-5 hover:shadow-lg hover:border-blue-300 transition-all cursor-pointer"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-muted-foreground truncate">{scan.url}</p>
          <p className="text-xs text-muted-foreground mt-1">
            {scan.timestamp.toLocaleString()}
          </p>
        </div>
        {scan.status === "completed" && (
          <CheckCircle className="w-5 h-5 text-green-600 flex-shrink-0 ml-2" />
        )}
        {scan.status === "in-progress" && (
          <Clock className="w-5 h-5 text-blue-600 flex-shrink-0 ml-2 animate-spin" />
        )}
        {scan.status === "failed" && (
          <XCircle className="w-5 h-5 text-red-600 flex-shrink-0 ml-2" />
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div>
            <p className="text-xs text-muted-foreground">Risk Score</p>
            <p className={`text-lg ${getRiskColor(scan.riskScore)}`}>
              {scan.riskScore}/100
            </p>
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Vulnerabilities</p>
            <div className="flex items-center gap-1">
              <AlertTriangle className="w-4 h-4 text-orange-600" />
              <p>{scan.vulnerabilities}</p>
            </div>
          </div>
        </div>
        <span className={`px-3 py-1 rounded-full text-xs ${badge.bg} ${badge.text}`}>
          {badge.label}
        </span>
      </div>
    </div>
  );
}
