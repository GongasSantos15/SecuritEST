import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { StatsCard } from "./components/StatsCard";
import { ScanForm } from "./components/ScanForm";
import { ScanHistoryCard, ScanData } from "./components/ScanHistoryCard";
import { VulnerabilityCard } from "./components/VulnerabilityCard";
import { RiskScoreGauge } from "./components/RiskScoreGauge";
import { fetchScans, startScan, ScanResult } from "../services/api";
import {
  Activity,
  AlertTriangle,
  CheckCircle,
  TrendingUp,
  ArrowLeft,
  Download,
  Share2,
  Clock,
  Loader2,
  WifiOff
} from "lucide-react";

function toScanData(s: any): ScanData {
  return {
    id: s.id,
    // Mapeamos 'target_url' para 'url'
    url: s.target_url || "URL não especificada",
    // Mapeamos 'started_at' para o formato Date
    timestamp: s.started_at ? new Date(s.started_at) : new Date(),
    // Mapeamos 'final_score' (número) para 'riskScore'
    riskScore: typeof s.final_score === 'number' ? s.final_score : 0,
    // Mapeamos 'findings_count' (número) para 'vulnerabilities'
    vulnerabilities: typeof s.findings_count === 'number' ? s.findings_count : 0,
    // Status vem diretamente da API
    status: s.status || "completed"
  };
}

export default function App() {
  const [scans, setScans] = useState<ScanData[]>([]);
  const [scanDetails, setScanDetails] = useState<Record<string, ScanResult>>({});
  const [selectedScan, setSelectedScan] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiOffline, setApiOffline] = useState(false);

useEffect(() => {
  setLoading(true);
  
  fetchScans()
    .then((results) => {
    const mappedScans: ScanData[] = results.map((s: any) => ({
      id: s.id,
      url: s.target_url || "URL não especificada",
      timestamp: s.started_at ? new Date(s.started_at) : new Date(),
      riskScore: typeof s.final_score === "number" ? Math.round(s.final_score) : 0,
      vulnerabilities: typeof s.findings_count === "number" ? s.findings_count : 0,
      status: s.status || "completed"
    }));

    const details: Record<string, any> = {};
      results.forEach((s: any) => {
      details[s.id] = s;
    });

      setScans(mappedScans);
      setScanDetails(details);
    })
    .catch(err => {
      console.error("Erro ao carregar scans da API:", err);
      setScans([]);
    })
    .finally(() => setLoading(false));
}, []);

  // ─── Novo scan ────────────────────────────────────────────────────────────
  const handleNewScan = async (url: string) => {
    try {
      const result = await startScan(url);
      const scanData = toScanData(result);
      setScans((prev) => {
        const updated = [scanData, ...prev];
        const updatedDetails = { ...scanDetails, [result.id]: result };
        setScanDetails(updatedDetails);
        return updated;
      });
      setSelectedScan(scanData);
      setApiOffline(false);
    } catch (err: any) {
      console.error("Erro no Scan:", err);
      // API inacessível — guardar localmente sem bloquear o utilizador
      const localId = `local_${Date.now()}`;
      const localResult: ScanResult = {
        id: localId,
        scan_id: localId,
        url,
        timestamp: new Date().toISOString(),
        status: "completed",
        riskScore: 0,
        vulnerabilities: [],
        vulnerabilityCount: 0
      };
      const scanData = toScanData(localResult);
      setScans((prev) => {
        const updated = [scanData, ...prev];
        const updatedDetails = { ...scanDetails, [localId]: localResult };
        setScanDetails(updatedDetails);
        return updated;
      });
      setSelectedScan(scanData);
      setApiOffline(true);
    }
  };

  const totalVulnerabilities = scans.reduce((sum, s) => sum + s.vulnerabilities, 0);
  const avgRiskScore = scans.length
    ? Math.round(scans.reduce((sum, s) => sum + (Number(s.riskScore) || 0), 0) / scans.length)
    : 0;

  // ─── Vista detalhe ────────────────────────────────────────────────────────
  if (selectedScan) {
    const detail = scanDetails[selectedScan.id];
    const findings = detail?.findings ?? [];

    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <button
            onClick={() => setSelectedScan(null)}
            className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors"
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
                    <button className="p-2 rounded-lg border border-border hover:bg-accent transition-colors">
                      <Share2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-card border border-border rounded-lg p-6 flex items-center justify-center">
              <RiskScoreGauge score={selectedScan.riskScore} />
            </div>
          </div>

          <h3 className="mb-4">Vulnerabilities Detected ({findings?.length || 0})</h3>
          
          <div className="space-y-4">
            {(() => {
              const currentFindings = scans?.findings || [];
              
              if (!currentFindings || currentFindings.length === 0) {
                return <p className="text-muted-foreground italic">No vulnerabilities found.</p>;
              }
              
              return currentFindings.map((f, index) => (
                <VulnerabilityCard 
                  // 💡 Ajuste na key para evitar colisões de renderização entre páginas diferentes
                  key={`${scan?.id || 'scan'}-${f.id || index}-${index}`} 
                  vulnerability={{
                    id: f.id, 
                    title: f.name || "Unknown Vulnerability",
                    // Garante que o cálculo da severidade bate certo com o que vem da API
                    severity: (f.severity > 5) ? "critical" : "medium",
                    category: f.category || "General",
                    description: f.description || "No description provided.",
                    endpoint: f.endpoint,
                    recommendation: f.recommendation || "No recommendation."
                  }} 
                />
              ));
            })()}
          </div>

          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
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

  // ─── Dashboard ────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8">

        {apiOffline && (
          <div className="mb-6 flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-yellow-800 text-sm">
            <WifiOff className="w-4 h-4 flex-shrink-0" />
            Backend inacessível — a funcionar em modo offline. Os scans são guardados localmente.
          </div>
        )}

        <div className="mb-8">
          <ScanForm onSubmit={handleNewScan} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatsCard title="Total Scans" value={scans.length} icon={Activity} />
          <StatsCard title="Vulnerabilities Found" value={totalVulnerabilities} icon={AlertTriangle} />
          <StatsCard title="Avg Risk Score" value={avgRiskScore} icon={TrendingUp} />
          <StatsCard title="APIs Secured" value={scans.filter((s) => s.riskScore < 30).length} icon={CheckCircle} />
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3>Recent Scans</h3>
            <button className="text-sm text-primary hover:underline">View All</button>
          </div>

          {loading && scans.length === 0 ? (
            <div className="flex items-center justify-center py-16 text-muted-foreground gap-3">
              <Loader2 className="w-5 h-5 animate-spin" />
              Loading scans...
            </div>
          ) : scans.length === 0 ? (
            <div className="text-center py-16 text-muted-foreground">
              <Activity className="w-10 h-10 mx-auto mb-3 opacity-40" />
              <p>No scans yet. Submit an API URL to get started.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {scans.map((scan) => (
                <ScanHistoryCard key={scan.id} scan={scan} onClick={() => setSelectedScan(scan)} />
              ))}
            </div>
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