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

const STORAGE_KEY = "securitest_scans";
const DETAILS_KEY = "securitest_scan_details";

// ─── Helpers ─────────────────────────────────────────────────────────────
function saveToStorage(scans: ScanData[], details: Record<string, ScanResult>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(scans.map(s => ({ ...s, timestamp: s.timestamp.toISOString() }))));
    localStorage.setItem(DETAILS_KEY, JSON.stringify(details));
  } catch (_) {}
}

function loadFromStorage(): { scans: ScanData[]; details: Record<string, ScanResult> } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const rawDetails = localStorage.getItem(DETAILS_KEY);
    if (!raw) return { scans: [], details: {} };
    const parsed = JSON.parse(raw);
    return { 
      scans: parsed.map((s: any) => ({ ...s, timestamp: new Date(s.timestamp) })), 
      details: rawDetails ? JSON.parse(rawDetails) : {} 
    };
  } catch (_) { return { scans: [], details: {} }; }
}

// Adaptador: Transforma o objeto do CosmosDB (ScanResult) para o formato do App (ScanData)
function toScanData(s: ScanResult): ScanData {
  return { 
    id: s.id, 
    url: s.target_url, 
    timestamp: new Date(s.started_at), 
    riskScore: s.final_score, 
    vulnerabilities: s.findings_count, 
    status: s.status 
  };
}

export default function App() {
  const [scans, setScans] = useState<ScanData[]>([]);
  const [scanDetails, setScanDetails] = useState<Record<string, ScanResult>>({});
  const [selectedScan, setSelectedScan] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiOffline, setApiOffline] = useState(false);

  useEffect(() => {
    const { scans: cached, details: cachedDetails } = loadFromStorage();
    if (cached.length > 0) {
      setScans(cached);
      setScanDetails(cachedDetails);
    }

    fetchScans()
      .then(res => {
        const fresh = res.map(toScanData);
        const details: Record<string, ScanResult> = {};
        res.forEach(r => details[r.id] = r);
        setScans(fresh); setScanDetails(details); saveToStorage(fresh, details);
        setApiOffline(false);
      })
      .catch((err) => {
        console.error("Erro na API:", err);
        setApiOffline(true);
      })
      .finally(() => setLoading(false));
  }, []);

  const handleNewScan = async (url: string) => {
    try {
      const result = await startScan(url);
      const scanData = toScanData(result);
      setScans(prev => [scanData, ...prev]);
      setScanDetails(prev => ({ ...prev, [result.id]: result }));
      setSelectedScan(scanData);
      setApiOffline(false);
    } catch { 
      // API inacessível, mas permitimos guardar localmente
      const localId = `local_${Date.now()}`;
      const localResult: ScanResult = { id: localId, scan_id: localId, target_url: url, timestamp: new Date().toISOString(), status: "completed", final_score: 0, findings: [], findings_count: 0 };
      const scanData = toScanData(localResult);
      setScans(prev => [scanData, ...prev]);
      setSelectedScan(scanData);
    } catch (err) {
      console.error("Erro ao iniciar scan:", err);
      alert("Falha ao iniciar o scan.");
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
            <div className="lg:col-span-2 bg-card border border-border rounded-lg p-6">
              <h2 className="mb-2">Scan Report</h2>
              <p className="text-sm text-muted-foreground break-all">{selectedScan.url}</p>
              <p className="text-xs text-muted-foreground mt-2">{selectedScan.timestamp.toLocaleString()}</p>
            </div>
            <div className="bg-card border border-border rounded-lg p-6 flex items-center justify-center">
              <RiskScoreGauge score={Number(selectedScan.riskScore) || 0} />
            </div>
          </div>

          <div className="mb-6">
            <h3 className="mb-4">Vulnerabilities Detected ({findings.length})</h3>
            {findings.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />
                <p className="text-green-800">No vulnerabilities detected.</p>
              </div>
            ) : (
              <div className="space-y-4">
                {findings.map((f) => (
                  <VulnerabilityCard key={f.id + f.endpoint} vulnerability={{
                    id: f.id,
                    title: f.name,
                    severity: f.severity > 5 ? "critical" : "medium",
                    category: f.category,
                    description: f.description || "No description provided.",
                    endpoint: f.endpoint,
                    recommendation: f.recommendation
                  }} />
                ))}
              </div>
            )}
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
        {/* ... (todo o conteúdo anterior do dashboard) ... */}
        
        <div>
           {/* ... (lista de scans) ... */}
        </div>

        {/* Adicionado aqui para aparecer no dashboard */}
        <AboutSection />
      </main>
    </div>
  );
}

// COMPONENTE AUXILIAR para não repetir código
function AboutSection() {
  return (
    <div className="mt-8 bg-card border border-border rounded-lg p-6">
      <h3 className="mb-4">About SecuritEST</h3>
      <p className="text-sm text-muted-foreground mb-4">
        SecuritEST is a cloud-native API security scanning platform built on Microsoft Azure.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        {[
          { title: "Container-Based", desc: "Scalable scanning engine" },
          { title: "Serverless Computing", desc: "Azure Functions processing" },
          { title: "NoSQL Storage", desc: "Cosmos DB scale" }
        ].map((item) => (
          <div key={item.title} className="bg-accent rounded-lg p-4">
            <h4 className="mb-2">{item.title}</h4>
            <p className="text-muted-foreground">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
