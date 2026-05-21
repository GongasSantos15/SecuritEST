// Lemos o URL exato e completo que o GitHub Actions injetou
const BASE_API_URL = import.meta.env.VITE_API_URL.replace(/\/api\/.*$/, "");

export interface Vulnerability {
  id: string;
  title: string;
  severity: "critical" | "high" | "medium" | "low";
  category: string;
  description: string;
  endpoint?: string;
  recommendation: string;
}

export interface ScanResult {
  id: string;
  scan_id: string;
  url: string;
  timestamp: string;
  status: "completed" | "in-progress" | "failed";
  riskScore: number;
  vulnerabilities: Vulnerability[];
  vulnerabilityCount: number;
}

// ─── Listar todos os scans (Bate na porta com GET) ─────────────
export async function fetchScans(): Promise<ScanResult[]> {
  // Constrói o URL dinamicamente
  const response = await fetch(`${BASE_API_URL}/api/scans`, {
    method: "GET"
  });

  if (!response.ok) {
    throw new Error(`Erro ao carregar scans: ${response.status}`);
  }

  const data = await response.json();
  return Array.isArray(data) ? data : (data.items || []);
}

// ─── Disparar novo scan (Bate na MESMA porta, mas com POST) ────
export async function startScan(url: string): Promise<ScanResult> {
  const response = await fetch(`${BASE_API_URL}/api/StartScan`, {
    method: "POST",
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ url })
  });

  if (!response.ok) {
    throw new Error(`Erro ao iniciar scan: ${response.status}`);
  }

  return await response.json();
}
