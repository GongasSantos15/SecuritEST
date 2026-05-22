import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { StatsCard } from "./components/StatsCard";
import { ScanForm } from "./components/ScanForm";
import { ScanHistoryCard, ScanData } from "./components/ScanHistoryCard";
import { VulnerabilityCard } from "./components/VulnerabilityCard";
import { RiskScoreGauge } from "./components/RiskScoreGauge";
import { fetchScans, startScan } from "../services/api";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  ArrowLeft,
  Download,
  Share2,
  Clock,
  Loader2
} from "lucide-react";

function toScanData(s: any): ScanData {
  return {
    id: s.id || s.scan_id,
    url: s.target_url || s.url || "URL não especificada",
    timestamp: s.started_at ? new Date(s.started_at) : new Date(),
    riskScore: Math.round(Number(s.final_score) || 0),
    vulnerabilities: Array.isArray(s.findings)
      ? s.findings.length
      : Number(s.findings_count) || 0,
    status: s.status || "completed",
    findings: s.findings || []
  } as any;
}

export default function App() {
  const [scans, setScans] = useState<ScanData[]>([]);
  const [selectedScan, setSelectedScan] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);

    fetchScans()
      .then((results) => {
        setScans(results.filter((s: any) => s.status === "completed").map(toScanData));
      })
      .catch(() => setScans([]))
      .finally(() => setLoading(false));
  }, []);

  const handleNewScan = async (url: string) => {
    try {
      const created = await startScan(url);
      const scanId = created?.scan_id || created?.id;

      if (!scanId) throw new Error("No scan_id returned");

      let completed = null;

      for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 2000));

        const results = await fetchScans();

        const completedOnly = results
          .filter((s: any) => s.status === "completed")
          .map(toScanData);

        setScans(completedOnly);

        const completed = results.find(
          (s: any) =>
            (s.id || s.scan_id) === scanId && s.status === "completed"
        );

        if (completed) {
          setSelectedScan(toScanData(completed));
          break;
        }
      }
    } catch (err) {
      console.error("Erro no Scan:", err);
    }
  };

  const totalVulnerabilities = scans.reduce(
    (sum: number, s: ScanData) => sum + s.vulnerabilities,
    0
  );

  const avgRiskScore = scans.length
    ? Math.round(
        scans.reduce(
          (sum: number, s: ScanData) => sum + (Number(s.riskScore) || 0),
          0
        ) / scans.length
      )
  : 0;

  // ─── DETALHE ─────────────────────────────────────────────
  if (selectedScan) {
    const findings = (selectedScan as any).findings || [];

    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">

          <button
            onClick={() => setSelectedScan(null)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2">
              <div className="bg-card border border-border rounded-lg p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h2 className="mb-2">Scan Report</h2>
                    <p className="text-sm text-muted-foreground break-all">{selectedScan.url}</p>
                    <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                      <Clock className="w-3 h-3" />
                      {selectedScan.timestamp.toLocaleString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button className="p-2 rounded-lg border border-border hover:bg-accent transition-colors">
                      <Download className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 flex items-center justify-center">
              <RiskScoreGauge score={selectedScan.riskScore} />
            </div>
          </div>

          <h3 className="mb-4">
            Vulnerabilities Detected ({findings.length})
          </h3>

          <div className="space-y-4">
            {findings.length === 0 ? (
              <p className="text-muted-foreground italic">
                No vulnerabilities found.
              </p>
            ) : (
              findings.map((f: any, index: number) => (
                <VulnerabilityCard
                  key={`${selectedScan.id}-${index}`}
                  vulnerability={{
                    id: f.id || `${selectedScan.id}-${index}`,
                    title: f.name || "Unknown",
                    severity:
                      Number(f.severity) >= 7
                        ? "critical"
                        : Number(f.severity) >= 4
                        ? "medium"
                        : "low",
                    category: f.owasp || "General",
                    description: f.evidence || "No description",
                    endpoint: f.endpoint || "Unknown",
                    recommendation: f.recommendation || "No recommendation"
                  }}
                />
              ))
            )}
          </div>
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 mt-8">
            <h4 className="text-foreground mb-2">Azure Cloud Architecture</h4>
            <p className="text-sm text-muted-foreground mb-4">
              This scan was powered by a cloud-native architecture on Microsoft Azure, featuring:
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
              {["Azure Container Instances", "Azure Functions (Serverless)", "Azure Cosmos DB (NoSQL)", "Azure DevOps CI/CD"].map((item) => (
                <div key={item} className="flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-blue-600" />
                  <span>{item}</span>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }

  // ─── DASHBOARD ─────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8">

        <div className="mb-8">
          <ScanForm onSubmit={handleNewScan} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatsCard title="Total Scans" value={scans.length} icon={Activity} />
          <StatsCard title="Vulnerabilities Found" value={totalVulnerabilities} icon={AlertTriangle} />
          <StatsCard title="Avg Risk Score" value={avgRiskScore} icon={TrendingUp} />
          <StatsCard
            title="APIs Secured"
            value={scans.filter((s) => s.riskScore > 80).length}
            icon={CheckCircle}
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {loading ? (
            <div className="flex items-center gap-3 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading scans...
            </div>
          ) : (
            scans.map((scan) => (
              <ScanHistoryCard
                key={scan.id}
                scan={scan}
                onClick={() => setSelectedScan(scan)}
              />
            ))
          )}
        </div>
        <div className="mt-8 bg-card border border-border rounded-lg p-6">
          <h3 className="mb-4">About SecuritEST</h3>
          <p className="text-sm text-muted-foreground mb-4">
            SecuritEST is a cloud-native API security scanning platform built on Microsoft Azure.
            It automatically analyzes exposed APIs, identifies potential vulnerabilities based on
            OWASP API Security Top 10, and generates comprehensive risk reports.
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            {[
              { title: "Container-Based", desc: "Scalable scanning engine deployed in Azure Container Instances" },
              { title: "Serverless Computing", desc: "Azure Functions handle request processing and report generation" },
              { title: "NoSQL Storage", desc: "Cosmos DB stores scan history and vulnerability data at scale" }
            ].map((item) => (
              <div key={item.title} className="bg-accent rounded-lg p-4">
                <h4 className="mb-2">{item.title}</h4>
                <p className="text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
}