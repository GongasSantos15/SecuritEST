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
  Loader2,
  WifiOff
} from "lucide-react";

const STORAGE_KEY = "securitest_scans";
const DETAILS_KEY = "securitest_scan_details";

// ─── Helpers localStorage ────────────────────────────────────────────────────
function saveToStorage(scans: ScanData[], details: Record<string, ScanResult>) {
  try {
    const serialized = scans.map((s) => ({ ...s, timestamp: s.timestamp.toISOString() }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
    localStorage.setItem(DETAILS_KEY, JSON.stringify(details));
  } catch (_) {}
}

function loadFromStorage(): { scans: ScanData[]; details: Record<string, ScanResult> } {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const rawDetails = localStorage.getItem(DETAILS_KEY);
    if (!raw) return { scans: [], details: {} };
    const parsed = JSON.parse(raw) as any[];
    const scans: ScanData[] = parsed.map((s) => ({ 
      ...s, 
      timestamp: !isNaN(Date.parse(s.timestamp)) ? new Date(s.timestamp) : new Date() 
    }));
    const details: Record<string, ScanResult> = rawDetails ? JSON.parse(rawDetails) : {};
    return { scans, details };
  } catch (_) {
    return { scans: [], details: {} };
  }
}

function toScanData(s: ScanResult): ScanData {
  // Fazemos um log para debug caso estejas a ver a consola F12
  console.log("A mapear item:", s);
  
  return {
    id: s.id || "unknown-id",
    url: s.target_url || "URL desconhecida",
    timestamp: s.started_at ? new Date(s.started_at) : new Date(),
    riskScore: Number(s.final_score) || 0,
    vulnerabilities: Number(s.findings_count) || 0,
    status: s.status || "completed"
  };
}

// COMPONENTE AUXILIAR
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
      .then((results) => {
        const fresh = results.map(toScanData);
        const details: Record<string, ScanResult> = {};
        results.forEach((r) => (details[r.id] = r));
        setScans(fresh);
        setScanDetails(details);
        saveToStorage(fresh, details);
        setApiOffline(false);
      })
      .catch((err) => { console.error(err); setApiOffline(true); })
      .finally(() => setLoading(false));
  }, []);

const handleNewScan = async (url: string) => {
  try {
    const result = await startScan(url);
    const scanData = toScanData(result);
    setScans((prev) => [scanData, ...prev]);
    setScanDetails((prev) => ({ ...prev, [result.id]: result }));
    setSelectedScan(scanData);
  } catch (err: any) {
    console.error("Erro detalhado:", err); // <--- VÊ ISTO NO F12 CONSOLE
    alert("Falha ao iniciar o scan: " + err.message); // <--- VÊ A MENSAGEM AQUI
  }
};

  const totalVulnerabilities = scans.reduce((sum, s) => sum + s.vulnerabilities, 0);
  const avgRiskScore = scans.length ? Math.round(scans.reduce((sum, s) => sum + (Number(s.riskScore) || 0), 0) / scans.length) : 0;

  if (selectedScan) {
    const detail = scanDetails[selectedScan.id];
    const findings = detail?.findings ?? [];
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <button onClick={() => setSelectedScan(null)} className="flex items-center gap-2 text-muted-foreground mb-6"><ArrowLeft className="w-4 h-4" /> Back to Dashboard</button>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-card border rounded-lg p-6">
              <h2 className="mb-2">Scan Report</h2>
              <p className="text-sm text-muted-foreground">{selectedScan.url}</p>
            </div>
            <div className="bg-card border rounded-lg p-6 flex items-center justify-center">
              <RiskScoreGauge score={Number(selectedScan.riskScore) || 0} />
            </div>
          </div>
          <h3 className="mb-4">Vulnerabilities Detected ({findings.length})</h3>
          <div className="space-y-4">
            {findings.map((f) => <VulnerabilityCard key={f.id + f.endpoint} vulnerability={{id: f.id, title: f.name, severity: f.severity > 5 ? "critical" : "medium", category: f.category, description: f.description || "", endpoint: f.endpoint, recommendation: f.recommendation}} />)}
          </div>
          <AboutSection />
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8">
        {apiOffline && <div className="mb-6 bg-yellow-50 p-3 text-yellow-800 rounded">Backend inacessível.</div>}
        <ScanForm onSubmit={handleNewScan} />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 my-8">
          <StatsCard title="Total Scans" value={scans.length} icon={Activity} />
          <StatsCard title="Vulnerabilities Found" value={totalVulnerabilities} icon={AlertTriangle} />
          <StatsCard title="Avg Risk Score" value={avgRiskScore} icon={TrendingUp} />
          <StatsCard title="Status" value="Online" icon={CheckCircle} />
        </div>
        <h3 className="mb-4">Recent Scans</h3>
        {loading ? <Loader2 className="animate-spin mx-auto w-8 h-8" /> : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {scans.map((scan) => <ScanHistoryCard key={scan.id} scan={scan} onClick={() => setSelectedScan(scan)} />)}
          </div>
        )}
        <AboutSection />
      </main>
    </div>
  );
}
