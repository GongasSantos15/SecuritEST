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

// ─── Helpers localStorage ────────────────────────────────────────────────────
function saveToStorage(scans: ScanData[], details: Record<string, any>) {
  try {
    const serialized = scans.map((s) => ({
      ...s,
      timestamp: s.timestamp.toISOString()
    }));

    localStorage.setItem(STORAGE_KEY, JSON.stringify(serialized));
    localStorage.setItem(DETAILS_KEY, JSON.stringify(details));
  } catch (_) {}
}

function loadFromStorage(): {
  scans: ScanData[];
  details: Record<string, any>;
} {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const rawDetails = localStorage.getItem(DETAILS_KEY);

    if (!raw) {
      return { scans: [], details: {} };
    }

    const parsed = JSON.parse(raw) as any[];

    const scans: ScanData[] = parsed.map((s) => ({
      ...s,
      timestamp: new Date(s.timestamp)
    }));

    const details: Record<string, any> = rawDetails
      ? JSON.parse(rawDetails)
      : {};

    return { scans, details };
  } catch (_) {
    return { scans: [], details: {} };
  }
}

// ─── Conversão API → frontend ───────────────────────────────────────────────
function toScanData(s: any): ScanData {
  return {
    id: s.scan_id || s.id,
    url: s.target_url || s.url,
    timestamp: new Date(s.started_at || s.timestamp),
    riskScore: Math.round(s.final_score || s.riskScore || 0),

    vulnerabilities:
      s.findings_count ||
      s.vulnerabilityCount ||
      s.vulnerabilities?.length ||
      0,

    status: s.status || "completed"
  };
}

export default function App() {
  const [scans, setScans] = useState<ScanData[]>([]);
  const [scanDetails, setScanDetails] = useState<Record<string, any>>({});
  const [selectedScan, setSelectedScan] = useState<ScanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [apiOffline, setApiOffline] = useState(false);

  // ─── Iniciar: CosmosDB → fallback localStorage ───────────────────────────
  useEffect(() => {
    const { scans: cached, details: cachedDetails } = loadFromStorage();

    // Mostrar cache imediatamente enquanto carrega
    if (cached.length > 0) {
      setScans(cached);
      setScanDetails(cachedDetails);
      setLoading(false);
    }

    fetchScans()
      .then((results) => {
        console.log("API RESULTS:", results);

        if (results.length > 0) {
          const fresh = results.map(toScanData);

          console.log("MAPPED:", fresh);

          const details: Record<string, any> = {};

          results.forEach((r: any) => {
            const id = r.scan_id || r.id;
            details[id] = r;
          });

          setScans(fresh);
          setScanDetails(details);

          saveToStorage(fresh, details);
        }

        setApiOffline(false);
      })
      .catch((err) => {
        console.error(err);
        setApiOffline(true);
      })
      .finally(() => setLoading(false));
  }, []);

  // ─── Novo scan ────────────────────────────────────────────────────────────
  const handleNewScan = async (url: string) => {
    try {
      const result = await startScan(url);

      console.log("NEW SCAN:", result);

      const scanData = toScanData(result);

      setScans((prev) => {
        const updated = [scanData, ...prev];

        const updatedDetails = {
          ...scanDetails,
          [scanData.id]: result
        };

        setScanDetails(updatedDetails);

        saveToStorage(updated, updatedDetails);

        return updated;
      });

      setSelectedScan(scanData);

      setApiOffline(false);
    } catch (err: any) {
      console.error(err);

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

        const updatedDetails = {
          ...scanDetails,
          [localId]: localResult
        };

        setScanDetails(updatedDetails);

        saveToStorage(updated, updatedDetails);

        return updated;
      });

      setSelectedScan(scanData);

      setApiOffline(true);
    }
  };

  const totalVulnerabilities = scans.reduce(
    (sum, s) => sum + s.vulnerabilities,
    0
  );

  const avgRiskScore = scans.length
    ? Math.round(
        scans.reduce((sum, s) => sum + s.riskScore, 0) / scans.length
      )
    : 0;

  // ─── Vista detalhe ────────────────────────────────────────────────────────
  if (selectedScan) {
    const detail = scanDetails[selectedScan.id];

    const vulnerabilities =
      detail?.findings ||
      detail?.vulnerabilities ||
      [];

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

                    <p className="text-sm text-muted-foreground break-all">
                      {selectedScan.url}
                    </p>

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

          <div className="mb-6">
            <h3 className="mb-4">
              Vulnerabilities Detected ({vulnerabilities.length})
            </h3>

            {vulnerabilities.length === 0 ? (
              <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
                <CheckCircle className="w-8 h-8 text-green-600 mx-auto mb-2" />

                <p className="text-green-800">
                  No vulnerabilities detected.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {vulnerabilities.map((vuln: any) => (
                  <VulnerabilityCard
                    key={vuln.id}
                    vulnerability={vuln}
                  />
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

        {apiOffline && (
          <div className="mb-6 flex items-center gap-3 bg-yellow-50 border border-yellow-200 rounded-lg px-4 py-3 text-yellow-800 text-sm">
            <WifiOff className="w-4 h-4 flex-shrink-0" />

            Backend inacessível — a funcionar em modo offline.
            Os scans são guardados localmente.
          </div>
        )}

        <div className="mb-8">
          <ScanForm onSubmit={handleNewScan} />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <StatsCard
            title="Total Scans"
            value={scans.length}
            icon={Activity}
            trend="+12% from last week"
            trendUp={true}
          />

          <StatsCard
            title="Vulnerabilities Found"
            value={totalVulnerabilities}
            icon={AlertTriangle}
            trend="+8 this week"
            trendUp={false}
          />

          <StatsCard
            title="Avg Risk Score"
            value={avgRiskScore}
            icon={TrendingUp}
            trend="-5 points"
            trendUp={true}
          />

          <StatsCard
            title="APIs Secured"
            value={scans.filter((s) => s.riskScore < 30).length}
            icon={CheckCircle}
            trend="+2 this week"
            trendUp={true}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <h3>Recent Scans</h3>

            <button className="text-sm text-primary hover:underline">
              View All
            </button>
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
                <ScanHistoryCard
                  key={scan.id}
                  scan={scan}
                  onClick={() => setSelectedScan(scan)}
                />
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
