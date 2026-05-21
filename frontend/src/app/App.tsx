import { useState, useEffect } from "react";
import { Header } from "./components/Header";
import { StatsCard } from "./components/StatsCard";
import { ScanForm } from "./components/ScanForm";
import { ScanHistoryCard, ScanData } from "./components/ScanHistoryCard";
import { VulnerabilityCard } from "./components/VulnerabilityCard";
import { RiskScoreGauge } from "./components/RiskScoreGauge";
import { fetchScans, startScan, ScanResult } from "../services/api";
import { Activity, AlertTriangle, CheckCircle, TrendingUp, ArrowLeft, Loader2, WifiOff } from "lucide-react";

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

function AboutSection() {
  return (
    <div className="mt-8 bg-card border border-border rounded-lg p-6">
      <h3 className="mb-4">About SecuritEST</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
        {[{t: "Container-Based", d: "Scalable engine"}, {t: "Serverless", d: "Azure Functions"}, {t: "NoSQL", d: "Cosmos DB"}].map(i => (
          <div key={i.t} className="bg-accent rounded-lg p-4"><h4>{i.t}</h4><p className="text-muted-foreground">{i.d}</p></div>
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
    if (cached.length > 0) { setScans(cached); setScanDetails(cachedDetails); }
    fetchScans()
      .then(res => {
        const fresh = res.map(toScanData);
        const details: Record<string, ScanResult> = {};
        res.forEach(r => details[r.id] = r);
        setScans(fresh); setScanDetails(details); saveToStorage(fresh, details);
      })
      .catch(() => setApiOffline(true))
      .finally(() => setLoading(false));
  }, []);

  const handleNewScan = async (url: string) => {
    try {
      const result = await startScan(url);
      const scanData = toScanData(result);
      setScans(prev => [scanData, ...prev]);
      setScanDetails(prev => ({ ...prev, [result.id]: result }));
      setSelectedScan(scanData);
    } catch { alert("Falha ao iniciar scan."); }
  };

  if (selectedScan) {
    const findings = scanDetails[selectedScan.id]?.findings ?? [];
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <button onClick={() => setSelectedScan(null)} className="flex items-center gap-2 mb-6"><ArrowLeft className="w-4 h-4" /> Back</button>
          <div className="grid lg:grid-cols-3 gap-6 mb-8">
            <div className="lg:col-span-2 bg-card border rounded-lg p-6"><h2>Scan Report</h2><p>{selectedScan.url}</p></div>
            <div className="bg-card border rounded-lg p-6 flex justify-center"><RiskScoreGauge score={Number(selectedScan.riskScore)} /></div>
          </div>
          <h3 className="mb-4">Vulnerabilities Detected ({findings.length})</h3>
          <div className="space-y-4">
            {Array.isArray(findings) ? findings.map(f => (
              <VulnerabilityCard key={f.id + f.endpoint} vulnerability={{id: f.id, title: f.name, severity: f.severity > 5 ? "critical" : "medium", category: f.category, description: f.description || "", endpoint: f.endpoint, recommendation: f.recommendation}} />
            )) : <p>No findings.</p>}
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
          <StatsCard title="Vulnerabilities" value={scans.reduce((a, s) => a + s.vulnerabilities, 0)} icon={AlertTriangle} />
          <StatsCard title="Avg Risk" value={Math.round(scans.reduce((a, s) => a + Number(s.riskScore), 0) / (scans.length || 1))} icon={TrendingUp} />
          <StatsCard title="Status" value="Online" icon={CheckCircle} />
        </div>
        <h3 className="mb-4">Recent Scans</h3>
        {loading ? <Loader2 className="animate-spin mx-auto w-8 h-8" /> : (
          <div className="grid md:grid-cols-2 gap-4">
            {scans.map(s => <ScanHistoryCard key={s.id} scan={s} onClick={() => setSelectedScan(s)} />)}
          </div>
        )}
        <AboutSection />
      </main>
    </div>
  );
}
